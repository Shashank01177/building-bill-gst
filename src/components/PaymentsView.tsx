import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Plus, 
  Banknote, 
  Smartphone, 
  Download, 
  Trash2, 
  Paperclip, 
  Camera, 
  Eye, 
  X,
  Building,
  CheckCircle2
} from 'lucide-react';
import { PaymentReceipt, Tenant, Invoice, BuildingProfile, BillAttachment } from '../types';
import { StorageService } from '../services/storage';
import { PdfService } from '../services/pdfService';

interface Props {
  payments: PaymentReceipt[];
  tenants: Tenant[];
  invoices: Invoice[];
  profile: BuildingProfile;
  onRefresh: () => void;
  onViewAttachment: (att: BillAttachment) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  preselectedInvoice?: Invoice | null;
}

export const PaymentsView: React.FC<Props> = ({
  payments,
  tenants,
  invoices,
  profile,
  onRefresh,
  onViewAttachment,
  isCreateModalOpen,
  setIsCreateModalOpen,
  preselectedInvoice,
}) => {
  const curr = profile.currencySymbol || '₹';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'CASH' | 'ONLINE' | 'SPLIT'>('ALL');

  // Form state
  const [selectedTenantId, setSelectedTenantId] = useState<string>(preselectedInvoice?.tenantId || '');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(preselectedInvoice?.id || '');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [onlineAmount, setOnlineAmount] = useState<number>(0);
  const [onlineMode, setOnlineMode] = useState<PaymentReceipt['onlineMode']>('UPI');
  const [onlineReference, setOnlineReference] = useState<string>('');
  const [paymentFor, setPaymentFor] = useState<string>('Rent & Maintenance Payment');
  const [notes, setNotes] = useState<string>('');
  const [pendingAttachments, setPendingAttachments] = useState<BillAttachment[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // When preselected invoice changes
  React.useEffect(() => {
    if (preselectedInvoice) {
      setSelectedTenantId(preselectedInvoice.tenantId);
      setSelectedInvoiceId(preselectedInvoice.id);
      setPaymentFor(`Settlement for ${preselectedInvoice.invoiceNumber} (${preselectedInvoice.period})`);
      setOnlineAmount(preselectedInvoice.balanceDue);
      setCashAmount(0);
    }
  }, [preselectedInvoice]);

  const totalAmount = (Number(cashAmount) || 0) + (Number(onlineAmount) || 0);

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
      alert('Error uploading payment receipt document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) {
      alert('Please select a business tenant.');
      return;
    }
    if (totalAmount <= 0) {
      alert('Please enter a valid Cash or Online payment amount.');
      return;
    }

    const tenant = tenants.find(t => t.id === selectedTenantId);
    if (!tenant) return;

    const linkedInvoice = invoices.find(i => i.id === selectedInvoiceId);

    const newPayment: PaymentReceipt = {
      id: 'pay-' + Date.now(),
      receiptNumber: `REC-${new Date().getFullYear()}-${String(payments.length + 1).padStart(3, '0')}`,
      tenantId: tenant.id,
      tenantName: tenant.name,
      unitNumber: tenant.unitNumber,
      invoiceId: linkedInvoice ? linkedInvoice.id : undefined,
      invoiceNumber: linkedInvoice ? linkedInvoice.invoiceNumber : undefined,
      paymentDate,
      cashAmount: Number(cashAmount) || 0,
      onlineAmount: Number(onlineAmount) || 0,
      totalAmount,
      onlineMode: onlineAmount > 0 ? onlineMode : undefined,
      onlineReference: onlineAmount > 0 ? onlineReference : undefined,
      paymentFor,
      notes,
      attachments: pendingAttachments,
    };

    StorageService.savePayment(newPayment);
    setIsCreateModalOpen(false);
    setPendingAttachments([]);
    setCashAmount(0);
    setOnlineAmount(0);
    setOnlineReference('');
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this payment receipt?')) {
      StorageService.deletePayment(id);
      onRefresh();
    }
  };

  // Filtered payments
  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      p.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.onlineReference && p.onlineReference.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filterMode === 'CASH') return matchesSearch && p.cashAmount > 0 && p.onlineAmount === 0;
    if (filterMode === 'ONLINE') return matchesSearch && p.onlineAmount > 0 && p.cashAmount === 0;
    if (filterMode === 'SPLIT') return matchesSearch && p.cashAmount > 0 && p.onlineAmount > 0;
    return matchesSearch;
  });

  const tenantInvoices = invoices.filter(i => i.tenantId === selectedTenantId && i.balanceDue > 0);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <CreditCard className="w-6 h-6 text-indigo-400" />
            <span>Payment Bills & Receipts</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Store payments received with dual Cash and Online breakdown & receipt attachments
          </p>
        </div>

        <button
          onClick={() => {
            if (tenants.length === 0) {
              alert('Please add a business tenant first.');
              return;
            }
            setSelectedTenantId(tenants[0]?.id || '');
            setSelectedInvoiceId('');
            setCashAmount(0);
            setOnlineAmount(0);
            setPendingAttachments([]);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-900/30 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Payment</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by business, receipt #, UTR / ref..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {(['ALL', 'CASH', 'ONLINE', 'SPLIT'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterMode === mode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {mode === 'ALL' ? 'All Payments' : mode === 'CASH' ? 'Cash Only' : mode === 'ONLINE' ? 'Online Only' : 'Split (Cash + Online)'}
            </button>
          ))}
        </div>
      </div>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800">
          <CreditCard className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-slate-300 font-medium">No payment records found</p>
          <p className="text-xs text-slate-500 mt-1">Record tenant payments to store cash, online, and receipt bills</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPayments.map(p => (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
                      {p.receiptNumber}
                    </span>
                    <h2 className="text-base font-bold text-white mt-1.5 leading-snug">{p.tenantName}</h2>
                    <p className="text-xs text-slate-400">{p.unitNumber} • {p.paymentDate}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-emerald-400 block">
                      +{curr}{p.totalAmount.toLocaleString('en-IN')}
                    </span>
                    {p.invoiceNumber && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Against {p.invoiceNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cash vs Online Split Cards */}
                <div className="grid grid-cols-2 gap-2 my-3">
                  <div className={`p-2.5 rounded-xl border ${
                    p.cashAmount > 0 
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' 
                      : 'bg-slate-800/40 border-slate-800 text-slate-500'
                  }`}>
                    <div className="flex items-center space-x-1.5 text-xs font-semibold">
                      <Banknote className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cash Paid</span>
                    </div>
                    <div className="text-sm font-bold mt-1">
                      {p.cashAmount > 0 ? `${curr}${p.cashAmount.toLocaleString('en-IN')}` : '₹0'}
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${
                    p.onlineAmount > 0 
                      ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' 
                      : 'bg-slate-800/40 border-slate-800 text-slate-500'
                  }`}>
                    <div className="flex items-center space-x-1.5 text-xs font-semibold">
                      <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Online Paid</span>
                    </div>
                    <div className="text-sm font-bold mt-1">
                      {p.onlineAmount > 0 ? `${curr}${p.onlineAmount.toLocaleString('en-IN')}` : '₹0'}
                    </div>
                  </div>
                </div>

                {/* Reference & Notes */}
                {p.onlineAmount > 0 && p.onlineReference && (
                  <div className="bg-slate-950/80 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono mb-2 flex items-center justify-between border border-slate-800">
                    <span className="text-slate-400 text-[11px]">{p.onlineMode || 'ONLINE'}:</span>
                    <span className="text-cyan-400 truncate max-w-[170px]">{p.onlineReference}</span>
                  </div>
                )}

                {p.paymentFor && (
                  <p className="text-xs text-slate-400 mb-2 italic">
                    "{p.paymentFor}"
                  </p>
                )}

                {/* Stored Payment Receipts / Bills */}
                {p.attachments && p.attachments.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center space-x-1">
                      <Paperclip className="w-3 h-3 text-indigo-400" />
                      <span>Stored Payment Bills ({p.attachments.length})</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.attachments.map(att => (
                        <button
                          key={att.id}
                          onClick={() => onViewAttachment(att)}
                          className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] border border-slate-700 truncate max-w-full"
                        >
                          <Eye className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="truncate">{att.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="border-t border-slate-800 pt-3 flex items-center justify-between gap-2 mt-2">
                <button
                  onClick={() => PdfService.generatePaymentReceiptPdf(p, profile)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Receipt</span>
                </button>

                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Delete Payment Record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Payment Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 text-white">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold">Record Tenant Payment & Store Bill</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Select Tenant */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Business Organisation / Tenant *
                </label>
                <select
                  value={selectedTenantId}
                  onChange={e => {
                    setSelectedTenantId(e.target.value);
                    setSelectedInvoiceId('');
                  }}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Tenant</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.unitNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Link Invoice (Optional) */}
              {selectedTenantId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Apply Towards Pending Bill (Optional)
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={e => {
                      setSelectedInvoiceId(e.target.value);
                      const inv = invoices.find(i => i.id === e.target.value);
                      if (inv) {
                        setPaymentFor(`Settlement for ${inv.invoiceNumber} (${inv.period})`);
                        setOnlineAmount(inv.balanceDue);
                        setCashAmount(0);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">General Payment / Advance</option>
                    {tenantInvoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.period} (Due: {curr}{inv.balanceDue.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Payment Date & Purpose */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment For</label>
                  <input
                    type="text"
                    value={paymentFor}
                    onChange={e => setPaymentFor(e.target.value)}
                    placeholder="e.g. Rent & Maintenance - Nov 2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              {/* DUAL PAYMENT SPLIT: Cash and Online Inputs */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Payment Method Breakdown
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    Total: {curr}{totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* 1. Cash Input */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                  <label className="block text-xs font-semibold text-amber-300 mb-1.5 flex items-center space-x-1.5">
                    <Banknote className="w-4 h-4 text-amber-400" />
                    <span>Amount Paid in Cash ({curr})</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter cash amount"
                    value={cashAmount || ''}
                    onChange={e => setCashAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-base font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Physical currency collected at premises</p>
                </div>

                {/* 2. Online Input */}
                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-cyan-300 mb-1.5 flex items-center space-x-1.5">
                      <Smartphone className="w-4 h-4 text-cyan-400" />
                      <span>Amount Paid Online ({curr})</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Enter online amount"
                      value={onlineAmount || ''}
                      onChange={e => setOnlineAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-base font-bold text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  {onlineAmount > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Online Mode</label>
                        <select
                          value={onlineMode}
                          onChange={e => setOnlineMode(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                          <option value="NEFT_RTGS">NEFT / RTGS</option>
                          <option value="IMPS">IMPS</option>
                          <option value="NET_BANKING">Net Banking Transfer</option>
                          <option value="CHEQUE">Cheque Deposit</option>
                          <option value="CARD">Card Payment</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Transaction Ref / UTR / Cheque #
                        </label>
                        <input
                          type="text"
                          value={onlineReference}
                          onChange={e => setOnlineReference(e.target.value)}
                          placeholder="e.g. UTR-928172810"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Attach Payment Receipt / Bank Bill Photo */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Store Payment Bill / Deposit Slip / UPI Screenshot</span>
                </label>
                <label className="block border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 rounded-xl p-3 text-center cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center space-x-2 text-xs text-slate-300">
                    <Camera className="w-4 h-4 text-indigo-400" />
                    <span>{isUploading ? 'Uploading receipt...' : 'Upload or Snap Photo of Payment Bill'}</span>
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

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Remarks</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Cash collected by manager, receipt given"
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-900/30"
                >
                  Save & Store Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
