import React, { useState, useEffect } from 'react';
import { X, Camera, Upload, CheckCircle2, Wallet, CreditCard, Banknote, Trash2 } from 'lucide-react';
import { db, type Bill, type Organization, type Payment } from '../db';
import { compressAndConvertImage, formatCurrency } from '../utils/formatters';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizations: Organization[];
  bills: Bill[];
  onPaymentRecorded: () => void;
  initialBillId?: number;
  initialOrgId?: number;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  organizations,
  bills,
  onPaymentRecorded,
  initialBillId,
  initialOrgId
}) => {
  const [orgId, setOrgId] = useState<number | ''>(initialOrgId || '');
  const [billId, setBillId] = useState<number | ''>(initialBillId || '');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [onlineAmount, setOnlineAmount] = useState<number>(0);
  const [onlineRefNumber, setOnlineRefNumber] = useState('');
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
      setError(null);

      if (initialBillId) {
        const b = bills.find(item => item.id === initialBillId);
        if (b) {
          setBillId(b.id!);
          setOrgId(b.orgId);
          // Suggest online amount as remaining balance by default
          setOnlineAmount(b.balanceAmount > 0 ? b.balanceAmount : 0);
          setCashAmount(0);
        }
      } else if (initialOrgId) {
        setOrgId(initialOrgId);
      }
    }
  }, [isOpen, initialBillId, initialOrgId, bills]);

  const handleBillSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bId = Number(e.target.value);
    setBillId(bId || '');
    if (bId) {
      const b = bills.find(item => item.id === bId);
      if (b) {
        setOrgId(b.orgId);
        if (cashAmount === 0 && onlineAmount === 0) {
          setOnlineAmount(b.balanceAmount);
        }
      }
    }
  };

  const handleOrgSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const oId = Number(e.target.value);
    setOrgId(oId || '');
    setBillId(''); // Reset bill when org changes
  };

  // Filter bills belonging to the selected organization
  const orgBills = bills.filter(b => (!orgId || b.orgId === orgId) && b.balanceAmount > 0);
  const selectedBill = bills.find(b => b.id === Number(billId));

  const totalAmountReceived = (Number(cashAmount) || 0) + (Number(onlineAmount) || 0);

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
    if (totalAmountReceived <= 0) {
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
      billId: billId ? Number(billId) : undefined,
      billNumber: selectedBill?.billNumber,
      orgId: org.id!,
      orgName: org.name,
      paymentDate,
      cashAmount: Number(cashAmount) || 0,
      onlineAmount: Number(onlineAmount) || 0,
      onlineRefNumber: onlineRefNumber.trim(),
      totalAmount: totalAmountReceived,
      paymentMode: mode,
      receiptAttachment: attachment,
      receiptAttachmentName: attachmentName,
      receiptAttachmentType: attachmentType,
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    };

    await db.payments.add(newPayment);

    // If linked to a bill, update the bill's paid amount & status
    if (selectedBill && selectedBill.id) {
      const newPaid = selectedBill.paidAmount + totalAmountReceived;
      const newBalance = Math.max(0, selectedBill.totalAmount - newPaid);
      let newStatus: Bill['status'] = selectedBill.status;

      if (newBalance <= 0) {
        newStatus = 'paid';
      } else if (newPaid > 0) {
        newStatus = 'partial';
      }

      await db.bills.update(selectedBill.id, {
        paidAmount: newPaid,
        balanceAmount: newBalance,
        status: newStatus
      });
    }

    onPaymentRecorded();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              Record Tenant Payment
            </h2>
            <p className="text-xs text-slate-400">Store Cash, Online split & attach payment receipt</p>
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

          {/* Org & Linked Bill */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Business Organisation *
              </label>
              <select
                value={orgId}
                onChange={handleOrgSelect}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                Against Bill / Invoice (Optional)
              </label>
              <select
                value={billId}
                onChange={handleBillSelect}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- General Payment / No specific bill --</option>
                {orgBills.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.billNumber} ({b.billingMonth}) - Due: {formatCurrency(b.balanceAmount)}
                  </option>
                ))}
              </select>
              {selectedBill && (
                <div className="mt-1.5 text-xs text-amber-400 flex justify-between bg-amber-950/30 p-2 rounded-lg border border-amber-800/40">
                  <span>Bill Total: {formatCurrency(selectedBill.totalAmount)}</span>
                  <span>Already Paid: {formatCurrency(selectedBill.paidAmount)}</span>
                  <span className="font-bold">Pending: {formatCurrency(selectedBill.balanceAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Receipt Number & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Receipt / Voucher Number
              </label>
              <input
                type="text"
                value={paymentNumber}
                onChange={(e) => setPaymentNumber(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="REC-2026-001"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Split Payment Section: Cash & Online */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Banknote className="w-4 h-4" />
              Payment Breakdown (Cash & Online)
            </h3>

            {/* Cash Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-amber-400" />
                  Amount Paid in Cash
                </label>
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">
                  <span className="text-amber-400 font-bold mr-1">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={cashAmount || ''}
                    onChange={(e) => setCashAmount(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-transparent text-white font-semibold text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Online Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                  Amount Paid Online (UPI/Bank)
                </label>
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">
                  <span className="text-sky-400 font-bold mr-1">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={onlineAmount || ''}
                    onChange={(e) => setOnlineAmount(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-transparent text-white font-semibold text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Online Reference / UTR Number */}
            {onlineAmount > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Online Transfer Ref / UTR / Cheque Number
                </label>
                <input
                  type="text"
                  value={onlineRefNumber}
                  onChange={(e) => setOnlineRefNumber(e.target.value)}
                  placeholder="e.g. UTR-49102931481 or Cheque #004521"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>
            )}

            {/* Total Received Summary */}
            <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-300">Total Payment Received:</span>
              <span className="text-base font-extrabold text-emerald-400">
                {formatCurrency(totalAmountReceived)}
              </span>
            </div>

            {selectedBill && (
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Remaining on this bill after payment:</span>
                <span className={`font-semibold ${selectedBill.balanceAmount - totalAmountReceived <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {formatCurrency(Math.max(0, selectedBill.balanceAmount - totalAmountReceived))}
                </span>
              </div>
            )}
          </div>

          {/* Attach Payment Bill / Receipt Screenshot */}
          <div className="border border-dashed border-slate-700 rounded-xl p-4 bg-slate-950/30 text-center">
            <input
              type="file"
              id="payment-file-upload"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            {attachment ? (
              <div className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-xl border border-emerald-500/40">
                <div className="flex items-center space-x-2.5 overflow-hidden text-left">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-white truncate">{attachmentName || 'Payment Slip'}</p>
                    <p className="text-[10px] text-emerald-400">Payment receipt stored</p>
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
                htmlFor="payment-file-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-1.5 py-1 text-slate-400 hover:text-emerald-300 transition"
              >
                <div className="flex items-center space-x-2">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  <Upload className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-slate-300">
                  {isUploading ? 'Saving receipt...' : 'Attach Payment Receipt / UPI Screenshot / Cheque Photo'}
                </span>
                <span className="text-[10px] text-slate-500">Camera photo or file upload stored locally</span>
              </label>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Payment Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Handed over cash by Mr. Sharma, online transfer cleared"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Submit */}
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Payment Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
