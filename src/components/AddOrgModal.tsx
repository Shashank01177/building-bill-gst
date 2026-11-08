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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              {editingOrg ? 'Edit Business Organisation' : 'Add Business Organisation / Tenant'}
            </h2>
            <p className="text-xs text-slate-400">Manage companies staying in your building</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-800 text-red-200 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Organisation Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Software Solutions Pvt Ltd"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unit / Floor / Office No. *</label>
              <input
                type="text"
                required
                value={unitNo}
                onChange={(e) => setUnitNo(e.target.value)}
                placeholder="e.g. Unit 401, 4th Floor"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tenant GSTIN (Optional)</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="27AAAAA0000A1Z5"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Person Name *</label>
              <input
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Official Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="billing@company.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Agreed Rates */}
          <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/80 space-y-2.5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Agreed Monthly Rental Terms</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Monthly Rent (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={monthlyRent || ''}
                  onChange={(e) => setMonthlyRent(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-semibold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Maintenance (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={monthlyMaintenance || ''}
                  onChange={(e) => setMonthlyMaintenance(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Security Deposit (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={securityDeposit || ''}
                  onChange={(e) => setSecurityDeposit(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-semibold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Lease Start Date</label>
                <input
                  type="date"
                  value={leaseStartDate}
                  onChange={(e) => setLeaseStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
            <div className="flex space-x-3">
              <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="org-status"
                  value="active"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span>Active Staying Tenant</span>
              </label>
              <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="org-status"
                  value="vacated"
                  checked={status === 'vacated'}
                  onChange={() => setStatus('vacated')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span>Vacated / Former Tenant</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingOrg ? 'Update Organisation' : 'Save Organisation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
