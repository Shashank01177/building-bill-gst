import React, { useState } from 'react';
import { X, Receipt, Camera, Upload, CheckCircle2, Trash2 } from 'lucide-react';
import { db, type GstExpense } from '../db';
import { compressAndConvertImage, formatCurrency } from '../utils/formatters';

interface AddGstExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseCreated: () => void;
}

export const AddGstExpenseModal: React.FC<AddGstExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseCreated
}) => {
  const [vendorName, setVendorName] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<GstExpense['category']>('maintenance');
  const [description, setDescription] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [taxableAmount, setTaxableAmount] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(18);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('online');
  const [onlineRef, setOnlineRef] = useState('');

  // Attachment
  const [attachment, setAttachment] = useState<string | undefined>(undefined);
  const [attachmentName, setAttachmentName] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gstAmount = Math.round((taxableAmount * gstRate) / 100);
  const totalAmount = taxableAmount + gstAmount;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      const base64 = await compressAndConvertImage(file);
      setAttachment(base64);
      setAttachmentName(file.name);
    } catch (err: any) {
      setError('Could not process expense bill file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim() || taxableAmount <= 0) {
      setError('Please provide vendor name and a taxable amount greater than 0.');
      return;
    }

    const newExpense: GstExpense = {
      date,
      vendorName: vendorName.trim(),
      vendorGstin: vendorGstin.trim().toUpperCase() || undefined,
      category,
      description: description.trim() || `${category} expense`,
      invoiceNumber: invoiceNumber.trim() || undefined,
      taxableAmount,
      gstRate,
      gstAmount,
      totalAmount,
      paymentMethod,
      onlineRef: onlineRef.trim() || undefined,
      billAttachment: attachment,
      billAttachmentName: attachmentName,
      createdAt: new Date().toISOString()
    };

    await db.gstExpenses.add(newExpense);
    onExpenseCreated();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f172a]/95 border border-white/10 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Record GST Paid on Building</h2>
              <p className="text-xs text-slate-400">Track Input Tax Credit for maintenance, lift & repairs</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-2xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Vendor / Contractor Name *
              </label>
              <input
                type="text"
                required
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. Otis Elevator, RK Electrician"
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Vendor GSTIN (Optional)
              </label>
              <input
                type="text"
                value={vendorGstin}
                onChange={(e) => setVendorGstin(e.target.value)}
                placeholder="27AAFCO1234F1Z8"
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-semibold"
              >
                <option value="maintenance">Maintenance</option>
                <option value="repairs">Repairs & Renovation</option>
                <option value="lift">Lift / Elevator AMC</option>
                <option value="electricity">Electrical & Generator</option>
                <option value="security">Security & CCTV</option>
                <option value="cleaning">Housekeeping / Cleaning</option>
                <option value="legal">Legal & Professional</option>
                <option value="other">Other Work</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Bill / Inv No.
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="AMC-8491"
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Work Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Quarterly lift servicing AMC, water pump motor replacement"
              className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none"
            />
          </div>

          {/* Amount and GST calculation card */}
          <div className="rounded-3xl p-4 bg-white/[0.02] border border-white/10 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Taxable Amount (₹) *</label>
                <div className="flex items-center bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5">
                  <span className="text-amber-400 font-bold mr-1">₹</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={taxableAmount || ''}
                    onChange={(e) => setTaxableAmount(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-transparent text-sm text-white font-black focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">GST Rate %</label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white font-bold focus:outline-none"
                >
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18% (Standard Services)</option>
                  <option value={28}>28%</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs text-slate-300">
              <span className="font-semibold">GST Amount Paid (ITC Credit):</span>
              <span className="text-amber-400 font-black text-sm">+{formatCurrency(gstAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span className="font-bold text-white">Total Amount Paid to Vendor:</span>
              <span className="text-emerald-400 font-black text-base">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Payment Method</label>
              <div className="flex space-x-3">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="exp-pay"
                    value="online"
                    checked={paymentMethod === 'online'}
                    onChange={() => setPaymentMethod('online')}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span className="font-semibold">Online / Bank</span>
                </label>
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="exp-pay"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={() => setPaymentMethod('cash')}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span className="font-semibold">Cash</span>
                </label>
              </div>
            </div>

            {paymentMethod === 'online' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  UTR / Ref No.
                </label>
                <input
                  type="text"
                  value={onlineRef}
                  onChange={(e) => setOnlineRef(e.target.value)}
                  placeholder="UPI/NEFT Ref"
                  className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Attach Vendor Bill Photo */}
          <div className="border border-dashed border-white/15 rounded-3xl p-4 bg-white/[0.02] text-center">
            <input
              type="file"
              id="gst-file-upload"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            {attachment ? (
              <div className="flex items-center justify-between bg-amber-500/10 p-3 rounded-2xl border border-amber-500/30">
                <div className="flex items-center space-x-3 overflow-hidden text-left">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate">{attachmentName || 'GST Bill'}</p>
                    <p className="text-[10px] text-amber-300">Vendor GST bill stored</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAttachment(undefined);
                    setAttachmentName(undefined);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="gst-file-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2 py-2 text-slate-400 hover:text-amber-300 transition"
              >
                <div className="flex items-center space-x-2">
                  <Camera className="w-6 h-6 text-amber-400" />
                  <Upload className="w-6 h-6 text-amber-400" />
                </div>
                <span className="text-xs font-bold text-slate-200">
                  {isUploading ? 'Uploading...' : 'Take Photo or Attach Vendor Bill with GST'}
                </span>
                <span className="text-[10px] text-slate-500">Keep proof of GST paid for IT returns</span>
              </label>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-400/20 transition active:scale-95 flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save GST Expense</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
