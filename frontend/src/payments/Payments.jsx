import React, { useState, useEffect } from 'react';
import { CreditCard, Search, ArrowUpRight, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { apiRequest } from '../api';

export default function Payments({ onSelectInvoice }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/payments/');
      if (!res.ok) throw new Error('Failed to load payments history');
      const data = await res.json();
      setPayments(data.results || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val || 0);
  };

  const filtered = payments.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.transaction_reference?.toLowerCase().includes(s) ||
      p.invoice_number?.toLowerCase().includes(s) ||
      p.customer_name?.toLowerCase().includes(s) ||
      p.payment_method?.toLowerCase().includes(s)
    );
  });

  const totalCollected = payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Payment Transactions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Immutable ledger of client settlements with fraud &amp; overpayment protection</p>
        </div>
      </div>

      {/* Security Rule Pill Banner */}
      <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 rounded-2xl flex items-center gap-3 text-xs text-blue-900 dark:text-blue-200">
        <ShieldAlert className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" />
        <div>
          <span className="font-bold">Fraud Prevention Guard Active:</span> Payments cannot exceed invoice remaining balance. Overpayments are strictly blocked at the API level. Financial records cannot be deleted.
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Mini-bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">Total Settled Collections</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalCollected)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">Total Verified Transactions</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{payments.length} Transactions</div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by transaction reference, UTR, invoice # or customer..."
          className="w-full text-sm outline-none bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
            Clear
          </button>
        )}
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-700 rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Transactions Found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {search ? 'No payments match your search query.' : 'Recorded settlements will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4">Transaction / UTR Ref</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-right">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {p.transaction_reference}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => onSelectInvoice(p.invoice)}
                        className="font-mono font-bold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{p.invoice_number}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">{p.customer_name}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">{p.payment_date}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs text-slate-500 dark:text-slate-400">
                      {p.recorded_by_username || 'Staff'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}



