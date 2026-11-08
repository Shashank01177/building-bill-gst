import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Trash2, 
  Paperclip, 
  Camera, 
  CheckCircle2, 
  Clock, 
  CreditCard,
  Eye,
  X
} from 'lucide-react';
import { Invoice, Tenant, BuildingProfile, BillAttachment, InvoiceItem } from '../types';
import { StorageService } from '../services/storage';
import { PdfService } from '../services/pdfService';

interface Props {
  invoices: Invoice[];
  tenants: Tenant[];
  profile: BuildingProfile;
  onRefresh: () => void;
  onRecordPaymentForInvoice: (invoice: Invoice) => void;
  onViewAttachment: (att: BillAttachment) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
}

export const InvoicesView: React.FC<Props> = ({
  invoices,
  tenants,
  profile,
  onRefresh,
  onRecordPaymentForInvoice,
  onViewAttachment,
  isCreateModalOpen,
  setIsCreateModalOpen,
}) => {
  const curr = profile.currencySymbol || '₹';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'>('ALL');

  // Form State for New Bill
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [period, setPeriod] = useState<string>(
    new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
  );
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Commercial Space Rent (SAC: 997212)', hsnSac: '997212', amount: 0 },
    { id: '2', description: 'Common Maintenance & DG Backup (SAC: 9987)', hsnSac: '9987', amount: 0 },
  ]);
  const [gstRate, setGstRate] = useState<number>(profile.defaultGstRate || 18);
  const [isInterState, setIsInterState] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [pendingAttachments, setPendingAttachments] = useState<BillAttachment[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Auto-populate rent & maintenance when tenant is selected
  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setItems([
        { id: '1', description: `Commercial Office Rent - ${period} (SAC: 997212)`, hsnSac: '997212', amount: tenant.monthlyRent || 0 },
        { id: '2', description: `Common Maintenance & DG Backup (SAC: 9987)`, hsnSac: '9987', amount: tenant.monthlyMaintenance || 0 },
      ]);
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: 'Electricity / Utility Charges', hsnSac: '9972', amount: 0 }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: 'description' | 'amount' | 'hsnSac', val: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: val } : item));
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
      alert('Error uploading bill document');
    } finally {
      setIsUploading(false);
    }
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalGst = (subtotal * gstRate) / 100;
  const cgst = isInterState ? 0 : totalGst / 2;
  const sgst = isInterState ? 0 : totalGst / 2;
  const igst = isInterState ? totalGst : 0;
  const totalAmount = subtotal + totalGst;

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) {
      alert('Please select a business tenant.');
      return;
    }
    const tenant = tenants.find(t => t.id === selectedTenantId);
    if (!tenant) return;

    const newInvoice: Invoice = {
      id: 'inv-' + Date.now(),
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`,
      tenantId: tenant.id,
      tenantName: tenant.name,
      unitNumber: tenant.unitNumber,
      invoiceDate,
      dueDate,
      period,
      items,
      subtotal,
      gstRate,
      isInterState,
      cgst,
      sgst,
      igst,
      totalGst,
      totalAmount,
      paidAmount: 0,
      balanceDue: totalAmount,
      status: 'UNPAID',
      notes,
      attachments: pendingAttachments,
    };

    StorageService.saveInvoice(newInvoice);
    setIsCreateModalOpen(false);
    setPendingAttachments([]);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this bill record?')) {
      StorageService.deleteInvoice(id);
      onRefresh();
    }
  };

  // Filtered invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.period.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && inv.status === statusFilter;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FileText className="w-6 h-6 text-emerald-400" />
            <span>Sent Bills & Invoices</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Store bills sent to tenants, calculate GST (CGST/SGST), and attach bill files
          </p>
        </div>

        <button
          onClick={() => {
            if (tenants.length === 0) {
              alert('Please add a business tenant first.');
              return;
            }
            setSelectedTenantId(tenants[0]?.id || '');
            handleTenantSelect(tenants[0]?.id || '');
            setPendingAttachments([]);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Generate & Store Bill</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by business name, invoice #, floor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {(['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {status === 'ALL' ? 'All Bills' : status === 'PARTIALLY_PAID' ? 'Partial' : status === 'PAID' ? 'Paid' : 'Unpaid'}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List Grid */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800">
          <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-slate-300 font-medium">No sent bills found matching your filter</p>
          <p className="text-xs text-slate-500 mt-1">Generate a new bill to store tenant rent & maintenance</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvoices.map(inv => {
            const tenant = tenants.find(t => t.id === inv.tenantId);
            return (
              <div
                key={inv.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                        {inv.invoiceNumber}
                      </span>
                      <h2 className="text-base font-bold text-white mt-1.5 leading-snug">{inv.tenantName}</h2>
                      <p className="text-xs text-slate-400">{inv.unitNumber} • {inv.period}</p>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                      inv.status === 'PAID'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : inv.status === 'PARTIALLY_PAID'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {inv.status === 'PAID' ? 'Fully Paid' : inv.status === 'PARTIALLY_PAID' ? 'Partial' : 'Unpaid'}
                    </span>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="bg-slate-800/60 rounded-xl p-3 my-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Taxable Value:</span>
                      <span className="text-slate-200">{curr}{inv.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>GST ({inv.gstRate}% - CGST+SGST):</span>
                      <span className="text-indigo-400 font-medium">+{curr}{inv.totalGst.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-700/60">
                      <span>Total Invoice:</span>
                      <span className="text-sm">{curr}{inv.totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                    {inv.paidAmount > 0 && (
                      <div className="flex justify-between text-emerald-400 pt-1">
                        <span>Paid:</span>
                        <span>{curr}{inv.paidAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {inv.balanceDue > 0 && (
                      <div className="flex justify-between text-rose-400 font-semibold">
                        <span>Balance Due:</span>
                        <span>{curr}{inv.balanceDue.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>

                  {/* Attachments Section */}
                  {inv.attachments && inv.attachments.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center space-x-1">
                        <Paperclip className="w-3 h-3 text-emerald-400" />
                        <span>Stored Bill Documents ({inv.attachments.length})</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {inv.attachments.map(att => (
                          <button
                            key={att.id}
                            onClick={() => onViewAttachment(att)}
                            className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] border border-slate-700 truncate max-w-full"
                          >
                            <Eye className="w-3 h-3 text-indigo-400 shrink-0" />
                            <span className="truncate">{att.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="border-t border-slate-800 pt-3 flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => PdfService.generateInvoicePdf(inv, tenant, profile)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Download PDF Tax Invoice"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete Bill Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {inv.balanceDue > 0 && (
                    <button
                      onClick={() => onRecordPaymentForInvoice(inv)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md active:scale-95 transition-all"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Generate & Store New Bill */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 text-white">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold">Generate & Store Tenant Bill</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Tenant Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Business Organisation / Tenant *
                </label>
                <select
                  value={selectedTenantId}
                  onChange={e => handleTenantSelect(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Tenant Business</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.unitNumber}) - GST: {t.gstin || 'None'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Billing Period & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Billing Period</label>
                  <input
                    type="text"
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    placeholder="e.g. November 2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300">Bill Particulars / Line Items</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex items-center space-x-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Particulars (e.g. Office Rent, Electricity)"
                          value={item.description}
                          onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                          className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="text"
                          placeholder="SAC"
                          value={item.hsnSac}
                          onChange={e => handleItemChange(item.id, 'hsnSac', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 font-mono text-center"
                        />
                      </div>
                      <div className="w-28 flex items-center">
                        <span className="text-xs text-slate-400 mr-1">{curr}</span>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={item.amount || ''}
                          onChange={e => handleItemChange(item.id, 'amount', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white text-right font-semibold"
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* GST Settings & Summary Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <label className="text-xs font-semibold text-slate-300">GST Rate:</label>
                    <select
                      value={gstRate}
                      onChange={e => setGstRate(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-white"
                    >
                      <option value={18}>18% (9% CGST + 9% SGST)</option>
                      <option value={12}>12% (6% CGST + 6% SGST)</option>
                      <option value={5}>5% (2.5% CGST + 2.5% SGST)</option>
                      <option value={0}>0% (Exempt)</option>
                    </select>
                  </div>

                  <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInterState}
                      onChange={e => setIsInterState(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-emerald-500"
                    />
                    <span>Inter-state (IGST)</span>
                  </label>
                </div>

                <div className="border-t border-slate-800/80 pt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Taxable Subtotal:</span>
                    <span>{curr}{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {isInterState ? (
                    <div className="flex justify-between text-indigo-400">
                      <span>IGST ({gstRate}%):</span>
                      <span>+{curr}{igst.toLocaleString('en-IN')}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-indigo-400">
                        <span>CGST ({gstRate / 2}%):</span>
                        <span>+{curr}{cgst.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-indigo-400">
                        <span>SGST ({gstRate / 2}%):</span>
                        <span>+{curr}{sgst.toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold text-base text-white pt-1 border-t border-slate-800">
                    <span>Total Billed Amount:</span>
                    <span className="text-emerald-400">{curr}{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Attach Bill Document / Photo (Camera & File Picker) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                  <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Store Bill Document / Photo Copy (Optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950/60 rounded-xl p-3 text-center cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center space-x-2 text-xs text-slate-300">
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>{isUploading ? 'Attaching file...' : 'Upload or Take Photo of Bill'}</span>
                    </div>
                  </label>
                </div>

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

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Sent via WhatsApp, meter reading units included"
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-900/30"
                >
                  Save & Store Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
