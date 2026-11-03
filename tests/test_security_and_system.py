import os
import django
from decimal import Decimal
from datetime import date, timedelta
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from rest_framework import status

from backend.authentication.models import User
from backend.customers.models import Customer
from backend.products.models import Product
from backend.invoices.models import Invoice, InvoiceItem
from backend.payments.models import Payment
from backend.audit_log.models import AuditLog
from security.pdf_hashing import compute_sha256, verify_pdf_integrity
from utilities.pdf_generator import generate_invoice_pdf
from security.data_immutability import assert_invoice_is_mutable

class EISTestSuite(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='test_admin',
            email='admin@test.com',
            password='Password@123',
            role='ADMIN'
        )
        self.staff = User.objects.create_user(
            username='test_staff',
            email='staff@test.com',
            password='Password@123',
            role='STAFF'
        )
        self.customer = Customer.objects.create(
            name='Test Enterprise Client',
            email='client@enterprise.com',
            gstin='29ABCDE1234F1Z5',
            pan='ABCDE1234F',
            billing_address='123 Tech Park, Bengaluru'
        )
        self.product1 = Product.objects.create(
            name='Cloud Infrastructure',
            sku='TEST-CLOUD-1',
            unit_price=Decimal('1000.00'),
            gst_rate=Decimal('18.00')
        )
        self.product2 = Product.objects.create(
            name='Security Consulting',
            sku='TEST-SEC-1',
            unit_price=Decimal('2000.00'),
            gst_rate=Decimal('18.00')
        )

    def test_01_backend_only_calculations(self):
        """Calculations must be computed strictly on the backend: subtotal, GST 18%, total."""
        self.client.force_authenticate(user=self.staff)
        payload = {
            "invoice_number": "INV-TEST-001",
            "customer": self.customer.id,
            "issue_date": str(date.today()),
            "due_date": str(date.today() + timedelta(days=15)),
            "items": [
                {"product": self.product1.id, "quantity": 2, "unit_price": "1000.00", "gst_rate": "18.00"},
                {"product": self.product2.id, "quantity": 1, "unit_price": "2000.00", "gst_rate": "18.00"}
            ]
        }
        res = self.client.post('/api/invoices/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        
        # 2*1000 + 1*2000 = 4000 subtotal
        # 18% of 4000 = 720 tax
        # Total = 4720
        self.assertEqual(Decimal(str(res.data['subtotal'])), Decimal('4000.00'))
        self.assertEqual(Decimal(str(res.data['tax_amount'])), Decimal('720.00'))
        self.assertEqual(Decimal(str(res.data['total_amount'])), Decimal('4720.00'))
        self.assertEqual(Decimal(str(res.data['balance_remaining'])), Decimal('4720.00'))
        self.assertEqual(res.data['status'], 'DRAFT')

    def test_02_pdf_generation_and_sha256_tamper_verification(self):
        """Issuing an invoice produces an immutable SHA-256 fingerprint verifiable against tamper."""
        self.client.force_authenticate(user=self.staff)
        invoice = Invoice.objects.create(
            invoice_number="INV-TEST-HASH",
            customer=self.customer,
            due_date=date.today() + timedelta(days=10),
            created_by=self.staff
        )
        InvoiceItem.objects.create(invoice=invoice, product=self.product1, quantity=1, unit_price=self.product1.unit_price, gst_rate=self.product1.gst_rate)
        
        # Issue endpoint
        res = self.client.post(f'/api/invoices/{invoice.id}/issue/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        pdf_hash = res.data['pdf_hash']
        self.assertTrue(len(pdf_hash) == 64)

        # Verification endpoint with legitimate hash
        verify_res = self.client.post('/api/invoices/verify/', {'hash': pdf_hash}, format='json')
        self.assertTrue(verify_res.data['verified'])
        self.assertEqual(verify_res.data['status'], 'AUTHENTIC')

        # Verification with tampered / altered hash
        tampered_hash = pdf_hash[:-2] + "FF"
        tampered_res = self.client.post('/api/invoices/verify/', {'hash': tampered_hash}, format='json')
        self.assertFalse(tampered_res.data['verified'])
        self.assertEqual(tampered_res.data['status'], 'TAMPERED_OR_UNKNOWN')

        upload_res = self.client.post(
            '/api/invoices/verify/',
            {'file': SimpleUploadedFile('invoice.pdf', b'pdf contents', content_type='application/pdf')},
            format='multipart'
        )
        self.assertEqual(upload_res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_03_overpayment_protection(self):
        """System must strictly block payments that exceed the remaining unpaid balance."""
        self.client.force_authenticate(user=self.staff)
        invoice = Invoice.objects.create(
            invoice_number="INV-TEST-PAY",
            customer=self.customer,
            status='ISSUED',
            due_date=date.today() + timedelta(days=10),
            subtotal=Decimal('1000.00'),
            tax_amount=Decimal('180.00'),
            total_amount=Decimal('1180.00'),
            balance_remaining=Decimal('1180.00'),
            created_by=self.staff
        )

        # Attempt to overpay by 500 (total 1680 vs balance 1180)
        overpay_payload = {
            "invoice": invoice.id,
            "amount": "1680.00",
            "payment_date": str(date.today()),
            "payment_method": "UPI",
            "transaction_reference": "UPI/TEST-OVERPAY-1"
        }
        res = self.client.post('/api/payments/', overpay_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Overpayment blocked", str(res.data))

        # Valid partial payment of 500
        valid_pay_payload = {
            "invoice": invoice.id,
            "amount": "500.00",
            "payment_date": str(date.today()),
            "payment_method": "UPI",
            "transaction_reference": "UPI/TEST-VALID-PARTIAL"
        }
        res = self.client.post('/api/payments/', valid_pay_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, 'PARTIALLY_PAID')
        self.assertEqual(invoice.paid_amount, Decimal('500.00'))
        self.assertEqual(invoice.balance_remaining, Decimal('680.00'))

    def test_04_data_immutability_on_finalized_invoices(self):
        """Finalized / issued invoices cannot have line items or financials altered."""
        self.client.force_authenticate(user=self.staff)
        invoice = Invoice.objects.create(
            invoice_number="INV-TEST-IMMUTABLE",
            customer=self.customer,
            status='ISSUED',
            due_date=date.today() + timedelta(days=10),
            total_amount=Decimal('1000.00'),
            balance_remaining=Decimal('1000.00'),
            created_by=self.staff
        )
        InvoiceItem.objects.create(invoice=invoice, product=self.product1, quantity=1, unit_price=Decimal('1000.00'), gst_rate=Decimal('18.00'))

        # Attempt to modify line items on an ISSUED invoice via PATCH
        update_payload = {
            "notes": "Trying to modify issued invoice"
        }
        res = self.client.patch(f'/api/invoices/{invoice.id}/', update_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("immutable", str(res.data))

    def test_05_soft_delete_preserves_financial_history(self):
        """Deletions must be soft deletes so financial and audit records are never lost."""
        self.client.force_authenticate(user=self.staff)
        invoice = Invoice.objects.create(
            invoice_number="INV-TEST-SOFT-DEL",
            customer=self.customer,
            due_date=date.today() + timedelta(days=10),
            created_by=self.staff
        )
        inv_id = invoice.id

        res = self.client.delete(f'/api/invoices/{inv_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Must not appear in active queries
        self.assertFalse(Invoice.objects.filter(id=inv_id, is_deleted=False).exists())
        # Must still exist in database with is_deleted=True
        persisted = Invoice.objects.filter(id=inv_id, is_deleted=True).first()
        self.assertIsNotNone(persisted)
        self.assertTrue(persisted.is_deleted)
