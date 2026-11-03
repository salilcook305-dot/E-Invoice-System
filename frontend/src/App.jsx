import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Package, 
  CreditCard, 
  ShieldCheck, 
  History, 
  LogOut, 
  Shield, 
  UserCircle,
  Sun,
  Moon
} from 'lucide-react';

import { getCurrentUser, clearAuthSession, apiRequest } from './api';
import { useTheme } from './theme';
import heroLogo from './assets/hero3.png';
import Login from './authentication/Login';
import Dashboard from './dashboard/Dashboard';
import Customers from './customers/Customers';
import Products from './products/Products';
import InvoiceList from './invoices/InvoiceList';
import InvoiceCreate from './invoices/InvoiceCreate';
import InvoiceDetail from './invoices/InvoiceDetail';
import Payments from './payments/Payments';
import Verification from './verification/Verification';
import AuditLogs from './audit/AuditLogs';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    // Listen for custom logout events dispatched on token expiration
    const handleLogout = () => {
      setCurrentUser(null);
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const handleSignOut = () => {
    clearAuthSession();
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'verification', label: 'Tamper Verifier', icon: ShieldCheck },
    { id: 'audit', label: 'Audit Trail', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      {/* Top Corporate Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div 
              onClick={() => setActiveTab('dashboard')} 
              className="flex items-center gap-3 cursor-pointer select-none group"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center group-hover:scale-105 transition shadow-md shadow-blue-900/30">
                <img src={heroLogo} alt="AI Samrat Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-slate-100 block leading-none">
                  AI SAMRAT
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-blue-700 dark:text-blue-400 mt-0.5 block">
                  Private Limited · EIS
                </span>
              </div>
            </div>

            {/* Main Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id || (item.id === 'invoices' && ['invoices-new', 'invoices-detail'].includes(activeTab));
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'invoices') setSelectedInvoiceId(null);
                      setActiveTab(item.id);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 font-bold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Controls, User Session & Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent dark:border-slate-800 transition cursor-pointer"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-700" />}
              </button>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

              <div className="flex items-center gap-2 text-right">
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{currentUser.username}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{currentUser.email || 'Operator'}</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                    currentUser.is_admin || currentUser.role === 'ADMIN'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                  }`}
                >
                  {currentUser.role || (currentUser.is_admin ? 'ADMIN' : 'STAFF')}
                </span>
              </div>

              <button
                onClick={handleSignOut}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                title="Sign out of EIS"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-100 dark:border-slate-800 py-2 bg-slate-50/70 dark:bg-slate-900/90 overflow-x-auto px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'invoices' && ['invoices-new', 'invoices-detail'].includes(activeTab));
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'invoices') setSelectedInvoiceId(null);
                  setActiveTab(item.id);
                }}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap ${
                  isActive ? 'text-blue-700 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            setActiveTab={setActiveTab}
            setSelectedInvoiceId={(id) => {
              setSelectedInvoiceId(id);
              setActiveTab('invoices-detail');
            }}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoiceList
            onSelectInvoice={(id) => {
              setSelectedInvoiceId(id);
              setActiveTab('invoices-detail');
            }}
            onCreateNew={() => setActiveTab('invoices-new')}
          />
        )}

        {activeTab === 'invoices-new' && (
          <InvoiceCreate
            onCancel={() => setActiveTab('invoices')}
            onInvoiceCreated={(id) => {
              setSelectedInvoiceId(id);
              setActiveTab('invoices-detail');
            }}
          />
        )}

        {activeTab === 'invoices-detail' && (
          <InvoiceDetail
            invoiceId={selectedInvoiceId}
            currentUser={currentUser}
            onBack={() => setActiveTab('invoices')}
            onNavigateToVerify={() => setActiveTab('verification')}
          />
        )}

        {activeTab === 'customers' && <Customers currentUser={currentUser} />}

        {activeTab === 'products' && <Products currentUser={currentUser} />}

        {activeTab === 'payments' && (
          <Payments
            onSelectInvoice={(id) => {
              setSelectedInvoiceId(id);
              setActiveTab('invoices-detail');
            }}
          />
        )}

        {activeTab === 'verification' && (
          <Verification
            onOpenInvoice={(id) => {
              setSelectedInvoiceId(id);
              setActiveTab('invoices-detail');
            }}
          />
        )}

        {activeTab === 'audit' && <AuditLogs />}
      </main>

      {/* Corporate Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors duration-150">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Electronic Invoicing System (EIS)</span>
            <span>• AI Samrat Project</span>
          </div>
          <div>
            Django 5 + REST Framework • React + Vite + Tailwind CSS • SQLite • SHA-256 Cryptographic Integrity
          </div>
        </div>
      </footer>
    </div>
  );
}


