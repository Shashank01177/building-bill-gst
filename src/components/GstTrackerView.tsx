import React, { useState } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Percent, 
  Paperclip, 
  Trash2, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp,
  Download,
  Calendar,
  Layers
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
  const totalExpenseTaxable = gstExpenses.reduce((s, g) => s + (g.taxableAmount || 0), 0);
  const totalExpenseAmount = gstExpenses.reduce((s, g) => s + (g.totalAmount || 0), 0);

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
    <div className="space-y-4 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            GST Center & Input Tax Credit (ITC)
          </h2>
          <p className="text-xs text-slate-400">Track GST collected on tenant bills and GST paid on building expenses</p>
        </div>
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition"
            title="Export GST sheet for accountant"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onOpenAddGstExpense}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record GST Paid</span>
          </button>
        </div>
      </div>

      {/* GST Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Output GST Collected */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Output GST Collected</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">{formatCurrency(totalOutputGst)}</div>
          <div className="mt-1 text-[11px] text-slate-400">
            From tenant invoices (CGST: {formatCurrency(outputCgst)}, SGST: {formatCurrency(outputSgst)})
          </div>
        </div>

        {/* Input GST Paid on Building */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Input GST Paid (ITC)</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400">{formatCurrency(totalInputGstPaid)}</div>
          <div className="mt-1 text-[11px] text-slate-400">
            Tax paid to maintenance, repairs & vendors
          </div>
        </div>

        {/* Net GST Payable */}
        <div className="bg-slate-900 border border-indigo-900/60 rounded-2xl p-4 shadow-xl bg-gradient-to-br from-slate-900 to-indigo-950/60">
          <div className="flex items-center justify-between text-indigo-300 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Net GST Liability</span>
            <Percent className="w-4 h-4 text-indigo-400" />
          </div>
          <div className={`text-xl font-black ${netGstPayable >= 0 ? 'text-indigo-300' : 'text-emerald-400'}`}>
            {formatCurrency(Math.abs(netGstPayable))}
          </div>
          <div className="mt-1 text-[11px] text-slate-300">
            {netGstPayable >= 0 ? 'Net Tax to Pay to Govt' : 'Excess Input Tax Credit to Carry Forward'}
          </div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search vendor, description, GSTIN or bill number..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none shrink-0"
        >
          <option value="all">All Categories</option>
          <option value="maintenance">Maintenance</option>
          <option value="repairs">Repairs & Renovation</option>
          <option value="lift">Lift AMC</option>
          <option value="electricity">Electrical & Generator</option>
          <option value="security">Security</option>
          <option value="cleaning">Cleaning</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-semibold text-sm">No GST expenses recorded</p>
          <p className="text-slate-500 text-xs mt-1">
            {searchTerm ? 'Try adjusting your search query' : 'Click "Record GST Paid" to log GST bills paid on building work'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredExpenses.map(e => (
            <div
              key={e.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-xl transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-amber-400 capitalize bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                        {e.category}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(e.date)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-1.5">{e.vendorName}</h3>
                    {e.vendorGstin && (
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        GSTIN: <span className="text-slate-300">{e.vendorGstin}</span>
                      </p>
                    )}
                  </div>

                  <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {e.invoiceNumber || 'No Bill #'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-2.5">{e.description}</p>

                {/* Amount details */}
                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Taxable Base Amount:</span>
                    <span className="text-slate-300 font-medium">{formatCurrency(e.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between text-amber-400 font-medium">
                    <span>GST Paid ({e.gstRate}% ITC):</span>
                    <span>+{formatCurrency(e.gstAmount)}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-800 flex justify-between font-bold text-white">
                    <span>Total Amount Paid:</span>
                    <span className="text-emerald-400 text-sm">{formatCurrency(e.totalAmount)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between pt-0.5">
                    <span>Payment Mode:</span>
                    <span className="capitalize text-slate-300 font-medium">
                      {e.paymentMethod} {e.onlineRef ? `(${e.onlineRef})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between mt-3">
                <div>
                  {e.billAttachment ? (
                    <button
                      onClick={() => onViewDocument(`GST Bill: ${e.vendorName}`, e.billAttachment!, e.billAttachmentName)}
                      className="flex items-center space-x-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-800/40"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>View Attached GST Bill</span>
                    </button>
                  ) : (
                    <span className="text-slate-600 text-[10px]">No bill photo</span>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteExpense(e.id!)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-500 hover:text-red-400 transition"
                  title="Delete expense"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
