import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Trash2, 
  Edit, 
  X, 
  FileText,
  CreditCard,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Tenant, Invoice, BuildingProfile } from '../types';
import { StorageService } from '../services/storage';

interface Props {
  tenants: Tenant[];
  invoices: Invoice[];
  profile: BuildingProfile;
  onRefresh: () => void;
  onNewBillForTenant: (tenant: Tenant) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
}

export const TenantsView: React.FC<Props> = ({
  tenants,
  invoices,
  profile,
  onRefresh,
  onNewBillForTenant,
  isCreateModalOpen,
  setIsCreateModalOpen,
}) => {
  const curr = profile.currencySymbol || '₹';
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [monthlyRent, setMonthlyRent] = useState<number>(0);
  const [monthlyMaintenance, setMonthlyMaintenance] = useState<number>(0);
  const [securityDeposit, setSecurityDeposit] = useState<number>(0);
  const [leaseStartDate, setLeaseStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const openNewModal = () => {
    setEditingTenant(null);
    setName('');
    setUnitNumber('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setGstin('');
    setPan('');
    setMonthlyRent(0);
    setMonthlyMaintenance(0);
    setSecurityDeposit(0);
    setLeaseStartDate(new Date().toISOString().slice(0, 10));
    setLeaseEndDate('');
    setNotes('');
    setIsActive(true);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (t: Tenant) => {
    setEditingTenant(t);
    setName(t.name);
    setUnitNumber(t.unitNumber);
    setContactPerson(t.contactPerson);
    setPhone(t.phone);
    setEmail(t.email);
    setGstin(t.gstin);
    setPan(t.pan);
    setMonthlyRent(t.monthlyRent);
    setMonthlyMaintenance(t.monthlyMaintenance);
    setSecurityDeposit(t.securityDeposit);
    setLeaseStartDate(t.leaseStartDate);
    setLeaseEndDate(t.leaseEndDate || '');
    setNotes(t.notes || '');
    setIsActive(t.isActive);
    setIsCreateModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Business Organisation name is required.');
      return;
    }

    const tenant: Tenant = {
      id: editingTenant ? editingTenant.id : 't-' + Date.now(),
      name,
      unitNumber,
      buildingName: profile.buildingName,
      contactPerson,
      phone,
      email,
      gstin: gstin.toUpperCase(),
      pan: pan.toUpperCase(),
      monthlyRent: Number(monthlyRent) || 0,
      monthlyMaintenance: Number(monthlyMaintenance) || 0,
      securityDeposit: Number(securityDeposit) || 0,
      leaseStartDate,
      leaseEndDate: leaseEndDate || undefined,
      isActive,
      notes,
    };

    StorageService.saveTenant(tenant);
    setIsCreateModalOpen(false);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this tenant business record? Associated past bills will remain.')) {
      StorageService.deleteTenant(id);
      onRefresh();
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-emerald-400" />
            <span>Business Organisations (Tenants)</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Companies, shops, and offices staying in your building with GSTIN details
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Business Tenant</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search by business organisation name, unit #, GSTIN, contact..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Tenants Cards Grid */}
      {filteredTenants.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800">
          <Building2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-slate-300 font-medium">No business organisations found</p>
          <p className="text-xs text-slate-500 mt-1">Add companies and offices staying in your commercial building</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTenants.map(t => {
            const tenantInvoices = invoices.filter(i => i.tenantId === t.id);
            const totalOutstanding = tenantInvoices.reduce((sum, i) => sum + i.balanceDue, 0);

            return (
              <div
                key={t.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                        {t.unitNumber}
                      </span>
                      <h2 className="text-base font-bold text-white mt-1.5 leading-snug">{t.name}</h2>
                      {t.contactPerson && (
                        <p className="text-xs text-slate-400 mt-0.5">Contact: {t.contactPerson}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {t.isActive ? 'Active' : 'Vacated'}
                    </span>
                  </div>

                  {/* GSTIN & PAN */}
                  <div className="bg-slate-950/80 rounded-xl p-2.5 my-3 text-xs space-y-1 font-mono border border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-400">GSTIN:</span>
                      <span className="text-emerald-400 font-bold">{t.gstin || 'Unregistered'}</span>
                    </div>
                    {t.pan && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">PAN:</span>
                        <span className="text-slate-300">{t.pan}</span>
                      </div>
                    )}
                  </div>

                  {/* Financials & Contact */}
                  <div className="space-y-1 text-xs text-slate-300 mb-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Monthly Rent:</span>
                      <span className="font-semibold text-white">{curr}{t.monthlyRent.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Maintenance:</span>
                      <span className="font-semibold text-white">{curr}{t.monthlyMaintenance.toLocaleString('en-IN')}</span>
                    </div>
                    {totalOutstanding > 0 ? (
                      <div className="flex justify-between text-rose-400 font-bold pt-1 border-t border-slate-800">
                        <span>Pending Dues:</span>
                        <span>{curr}{totalOutstanding.toLocaleString('en-IN')}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-emerald-400 font-medium pt-1 border-t border-slate-800">
                        <span>Dues:</span>
                        <span>All Clear</span>
                      </div>
                    )}
                  </div>

                  {(t.phone || t.email) && (
                    <div className="flex flex-wrap gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                      {t.phone && (
                        <a href={`tel:${t.phone}`} className="flex items-center space-x-1 hover:text-emerald-400">
                          <Phone className="w-3 h-3" />
                          <span>{t.phone}</span>
                        </a>
                      )}
                      {t.email && (
                        <a href={`mailto:${t.email}`} className="flex items-center space-x-1 hover:text-emerald-400">
                          <Mail className="w-3 h-3" />
                          <span className="truncate max-w-[140px]">{t.email}</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="border-t border-slate-800 pt-3 flex items-center justify-between gap-2 mt-3">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      title="Edit Tenant"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400"
                      title="Delete Tenant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => onNewBillForTenant(t)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md active:scale-95 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Create Bill</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Tenant Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 text-white">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold">
                  {editingTenant ? 'Edit Business Tenant' : 'Add Business Organisation'}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Business / Organisation Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Zenith InfoTech Solutions Pvt Ltd"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Premise / Unit / Floor # *
                  </label>
                  <input
                    type="text"
                    required
                    value={unitNumber}
                    onChange={e => setUnitNumber(e.target.value)}
                    placeholder="e.g. Suite 301, 3rd Floor"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder="e.g. Mr. Arvind Sharma"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="accounts@business.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tenant GSTIN</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={e => setGstin(e.target.value.toUpperCase())}
                    placeholder="29ABCDE1234F1Z5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={pan}
                    onChange={e => setPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Monthly Rent ({curr})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={monthlyRent || ''}
                    onChange={e => setMonthlyRent(parseFloat(e.target.value) || 0)}
                    placeholder="85000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Maintenance ({curr})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={monthlyMaintenance || ''}
                    onChange={e => setMonthlyMaintenance(parseFloat(e.target.value) || 0)}
                    placeholder="15000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Deposit ({curr})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={securityDeposit || ''}
                    onChange={e => setSecurityDeposit(parseFloat(e.target.value) || 0)}
                    placeholder="500000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Lease Start Date</label>
                  <input
                    type="date"
                    value={leaseStartDate}
                    onChange={e => setLeaseStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Lease End Date</label>
                  <input
                    type="date"
                    value={leaseEndDate}
                    onChange={e => setLeaseEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. IT services, 3-year commercial agreement"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500"
                />
                <span>Currently active tenant staying in building</span>
              </label>

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
                  {editingTenant ? 'Update Business Tenant' : 'Save Business Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
