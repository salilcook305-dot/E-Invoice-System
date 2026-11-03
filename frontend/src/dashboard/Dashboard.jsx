import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  DollarSign, 
  ShieldCheck, 
  ArrowUpRight,
  RefreshCw,
  Plus
} from 'lucide-react';
import { apiRequest } from '../api';

export default function Dashboard({ setActiveTab, setSelectedInvoiceId }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/invoices/metrics/');
      if (!res.ok) throw new Error('Failed to load dashboard metrics');
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const getStatusBadge = (status) => {
    const map = {
      PAID: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
      PARTIALLY_PAID: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
      ISSUED: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
      OVERDUE: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
      DRAFT: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
      VOID: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 line-through',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-700 rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">Loading system metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500" />
          <p className="font-semibold text-sm">Failed to retrieve dashboard data</p>
        </div>
        <button
          onClick={fetchMetrics}
          className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-medium cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Executive Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Live financial metrics and tamper-proof invoice monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMetrics}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('invoices-new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-700 hover:to-blue-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-blue-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Invoiced</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(metrics.total_invoiced)}</div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{metrics.total_count} total invoices recorded</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Collected</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(metrics.total_collected)}</div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Verified settled payments</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Outstanding Balance</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(metrics.total_outstanding)}</div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Active accounts receivable</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue Alert</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{metrics.status_counts.OVERDUE || 0} Invoices</div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Require immediate follow-up</p>
        </div>
      </div>

      {/* Status Breakdown Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4">
          Invoice Status Distribution
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(metrics.status_counts).map(([st, cnt]) => (
            <div
              key={st}
              onClick={() => setActiveTab('invoices')}
              className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer transition text-center"
            >
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{cnt}</div>
              <div className="mt-1">{getStatusBadge(st)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Monthly Revenue Trend */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Billing &amp; Collections Trend</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">6-Month revenue performance (Invoiced vs Collected)</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {metrics.trends?.map((item) => {
            const maxVal = Math.max(...metrics.trends.map(t => t.total), 1);
            const pctTotal = Math.min(100, Math.round((item.total / maxVal) * 100));
            const pctCollected = Math.min(100, Math.round((item.collected / maxVal) * 100));
            return (
              <div key={item.month} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>{item.month} ({item.count} invoices)</span>
                  <div className="flex items-center gap-4">
                    <span className="text-blue-700 dark:text-blue-400 font-semibold">{formatCurrency(item.total)}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(item.collected)}</span>
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${pctCollected}%` }}
                    className="bg-emerald-500 h-full rounded-l-full"
                    title={`Collected: ${formatCurrency(item.collected)}`}
                  ></div>
                  <div
                    style={{ width: `${Math.max(0, pctTotal - pctCollected)}%` }}
                    className="bg-blue-400 dark:bg-blue-500 h-full rounded-r-full"
                    title={`Uncollected: ${formatCurrency(item.total - item.collected)}`}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-6 mt-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span>Settled Collections</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-400 dark:bg-blue-500"></div>
            <span>Pending Balance</span>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Recent Invoices</h2>
          </div>
          <button
            onClick={() => setActiveTab('invoices')}
            className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Invoices</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {metrics.recent_invoices?.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => {
                    setSelectedInvoiceId(inv.id);
                    setActiveTab('invoices-detail');
                  }}
                  className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer transition"
                >
                  <td className="py-3.5 px-4 font-bold text-blue-700 dark:text-blue-400 font-mono">{inv.invoice_number}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">{inv.customer_name}</td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{inv.issue_date}</td>
                  <td className="py-3.5 px-4">{getStatusBadge(inv.status)}</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(inv.total_amount)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-rose-600 dark:text-rose-400">
                    {formatCurrency(inv.balance_remaining)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {inv.pdf_hash ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-mono border border-emerald-200 dark:border-emerald-800/60">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Hashed</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">Draft</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



