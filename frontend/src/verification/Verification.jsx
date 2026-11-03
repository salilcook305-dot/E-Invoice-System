import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Lock,
  ArrowRight
} from 'lucide-react';
import { apiRequest } from '../api';

export default function Verification({ onOpenInvoice }) {
  const [activeMode, setActiveMode] = useState('hash');
  const [hashInput, setHashInput] = useState('');
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      let body;
      if (activeMode === 'hash') {
        if (!hashInput.trim()) throw new Error('Please enter a SHA-256 hash string.');
        body = JSON.stringify({ hash: hashInput.trim() });
      } else {
        if (!invoiceNumberInput.trim()) throw new Error('Please enter an Invoice Number.');
        body = JSON.stringify({ invoice_number: invoiceNumberInput.trim() });
      }

      const res = await apiRequest('/invoices/verify/', {
        method: 'POST',
        body,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification request failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val || 0);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 ring-4 ring-blue-600/10 mb-2">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Invoice Authenticity &amp; Tamper Verification Engine
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Verify digital signatures and cryptographic SHA-256 digests. Guarantees that financial line items, tax numbers, and dates have never been altered.
        </p>
      </div>

      {/* Verification Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveMode('hash');
              setResult(null);
            }}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeMode === 'hash'
                ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Verify via SHA-256 Hash
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('number');
              setResult(null);
            }}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeMode === 'number'
                ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Search by Invoice #
          </button>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          {activeMode === 'hash' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Paste 64-Character SHA-256 Fingerprint
              </label>
              <textarea
                rows={2}
                required
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                placeholder="e.g. 5E884898DA28047151D0E56F8DC6292773603D0D6AABBDD62A11EF721D1542D8"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-blue-700 focus:outline-none resize-none"
              />
            </div>
          )}

          {activeMode === 'number' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Invoice Reference Number
              </label>
              <input
                type="text"
                required
                value={invoiceNumberInput}
                onChange={(e) => setInvoiceNumberInput(e.target.value)}
                placeholder="e.g. INV-2026-0001"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-2 focus:ring-blue-700 focus:outline-none"
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-500 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-sm shadow-blue-800/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Verify Authenticity</span>
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Verification Result Display */}
        {result && (
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            {result.verified ? (
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                      DOCUMENT VERIFIED: 100% AUTHENTIC
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                      The document's cryptographic SHA-256 checksum exactly matches the immutable official record stored in the database.
                    </p>
                  </div>
                </div>

                {result.invoice && (
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block font-semibold uppercase text-[10px]">Invoice Number</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm font-mono">{result.invoice.invoice_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block font-semibold uppercase text-[10px]">Client</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{result.invoice.customer_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block font-semibold uppercase text-[10px]">Date</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{result.invoice.issue_date}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block font-semibold uppercase text-[10px]">Total Amount</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">{formatCurrency(result.invoice.total_amount)}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/40 p-2.5 rounded-lg">
                  <span className="truncate">Hash: {result.computed_hash}</span>
                  {result.invoice?.id && onOpenInvoice && (
                    <button
                      onClick={() => onOpenInvoice(result.invoice.id)}
                      className="ml-2 font-sans font-semibold text-emerald-800 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-emerald-100 flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>View Record</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-3">
                <div className="flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
                      VERIFICATION FAILED: UNRECOGNIZED OR TAMPERED DOCUMENT
                    </h3>
                    <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
                      {result.message || 'No matching invoice was found with this cryptographic SHA-256 fingerprint. The document may have been modified, corrupted, or forged.'}
                    </p>
                  </div>
                </div>

                {result.computed_hash && (
                  <div className="p-2.5 bg-rose-100/70 dark:bg-rose-900/40 rounded-lg text-xs font-mono text-rose-800 dark:text-rose-300">
                    Computed SHA-256 Digest: {result.computed_hash}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Security Architecture Info Callout */}
      <div className="bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-sm">
          <Lock className="w-4 h-4 text-cyan-400" />
          <span>HOW SHA-256 TAMPER DETECTION PROTECTS FINANCIAL INTEGRITY</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300 dark:text-slate-400">
          <div>
            <div className="font-semibold text-white mb-1">1. Cryptographic Hashing</div>
            <p className="leading-relaxed">
              When an invoice is issued, the backend compiles the document bytes into a 256-bit mathematical digest (SHA-256).
            </p>
          </div>
          <div>
            <div className="font-semibold text-white mb-1">2. Avalanche Effect</div>
            <p className="leading-relaxed">
              Modifying even a single penny (e.g. ₹100.00 to ₹100.01) completely changes every character in the generated hash.
            </p>
          </div>
          <div>
            <div className="font-semibold text-white mb-1">3. Immutable Ledger</div>
            <p className="leading-relaxed">
              The hash is permanently sealed in the database. Discrepancies between the file and stored hash immediately flag fraud.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


