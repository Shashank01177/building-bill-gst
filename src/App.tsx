import React, { useState, useEffect, useCallback } from 'react';
import { StorageService } from './services/storage';
import { Tenant, Invoice, PaymentReceipt, GstExpenseRecord, BuildingProfile, BillAttachment } from './types';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { InvoicesView } from './components/InvoicesView';
import { PaymentsView } from './components/PaymentsView';
import { GstLedgerView } from './components/GstLedgerView';
import { TenantsView } from './components/TenantsView';
import { AttachmentViewerModal } from './components/AttachmentViewerModal';
import { ProfileModal } from './components/ProfileModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [profile, setProfile] = useState<BuildingProfile>(StorageService.getProfile());
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [gstExpenses, setGstExpenses] = useState<GstExpenseRecord[]>([]);

  // Modals & Cross-action states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isGstModalOpen, setIsGstModalOpen] = useState(false);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<BillAttachment | null>(null);
  const [preselectedInvoice, setPreselectedInvoice] = useState<Invoice | null>(null);

  const loadData = useCallback(() => {
    setProfile(StorageService.getProfile());
    setTenants(StorageService.getTenants());
    setInvoices(StorageService.getInvoices());
    setPayments(StorageService.getPayments());
    setGstExpenses(StorageService.getGstExpenses());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler to record payment for a specific invoice
  const handleRecordPaymentForInvoice = (invoice: Invoice) => {
    setPreselectedInvoice(invoice);
    setActiveTab('payments');
    setIsPaymentModalOpen(true);
  };

  // Handler to create bill for a specific tenant
  const handleNewBillForTenant = (tenant: Tenant) => {
    setActiveTab('invoices');
    setIsInvoiceModalOpen(true);
  };

  const pendingInvoicesCount = invoices.filter(i => i.balanceDue > 0).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Navigation Header & Mobile Bottom Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        profile={profile}
        pendingInvoicesCount={pendingInvoicesCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            tenants={tenants}
            invoices={invoices}
            payments={payments}
            gstExpenses={gstExpenses}
            profile={profile}
            onNavigate={setActiveTab}
            onNewInvoice={() => {
              setActiveTab('invoices');
              setIsInvoiceModalOpen(true);
            }}
            onNewPayment={() => {
              setActiveTab('payments');
              setIsPaymentModalOpen(true);
            }}
            onNewGst={() => {
              setActiveTab('gst');
              setIsGstModalOpen(true);
            }}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesView
            invoices={invoices}
            tenants={tenants}
            profile={profile}
            onRefresh={loadData}
            onRecordPaymentForInvoice={handleRecordPaymentForInvoice}
            onViewAttachment={setSelectedAttachment}
            isCreateModalOpen={isInvoiceModalOpen}
            setIsCreateModalOpen={setIsInvoiceModalOpen}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsView
            payments={payments}
            tenants={tenants}
            invoices={invoices}
            profile={profile}
            onRefresh={loadData}
            onViewAttachment={setSelectedAttachment}
            isCreateModalOpen={isPaymentModalOpen}
            setIsCreateModalOpen={setIsPaymentModalOpen}
            preselectedInvoice={preselectedInvoice}
          />
        )}

        {activeTab === 'gst' && (
          <GstLedgerView
            gstExpenses={gstExpenses}
            invoices={invoices}
            profile={profile}
            onRefresh={loadData}
            onViewAttachment={setSelectedAttachment}
            isCreateModalOpen={isGstModalOpen}
            setIsCreateModalOpen={setIsGstModalOpen}
          />
        )}

        {activeTab === 'tenants' && (
          <TenantsView
            tenants={tenants}
            invoices={invoices}
            profile={profile}
            onRefresh={loadData}
            onNewBillForTenant={handleNewBillForTenant}
            isCreateModalOpen={isTenantModalOpen}
            setIsCreateModalOpen={setIsTenantModalOpen}
          />
        )}
      </main>

      {/* Bill & Receipt Document Viewer Modal */}
      <AttachmentViewerModal
        attachment={selectedAttachment}
        onClose={() => setSelectedAttachment(null)}
      />

      {/* Building & Landlord Profile Modal */}
      <ProfileModal
        profile={profile}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSaved={loadData}
      />
    </div>
  );
};

export default App;
