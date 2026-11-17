import React from 'react';
import { 
  Building2, 
  Wallet, 
  CreditCard, 
  Banknote, 
  Receipt, 
  ExternalLink,
  Percent,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Users,
  Paperclip
} from 'lucide-react';
import { type Bill, type Organization, type Payment, type GstExpense } from '../db';
import { formatCurrency, formatDate } from '../utils/formatters';

interface DashboardViewProps {
  organizations: Organization[];
  bills: Bill[];
  payments: Payment[];
  gstExpenses: GstExpense[];
  onOpenAddBill: () => void;
  onOpenAddPayment: (billId?: number) => void;
  onOpenAddOrg: () => void;
  onOpenAddGstExpense: () => void;
  onViewDocument: (title: string, fileData: string, fileName?: string, fileType?: string) => void;
  onNavigateTab: (tab: 'dashboard' | 'tenants' | 'bills' | 'payments' | 'gst') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  organizations,
  payments,
  gstExpenses,
  onOpenAddPayment,
  onOpenAddOrg,
  onOpenAddGstExpense,
  onViewDocument,
  onNavigateTab
}) => {
  // Aggregate statistics
  const totalPaid = payments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const totalCashPaid = payments.reduce((sum, p) => sum + (p.cashAmount || 0), 0);
  const totalOnlinePaid = payments.reduce((sum, p) => sum + (p.onlineAmount || 0), 0);

  // GST calculations
  const totalPaymentGst = payments.reduce((sum, p) => sum + (p.gstAmount || 0), 0);
  const totalInputGstPaid = gstExpenses.reduce((sum, g) => sum + (g.gstAmount || 0), 0);
  const netGstPayable = totalPaymentGst - totalInputGstPaid;

  const recentPayments = [...payments].reverse().slice(0, 10);
  const activeOrgs = organizations.filter(o => o.status === 'active');
  const totalAgreedRent = activeOrgs.reduce((s, o) => s + (o.monthlyRent || 0) + (o.monthlyMaintenance || 0), 0);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* 🌟 HERO FINANCIAL CARD */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-indigo-900/90 via-slate-900/95 to-slate-950 border border-indigo-500/20 shadow-2xl shadow-indigo-950/50">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center space-x-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                Total Collections
              </span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{payments.length} Payments Recorded</span>
            </div>
          </div>

          {/* Big Amount Typography */}
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-5">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              {formatCurrency(totalPaid)}
            </h2>
            <div className="text-xs sm:text-sm text-slate-400">
              Total rent & bill collections recorded
            </div>
          </div>

          {/* Cash vs Online Split Cards */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
            {/* Cash Pill */}
            <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
                <Banknote className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block truncate">Cash Received</span>
                <span className="text-base sm:text-lg font-black text-white block truncate">
                  {formatCurrency(totalCashPaid)}
                </span>
              </div>
            </div>

            {/* Online Pill */}
            <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center shrink-0 text-sky-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300 block truncate">Online / UPI</span>
                <span className="text-base sm:text-lg font-black text-white block truncate">
                  {formatCurrency(totalOnlinePaid)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ⚡ TACTILE QUICK ACTION DOCK (Streamlined) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Quick Actions</h3>
          <span className="text-[11px] text-slate-500">Tap to record</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onOpenAddPayment()}
            className="group p-4 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-emerald-500/30 hover:border-emerald-500/60 shadow-lg shadow-black/40 transition-all duration-200 active:scale-95 text-left flex items-center space-x-3.5"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 group-hover:bg-emerald-500/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 transition">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-emerald-300 font-semibold block">Record Tenant</span>
              <span className="text-sm sm:text-base font-bold text-white block">Payment (Cash & Online)</span>
            </div>
          </button>

          <button
            onClick={onOpenAddGstExpense}
            className="group p-4 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-amber-500/30 hover:border-amber-500/60 shadow-lg shadow-black/40 transition-all duration-200 active:scale-95 text-left flex items-center space-x-3.5"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 group-hover:bg-amber-500/30 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 transition">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-amber-300 font-semibold block">Record Building</span>
              <span className="text-sm sm:text-base font-bold text-white block">GST Expense (ITC)</span>
            </div>
          </button>

          <button
            onClick={onOpenAddOrg}
            className="group p-4 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-sky-500/30 hover:border-sky-500/60 shadow-lg shadow-black/40 transition-all duration-200 active:scale-95 text-left flex items-center space-x-3.5"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 group-hover:bg-sky-500/30 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 transition">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-sky-300 font-semibold block">Register New</span>
              <span className="text-sm sm:text-base font-bold text-white block">Business Tenant</span>
            </div>
          </button>
        </div>
      </div>

      {/* 📊 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* GST Net Position Card */}
        <div 
          onClick={() => onNavigateTab('gst')}
          className="glass-card-interactive rounded-2xl p-4 cursor-pointer flex flex-col justify-between border-purple-500/20 hover:border-purple-500/40"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">GST Overview</span>
            <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-300">
            {formatCurrency(Math.abs(netGstPayable))}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Input GST Paid on building: {formatCurrency(totalInputGstPaid)}</span>
            <span className="text-purple-400 font-bold inline-flex items-center gap-0.5">
              GST Center <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Active Tenants Card */}
        <div 
          onClick={() => onNavigateTab('tenants')}
          className="glass-card-interactive rounded-2xl p-4 cursor-pointer flex flex-col justify-between border-sky-500/20 hover:border-sky-500/40"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-300">Staying Tenants</span>
            <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{activeOrgs.length} Businesses</div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Agreed rent: {formatCurrency(totalAgreedRent)} / mo</span>
            <span className="text-sky-400 font-bold inline-flex items-center gap-0.5">
              Directory <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 📋 RECENT PAYMENTS & BILL RECEIPTS LEDGER */}
      <div className="glass-card rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Tenant Payments & Bill Proofs</h4>
              <p className="text-[11px] text-slate-400">Recent Cash & Online payments with bill slips</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('payments')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-1 rounded-lg hover:bg-white/5 transition"
          >
            See all ({payments.length})
          </button>
        </div>

        {recentPayments.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center">
            <Sparkles className="w-8 h-8 text-emerald-400 mb-2" />
            <p className="font-semibold text-white">No payments recorded yet</p>
            <p className="text-slate-500 mt-0.5">Click "Record Tenant Payment" above to add your first payment.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentPayments.map(p => (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition flex items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md">
                    {p.orgName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white truncate">{p.orgName}</p>
                    <div className="flex items-center space-x-2 text-[11px] mt-0.5 flex-wrap">
                      <span className="text-slate-400 font-medium">{formatDate(p.paymentDate)}</span>
                      {p.billingMonth && (
                        <span className="text-slate-300 bg-white/5 px-1.5 py-0.5 rounded text-[10px]">
                          {p.billingMonth}
                        </span>
                      )}
                      {p.cashAmount > 0 && (
                        <span className="text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded font-medium text-[10px]">
                          Cash {formatCurrency(p.cashAmount)}
                        </span>
                      )}
                      {p.onlineAmount > 0 && (
                        <span className="text-sky-400 bg-sky-500/15 px-1.5 py-0.5 rounded font-medium text-[10px]">
                          Online {formatCurrency(p.onlineAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <div className="text-sm font-black text-emerald-400">
                    +{formatCurrency(p.totalAmount)}
                  </div>
                  {p.receiptAttachment && (
                    <button
                      onClick={() => onViewDocument(`Payment Receipt: ${p.paymentNumber}`, p.receiptAttachment!, p.receiptAttachmentName, p.receiptAttachmentType)}
                      className="text-[10px] text-emerald-300 hover:text-emerald-200 flex items-center gap-1 font-semibold ml-auto"
                    >
                      <Paperclip className="w-3 h-3" />
                      <span>View Bill</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
