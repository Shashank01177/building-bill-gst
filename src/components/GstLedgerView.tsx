import React, { useState } from 'react';
import { 
  Receipt, 
  Search, 
  Plus, 
  Download, 
  Trash2, 
  Paperclip, 
  Camera, 
  Eye, 
  X,
  ShieldCheck,
  Building,
  TrendingDown,
  Landmark
} from 'lucide-react';
import { GstExpenseRecord, Invoice, BuildingProfile, BillAttachment } from '../types';
import { StorageService } from '../services/storage';
import { PdfService } from '../services/pdfService';

interface Props {
  gstExpenses: GstExpenseRecord[];
  invoices: Invoice[];
  profile: BuildingProfile;
  onRefresh: () => void;
  onViewAttachment: (att: BillAttachment) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
}

export const GstLedgerView: React.FC<Props> = ({
  gstExpenses,
  invoices,
  profile,
  onRefresh,
  onViewAttachment,
  isCreateModalOpen,
  setIsCreateModalOpen,
}) => {
  const curr = profile.currencySymbol || '₹';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'EXPENSE_GST' | 'GOVT_CHALLAN_PAYMENT'>('ALL');

  // Form state
  const [recordType, setRecordType] = useState<GstExpenseRecord['recordType']>('EXPENSE_GST');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [vendorOrAuthority, setVendorOrAuthority] = useState<string>('');
  const [billOrChallanNumber, setBillOrChallanNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<GstExpenseRecord['category']>('MAINTENANCE');
  const [taxableAmount, setTaxableAmount] = useState<number>(0);
  const [cgst, setCgst] = useState<number>(0);
  const [sgst, setSgst] = useState<number>(0);
  const [igst, setIgst] = useState<number>(0);
  const [isInterState, setIsInterState] = useState<boolean>(false);
  const [paymentMode, setPaymentMode] = useState<GstExpenseRecord['paymentMode']>('ONLINE');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [pendingAttachments, setPendingAttachments] = useState<BillAttachment[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Auto calculate GST if taxable amount is typed (18% default)
  const handleTaxableChange = (val: number) => {
    setTaxableAmount(val);
    const gst = (val * (profile.defaultGstRate || 18)) / 100;
    if (isInterState) {
      setIgst(gst);
      setCgst(0);
      setSgst(0);
    } else {
      setCgst(gst / 2);
      setSgst(gst / 2);
      setIgst(0);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const newAtts: BillAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const att = await StorageService.fileToAttachment(files[i]);
        newAtts.push(att);
      }
      setPendingAttachments([...pendingAttachments, ...newAtts]);
    } catch (err) {
      console.error(err);
      alert('Error uploading GST bill / challan document');
    } finally {
      setIsUploading(false);
    }
  };

  const totalGstPaid = (Number(cgst) || 0) + (Number(sgst) || 0) + (Number(igst) || 0);
  const totalAmount = (Number(taxableAmount) || 0) + totalGstPaid;

  const handleSaveGstRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorOrAuthority) {
      alert('Please enter Vendor / Authority name.');
      return;
    }
    if (totalGstPaid <= 0 && recordType === 'GOVT_CHALLAN_PAYMENT') {
      alert('Please enter the GST tax amount paid.');
      return;
    }

    const newRecord: GstExpenseRecord = {
      id: 'gst-' + Date.now(),
      recordType,
      date,
      vendorOrAuthority,
      billOrChallanNumber: billOrChallanNumber || `CH-${Date.now().toString().slice(-6)}`,
      description,
      category: recordType === 'GOVT_CHALLAN_PAYMENT' ? 'CHALLAN_PAYMENT' : category,
      taxableAmount: Number(taxableAmount) || 0,
      cgst: Number(cgst) || 0,
      sgst: Number(sgst) || 0,
      igst: Number(igst) || 0,
      totalGstPaid,
      totalAmount: recordType === 'GOVT_CHALLAN_PAYMENT' ? totalGstPaid : totalAmount,
      paymentMode,
      referenceNumber,
      notes,
      attachments: pendingAttachments,
    };

    StorageService.saveGstExpense(newRecord);
    setIsCreateModalOpen(false);
    setPendingAttachments([]);
    setVendorOrAuthority('');
    setBillOrChallanNumber('');
    setDescription('');
    setTaxableAmount(0);
    setCgst(0);
    setSgst(0);
    setIgst(0);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this GST record?')) {
      StorageService.deleteGstExpense(id);
      onRefresh();
    }
  };

  // Metrics
  const totalOutwardGst = invoices.reduce((sum, inv) => sum + inv.totalGst, 0);
  const expenseRecords = gstExpenses.filter(g => g.recordType === 'EXPENSE_GST');
  const challanRecords = gstExpenses.filter(g => g.recordType === 'GOVT_CHALLAN_PAYMENT');

  const totalExpenseGst = expenseRecords.reduce((sum, g) => sum + g.totalGstPaid, 0);
  const totalChallanPaid = challanRecords.reduce((sum, g) => sum + g.totalGstPaid, 0);
  const netLiability = totalOutwardGst - totalExpenseGst - totalChallanPaid;

  const filteredRecords = gstExpenses.filter(g => {
    const matchesSearch = 
      g.vendorOrAuthority.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.billOrChallanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === 'ALL') return matchesSearch;
    return matchesSearch && g.recordType === filterType;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Receipt className="w-6 h-6 text-amber-400" />
            <span>GST Paid & Tax Ledger</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Store GST bills paid on building maintenance, security, and direct Government GST challans
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => PdfService.generateGstSummaryReportPdf(invoices, gstExpenses, profile)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>GST Report PDF</span>
          </button>
          <button
            onClick={() => {
              setPendingAttachments([]);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-amber-900/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Store GST Bill / Challan</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards for GST Ledger */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Outward GST */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            GST Collected (Bills)
          </span>
          <div className="text-xl font-bold text-indigo-400">
            {curr}{totalOutwardGst.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">From tenant commercial rent</span>
        </div>

        {/* Inward GST */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            GST Paid (Expenses ITC)
          </span>
          <div className="text-xl font-bold text-emerald-400">
            {curr}{totalExpenseGst.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Maintenance, repairs, lift AMC</span>
        </div>

        {/* Govt Challan Paid */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Paid to Govt (Challan)
          </span>
          <div className="text-xl font-bold text-amber-400">
            {curr}{totalChallanPaid.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">GSTR-3B monthly tax deposits</span>
        </div>

        {/* Net Balance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Estimated Net Balance
          </span>
          <div className={`text-xl font-bold ${netLiability > 0 ? 'text-cyan-400' : 'text-emerald-400'}`}>
            {curr}{netLiability.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {netLiability > 0 ? 'Pending tax liability' : 'Tax credit surplus'}
          </span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by vendor, authority, challan #, description..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {(['ALL', 'EXPENSE_GST', 'GOVT_CHALLAN_PAYMENT'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === type
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {type === 'ALL' ? 'All GST Records' : type === 'EXPENSE_GST' ? 'Expense GST (ITC)' : 'Govt Tax Challans'}
            </button>
          ))}
        </div>
      </div>

      {/* Records Grid */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800">
          <Receipt className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-slate-300 font-medium">No GST records found</p>
          <p className="text-xs text-slate-500 mt-1">Store GST paid on building expenses or GST challan receipts</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map(r => (
            <div
              key={r.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      r.recordType === 'GOVT_CHALLAN_PAYMENT'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {r.recordType === 'GOVT_CHALLAN_PAYMENT' ? 'Govt GST Challan' : 'Vendor Expense (ITC)'}
                    </span>
                    <h2 className="text-base font-bold text-white mt-1.5 leading-snug">{r.vendorOrAuthority}</h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{r.billOrChallanNumber} • {r.date}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-amber-400 block">
                      {curr}{r.totalGstPaid.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 block">GST Paid</span>
                  </div>
                </div>

                {r.description && (
                  <p className="text-xs text-slate-300 my-2">
                    {r.description}
                  </p>
                )}

                {/* Tax Breakdown */}
                <div className="bg-slate-800/60 rounded-xl p-3 my-2 space-y-1 text-xs">
                  {r.taxableAmount > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Taxable Value:</span>
                      <span className="text-slate-200">{curr}{r.taxableAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {r.cgst > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>CGST:</span>
                      <span className="text-amber-400">{curr}{r.cgst.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {r.sgst > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>SGST:</span>
                      <span className="text-amber-400">{curr}{r.sgst.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {r.igst > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>IGST:</span>
                      <span className="text-amber-400">{curr}{r.igst.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-700/60">
                    <span>Total Amount Paid:</span>
                    <span>{curr}{r.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Stored GST Bill / Challan Attachment */}
                {r.attachments && r.attachments.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center space-x-1">
                      <Paperclip className="w-3 h-3 text-amber-400" />
                      <span>Stored GST Bill Document ({r.attachments.length})</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.attachments.map(att => (
                        <button
                          key={att.id}
                          onClick={() => onViewAttachment(att)}
                          className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] border border-slate-700 truncate max-w-full"
                        >
                          <Eye className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{att.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-400 mt-2">
                <span>Mode: {r.paymentMode} {r.referenceNumber ? `(${r.referenceNumber})` : ''}</span>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Delete Record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record GST Bill / Challan Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 text-white">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold">Store GST Paid Bill / Challan</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGstRecord} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Record Type Picker */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setRecordType('EXPENSE_GST')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    recordType === 'EXPENSE_GST'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Building Maintenance GST (ITC)
                </button>
                <button
                  type="button"
                  onClick={() => setRecordType('GOVT_CHALLAN_PAYMENT')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    recordType === 'GOVT_CHALLAN_PAYMENT'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Govt GST Portal Challan
                </button>
              </div>

              {/* Vendor / Authority Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {recordType === 'GOVT_CHALLAN_PAYMENT' ? 'Tax Authority / Portal' : 'Vendor / Service Provider Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={vendorOrAuthority}
                  onChange={e => setVendorOrAuthority(e.target.value)}
                  placeholder={recordType === 'GOVT_CHALLAN_PAYMENT' ? 'e.g. GST Portal / CBIC PMT-06' : 'e.g. Otis Elevator India, SecureGuard Corp, Power Corp'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Bill / Challan Number & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {recordType === 'GOVT_CHALLAN_PAYMENT' ? 'Challan CIN #' : 'Vendor GST Bill / Invoice #'}
                  </label>
                  <input
                    type="text"
                    value={billOrChallanNumber}
                    onChange={e => setBillOrChallanNumber(e.target.value)}
                    placeholder={recordType === 'GOVT_CHALLAN_PAYMENT' ? 'e.g. CIN-26102900018491' : 'e.g. INV/2026/894'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              {/* Category (if expense) */}
              {recordType === 'EXPENSE_GST' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Expense Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="MAINTENANCE">Elevator / DG / Building Maintenance</option>
                    <option value="SECURITY">Security Services</option>
                    <option value="UTILITIES">Electricity / Water Utilities</option>
                    <option value="REPAIRS">Civil, Plumbing & Electrical Repairs</option>
                    <option value="LEGAL">Legal / Professional Accounting</option>
                    <option value="OTHER">Other Commercial Services</option>
                  </select>
                </div>
              )}

              {/* Taxable Amount & GST Calculation */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                {recordType === 'EXPENSE_GST' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Taxable Value ({curr})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={taxableAmount || ''}
                      onChange={e => handleTaxableChange(parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 25000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-semibold"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-amber-300 mb-1">CGST Paid ({curr})</label>
                    <input
                      type="number"
                      min="0"
                      value={cgst || ''}
                      onChange={e => setCgst(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-300 mb-1">SGST Paid ({curr})</label>
                    <input
                      type="number"
                      min="0"
                      value={sgst || ''}
                      onChange={e => setSgst(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-slate-800 text-white">
                  <span>Total GST Paid:</span>
                  <span className="text-amber-400 text-sm">{curr}{totalGstPaid.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="ONLINE">Online (UPI / NEFT)</option>
                    <option value="NET_BANKING">Net Banking (Portal Payment)</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ref / UTR Number</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    placeholder="e.g. UTR-881928"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              {/* Attach GST Bill Photo / Challan PDF */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                  <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                  <span>Store GST Tax Invoice / Challan PDF Document</span>
                </label>
                <label className="block border-2 border-dashed border-slate-700 hover:border-amber-500 bg-slate-950/60 rounded-xl p-3 text-center cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center space-x-2 text-xs text-slate-300">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>{isUploading ? 'Uploading GST document...' : 'Upload or Snap Photo of GST Bill/Challan'}</span>
                  </div>
                </label>

                {pendingAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pendingAttachments.map((att, i) => (
                      <div key={i} className="flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded text-xs text-slate-200">
                        <span className="truncate max-w-[150px]">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => setPendingAttachments(pendingAttachments.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-rose-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Description & Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Monthly lift AMC GST tax paid, input credit claimed"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-amber-900/30"
                >
                  Save & Store GST Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
