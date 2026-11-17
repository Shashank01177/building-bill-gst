import React, { useState } from 'react';
import { X, Building2, CheckCircle2 } from 'lucide-react';
import { db, type Organization } from '../db';

interface AddOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrgCreated: () => void;
  editingOrg?: Organization | null;
}

export const AddOrgModal: React.FC<AddOrgModalProps> = ({
  isOpen,
  onClose,
  onOrgCreated,
  editingOrg
}) => {
  const [name, setName] = useState(editingOrg?.name || '');
  const [unitNo, setUnitNo] = useState(editingOrg?.unitNo || '');
  const [contactPerson, setContactPerson] = useState(editingOrg?.contactPerson || '');
  const [phone, setPhone] = useState(editingOrg?.phone || '');
  const [email, setEmail] = useState(editingOrg?.email || '');
  const [gstin, setGstin] = useState(editingOrg?.gstin || '');
  const [monthlyRent, setMonthlyRent] = useState<number>(editingOrg?.monthlyRent || 0);
  const [monthlyMaintenance, setMonthlyMaintenance] = useState<number>(editingOrg?.monthlyMaintenance || 0);
  const [securityDeposit, setSecurityDeposit] = useState<number>(editingOrg?.securityDeposit || 0);
  const [leaseStartDate, setLeaseStartDate] = useState(editingOrg?.leaseStartDate || new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'active' | 'vacated'>(editingOrg?.status || 'active');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (editingOrg) {
      setName(editingOrg.name);
      setUnitNo(editingOrg.unitNo);
      setContactPerson(editingOrg.contactPerson);
      setPhone(editingOrg.phone);
      setEmail(editingOrg.email || '');
      setGstin(editingOrg.gstin || '');
      setMonthlyRent(editingOrg.monthlyRent);
      setMonthlyMaintenance(editingOrg.monthlyMaintenance);
      setSecurityDeposit(editingOrg.securityDeposit || 0);
      setLeaseStartDate(editingOrg.leaseStartDate);
      setStatus(editingOrg.status);
    } else {
      setName('');
      setUnitNo('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setGstin('');
      setMonthlyRent(0);
      setMonthlyMaintenance(0);
      setSecurityDeposit(0);
      setLeaseStartDate(new Date().toISOString().split('T')[0]);
      setStatus('active');
    }
    setError(null);
  }, [editingOrg, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unitNo.trim() || !contactPerson.trim() || !phone.trim()) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    const orgData: Organization = {
      name: name.trim(),
      unitNo: unitNo.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      gstin: gstin.trim().toUpperCase() || undefined,
      monthlyRent: Number(monthlyRent) || 0,
      monthlyMaintenance: Number(monthlyMaintenance) || 0,
      securityDeposit: Number(securityDeposit) || 0,
      leaseStartDate,
      status,
      createdAt: editingOrg?.createdAt || new Date().toISOString()
    };

    if (editingOrg?.id) {
      await db.organizations.update(editingOrg.id, orgData);
    } else {
      await db.organizations.add(orgData);
    }

    onOrgCreated();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f172a]/95 border border-white/10 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {editingOrg ? 'Edit Tenant Organisation' : 'Add Business Tenant'}
              </h2>
              <p className="text-xs text-slate-400">Manage company staying in building unit</p>
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Company / Organisation Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Software Solutions Pvt Ltd"
              className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Unit / Floor / Office No. *
              </label>
              <input
                type="text"
                required
                value={unitNo}
                onChange={(e) => setUnitNo(e.target.value)}
                placeholder="e.g. Unit 401, 4th Floor"
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Tenant GSTIN (Optional)
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="27AAAAA0000A1Z5"
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Contact Person Name *
              </label>
              <input
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Contact Phone *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Official Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="billing@company.com"
              className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>

          {/* Agreed Rates Card */}
          <div className="rounded-3xl p-4 bg-white/[0.02] border border-white/10 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Agreed Monthly Terms
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Monthly Rent (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={monthlyRent || ''}
                  onChange={(e) => setMonthlyRent(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Maintenance (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={monthlyMaintenance || ''}
                  onChange={(e) => setMonthlyMaintenance(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Security Deposit (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={securityDeposit || ''}
                  onChange={(e) => setSecurityDeposit(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Lease Start Date</label>
                <input
                  type="date"
                  value={leaseStartDate}
                  onChange={(e) => setLeaseStartDate(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Occupancy Status</label>
            <div className="flex space-x-3">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="org-status"
                  value="active"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                  className="text-sky-500 focus:ring-sky-500"
                />
                <span className="font-semibold">Active Tenant</span>
              </label>
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="org-status"
                  value="vacated"
                  checked={status === 'vacated'}
                  onChange={() => setStatus('vacated')}
                  className="text-sky-500 focus:ring-sky-500"
                />
                <span className="font-semibold">Vacated Tenant</span>
              </label>
            </div>
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
              className="px-6 py-2.5 rounded-2xl text-xs font-black text-slate-950 bg-sky-400 hover:bg-sky-300 shadow-lg shadow-sky-400/20 transition active:scale-95 flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingOrg ? 'Update Tenant' : 'Save Tenant'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
