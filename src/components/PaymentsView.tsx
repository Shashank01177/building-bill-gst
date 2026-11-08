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
  Building2,
  Calendar,
  Layers
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
      // If linked to a bill, reconcile bill's paidAmount
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
    <div className="space-y-4 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            Payment Receipts & Collections
          </h2>
          <p className="text-xs text-slate-400">Cash & Online payments made by building tenants with receipt proofs</p>
        </div>
        <button
          onClick={onOpenAddPayment}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/30 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Payment</span>
        </button>
      </div>

      {/* Aggregate Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">Cash Received</span>
            <div className="text-lg font-black text-amber-400">{formatCurrency(totalCash)}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center space-x-3">
          <div className="p-2.5 bg-sky-500/10 rounded-xl text-sky-400">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">Online Received</span>
            <div className="text-lg font-black text-sky-400">{formatCurrency(totalOnline)}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">Total Collected</span>
            <div className="text-lg font-black text-emerald-400">{formatCurrency(grandTotal)}</div>
          </div>
        </div>
      </div>

      {/* Search & Mode Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search payments by receipt #, tenant, bill # or UTR..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
          {(['all', 'cash', 'online', 'mixed'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setModeFilter(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                modeFilter === mode
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-semibold text-sm">No payment records found</p>
          <p className="text-slate-500 text-xs mt-1">
            {searchTerm ? 'Try adjusting your search criteria' : 'Click "Record New Payment" to log cash/online rent receipts'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredPayments.map(p => (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-xl transition flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">{p.paymentNumber}</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(p.paymentDate)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{p.orgName}</span>
                    </h3>
                  </div>

                  {/* Mode Badge */}
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      p.paymentMode === 'cash'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                        : p.paymentMode === 'online'
                        ? 'bg-sky-950 text-sky-400 border border-sky-800/40'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                    }`}
                  >
                    {p.paymentMode === 'mixed' ? 'Cash + Online' : p.paymentMode}
                  </span>
                </div>

                {p.billNumber && (
                  <p className="text-[11px] text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800/30 inline-block mb-2 font-mono">
                    Against: {p.billNumber}
                  </p>
                )}

                {/* Cash & Online Breakdown Box */}
                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 space-y-2 my-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Banknote className="w-4 h-4 text-amber-400" />
                      Paid in Cash:
                    </span>
                    <span className="font-bold text-amber-400 text-sm">
                      {formatCurrency(p.cashAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <CreditCard className="w-4 h-4 text-sky-400" />
                      Paid Online:
                    </span>
                    <span className="font-bold text-sky-400 text-sm">
                      {formatCurrency(p.onlineAmount)}
                    </span>
                  </div>

                  {p.onlineRefNumber && (
                    <div className="text-[11px] text-slate-400 font-mono bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
                      Ref/UTR: <span className="text-slate-200">{p.onlineRefNumber}</span>
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between">
                    <span className="font-bold text-slate-200">Total Received:</span>
                    <span className="font-black text-emerald-400 text-base">
                      {formatCurrency(p.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {p.notes && (
                  <p className="text-[11px] text-slate-400 italic mb-2">"{p.notes}"</p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  {p.receiptAttachment ? (
                    <button
                      onClick={() => onViewDocument(`Payment Receipt: ${p.paymentNumber}`, p.receiptAttachment!, p.receiptAttachmentName, p.receiptAttachmentType)}
                      className="flex items-center space-x-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-800/40"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>View Receipt Photo</span>
                    </button>
                  ) : (
                    <span className="text-slate-600 text-[10px]">No receipt photo</span>
                  )}
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => generatePaymentReceiptPDF(p, profile)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="Download Receipt PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                  </button>

                  <button
                    onClick={() => handleDeletePayment(p)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-500 hover:text-red-400 transition"
                    title="Delete payment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
