import os
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import django
from decimal import Decimal
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from backend.authentication.models import User
from backend.customers.models import Customer
from backend.products.models import Product
from backend.invoices.models import Invoice, InvoiceItem
from backend.payments.models import Payment
from backend.audit_log.models import AuditLog, record_audit_log
from utilities.pdf_generator import generate_invoice_pdf
from backend.validation.calculator import recalculate_invoice_totals

def run_seed():
    print("🌱 Starting EIS Database Seeding...")

    # 1. Users
    admin_user, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@eis.local',
            'first_name': 'Ram',
            'last_name': 'Admin',
            'role': 'ADMIN',
            'is_staff': True,
            'is_superuser': True,
            'department': 'Executive Management',
            'phone': '+91 98765 43210'
        }
    )
    if created:
        admin_user.set_password('Admin@12345')
        admin_user.save()
        print("  ✓ Created Admin: admin / Admin@12345")
    else:
        print("  - Admin user already exists")

    staff_user, created = User.objects.get_or_create(
        username='staff',
        defaults={
            'email': 'staff@eis.local',
            'first_name': 'Salil',
            'last_name': 'Staff',
            'role': 'STAFF',
            'department': 'Billing & Operations',
            'phone': '+91 98111 22334'
        }
    )
    if created:
        staff_user.set_password('Staff@12345')
        staff_user.save()
        print("  ✓ Created Staff: staff / Staff@12345")
    else:
        print("  - Staff user already exists")

    # 2. Customers
    customers_data = [
        {
            'name': 'Nexus Infotech Solutions Pvt Ltd',
            'email': 'billing@nexusinfotech.com',
            'phone': '+91 80 4920 1100',
            'gstin': '29ABCDE1234F1Z5',
            'pan': 'ABCDE1234F',
            'billing_address': 'Level 4, Orion Tech Park, Whitefield, Bengaluru, KA 560066',
        },
        {
            'name': 'CloudMatrix Global Logistics',
            'email': 'accounts@cloudmatrix.in',
            'phone': '+91 22 2847 9000',
            'gstin': '27AAFCC2849P1ZQ',
            'pan': 'AAFCC2849P',
            'billing_address': 'Plot 18, BKC Commercial Complex, Bandra East, Mumbai, MH 400051',
        },
        {
            'name': 'Quantum Dynamics Healthcare LLP',
            'email': 'finance@quantumdynam.com',
            'phone': '+91 40 6712 3400',
            'gstin': '36AAHFQ8831R1Z8',
            'pan': 'AAHFQ8831R',
            'billing_address': 'Cyber Gateway, Hitec City, Hyderabad, TG 500081',
        },
        {
            'name': 'Astra Automotive Components',
            'email': 'vendor.pay@astraauto.com',
            'phone': '+91 44 2254 8877',
            'gstin': '33AABCA4521N1ZH',
            'pan': 'AABCA4521N',
            'billing_address': 'Industrial Estate, Guindy, Chennai, TN 600032',
        },
        {
            'name': 'Zenith Retail E-Commerce',
            'email': 'invoices@zenithretail.in',
            'phone': '+91 11 4100 5566',
            'gstin': '07AAECZ9182C1ZS',
            'pan': 'AAECZ9182C',
            'billing_address': 'Barakhamba Road, Connaught Place, New Delhi, DL 110001',
        }
    ]

    customers = []
    for c_data in customers_data:
        cust, _ = Customer.objects.get_or_create(
            name=c_data['name'],
            defaults=c_data
        )
        customers.append(cust)
    print(f"  ✓ Verified {len(customers)} Customers")

    # 3. Products
    products_data = [
        {
            'name': 'Enterprise Cloud Hosting & VPC',
            'sku': 'SRV-CLOUD-01',
            'description': 'High-availability Kubernetes & cloud server infrastructure management with 99.99% uptime SLA.',
            'unit_price': Decimal('45000.00'),
            'gst_rate': Decimal('18.00'),
            'hsn_sac_code': '998315'
        },
        {
            'name': 'Custom ERP Module Development',
            'sku': 'DEV-ERP-SPRINT',
            'description': 'Bi-weekly dedicated engineering sprint for invoice automation & workflow orchestration.',
            'unit_price': Decimal('85000.00'),
            'gst_rate': Decimal('18.00'),
            'hsn_sac_code': '998314'
        },
        {
            'name': 'Annual Software Maintenance (AMC)',
            'sku': 'MNT-AMC-ANNUAL',
            'description': 'Annual software patch updates, database health inspection, and 24/7 technical hotline.',
            'unit_price': Decimal('60000.00'),
            'gst_rate': Decimal('18.00'),
            'hsn_sac_code': '998717'
        },
        {
            'name': 'Cybersecurity Vulnerability Audit',
            'sku': 'SEC-VAPT-01',
            'description': 'Comprehensive OWASP Top 10 penetration testing and zero-trust perimeter auditing.',
            'unit_price': Decimal('55000.00'),
            'gst_rate': Decimal('18.00'),
            'hsn_sac_code': '998316'
        },
        {
            'name': 'Database Optimization & Clustering',
            'sku': 'DB-PERF-OPT',
            'description': 'PostgreSQL/SQLite indexing, query optimization, and read-replica scaling setup.',
            'unit_price': Decimal('32000.00'),
            'gst_rate': Decimal('18.00'),
            'hsn_sac_code': '998313'
        },
        {
            'name': 'UI/UX Interactive Design Sprint',
            'sku': 'DES-SPRINT-02',
            'description': 'Design system, Figma prototyping, and responsive accessibility design.',
            'unit_price': Decimal('28000.00'),
            'gst_rate': Decimal('18.00'),
            'hsn_sac_code': '998399'
        }
    ]

    products = []
    for p_data in products_data:
        prod, _ = Product.objects.get_or_create(
            sku=p_data['sku'],
            defaults=p_data
        )
        products.append(prod)
    print(f"  ✓ Verified {len(products)} Products")

    # 4. Invoices
    today = date.today()

    # Invoice 1: Fully PAID
    inv1, c1 = Invoice.objects.get_or_create(
        invoice_number='INV-2026-0001',
        defaults={
            'customer': customers[0],
            'status': 'ISSUED',
            'issue_date': today - timedelta(days=25),
            'due_date': today - timedelta(days=5),
            'created_by': admin_user,
            'notes': 'Terms: Net 20 days. Payment received in full via NEFT.'
        }
    )
    if c1:
        InvoiceItem.objects.create(invoice=inv1, product=products[0], quantity=1, unit_price=products[0].unit_price, gst_rate=products[0].gst_rate)
        InvoiceItem.objects.create(invoice=inv1, product=products[3], quantity=1, unit_price=products[3].unit_price, gst_rate=products[3].gst_rate)
        recalculate_invoice_totals(inv1, save=True)
        pdf_bytes, pdf_hash = generate_invoice_pdf(inv1)
        inv1.pdf_hash = pdf_hash
        inv1.save(update_fields=['pdf_hash'])

        # Record full payment
        Payment.objects.create(
            invoice=inv1,
            amount=inv1.total_amount,
            payment_date=today - timedelta(days=10),
            payment_method='BANK_TRANSFER',
            transaction_reference='NEFT-HDFC-99120482',
            notes='Paid in full via corporate netbanking',
            recorded_by=staff_user
        )
        inv1.paid_amount = inv1.total_amount
        inv1.balance_remaining = Decimal('0.00')
        inv1.status = 'PAID'
        inv1.save(update_fields=['paid_amount', 'balance_remaining', 'status'])
        print(f"  ✓ Seeded Invoice #{inv1.invoice_number} (PAID)")

    # Invoice 2: PARTIALLY_PAID
    inv2, c2 = Invoice.objects.get_or_create(
        invoice_number='INV-2026-0002',
        defaults={
            'customer': customers[1],
            'status': 'ISSUED',
            'issue_date': today - timedelta(days=15),
            'due_date': today + timedelta(days=15),
            'created_by': staff_user,
            'notes': '50% advance milestone received. Balance due upon sprint delivery.'
        }
    )
    if c2:
        InvoiceItem.objects.create(invoice=inv2, product=products[1], quantity=1, unit_price=products[1].unit_price, gst_rate=products[1].gst_rate)
        recalculate_invoice_totals(inv2, save=True)
        pdf_bytes, pdf_hash = generate_invoice_pdf(inv2)
        inv2.pdf_hash = pdf_hash
        inv2.save(update_fields=['pdf_hash'])

        # Record 50% partial payment
        partial_amt = (inv2.total_amount / Decimal('2.00')).quantize(Decimal('0.01'))
        Payment.objects.create(
            invoice=inv2,
            amount=partial_amt,
            payment_date=today - timedelta(days=5),
            payment_method='UPI',
            transaction_reference='UPI/9028194481@axis/HDFC',
            notes='Initial 50% advance milestone',
            recorded_by=staff_user
        )
        inv2.paid_amount = partial_amt
        inv2.balance_remaining = inv2.total_amount - partial_amt
        inv2.status = 'PARTIALLY_PAID'
        inv2.save(update_fields=['paid_amount', 'balance_remaining', 'status'])
        print(f"  ✓ Seeded Invoice #{inv2.invoice_number} (PARTIALLY_PAID)")

    # Invoice 3: ISSUED (Pending)
    inv3, c3 = Invoice.objects.get_or_create(
        invoice_number='INV-2026-0003',
        defaults={
            'customer': customers[2],
            'status': 'ISSUED',
            'issue_date': today - timedelta(days=3),
            'due_date': today + timedelta(days=27),
            'created_by': admin_user,
            'notes': 'Net 30 days. Contact accounts for billing clarification.'
        }
    )
    if c3:
        InvoiceItem.objects.create(invoice=inv3, product=products[2], quantity=1, unit_price=products[2].unit_price, gst_rate=products[2].gst_rate)
        InvoiceItem.objects.create(invoice=inv3, product=products[4], quantity=1, unit_price=products[4].unit_price, gst_rate=products[4].gst_rate)
        recalculate_invoice_totals(inv3, save=True)
        pdf_bytes, pdf_hash = generate_invoice_pdf(inv3)
        inv3.pdf_hash = pdf_hash
        inv3.save(update_fields=['pdf_hash'])
        print(f"  ✓ Seeded Invoice #{inv3.invoice_number} (ISSUED)")

    # Invoice 4: OVERDUE
    inv4, c4 = Invoice.objects.get_or_create(
        invoice_number='INV-2026-0004',
        defaults={
            'customer': customers[3],
            'status': 'OVERDUE',
            'issue_date': today - timedelta(days=40),
            'due_date': today - timedelta(days=10),
            'created_by': staff_user,
            'notes': 'Payment overdue. Automated dunning email sent.'
        }
    )
    if c4:
        InvoiceItem.objects.create(invoice=inv4, product=products[5], quantity=2, unit_price=products[5].unit_price, gst_rate=products[5].gst_rate)
        recalculate_invoice_totals(inv4, save=True)
        pdf_bytes, pdf_hash = generate_invoice_pdf(inv4)
        inv4.pdf_hash = pdf_hash
        inv4.status = 'OVERDUE'
        inv4.save(update_fields=['pdf_hash', 'status'])
        print(f"  ✓ Seeded Invoice #{inv4.invoice_number} (OVERDUE)")

    # Invoice 5: DRAFT
    inv5, c5 = Invoice.objects.get_or_create(
        invoice_number='INV-2026-0005',
        defaults={
            'customer': customers[4],
            'status': 'DRAFT',
            'issue_date': today,
            'due_date': today + timedelta(days=30),
            'created_by': staff_user,
            'notes': 'Draft proposal under review with client procurement team.'
        }
    )
    if c5:
        InvoiceItem.objects.create(invoice=inv5, product=products[1], quantity=1, unit_price=products[1].unit_price, gst_rate=products[1].gst_rate)
        InvoiceItem.objects.create(invoice=inv5, product=products[5], quantity=1, unit_price=products[5].unit_price, gst_rate=products[5].gst_rate)
        recalculate_invoice_totals(inv5, save=True)
        print(f"  ✓ Seeded Invoice #{inv5.invoice_number} (DRAFT)")

    # 5. Audit Log sample entries
    record_audit_log('Security', '0', 'CREATE', user=admin_user, changes={'system': 'EIS Initialized', 'version': '1.0.0'})
    print("  ✓ Seeded Audit Log initialization record")
    print("✨ EIS Database Seeding Completed Successfully!\n")

if __name__ == '__main__':
    run_seed()
