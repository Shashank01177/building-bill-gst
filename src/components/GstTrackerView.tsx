import React, { useState } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Percent, 
  Paperclip, 
  Trash2, 
  TrendingDown, 
  TrendingUp,
  Download,
  Calendar,
  X
} from 'lucide-react';
import { db, type GstExpense, type Bill } from '../db';
import { formatCurrency, formatDate } from '../utils/formatters';

interface GstTrackerViewProps {
  bills: Bill[];
  gstExpenses: GstExpense[];
  onOpenAddGstExpense: () => void;
  onViewDocument: (title: string, fileData: string, fileName?: string, fileType?: string) => void;
  onRefresh: () => void;
}

export const GstTrackerView: React.FC<GstTrackerViewProps> = ({
  bills,
  gstExpenses,
  onOpenAddGstExpense,
  onViewDocument,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Compute GST Figures
  const outputCgst = bills.reduce((s, b) => s + (b.cgstAmount || 0), 0);
  const outputSgst = bills.reduce((s, b) => s + (b.sgstAmount || 0), 0);
  const outputIgst = bills.reduce((s, b) => s + (b.igstAmount || 0), 0);
  const totalOutputGst = outputCgst + outputSgst + outputIgst;

  const totalInputGstPaid = gstExpenses.reduce((s, g) => s + (g.gstAmount || 0), 0);
  const netGstPayable = totalOutputGst - totalInputGstPaid;

  const filteredExpenses = gstExpenses.filter(e => {
    const matchesSearch = e.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.vendorGstin && e.vendorGstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.invoiceNumber && e.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    if (categoryFilter === 'all') return matchesSearch;
    return matchesSearch && e.category === categoryFilter;
  });

  const handleDeleteExpense = async (id: number) => {
    if (confirm('Are you sure you want to delete this GST expense record?')) {
      await db.gstExpenses.delete(id);
      onRefresh();
    }
  };

  const handleExportCsv = () => {
    let csv = 'Date,Vendor,GSTIN,Category,Bill No,Taxable Amount,GST Rate,GST Paid,Total Amount,Payment Mode,Ref\n';
    gstExpenses.forEach(e => {
      csv += `"${e.date}","${e.vendorName}","${e.vendorGstin || ''}","${e.category}","${e.invoiceNumber || ''}",${e.taxableAmount},${e.gstRate}%,${e.gstAmount},${e.totalAmount},"${e.paymentMethod}","${e.onlineRef || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GST_Paid_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 pb-20 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <span>GST Center & Input Credit</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Track GST collected on tenant rents vs GST paid on building expenses</p>
        </div>
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition active:scale-95 border border-white/10"
            title="Export CSV for your CA / Accountant"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onOpenAddGstExpense}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Record GST Paid</span>
          </button>
        </div>
      </div>

      {/* GST Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Output GST Collected */}
        <div className="glass-card rounded-2xl p-4 border-emerald-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">Output GST Collected</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{formatCurrency(totalOutputGst)}</div>
          <div className="mt-2 text-[11px] text-slate-400">
            From tenant invoices (CGST: {formatCurrency(outputCgst)}, SGST: {formatCurrency(outputSgst)})
          </div>
        </div>

        {/* Input GST Paid on Building */}
        <div className="glass-card rounded-2xl p-4 border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Input GST Paid (ITC)</span>
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400">{formatCurrency(totalInputGstPaid)}</div>
          <div className="mt-2 text-[11px] text-slate-400">
            Tax paid on lift AMC, repairs, security & maintenance
          </div>
        </div>

        {/* Net GST Payable */}
        <div className="glass-card rounded-2xl p-4 border-purple-500/20 bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-300 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">Net Tax Liability</span>
            <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${netGstPayable >= 0 ? 'text-purple-300' : 'text-emerald-400'}`}>
            {formatCurrency(Math.abs(netGstPayable))}
          </div>
          <div className="mt-2 text-[11px] text-slate-300">
            {netGstPayable >= 0 ? 'Net Tax to Pay to Government' : 'Excess Input Tax Credit to Carry Forward'}
          </div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search vendor, description, GSTIN or bill number..."
            className="w-full bg-slate-900/80 border border-white/10 rounded-2xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 backdrop-blur-md transition"
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

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none shrink-0 backdrop-blur-md"
        >
          <option value="all">All Expense Categories</option>
          <option value="maintenance">Maintenance</option>
          <option value="repairs">Repairs & Renovation</option>
          <option value="lift">Lift / Elevator AMC</option>
          <option value="electricity">Electrical & Generator</option>
          <option value="security">Security & CCTV</option>
          <option value="cleaning">Housekeeping / Cleaning</option>
          <option value="other">Other Work</option>
        </select>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center">
          <Receipt className="w-12 h-12 text-slate-600 mb-3" />
          <h4 className="text-white font-bold text-base">No GST expenses recorded</h4>
          <p className="text-slate-400 text-xs mt-1 max-w-sm">
            {searchTerm ? 'Try adjusting your search criteria.' : 'Click "Record GST Paid" to log GST bills paid on building work.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExpenses.map(e => (
            <div
              key={e.id}
              className="glass-card rounded-3xl p-5 flex flex-col justify-between border-white/[0.08] hover:border-white/20 transition-all duration-200"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-amber-400 capitalize bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                        {e.category}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3" />
                        {formatDate(e.date)}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1.5">{e.vendorName}</h3>
                    {e.vendorGstin && (
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        GSTIN: <span className="text-slate-300 font-semibold">{e.vendorGstin}</span>
                      </p>
                    )}
                  </div>

                  <span className="text-xs font-mono font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-xl">
                    {e.invoiceNumber || 'No Bill #'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-3">{e.description}</p>

                {/* Amount details card */}
                <div className="rounded-2xl p-3.5 bg-black/20 border border-white/5 space-y-1.5 text-xs mb-3">
                  <div className="flex justify-between text-slate-400">
                    <span>Taxable Base Amount:</span>
                    <span className="text-slate-200 font-semibold">{formatCurrency(e.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between text-amber-400 font-semibold">
                    <span>GST Paid ({e.gstRate}% ITC):</span>
                    <span>+{formatCurrency(e.gstAmount)}</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between font-black text-white text-sm">
                    <span>Total Amount Paid:</span>
                    <span className="text-emerald-400">{formatCurrency(e.totalAmount)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between pt-0.5">
                    <span>Payment Method:</span>
                    <span className="capitalize text-slate-200 font-semibold">
                      {e.paymentMethod} {e.onlineRef ? `(${e.onlineRef})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <div>
                  {e.billAttachment ? (
                    <button
                      onClick={() => onViewDocument(`GST Bill: ${e.vendorName}`, e.billAttachment!, e.billAttachmentName)}
                      className="flex items-center space-x-1.5 text-[11px] text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/20 transition"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>View Vendor GST Bill</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-600">No attached bill</span>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteExpense(e.id!)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-rose-400 transition active:scale-95"
                  title="Delete Expense"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
