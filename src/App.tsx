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
  Layers,
  Smartphone,
  ChevronDown
} from 'lucide-react';

import { db, initDemoDataIfEmpty, type Organization, type Bill } from './db';
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Mobile/Desktop Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 sm:py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 p-0.5 shadow-md shadow-indigo-500/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <span>{profile?.buildingName || 'Building Bill Manager'}</span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-none">
              {profile?.ownerName ? `${profile.ownerName} • Tenant & GST Tracker` : 'Tenant Billing & Payment Tracker'}
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center space-x-2">
          {/* Quick Add Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1 shadow-lg shadow-indigo-600/30 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
            </button>

            {isQuickMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsQuickMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-xs animate-fadeIn">
                  <button
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      handleOpenAddBill();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center space-x-2 text-slate-200"
                  >
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Send New Bill</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      handleOpenAddPayment();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center space-x-2 text-slate-200"
                  >
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span>Record Payment (Cash/Online)</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      setIsAddGstOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center space-x-2 text-slate-200"
                  >
                    <Receipt className="w-4 h-4 text-amber-400" />
                    <span>Record GST Expense</span>
                  </button>
                  <div className="border-t border-slate-800 my-1" />
                  <button
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      setEditingOrg(null);
                      setIsAddOrgOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center space-x-2 text-slate-200"
                  >
                    <Building2 className="w-4 h-4 text-sky-400" />
                    <span>Add Business Tenant</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Settings / APK Info Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Building Settings, Backup & APK Install"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3.5 sm:p-5">
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

      {/* Modern Bottom Navigation Bar (Optimized for Android Mobile Navigation) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe">
        <div className="max-w-md mx-auto grid grid-cols-5 px-1 py-1.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 transition relative ${
              activeTab === 'dashboard' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('tenants')}
            className={`flex flex-col items-center justify-center py-1 transition relative ${
              activeTab === 'tenants' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Tenants</span>
          </button>

          <button
            onClick={() => setActiveTab('bills')}
            className={`flex flex-col items-center justify-center py-1 transition relative ${
              activeTab === 'bills' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <FileText className="w-5 h-5 mb-0.5" />
              {pendingBillsCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center">
                  {pendingBillsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">Bills Sent</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex flex-col items-center justify-center py-1 transition relative ${
              activeTab === 'payments' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Payments</span>
          </button>

          <button
            onClick={() => setActiveTab('gst')}
            className={`flex flex-col items-center justify-center py-1 transition relative ${
              activeTab === 'gst' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">GST Center</span>
          </button>
        </div>
      </nav>

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
