import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Building2, 
  FileText, 
  Wallet, 
  Receipt, 
  Settings, 
  Plus, 
  Home, 
  ChevronDown
} from 'lucide-react';

import { db, initDemoDataIfEmpty, type Organization } from './db';
import { DashboardView } from './components/DashboardView';
import { BillsView } from './components/BillsView';
import { PaymentsView } from './components/PaymentsView';
import { OrganizationsView } from './components/OrganizationsView';
import { GstTrackerView } from './components/GstTrackerView';
import { AddBillModal } from './components/AddBillModal';
import { AddPaymentModal } from './components/AddPaymentModal';
import { AddOrgModal } from './components/AddOrgModal';
import { AddGstExpenseModal } from './components/AddGstExpenseModal';
import { SettingsModal } from './components/SettingsModal';
import { DocumentViewerModal } from './components/DocumentViewerModal';

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bills' | 'payments' | 'tenants' | 'gst'>('dashboard');

  // Modals state
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isAddOrgOpen, setIsAddOrgOpen] = useState(false);
  const [isAddGstOpen, setIsAddGstOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Selected entities for modals
  const [selectedBillIdForPayment, setSelectedBillIdForPayment] = useState<number | undefined>(undefined);
  const [selectedOrgIdForAction, setSelectedOrgIdForAction] = useState<number | undefined>(undefined);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  // Document viewer modal state
  const [viewerDoc, setViewerDoc] = useState<{
    isOpen: boolean;
    title: string;
    fileData?: string;
    fileName?: string;
    fileType?: string;
  }>({
    isOpen: false,
    title: ''
  });

  // Fast Add menu dropdown on mobile
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  // Initialize DB demo data
  useEffect(() => {
    initDemoDataIfEmpty();
  }, []);

  // Reactive DB queries
  const profileList = useLiveQuery(() => db.profile.toArray(), []);
  const organizations = useLiveQuery(() => db.organizations.toArray(), []) || [];
  const bills = useLiveQuery(() => db.bills.orderBy('createdAt').reverse().toArray(), []) || [];
  const payments = useLiveQuery(() => db.payments.orderBy('createdAt').reverse().toArray(), []) || [];
  const gstExpenses = useLiveQuery(() => db.gstExpenses.orderBy('createdAt').reverse().toArray(), []) || [];

  const profile = profileList && profileList.length > 0 ? profileList[0] : null;

  const handleOpenAddBill = (orgId?: number) => {
    setSelectedOrgIdForAction(orgId);
    setIsAddBillOpen(true);
  };

  const handleOpenAddPayment = (billId?: number, orgId?: number) => {
    setSelectedBillIdForPayment(billId);
    setSelectedOrgIdForAction(orgId);
    setIsAddPaymentOpen(true);
  };

  const handleOpenEditOrg = (org: Organization) => {
    setEditingOrg(org);
    setIsAddOrgOpen(true);
  };

  const handleViewDocument = (title: string, fileData: string, fileName?: string, fileType?: string) => {
    setViewerDoc({
      isOpen: true,
      title,
      fileData,
      fileName,
      fileType
    });
  };

  const pendingBillsCount = bills.filter(b => b.balanceAmount > 0).length;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative">
      {/* Subtle Background Glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[128px] pointer-events-none" />

      {/* 🌟 TOP APP HEADER */}
      <header className="sticky top-0 z-40 bg-[#090d16]/85 backdrop-blur-2xl border-b border-white/[0.08] px-4 py-3 sm:py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 p-0.5 shadow-lg shadow-indigo-500/25 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-white tracking-tight truncate flex items-center gap-1.5">
              <span>{profile?.buildingName || 'Building Bill Manager'}</span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-none">
              {profile?.ownerName ? `${profile.ownerName} • Commercial Space Billing` : 'Tenant Billing & Payment Tracker'}
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center space-x-2">
          {/* Quick Add Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
              className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {isQuickMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsQuickMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl py-2 z-50 text-xs animate-slide-up">
                  <button
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      handleOpenAddBill();
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center space-x-2.5 text-slate-200 transition"
                  >
                    <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span>Send New Bill</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      handleOpenAddPayment();
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center space-x-2.5 text-slate-200 transition"
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Wallet className="w-3.5 h-3.5" />
                    </div>
                    <span>Record Payment</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      setIsAddGstOpen(true);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center space-x-2.5 text-slate-200 transition"
                  >
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                      <Receipt className="w-3.5 h-3.5" />
                    </div>
                    <span>Record GST Expense</span>
                  </button>
                  <div className="border-t border-white/10 my-1" />
                  <button
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      setEditingOrg(null);
                      setIsAddOrgOpen(true);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center space-x-2.5 text-slate-200 transition"
                  >
                    <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <span>Add Business Tenant</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition active:scale-95"
            title="Building Profile, Backup & APK Install"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            organizations={organizations}
            bills={bills}
            payments={payments}
            gstExpenses={gstExpenses}
            onOpenAddBill={() => handleOpenAddBill()}
            onOpenAddPayment={(billId) => handleOpenAddPayment(billId)}
            onOpenAddOrg={() => {
              setEditingOrg(null);
              setIsAddOrgOpen(true);
            }}
            onOpenAddGstExpense={() => setIsAddGstOpen(true)}
            onViewDocument={handleViewDocument}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'bills' && (
          <BillsView
            bills={bills}
            profile={profile}
            onOpenAddBill={() => handleOpenAddBill()}
            onOpenAddPayment={(billId) => handleOpenAddPayment(billId)}
            onViewDocument={handleViewDocument}
            onRefresh={() => {}}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsView
            payments={payments}
            profile={profile}
            onOpenAddPayment={() => handleOpenAddPayment()}
            onViewDocument={handleViewDocument}
            onRefresh={() => {}}
          />
        )}

        {activeTab === 'tenants' && (
          <OrganizationsView
            organizations={organizations}
            bills={bills}
            payments={payments}
            onOpenAddOrg={() => {
              setEditingOrg(null);
              setIsAddOrgOpen(true);
            }}
            onEditOrg={handleOpenEditOrg}
            onOpenAddBillForOrg={(orgId) => handleOpenAddBill(orgId)}
            onOpenAddPaymentForOrg={(orgId) => handleOpenAddPayment(undefined, orgId)}
            onRefresh={() => {}}
          />
        )}

        {activeTab === 'gst' && (
          <GstTrackerView
            bills={bills}
            gstExpenses={gstExpenses}
            onOpenAddGstExpense={() => setIsAddGstOpen(true)}
            onViewDocument={handleViewDocument}
            onRefresh={() => {}}
          />
        )}
      </main>

      {/* 🚀 FLOATING DOCK BOTTOM NAVIGATION (Optimized for Android Touch) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-2 sm:p-3 pointer-events-none flex justify-center pb-safe">
        <nav className="pointer-events-auto bg-slate-900/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl sm:rounded-full px-2 py-1.5 flex items-center justify-around w-full max-w-md">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl sm:rounded-full transition-all duration-200 relative ${
              activeTab === 'dashboard' 
                ? 'text-indigo-400 bg-indigo-500/15 font-black scale-105' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('tenants')}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl sm:rounded-full transition-all duration-200 relative ${
              activeTab === 'tenants' 
                ? 'text-sky-400 bg-sky-500/15 font-black scale-105' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Tenants</span>
          </button>

          <button
            onClick={() => setActiveTab('bills')}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl sm:rounded-full transition-all duration-200 relative ${
              activeTab === 'bills' 
                ? 'text-indigo-400 bg-indigo-500/15 font-black scale-105' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <FileText className="w-5 h-5 mb-0.5" />
              {pendingBillsCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[14px] text-center shadow">
                  {pendingBillsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">Bills</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl sm:rounded-full transition-all duration-200 relative ${
              activeTab === 'payments' 
                ? 'text-emerald-400 bg-emerald-500/15 font-black scale-105' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Payments</span>
          </button>

          <button
            onClick={() => setActiveTab('gst')}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl sm:rounded-full transition-all duration-200 relative ${
              activeTab === 'gst' 
                ? 'text-amber-400 bg-amber-500/15 font-black scale-105' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">GST</span>
          </button>
        </nav>
      </div>

      {/* Modals */}
      <AddBillModal
        isOpen={isAddBillOpen}
        onClose={() => {
          setIsAddBillOpen(false);
          setSelectedOrgIdForAction(undefined);
        }}
        organizations={organizations}
        initialOrgId={selectedOrgIdForAction}
        onBillCreated={() => {}}
      />

      <AddPaymentModal
        isOpen={isAddPaymentOpen}
        onClose={() => {
          setIsAddPaymentOpen(false);
          setSelectedBillIdForPayment(undefined);
          setSelectedOrgIdForAction(undefined);
        }}
        organizations={organizations}
        bills={bills}
        initialBillId={selectedBillIdForPayment}
        initialOrgId={selectedOrgIdForAction}
        onPaymentRecorded={() => {}}
      />

      <AddOrgModal
        isOpen={isAddOrgOpen}
        onClose={() => {
          setIsAddOrgOpen(false);
          setEditingOrg(null);
        }}
        onOrgCreated={() => {}}
        editingOrg={editingOrg}
      />

      <AddGstExpenseModal
        isOpen={isAddGstOpen}
        onClose={() => setIsAddGstOpen(false)}
        onExpenseCreated={() => {}}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onProfileUpdated={() => {}}
      />

      <DocumentViewerModal
        isOpen={viewerDoc.isOpen}
        onClose={() => setViewerDoc({ isOpen: false, title: '' })}
        title={viewerDoc.title}
        fileData={viewerDoc.fileData}
        fileName={viewerDoc.fileName}
        fileType={viewerDoc.fileType}
      />
    </div>
  );
}

export default App;
