import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Mail, 
  CreditCard, 
  ShieldCheck, 
  Ban, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Copy, 
  Check,
  Send,
  X
} from 'lucide-react';
import { apiRequest } from '../api';

export default function InvoiceDetail({ invoiceId, onBack, currentUser, onNavigateToVerify }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [transRef, setTransRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/invoices/${invoiceId}/`);
      if (!res.ok) throw new Error('Failed to load invoice details');
      const data = await res.json();
      setInvoice(data);
      setEmailRecipient(data.customer_email || '');
      setPaymentAmount(data.balance_remaining);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) fetchInvoice();
  }, [invoiceId]);

  const handleIssueInvoice = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await apiRequest(`/invoices/${invoiceId}/issue/`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to issue invoice');
      setSuccessMsg(`Invoice issued! SHA-256 fingerprint: ${data.pdf_hash}`);
      fetchInvoice();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await apiRequest(`/invoices/${invoiceId}/download_pdf/`);
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      const res = await apiRequest(`/invoices/${invoiceId}/send_email/`, {
        method: 'POST',
        body: JSON.stringify({ recipient_email: emailRecipient }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invoice email');
      setSuccessMsg(`Invoice emailed successfully to ${emailRecipient}.`);
      setIsEmailModalOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    try {
      const res = await apiRequest('/payments/', {
        method: 'POST',
        body: JSON.stringify({
          invoice: invoice.id,
          amount: paymentAmount,
          payment_method: paymentMethod,
          transaction_reference: transRef,
          notes: paymentNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorDetail = typeof data === 'object'
          ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
          : 'Failed to record payment';
        throw new Error(errorDetail);
      }

      setSuccessMsg(`Payment of ₹${paymentAmount} recorded successfully!`);
      setIsPaymentModalOpen(false);
      fetchInvoice();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoidInvoice = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    try {
      const res = await apiRequest(`/invoices/${invoiceId}/void/`, {
        method: 'POST',
        body: JSON.stringify({ reason: voidReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to void invoice');
      setSuccessMsg(`Invoice ${invoice.invoice_number} has been voided.`);
      setIsVoidModalOpen(false);
      fetchInvoice();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const copyHashToClipboard = () => {
    if (invoice?.pdf_hash) {
      navigator.clipboard.writeText(invoice.pdf_hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val || 0);
  };

  const getStatusBadge = (status) => {
    const map = {
      PAID: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
      PARTIALLY_PAID: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
      ISSUED: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
      OVERDUE: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
      DRAFT: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      VOID: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 line-through',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${map[status] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 max-w-lg mx-auto text-center">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="font-bold text-sm">Failed to Load Invoice</h3>
        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Return to List
        </button>
      </div>
    );
  }

  const isAdmin = currentUser?.is_admin || currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
                {invoice.invoice_number}
              </h1>
              {getStatusBadge(invoice.status)}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Created on {new Date(invoice.created_at).toLocaleDateString()} by {invoice.created_by_username || 'System'}
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {invoice.status === 'DRAFT' && (
            <button
              onClick={handleIssueInvoice}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Issue &amp; Hash Invoice</span>
            </button>
          )}

          {invoice.status !== 'DRAFT' && (
            <>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>PDF Document</span>
              </button>

              <button
                onClick={() => setIsEmailModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition cursor-pointer"
              >
                <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Email Client</span>
              </button>
            </>
          )}

          {['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && (
            <button
              onClick={() => {
                setPaymentAmount(invoice.balance_remaining);
                setIsPaymentModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-blue-600/20 transition cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          )}

          {isAdmin && invoice.status !== 'VOID' && (
            <button
              onClick={() => setIsVoidModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl transition cursor-pointer"
              title="Cancel / Void Invoice"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Void</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Banners */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Document Layout Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Document Top Details */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 mb-2">Billed To (Client):</div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{invoice.customer_name}</h2>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <p>Email: <span className="text-slate-800 dark:text-slate-200 font-medium">{invoice.customer_email}</span></p>
              <p>GSTIN: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{invoice.customer_gstin || 'Unregistered'}</span></p>
            </div>
          </div>

          <div className="md:text-right space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            <div className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 mb-2">Invoice Attributes:</div>
            <p>Issue Date: <span className="font-semibold text-slate-800 dark:text-slate-200">{invoice.issue_date}</span></p>
            <p>Due Date: <span className="font-semibold text-slate-800 dark:text-slate-200">{invoice.due_date}</span></p>
            <p>Currency: <span className="font-semibold text-slate-800 dark:text-slate-200">INR (₹)</span></p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-6">#</th>
                <th className="py-3 px-6">Description / Item</th>
                <th className="py-3 px-6 text-right">Unit Price</th>
                <th className="py-3 px-6 text-center">Qty</th>
                <th className="py-3 px-6 text-center">GST %</th>
                <th className="py-3 px-6 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoice.items?.map((it, idx) => (
                <tr key={it.id || idx}>
                  <td className="py-4 px-6 text-slate-400 dark:text-slate-500 text-xs">{idx + 1}</td>
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{it.product_name}</div>
                    {it.description && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{it.description}</div>}
                    <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">SKU: {it.product_sku}</div>
                  </td>
                  <td className="py-4 px-6 text-right text-slate-700 dark:text-slate-300">{formatCurrency(it.unit_price)}</td>
                  <td className="py-4 px-6 text-center text-slate-700 dark:text-slate-300">{it.quantity}</td>
                  <td className="py-4 px-6 text-center text-slate-700 dark:text-slate-300">{it.gst_rate}%</td>
                  <td className="py-4 px-6 text-right font-bold text-slate-900 dark:text-slate-100">{formatCurrency(it.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850/40 flex flex-col sm:flex-row justify-between gap-6">
          <div className="max-w-md">
            {invoice.notes && (
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">Notes &amp; Payment Terms</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  {invoice.notes}
                </p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-80 space-y-2.5 text-sm">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Taxable Subtotal:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>GST Tax Amount:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(invoice.tax_amount)}</span>
            </div>
            {parseFloat(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Discount Applied:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">- {formatCurrency(invoice.discount_amount)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-750 flex justify-between text-base font-bold text-slate-900 dark:text-slate-100">
              <span>Grand Total:</span>
              <span className="text-blue-700 dark:text-blue-400">{formatCurrency(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
              <span>Amount Paid:</span>
              <span>{formatCurrency(invoice.paid_amount)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-750 flex justify-between text-base font-bold text-rose-600 dark:text-rose-400">
              <span>Balance Remaining:</span>
              <span>{formatCurrency(invoice.balance_remaining)}</span>
            </div>
          </div>
        </div>

        {/* Cryptographic SHA-256 Tamper Proof Box */}
        <div className="p-6 bg-slate-900 dark:bg-slate-950 text-slate-200 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Cryptographic SHA-256 Integrity Fingerprint
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-xl">
                This document is permanently verified with SHA-256 digest hashing. Any post-issue modification renders the invoice invalid.
              </p>
            </div>

            {invoice.pdf_hash ? (
              <button
                onClick={onNavigateToVerify}
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Verify Authenticity
              </button>
            ) : (
              <span className="text-xs text-slate-500 italic">Hash will be generated upon issue</span>
            )}
          </div>

          {invoice.pdf_hash && (
            <div className="mt-4 p-3 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-emerald-300 break-all select-all">
                {invoice.pdf_hash}
              </span>
              <button
                onClick={copyHashToClipboard}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer shrink-0"
                title="Copy Hash"
              >
                {copiedHash ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Record Payment */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Record Customer Payment</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Invoice #{invoice.invoice_number}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
                <strong>Remaining Balance Due:</strong> {formatCurrency(invoice.balance_remaining)}
                <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                  Overpayment is strictly blocked by backend security rules.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={invoice.balance_remaining}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-400 focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="UPI">UPI Payment</option>
                  <option value="CREDIT_CARD">Credit / Debit Card</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Transaction / UTR Reference *
                </label>
                <input
                  type="text"
                  required
                  value={transRef}
                  onChange={(e) => setTransRef(e.target.value)}
                  placeholder="e.g. UTR-HDFC-99182312 or UPI/398271"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Payment confirmation notes"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Submit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Void Invoice */}
      {isVoidModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200">
              <div>
                <h3 className="font-bold text-lg">Void Invoice Confirmation</h3>
                <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">Administrative Action • Permanent</p>
              </div>
              <button onClick={() => setIsVoidModalOpen(false)} className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVoidInvoice} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Voiding this invoice will transition its status to <strong className="text-rose-600 dark:text-rose-400">VOID</strong>, disable further payments, and log this cancellation in the audit trail.
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Reason for Cancellation *
                </label>
                <textarea
                  required
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Scope revised by client, credit note issued, etc."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsVoidModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Confirm Void
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Email Invoice */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Email Invoice PDF</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Send signed PDF document to customer</p>
              </div>
              <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Recipient Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-700 focus:outline-none"
                />
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                The official tax invoice PDF with SHA-256 verification details will be attached automatically.
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



