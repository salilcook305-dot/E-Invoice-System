import React, { useState, useEffect } from 'react';
import { History, Search, Shield, RefreshCw, AlertCircle } from 'lucide-react';
import { apiRequest } from '../api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/audit-logs/');
      if (!res.ok) throw new Error('Failed to load audit logs');
      const data = await res.json();
      setLogs(data.results || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadge = (action) => {
    const map = {
      CREATE: 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
      UPDATE: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
      DELETE: 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
      ISSUE: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
      PAYMENT: 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
      VOID: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700',
      EMAIL: 'bg-cyan-100 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60',
      VERIFY: 'bg-teal-100 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800/60',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${map[action] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
        {action}
      </span>
    );
  };

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.entity_name?.toLowerCase().includes(s) ||
      l.entity_id?.toLowerCase().includes(s) ||
      l.action?.toLowerCase().includes(s) ||
      l.username?.toLowerCase().includes(s) ||
      l.changes_json?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">System Audit Trail</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Immutable ledger of every creation, modification, payment, and security check</p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer self-start sm:self-auto"
          title="Refresh audit logs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 bg-slate-900 dark:bg-slate-950 border border-slate-800 text-slate-200 rounded-2xl flex items-center gap-3 text-xs shadow-sm">
        <Shield className="w-5 h-5 text-cyan-400 shrink-0" />
        <div>
          <strong className="text-white">Tamper-Proof Audit Logging:</strong> Every state change across Customers, Products, Invoices, and Payments is timestamped with the originating user, IP address, and payload diff. Audit records are strictly read-only and cannot be altered or pruned.
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter audit records by entity, action, user, or changes..."
          className="w-full text-sm outline-none bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
        />
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-700 rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Audit Events Found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Actions performed across the system will be recorded here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Changes &amp; Payload</th>
                  <th className="py-3 px-4 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{log.username}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">{log.user_role}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {log.entity_name} #{log.entity_id}
                    </td>
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded border border-slate-200/60 dark:border-slate-700" title={log.changes_json}>
                        {log.changes_json || 'None'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {log.ip_address || '127.0.0.1'}
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



