import React from 'react';
import { 
  Building2, 
  FileText, 
  Wallet, 
  CreditCard, 
  Banknote, 
  ArrowUpRight, 
  AlertCircle, 
  Receipt, 
  Plus, 
  ExternalLink,
  Percent
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
  bills,
  payments,
  gstExpenses,
  onOpenAddBill,
  onOpenAddPayment,
  onOpenAddOrg,
  onOpenAddGstExpense,
  onViewDocument,
  onNavigateTab
}) => {
  // Aggregate statistics
  const totalBilled = bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const totalCashPaid = payments.reduce((sum, p) => sum + (p.cashAmount || 0), 0);
  const totalOnlinePaid = payments.reduce((sum, p) => sum + (p.onlineAmount || 0), 0);
  const totalOutstanding = bills.reduce((sum, b) => sum + (b.balanceAmount || 0), 0);

  // GST calculations
  const totalOutputGst = bills.reduce((sum, b) => sum + (b.cgstAmount + b.sgstAmount + b.igstAmount || 0), 0);
  const totalInputGstPaid = gstExpenses.reduce((sum, g) => sum + (g.gstAmount || 0), 0);
  const netGstPayable = totalOutputGst - totalInputGstPaid;

  // Unpaid/Partial bills
  const pendingBills = bills.filter(b => b.balanceAmount > 0).slice(0, 5);
  const recentPayments = [...payments].reverse().slice(0, 5);

  return (
    <div className="space-y-5 pb-16">
      {/* Quick Action Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={onOpenAddBill}
          className="flex items-center space-x-2.5 p-3 rounded-2xl bg-indigo-600/90 hover:bg-indigo-600 border border-indigo-500/30 text-white shadow-lg shadow-indigo-950 transition active:scale-95"
        >
          <div className="p-2 rounded-xl bg-white/10 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="block text-[11px] text-indigo-200 uppercase font-semibold">New</span>
            <span className="block text-xs sm:text-sm font-bold truncate">Sent Bill</span>
          </div>
        </button>

        <button
          onClick={() => onOpenAddPayment()}
          className="flex items-center space-x-2.5 p-3 rounded-2xl bg-emerald-600/90 hover:bg-emerald-600 border border-emerald-500/30 text-white shadow-lg shadow-emerald-950 transition active:scale-95"
        >
          <div className="p-2 rounded-xl bg-white/10 shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="block text-[11px] text-emerald-200 uppercase font-semibold">Record</span>
            <span className="block text-xs sm:text-sm font-bold truncate">Payment</span>
          </div>
        </button>

        <button
          onClick={onOpenAddGstExpense}
          className="flex items-center space-x-2.5 p-3 rounded-2xl bg-amber-600/90 hover:bg-amber-600 border border-amber-500/30 text-white shadow-lg shadow-amber-950 transition active:scale-95"
        >
          <div className="p-2 rounded-xl bg-white/10 shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="block text-[11px] text-amber-200 uppercase font-semibold">Track</span>
            <span className="block text-xs sm:text-sm font-bold truncate">GST Paid</span>
          </div>
        </button>

        <button
          onClick={onOpenAddOrg}
          className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white shadow-lg transition active:scale-95"
        >
          <div className="p-2 rounded-xl bg-white/10 shrink-0">
            <Building2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-left">
            <span className="block text-[11px] text-slate-400 uppercase font-semibold">Add</span>
            <span className="block text-xs sm:text-sm font-bold truncate">Tenant Org</span>
          </div>
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Billed */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Bills Sent</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{formatCurrency(totalBilled)}</div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{bills.length} bills issued</span>
            <span className="text-indigo-400 cursor-pointer hover:underline" onClick={() => onNavigateTab('bills')}>
              View all →
            </span>
          </div>
        </div>

        {/* Total Collected with Cash vs Online */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Payments Collected</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{formatCurrency(totalPaid)}</div>
          
          {/* Split indicator */}
          <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center space-x-1.5">
              <Banknote className="w-3.5 h-3.5 text-amber-400" />
              <div>
                <span className="text-slate-400 block text-[10px]">Cash:</span>
                <span className="font-bold text-slate-200">{formatCurrency(totalCashPaid)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <CreditCard className="w-3.5 h-3.5 text-sky-400" />
              <div>
                <span className="text-slate-400 block text-[10px]">Online:</span>
                <span className="font-bold text-slate-200">{formatCurrency(totalOnlinePaid)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Balance Due / Pending</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{formatCurrency(totalOutstanding)}</div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{bills.filter(b => b.balanceAmount > 0).length} bills pending</span>
            <span className="text-rose-400 font-medium">Action needed</span>
          </div>
        </div>

        {/* GST Overview Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-indigo-900/40 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-indigo-300 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
              <Percent className="w-3.5 h-3.5" />
              Net GST Balance
            </span>
            <Receipt className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-300">{formatCurrency(Math.abs(netGstPayable))}</div>
          <div className="mt-2 text-[11px] text-slate-300 space-y-0.5">
            <div className="flex justify-between">
              <span className="text-slate-400">GST on Bills:</span>
              <span className="text-emerald-400 font-semibold">{formatCurrency(totalOutputGst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">GST Paid (ITC):</span>
              <span className="text-amber-400 font-semibold">{formatCurrency(totalInputGstPaid)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Pending Bills & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Bills */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white text-sm">Bills Awaiting Payment</h3>
            </div>
            <button
              onClick={() => onNavigateTab('bills')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              See all
            </button>
          </div>

          {pendingBills.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              All sent bills have been fully paid! 🎉
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingBills.map(b => (
                <div
                  key={b.id}
                  className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 transition"
                >
                  <div className="space-y-0.5 max-w-[55%] truncate">
                    <p className="text-xs font-bold text-white truncate">{b.orgName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {b.billNumber} • {b.billingMonth}
                    </p>
                    <p className="text-[10px] text-rose-400">Due: {formatDate(b.dueDate)}</p>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-xs font-black text-rose-400">
                      {formatCurrency(b.balanceAmount)}
                    </div>
                    <div className="flex items-center space-x-1.5 justify-end">
                      {b.billAttachment && (
                        <button
                          onClick={() => onViewDocument(`Bill: ${b.billNumber}`, b.billAttachment!, b.billAttachmentName, b.billAttachmentType)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 text-[10px]"
                          title="View attached bill image"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onOpenAddPayment(b.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition flex items-center space-x-1"
                      >
                        <Wallet className="w-3 h-3" />
                        <span>Pay</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments Received */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center space-x-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Recent Payments Received</h3>
            </div>
            <button
              onClick={() => onNavigateTab('payments')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              See all
            </button>
          </div>

          {recentPayments.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No payments recorded yet. Click "Record Payment" to add one.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentPayments.map(p => (
                <div
                  key={p.id}
                  className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 transition"
                >
                  <div className="space-y-0.5 max-w-[55%] truncate">
                    <p className="text-xs font-bold text-white truncate">{p.orgName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {p.paymentNumber} • {formatDate(p.paymentDate)}
                    </p>
                    <div className="flex items-center space-x-1.5 text-[10px]">
                      {p.cashAmount > 0 && (
                        <span className="text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/30">
                          Cash: {formatCurrency(p.cashAmount)}
                        </span>
                      )}
                      {p.onlineAmount > 0 && (
                        <span className="text-sky-400 bg-sky-950/50 px-1.5 py-0.5 rounded border border-sky-800/30">
                          Online: {formatCurrency(p.onlineAmount)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-xs font-black text-emerald-400">
                      +{formatCurrency(p.totalAmount)}
                    </div>
                    {p.receiptAttachment && (
                      <button
                        onClick={() => onViewDocument(`Payment Receipt: ${p.paymentNumber}`, p.receiptAttachment!, p.receiptAttachmentName, p.receiptAttachmentType)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] inline-flex items-center space-x-1"
                      >
                        <ExternalLink className="w-3 h-3 text-emerald-400" />
                        <span>Receipt</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
