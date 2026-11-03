import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, AlertCircle, FileCheck, DollarSign, Hash, Sparkles } from 'lucide-react';
import { apiRequest } from '../api';

export default function InvoiceCreate({ onCancel, onInvoiceCreated }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [suggestedNumber, setSuggestedNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [discountAmount, setDiscountAmount] = useState('0.00');
  const [notes, setNotes] = useState('Payment terms: Net 15 days. Please make payment via NEFT/RTGS or UPI.');
  
  const [items, setItems] = useState([
    { product: '', quantity: 1, unit_price: '0.00', gst_rate: '18.00', description: '' }
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, pRes, nRes] = await Promise.all([
          apiRequest('/customers/'),
          apiRequest('/products/'),
          apiRequest('/invoices/next_number/'),
        ]);
        if (cRes.ok) {
          const cData = await cRes.json();
          const custList = cData.results || cData;
          setCustomers(custList);
          if (custList.length > 0) setCustomerId(custList[0].id);
        }
        if (pRes.ok) {
          const pData = await pRes.json();
          const prodList = pData.results || pData;
          setProducts(prodList);
          if (prodList.length > 0) {
            setItems([
              {
                product: prodList[0].id,
                quantity: 1,
                unit_price: prodList[0].unit_price,
                gst_rate: prodList[0].gst_rate,
                description: prodList[0].description || '',
              }
            ]);
          }
        }
        if (nRes && nRes.ok) {
          const nData = await nRes.json();
          if (nData.next_invoice_number) {
            setSuggestedNumber(nData.next_invoice_number);
            setInvoiceNumber(nData.next_invoice_number);
          }
        }
      } catch (err) {
        setError('Failed to load customers or products');
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  const handleAutoGenerateNumber = async () => {
    try {
      const res = await apiRequest('/invoices/next_number/');
      if (res.ok) {
        const data = await res.json();
        setSuggestedNumber(data.next_invoice_number);
        setInvoiceNumber(data.next_invoice_number);
      }
    } catch {
      // fallback
    }
  };

  const handleProductSelect = (index, prodId) => {
    const selected = products.find((p) => p.id === parseInt(prodId, 10));
    const nextItems = [...items];
    if (selected) {
      nextItems[index] = {
        ...nextItems[index],
        product: selected.id,
        unit_price: selected.unit_price,
        gst_rate: selected.gst_rate,
        description: selected.description || '',
      };
    } else {
      nextItems[index].product = prodId;
    }
    setItems(nextItems);
  };

  const handleItemChange = (index, field, value) => {
    const nextItems = [...items];
    nextItems[index][field] = value;
    setItems(nextItems);
  };

  const addItemRow = () => {
    const defaultProd = products[0] || {};
    setItems([
      ...items,
      {
        product: defaultProd.id || '',
        quantity: 1,
        unit_price: defaultProd.unit_price || '0.00',
        gst_rate: defaultProd.gst_rate || '18.00',
        description: defaultProd.description || '',
      }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Live estimated financials for UI presentation
  const estimatedSubtotal = items.reduce((acc, it) => {
    const q = parseFloat(it.quantity) || 0;
    const p = parseFloat(it.unit_price) || 0;
    return acc + (q * p);
  }, 0);

  const estimatedTax = items.reduce((acc, it) => {
    const q = parseFloat(it.quantity) || 0;
    const p = parseFloat(it.unit_price) || 0;
    const r = parseFloat(it.gst_rate) || 0;
    return acc + (q * p * (r / 100));
  }, 0);

  const discountVal = parseFloat(discountAmount) || 0;
  const estimatedGrandTotal = Math.max(0, estimatedSubtotal + estimatedTax - discountVal);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      customer: parseInt(customerId, 10),
      issue_date: issueDate,
      due_date: dueDate,
      discount_amount: discountAmount,
      notes,
      items: items.map((it) => ({
        product: parseInt(it.product, 10),
        quantity: parseInt(it.quantity, 10) || 1,
        unit_price: it.unit_price,
        gst_rate: it.gst_rate,
        description: it.description,
      })),
    };

    if (invoiceNumber && invoiceNumber.trim()) {
      payload.invoice_number = invoiceNumber.trim();
    }

    try {
      const res = await apiRequest('/invoices/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorDetail = typeof data === 'object'
          ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
          : 'Failed to create invoice';
        throw new Error(errorDetail);
      }

      onInvoiceCreated(data.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Create New Invoice</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Totals and statutory tax calculated strictly on backend</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to Save Invoice</p>
            <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Dates Section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Invoice Info &amp; Client Details</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>Invoice #</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateNumber}
                  className="text-[11px] text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold flex items-center gap-0.5 cursor-pointer bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2 py-0.5 rounded-lg transition"
                  title="Generate next sequential number"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto</span>
                </button>
              </div>
              <input
                type="text"
                placeholder={suggestedNumber || "e.g. INV-2026-0006"}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-400 focus:outline-none font-mono text-sm"
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                Leave blank to auto-generate, or enter custom
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Select Customer *
              </label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-400 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gstin || 'Consumer'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Invoice Issue Date *
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Payment Due Date *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Line Items Section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Line Items &amp; Services</h2>
            <button
              type="button"
              onClick={addItemRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Product / SKU</label>
                    <select
                      value={item.product}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Unit Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700 text-center"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">GST Rate</label>
                    <select
                      value={item.gst_rate}
                      onChange={(e) => handleItemChange(idx, 'gst_rate', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700"
                    >
                      <option value="0.00">0%</option>
                      <option value="5.00">5%</option>
                      <option value="12.00">12%</option>
                      <option value="18.00">18%</option>
                      <option value="28.00">28%</option>
                    </select>
                  </div>

                  <div className="sm:col-span-1 flex justify-end pt-4 sm:pt-0">
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => removeItemRow(idx)}
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    placeholder="Specific deliverable description (optional)..."
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calculations Summary & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Terms &amp; Notes</h2>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-400 focus:outline-none resize-none"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Financial Summary (Live Preview)</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Taxable Subtotal:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(estimatedSubtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Estimated GST:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(estimatedTax)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Discount (₹):</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-24 text-right px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-base font-bold text-slate-900 dark:text-slate-100">
                <span>Grand Total:</span>
                <span className="text-blue-700 dark:text-blue-400">{formatCurrency(estimatedGrandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-700 hover:to-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                <span>Create Draft Invoice</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}



