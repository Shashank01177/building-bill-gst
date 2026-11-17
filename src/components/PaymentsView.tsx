import React, { useState } from 'react';
import { 
  Wallet, 
  Plus, 
  Search, 
  Banknote, 
  CreditCard, 
  Paperclip, 
  Download, 
  Trash2, 
  Calendar,
  Building2,
  CheckCircle,
  X
} from 'lucide-react';
import { db, type Payment, type BuildingProfile } from '../db';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generatePaymentReceiptPDF } from '../utils/pdfGenerator';

interface PaymentsViewProps {
  payments: Payment[];
  profile: BuildingProfile | null;
  onOpenAddPayment: () => void;
  onViewDocument: (title: string, fileData: string, fileName?: string, fileType?: string) => void;
  onRefresh: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  profile,
  onOpenAddPayment,
  onViewDocument,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'cash' | 'online' | 'mixed'>('all');

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.orgName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.billNumber && p.billNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.onlineRefNumber && p.onlineRefNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    if (modeFilter === 'all') return matchesSearch;
    return matchesSearch && p.paymentMode === modeFilter;
  });

  const totalCash = payments.reduce((sum, p) => sum + (p.cashAmount || 0), 0);
  const totalOnline = payments.reduce((sum, p) => sum + (p.onlineAmount || 0), 0);
  const grandTotal = totalCash + totalOnline;

  const handleDeletePayment = async (p: Payment) => {
    if (confirm(`Are you sure you want to delete payment ${p.paymentNumber}?`)) {
      // Reconcile linked bill
      if (p.billId) {
        const bill = await db.bills.get(p.billId);
        if (bill) {
          const newPaid = Math.max(0, bill.paidAmount - p.totalAmount);
          const newBalance = bill.totalAmount - newPaid;
          let newStatus = bill.status;
          if (newPaid === 0) newStatus = 'unpaid';
          else if (newBalance > 0) newStatus = 'partial';
          else newStatus = 'paid';

          await db.bills.update(bill.id!, {
            paidAmount: newPaid,
            balanceAmount: newBalance,
            status: newStatus
          });
        }
      }

      await db.payments.delete(p.id!);
      onRefresh();
    }
  };

  return (
    <div className="space-y-5 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <span>Payment Receipts</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Cash and online rent collection records with proof slips</p>
        </div>
        <button
          onClick={onOpenAddPayment}
          className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Aggregate Header Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-4 flex items-center space-x-3.5 border-amber-500/20">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Total Cash Received</span>
            <div className="text-xl font-black text-white">{formatCurrency(totalCash)}</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center space-x-3.5 border-sky-500/20">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300">Total Online / UPI</span>
            <div className="text-xl font-black text-white">{formatCurrency(totalOnline)}</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center space-x-3.5 border-emerald-500/20">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">Total Collected</span>
            <div className="text-xl font-black text-emerald-400">{formatCurrency(grandTotal)}</div>
          </div>
        </div>
      </div>

      {/* Search & Mode Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search payments by receipt #, tenant, bill # or UTR..."
            className="w-full bg-slate-900/80 border border-white/10 rounded-2xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 backdrop-blur-md transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mode Filter Pills */}
        <div className="flex bg-slate-900/80 border border-white/10 rounded-2xl p-1 shrink-0 backdrop-blur-md overflow-x-auto">
          {(['all', 'cash', 'online', 'mixed'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setModeFilter(mode)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all duration-200 ${
                modeFilter === mode
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Payments List Cards */}
      {filteredPayments.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center">
          <Wallet className="w-12 h-12 text-slate-600 mb-3" />
          <h4 className="text-white font-bold text-base">No payment records found</h4>
          <p className="text-slate-400 text-xs mt-1 max-w-sm">
            {searchTerm ? 'Try adjusting your search criteria.' : 'Click "Record Payment" to log cash or online collections.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPayments.map(p => (
            <div
              key={p.id}
              className="glass-card rounded-3xl p-5 flex flex-col justify-between border-white/[0.08] hover:border-white/20 transition-all duration-200"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center font-black text-white text-sm shrink-0 shadow-lg shadow-emerald-600/20">
                      {p.orgName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-emerald-400">{p.paymentNumber}</span>
                        <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full font-medium">
                          {formatDate(p.paymentDate)}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white mt-0.5 truncate max-w-[200px] sm:max-w-xs">
                        {p.orgName}
                      </h3>
                    </div>
                  </div>

                  {/* Mode Badge */}
                  <span
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
                      p.paymentMode === 'cash'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : p.paymentMode === 'online'
                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {p.paymentMode === 'mixed' ? 'Cash + Online' : p.paymentMode}
                  </span>
                </div>

                {p.billNumber && (
                  <div className="mb-2.5">
                    <span className="text-[11px] text-indigo-300 font-mono bg-indigo-500/15 px-2 py-0.5 rounded-lg border border-indigo-500/25">
                      Against Bill: {p.billNumber}
                    </span>
                  </div>
                )}

                {/* Cash & Online Breakdown Card */}
                <div className="rounded-2xl p-3.5 bg-black/20 border border-white/5 space-y-2 text-xs mb-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Banknote className="w-4 h-4 text-amber-400" />
                      Amount Paid in Cash:
                    </span>
                    <span className="font-bold text-amber-400 text-sm">
                      {formatCurrency(p.cashAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <CreditCard className="w-4 h-4 text-sky-400" />
                      Amount Paid Online:
                    </span>
                    <span className="font-bold text-sky-400 text-sm">
                      {formatCurrency(p.onlineAmount)}
                    </span>
                  </div>

                  {p.onlineRefNumber && (
                    <div className="text-[11px] text-slate-300 font-mono bg-white/[0.04] px-2.5 py-1 rounded-xl border border-white/5 flex items-center justify-between">
                      <span className="text-slate-400">Ref / UTR:</span>
                      <span className="text-sky-300 font-bold">{p.onlineRefNumber}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="font-bold text-slate-200">Total Received:</span>
                    <span className="font-black text-emerald-400 text-base">
                      {formatCurrency(p.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Remarks / Notes */}
                {p.notes && (
                  <p className="text-[11px] text-slate-400 italic mb-2">"{p.notes}"</p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <div>
                  {p.receiptAttachment ? (
                    <button
                      onClick={() => onViewDocument(`Payment Receipt: ${p.paymentNumber}`, p.receiptAttachment!, p.receiptAttachmentName, p.receiptAttachmentType)}
                      className="flex items-center space-x-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-xl border border-emerald-500/20 transition"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>View Receipt Slip</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-600">No attached proof</span>
                  )}
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => generatePaymentReceiptPDF(p, profile)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition active:scale-95"
                    title="Download Receipt PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeletePayment(p)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-rose-400 transition active:scale-95"
                    title="Delete Payment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
