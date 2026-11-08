import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Download, 
  Share2, 
  Wallet, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Paperclip,
  Calendar,
  Building2
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
    <div className="space-y-4 pb-16">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Bills & Invoices Sent to Tenants
          </h2>
          <p className="text-xs text-slate-400">Track all invoices issued to businesses staying in your building</p>
        </div>
        <button
          onClick={onOpenAddBill}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Bill</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by bill number, tenant or month..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
          {(['all', 'unpaid', 'partial', 'paid'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === tab
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Bills Cards List */}
      {filteredBills.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-semibold text-sm">No bills found</p>
          <p className="text-slate-500 text-xs mt-1">
            {searchTerm ? 'Try adjusting your search criteria' : 'Click "Create New Bill" to generate your first invoice'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredBills.map(b => {
            const isFullyPaid = b.balanceAmount <= 0;
            const isPartial = b.paidAmount > 0 && b.balanceAmount > 0;

            return (
              <div
                key={b.id}
                className="bg-slate-900 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-4 shadow-xl transition flex flex-col justify-between"
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-indigo-400">{b.billNumber}</span>
                        <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                          {b.billingMonth}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">{b.orgName}</span>
                      </h3>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        isFullyPaid
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                          : isPartial
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                          : 'bg-rose-950 text-rose-400 border border-rose-800/50'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  {/* Amounts breakdown */}
                  <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 space-y-1.5 my-2.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Base Charges:</span>
                      <span className="text-slate-300 font-medium">{formatCurrency(b.subtotal)}</span>
                    </div>
                    {b.gstRate > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span>GST ({b.gstRate}%):</span>
                        <span className="text-indigo-300 font-medium">
                          +{formatCurrency(b.cgstAmount + b.sgstAmount + b.igstAmount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-slate-800 font-bold text-white">
                      <span>Total Bill:</span>
                      <span className="text-white">{formatCurrency(b.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 pt-0.5">
                      <span>Amount Paid:</span>
                      <span>{formatCurrency(b.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t border-slate-800">
                      <span className="text-slate-300">Balance Pending:</span>
                      <span className={b.balanceAmount > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        {formatCurrency(b.balanceAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Date & Attachment info */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Due: {formatDate(b.dueDate)}
                    </span>
                    {b.billAttachment ? (
                      <button
                        onClick={() => onViewDocument(`Bill: ${b.billNumber}`, b.billAttachment!, b.billAttachmentName, b.billAttachmentType)}
                        className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 bg-indigo-950/50 px-2 py-0.5 rounded-lg border border-indigo-800/40"
                      >
                        <Paperclip className="w-3 h-3" />
                        <span>View Attached Bill</span>
                      </button>
                    ) : (
                      <span className="text-slate-600 text-[10px]">No attachment</span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Toolbar */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                  <div className="flex items-center space-x-1.5">
                    {/* PDF Generator */}
                    <button
                      onClick={() => generateBillPDF(b, profile)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="Download PDF Tax Invoice"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-400" />
                    </button>

                    {/* WhatsApp */}
                    <button
                      onClick={() => handleShareWhatsApp(b)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 transition"
                      title="Share bill on WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteBill(b.id!)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-500 hover:text-red-400 transition"
                      title="Delete bill"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Record Payment Button */}
                  {b.balanceAmount > 0 && (
                    <button
                      onClick={() => onOpenAddPayment(b.id!)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-700/20 transition"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
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
