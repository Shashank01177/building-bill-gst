import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Camera, Upload, CheckCircle2, FileText } from 'lucide-react';
import { db, type Bill, type Organization } from '../db';
import { compressAndConvertImage, formatCurrency } from '../utils/formatters';

interface AddBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizations: Organization[];
  onBillCreated: () => void;
  initialOrgId?: number;
}

export const AddBillModal: React.FC<AddBillModalProps> = ({
  isOpen,
  onClose,
  organizations,
  onBillCreated,
  initialOrgId
}) => {
  const [orgId, setOrgId] = useState<number | ''>(initialOrgId || '');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [billingMonth, setBillingMonth] = useState('');
  const [gstRate, setGstRate] = useState<number>(18);
  const [isInterstate, setIsInterstate] = useState<boolean>(false);
  const [notes, setNotes] = useState('');

  // Bill items
  const [items, setItems] = useState<Array<{ id: string; description: string; amount: number }>>([
    { id: '1', description: 'Monthly Rent', amount: 0 },
    { id: '2', description: 'Maintenance Charges', amount: 0 }
  ]);

  // Attachment state
  const [attachment, setAttachment] = useState<string | undefined>(undefined);
  const [attachmentName, setAttachmentName] = useState<string | undefined>(undefined);
  const [attachmentType, setAttachmentType] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Auto generate bill number
      const now = new Date();
      const yr = now.getFullYear();
      const rand = Math.floor(100 + Math.random() * 900);
      setBillNumber(`INV-${yr}-${rand}`);

      // Month name
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      setBillingMonth(`${monthNames[now.getMonth()]} ${now.getFullYear()}`);

      // Default due date: 10 days from today
      const due = new Date();
      due.setDate(due.getDate() + 10);
      setDueDate(due.toISOString().split('T')[0]);

      if (initialOrgId) {
        setOrgId(initialOrgId);
        populateOrgDefaultRent(initialOrgId);
      }
    }
  }, [isOpen, initialOrgId]);

  const populateOrgDefaultRent = (selectedId: number) => {
    const org = organizations.find(o => o.id === selectedId);
    if (org) {
      setItems([
        { id: '1', description: `Office Space Rent (${org.unitNo})`, amount: org.monthlyRent || 0 },
        { id: '2', description: 'Building Maintenance & Amenities', amount: org.monthlyMaintenance || 0 }
      ]);
    }
  };

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setOrgId(id);
    if (id) {
      populateOrgDefaultRent(id);
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: '', amount: 0 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'description' | 'amount', value: any) => {
    const updated = [...items];
    if (field === 'amount') {
      updated[index].amount = Math.max(0, Number(value) || 0);
    } else {
      updated[index].description = value;
    }
    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalGst = Math.round((subtotal * gstRate) / 100);
  const totalAmount = subtotal + totalGst;

  const cgstAmount = isInterstate ? 0 : totalGst / 2;
  const sgstAmount = isInterstate ? 0 : totalGst / 2;
  const igstAmount = isInterstate ? totalGst : 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      const base64 = await compressAndConvertImage(file);
      setAttachment(base64);
      setAttachmentName(file.name);
      setAttachmentType(file.type);
    } catch (err: any) {
      setError('Could not process the selected file. Please try another image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      setError('Please select an organisation.');
      return;
    }
    if (subtotal <= 0) {
      setError('Please enter at least one item with an amount greater than 0.');
      return;
    }

    const org = organizations.find(o => o.id === orgId);
    if (!org) return;

    const newBill: Bill = {
      billNumber: billNumber.trim() || `INV-${Date.now()}`,
      orgId: org.id!,
      orgName: org.name,
      billDate,
      dueDate,
      billingMonth,
      items: items.filter(it => it.description.trim() && it.amount > 0),
      subtotal,
      gstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      isInterstate,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      status: 'unpaid',
      notes: notes.trim(),
      billAttachment: attachment,
      billAttachmentName: attachmentName,
      billAttachmentType: attachmentType,
      createdAt: new Date().toISOString()
    };

    await db.bills.add(newBill);
    onBillCreated();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Create & Store Outgoing Bill
            </h2>
            <p className="text-xs text-slate-400">Store bills sent to tenant businesses in your building</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-800 text-red-200 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Org & Bill Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Business Organisation / Tenant *
              </label>
              <select
                value={orgId}
                onChange={handleOrgChange}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Select Organisation --</option>
                {organizations.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.unitNo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Bill / Invoice Number *
              </label>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                placeholder="e.g. INV-2026-001"
              />
            </div>
          </div>

          {/* Dates & Month */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Billing Month / Period
              </label>
              <input
                type="text"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. October 2026"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Bill Date *
              </label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Due Date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Items breakdown */}
          <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Bill Items & Charges
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    placeholder="Description (e.g. Rent, Maintenance, Electricity)"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="w-32 flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5">
                    <span className="text-xs text-slate-400 mr-1">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={item.amount || ''}
                      onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent text-xs sm:text-sm text-white focus:outline-none text-right font-medium"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* GST Controls */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <label className="text-xs font-semibold text-slate-300">GST Rate:</label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium text-white focus:outline-none"
                >
                  <option value={0}>0% (Exempt)</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18% (Standard Commercial Rent)</option>
                  <option value={28}>28%</option>
                </select>
              </div>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInterstate}
                  onChange={(e) => setIsInterstate(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Interstate (IGST)</span>
              </label>
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-2 border-t border-slate-700/60 text-xs space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal (Base Charges):</span>
                <span className="font-semibold text-white">{formatCurrency(subtotal)}</span>
              </div>
              {gstRate > 0 && (
                <>
                  {!isInterstate ? (
                    <>
                      <div className="flex justify-between text-slate-400">
                        <span>CGST ({gstRate / 2}%):</span>
                        <span>{formatCurrency(cgstAmount)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>SGST ({gstRate / 2}%):</span>
                        <span>{formatCurrency(sgstAmount)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-400">
                      <span>IGST ({gstRate}%):</span>
                      <span>{formatCurrency(igstAmount)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-700 text-sm font-bold text-white">
                <span>Total Bill Amount:</span>
                <span className="text-emerald-400 text-base">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Attach Bill Photo or PDF Document */}
          <div className="border border-dashed border-slate-700 rounded-xl p-4 bg-slate-950/30 text-center">
            <input
              type="file"
              id="bill-file-upload"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            {attachment ? (
              <div className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-xl border border-indigo-500/40">
                <div className="flex items-center space-x-2.5 overflow-hidden text-left">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-white truncate">{attachmentName || 'Bill Document'}</p>
                    <p className="text-[10px] text-emerald-400">Ready to store in app</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAttachment(undefined);
                    setAttachmentName(undefined);
                    setAttachmentType(undefined);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="bill-file-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-1.5 py-1 text-slate-400 hover:text-indigo-300 transition"
              >
                <div className="flex items-center space-x-2">
                  <Camera className="w-5 h-5 text-indigo-400" />
                  <Upload className="w-5 h-5 text-indigo-400" />
                </div>
                <span className="text-xs font-medium text-slate-300">
                  {isUploading ? 'Compressing document...' : 'Take Photo or Attach Sent Bill / Invoice'}
                </span>
                <span className="text-[10px] text-slate-500">Supports Camera capture, JPG, PNG & PDF</span>
              </label>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Internal Notes / Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sent via courier & WhatsApp, meter reading: 4520"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Submit buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save & Store Bill</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
