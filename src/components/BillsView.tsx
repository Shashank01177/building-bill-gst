import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Download, 
  Share2, 
  Wallet, 
  Trash2, 
  Calendar,
  Building2,
  Paperclip,
  CheckCircle,
  Clock,
  AlertTriangle,
  X
} from 'lucide-react';
import { db, type Bill, type BuildingProfile } from '../db';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generateBillPDF } from '../utils/pdfGenerator';

interface BillsViewProps {
  bills: Bill[];
  profile: BuildingProfile | null;
  onOpenAddBill: () => void;
  onOpenAddPayment: (billId: number) => void;
  onViewDocument: (title: string, fileData: string, fileName?: string, fileType?: string) => void;
  onRefresh: () => void;
}

export const BillsView: React.FC<BillsViewProps> = ({
  bills,
  profile,
  onOpenAddBill,
  onOpenAddPayment,
  onViewDocument,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');

  const filteredBills = bills.filter(b => {
    const matchesSearch = b.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.orgName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.billingMonth.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && b.status === statusFilter;
  });

  const handleDeleteBill = async (id: number) => {
    if (confirm('Are you sure you want to delete this bill? This cannot be undone.')) {
      await db.bills.delete(id);
      onRefresh();
    }
  };

  const handleShareWhatsApp = (b: Bill) => {
    const text = `*Invoice / Bill from ${profile?.buildingName || 'Building Management'}*
Bill No: ${b.billNumber}
Period: ${b.billingMonth}
Tenant: ${b.orgName}
Total Amount: ${formatCurrency(b.totalAmount)}
Paid Amount: ${formatCurrency(b.paidAmount)}
*Balance Due: ${formatCurrency(b.balanceAmount)}*
Due Date: ${formatDate(b.dueDate)}

Please make payment via Cash or Online:
${profile?.upiId ? `UPI ID: ${profile.upiId}` : ''}
${profile?.accountNumber ? `A/C: ${profile.accountNumber} (IFSC: ${profile.ifscCode})` : ''}

Thank you!`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-5 pb-20 animate-fade-in">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <span>Bills & Invoices Sent</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage outgoing rent & utility bills issued to tenant businesses</p>
        </div>
        <button
          onClick={onOpenAddBill}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Bill</span>
        </button>
      </div>

      {/* Search & Segmented Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by bill number, tenant or month..."
            className="w-full bg-slate-900/80 border border-white/10 rounded-2xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-md transition"
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

        {/* Segmented Filter Pills */}
        <div className="flex bg-slate-900/80 border border-white/10 rounded-2xl p-1 shrink-0 backdrop-blur-md overflow-x-auto">
          {(['all', 'unpaid', 'partial', 'paid'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all duration-200 ${
                statusFilter === tab
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Bills Cards Grid */}
      {filteredBills.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center">
          <FileText className="w-12 h-12 text-slate-600 mb-3" />
          <h4 className="text-white font-bold text-base">No bills found</h4>
          <p className="text-slate-400 text-xs mt-1 max-w-sm">
            {searchTerm ? 'Try searching with a different keyword.' : 'Start by clicking "New Bill" to generate an invoice for your tenants.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBills.map(b => {
            const isFullyPaid = b.balanceAmount <= 0;
            const isPartial = b.paidAmount > 0 && b.balanceAmount > 0;
            const paidPct = b.totalAmount > 0 ? Math.round((b.paidAmount / b.totalAmount) * 100) : 0;

            return (
              <div
                key={b.id}
                className="glass-card rounded-3xl p-5 flex flex-col justify-between border-white/[0.08] hover:border-white/20 transition-all duration-200"
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-black text-white text-sm shrink-0 shadow-lg shadow-indigo-600/20">
                        {b.orgName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-indigo-400">{b.billNumber}</span>
                          <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full font-medium">
                            {b.billingMonth}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-white mt-0.5 truncate max-w-[200px] sm:max-w-xs">
                          {b.orgName}
                        </h3>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
                        isFullyPaid
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : isPartial
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  {/* Financial Breakdown Box */}
                  <div className="rounded-2xl p-3.5 bg-black/20 border border-white/5 space-y-2 text-xs mb-3">
                    <div className="flex justify-between text-slate-400">
                      <span>Base Charges:</span>
                      <span className="text-slate-200 font-semibold">{formatCurrency(b.subtotal)}</span>
                    </div>

                    {b.gstRate > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span>GST ({b.gstRate}%):</span>
                        <span className="text-purple-300 font-semibold">
                          +{formatCurrency(b.cgstAmount + b.sgstAmount + b.igstAmount)}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/10 flex justify-between font-black text-white text-sm">
                      <span>Total Invoice:</span>
                      <span className="text-white">{formatCurrency(b.totalAmount)}</span>
                    </div>

                    {/* Payment Progress Bar */}
                    <div className="pt-1">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-emerald-400 font-semibold">Paid: {formatCurrency(b.paidAmount)}</span>
                        <span className={b.balanceAmount > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                          Due: {formatCurrency(b.balanceAmount)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFullyPaid ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-400 to-emerald-400'
                          }`}
                          style={{ width: `${paidPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Due Date & Proof Attachment Pill */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <div className="flex items-center space-x-1.5 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Due: {formatDate(b.dueDate)}</span>
                    </div>

                    {b.billAttachment ? (
                      <button
                        onClick={() => onViewDocument(`Bill: ${b.billNumber}`, b.billAttachment!, b.billAttachmentName, b.billAttachmentType)}
                        className="flex items-center space-x-1 text-[11px] text-indigo-300 hover:text-indigo-200 font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded-lg border border-indigo-500/20 transition"
                      >
                        <Paperclip className="w-3 h-3" />
                        <span>View Attachment</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-600">No attached file</span>
                    )}
                  </div>
                </div>

                {/* Bottom Action Ribbon */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    {/* PDF Generator */}
                    <button
                      onClick={() => generateBillPDF(b, profile)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-indigo-400 hover:text-indigo-300 transition active:scale-95"
                      title="Download PDF Tax Invoice"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* WhatsApp */}
                    <button
                      onClick={() => handleShareWhatsApp(b)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition active:scale-95"
                      title="Share Bill on WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteBill(b.id!)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-rose-400 transition active:scale-95"
                      title="Delete Bill"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Record Payment Button */}
                  {b.balanceAmount > 0 && (
                    <button
                      onClick={() => onOpenAddPayment(b.id!)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 transition active:scale-95"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Record Pay</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
