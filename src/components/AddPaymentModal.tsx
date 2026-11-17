import React, { useState, useEffect } from 'react';
import { X, Camera, Upload, CheckCircle2, Wallet, CreditCard, Banknote, Trash2, Calendar, Percent } from 'lucide-react';
import { db, type Organization, type Payment } from '../db';
import { compressAndConvertImage, formatCurrency } from '../utils/formatters';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizations: Organization[];
  onPaymentRecorded: () => void;
  initialOrgId?: number;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  organizations,
  onPaymentRecorded,
  initialOrgId
}) => {
  const [orgId, setOrgId] = useState<number | ''>(initialOrgId || '');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [billingMonth, setBillingMonth] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [onlineAmount, setOnlineAmount] = useState<number>(0);
  const [onlineRefNumber, setOnlineRefNumber] = useState('');
  const [gstRate, setGstRate] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Attachment
  const [attachment, setAttachment] = useState<string | undefined>(undefined);
  const [attachmentName, setAttachmentName] = useState<string | undefined>(undefined);
  const [attachmentType, setAttachmentType] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const yr = now.getFullYear();
      const rand = Math.floor(100 + Math.random() * 900);
      setPaymentNumber(`REC-${yr}-${rand}`);
      setPaymentDate(new Date().toISOString().split('T')[0]);

      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      setBillingMonth(`${monthNames[now.getMonth()]} ${now.getFullYear()}`);
      setError(null);

      if (initialOrgId) {
        setOrgId(initialOrgId);
        populateOrgDefaultRent(initialOrgId);
      }
    }
  }, [isOpen, initialOrgId]);

  const populateOrgDefaultRent = (selectedId: number) => {
    const org = organizations.find(o => o.id === selectedId);
    if (org && org.monthlyRent) {
      // Suggest agreed rent as default online amount if empty
      if (cashAmount === 0 && onlineAmount === 0) {
        setOnlineAmount(org.monthlyRent + (org.monthlyMaintenance || 0));
      }
    }
  };

  const handleOrgSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const oId = Number(e.target.value);
    setOrgId(oId || '');
    if (oId) {
      populateOrgDefaultRent(oId);
    }
  };

  const baseReceived = (Number(cashAmount) || 0) + (Number(onlineAmount) || 0);
  const calculatedGst = gstRate > 0 ? Math.round((baseReceived * gstRate) / 100) : 0;
  const totalAmountReceived = baseReceived + calculatedGst;

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
      setError('Could not process receipt file.');
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
    if (baseReceived <= 0) {
      setError('Please enter either a Cash amount or Online amount paid.');
      return;
    }

    const org = organizations.find(o => o.id === orgId);
    if (!org) return;

    let mode: 'cash' | 'online' | 'mixed' = 'cash';
    if (cashAmount > 0 && onlineAmount > 0) {
      mode = 'mixed';
    } else if (onlineAmount > 0) {
      mode = 'online';
    }

    const newPayment: Payment = {
      paymentNumber: paymentNumber.trim() || `REC-${Date.now()}`,
      orgId: org.id!,
      orgName: org.name,
      billingMonth: billingMonth.trim() || undefined,
      paymentDate,
      cashAmount: Number(cashAmount) || 0,
      onlineAmount: Number(onlineAmount) || 0,
      onlineRefNumber: onlineRefNumber.trim() || undefined,
      gstRate: gstRate > 0 ? gstRate : undefined,
      gstAmount: calculatedGst > 0 ? calculatedGst : undefined,
      totalAmount: totalAmountReceived,
      paymentMode: mode,
      receiptAttachment: attachment,
      receiptAttachmentName: attachmentName,
      receiptAttachmentType: attachmentType,
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    };

    await db.payments.add(newPayment);
    onPaymentRecorded();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f172a]/95 border border-white/10 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Record Tenant Payment</h2>
              <p className="text-xs text-slate-400">Store Cash & Online split with bill receipt photo</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-2xl">
              {error}
            </div>
          )}

          {/* Org & Month */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Business Organisation / Tenant *
              </label>
              <select
                value={orgId}
                onChange={handleOrgSelect}
                required
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Billing Month / Period
              </label>
              <input
                type="text"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                placeholder="e.g. November 2026"
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Receipt Number & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Receipt / Voucher Number
              </label>
              <input
                type="text"
                value={paymentNumber}
                onChange={(e) => setPaymentNumber(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="REC-2026-001"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Split Payment Section: Cash & Online */}
          <div className="rounded-3xl p-4 bg-white/[0.02] border border-white/10 space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Banknote className="w-4 h-4" />
              <span>Payment Breakdown (Cash & Online)</span>
            </h3>

            {/* Cash Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-amber-400" />
                  Amount Paid in Cash
                </label>
                <div className="flex items-center bg-slate-900/90 border border-amber-500/30 rounded-2xl px-4 py-2.5">
                  <span className="text-amber-400 font-bold mr-1.5">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={cashAmount || ''}
                    onChange={(e) => setCashAmount(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-transparent text-white font-bold text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Online Input */}
              <div>
                <label className="block text-xs font-semibold text-sky-300 mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                  Amount Paid Online (UPI/Bank)
                </label>
                <div className="flex items-center bg-slate-900/90 border border-sky-500/30 rounded-2xl px-4 py-2.5">
                  <span className="text-sky-400 font-bold mr-1.5">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={onlineAmount || ''}
                    onChange={(e) => setOnlineAmount(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-transparent text-white font-bold text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Online Reference / UTR Number */}
            {onlineAmount > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Online Transfer Ref / UTR / Cheque Number
                </label>
                <input
                  type="text"
                  value={onlineRefNumber}
                  onChange={(e) => setOnlineRefNumber(e.target.value)}
                  placeholder="e.g. UTR-49102931481 or Cheque #004521"
                  className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 font-mono"
                />
              </div>
            )}

            {/* GST Selector */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Percent className="w-4 h-4 text-purple-400" />
                <label className="text-xs font-semibold text-slate-300">GST on Payment:</label>
              </div>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="bg-slate-900/90 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none"
              >
                <option value={0}>0% (No GST)</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18% (Commercial Rent GST)</option>
                <option value={28}>28%</option>
              </select>
            </div>

            {/* Total Received Summary */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-300 font-semibold block">Total Amount Received:</span>
                {calculatedGst > 0 && (
                  <span className="text-[11px] text-purple-300">
                    Includes GST ({gstRate}%): +{formatCurrency(calculatedGst)}
                  </span>
                )}
              </div>
              <span className="text-lg sm:text-xl font-black text-emerald-400">
                {formatCurrency(totalAmountReceived)}
              </span>
            </div>
          </div>

          {/* Attach Payment Receipt / Bill Proof */}
          <div className="border border-dashed border-white/15 rounded-3xl p-4 bg-white/[0.02] text-center">
            <input
              type="file"
              id="payment-file-upload"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            {attachment ? (
              <div className="flex items-center justify-between bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/30">
                <div className="flex items-center space-x-3 overflow-hidden text-left">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate">{attachmentName || 'Payment Bill'}</p>
                    <p className="text-[10px] text-emerald-300">Bill/receipt photo stored</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAttachment(undefined);
                    setAttachmentName(undefined);
                    setAttachmentType(undefined);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="payment-file-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2 py-2 text-slate-400 hover:text-emerald-300 transition"
              >
                <div className="flex items-center space-x-2">
                  <Camera className="w-6 h-6 text-emerald-400" />
                  <Upload className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="text-xs font-bold text-slate-200">
                  {isUploading ? 'Compressing receipt...' : 'Snap Photo or Attach Payment Slip / UPI Screenshot'}
                </span>
                <span className="text-[10px] text-slate-500">Camera photo or file upload stored locally</span>
              </label>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received cash by hand, online transfer verified"
              className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Submit */}
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
              className="px-6 py-2.5 rounded-2xl text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-400/20 transition active:scale-95 flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
