import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  FileText, 
  Wallet, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  Calendar,
  X
} from 'lucide-react';
import { db, type Organization, type Bill, type Payment } from '../db';
import { formatCurrency } from '../utils/formatters';

interface OrganizationsViewProps {
  organizations: Organization[];
  bills: Bill[];
  payments: Payment[];
  onOpenAddOrg: () => void;
  onEditOrg: (org: Organization) => void;
  onOpenAddBillForOrg: (orgId: number) => void;
  onOpenAddPaymentForOrg: (orgId: number) => void;
  onRefresh: () => void;
}

export const OrganizationsView: React.FC<OrganizationsViewProps> = ({
  organizations,
  bills,
  payments,
  onOpenAddOrg,
  onEditOrg,
  onOpenAddBillForOrg,
  onOpenAddPaymentForOrg,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'vacated'>('all');

  const filteredOrgs = organizations.filter(o => {
    const matchesSearch = o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.unitNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.phone.includes(searchTerm) ||
      (o.gstin && o.gstin.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && o.status === statusFilter;
  });

  const handleDeleteOrg = async (org: Organization) => {
    if (confirm(`Are you sure you want to delete ${org.name}? This will remove the organisation record.`)) {
      await db.organizations.delete(org.id!);
      onRefresh();
    }
  };

  return (
    <div className="space-y-5 pb-20 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <span>Tenant Businesses</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Directory of commercial organisations occupying building units</p>
        </div>
        <button
          onClick={onOpenAddOrg}
          className="px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-sky-500/20 transition active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Tenant</span>
        </button>
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search organizations by name, unit no, contact, GSTIN..."
            className="w-full bg-slate-900/80 border border-white/10 rounded-2xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 backdrop-blur-md transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex bg-slate-900/80 border border-white/10 rounded-2xl p-1 shrink-0 backdrop-blur-md overflow-x-auto">
          {(['all', 'active', 'vacated'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all duration-200 ${
                statusFilter === tab
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Organisations Grid */}
      {filteredOrgs.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center">
          <Building2 className="w-12 h-12 text-slate-600 mb-3" />
          <h4 className="text-white font-bold text-base">No organisations found</h4>
          <p className="text-slate-400 text-xs mt-1 max-w-sm">
            {searchTerm ? 'Try adjusting your search query.' : 'Click "Add Tenant" to register your first business organisation.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrgs.map(org => {
            const orgBills = bills.filter(b => b.orgId === org.id);
            const orgPayments = payments.filter(p => p.orgId === org.id);

            const totalBilled = orgBills.reduce((s, b) => s + b.totalAmount, 0);
            const totalPaid = orgPayments.reduce((s, p) => s + p.totalAmount, 0);
            const totalCash = orgPayments.reduce((s, p) => s + p.cashAmount, 0);
            const totalOnline = orgPayments.reduce((s, p) => s + p.onlineAmount, 0);
            const balanceDue = orgBills.reduce((s, b) => s + b.balanceAmount, 0);

            return (
              <div
                key={org.id}
                className="glass-card rounded-3xl p-5 flex flex-col justify-between border-white/[0.08] hover:border-white/20 transition-all duration-200"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shrink-0 shadow-lg shadow-sky-600/20">
                        {org.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-sky-400 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-lg">
                            {org.unitNo}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full capitalize ${
                              org.status === 'active'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {org.status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-1">{org.name}</h3>
                        {org.gstin && (
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            GSTIN: <span className="text-slate-300 font-semibold">{org.gstin}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onEditOrg(org)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition active:scale-95"
                        title="Edit Tenant"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrg(org)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-rose-400 transition active:scale-95"
                        title="Delete Tenant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info Pill */}
                  <div className="rounded-2xl p-3 bg-black/20 border border-white/5 text-xs space-y-1.5 mb-3">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Contact Person:</span>
                      <span className="font-bold text-white">{org.contactPerson}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Phone:</span>
                      <a href={`tel:${org.phone}`} className="text-sky-400 hover:underline font-mono font-semibold flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{org.phone}</span>
                      </a>
                    </div>
                    {org.email && (
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Email:</span>
                        <a href={`mailto:${org.email}`} className="text-slate-400 hover:text-white truncate max-w-[180px] flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{org.email}</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Financial Snapshot */}
                  <div className="rounded-2xl p-3.5 bg-black/20 border border-white/5 space-y-1.5 text-xs mb-3">
                    <div className="flex justify-between text-slate-400">
                      <span>Agreed Rent + Maintenance:</span>
                      <span className="text-white font-bold">
                        {formatCurrency(org.monthlyRent + org.monthlyMaintenance)} / month
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Total Billed:</span>
                      <span className="text-slate-200">{formatCurrency(totalBilled)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Total Collected:</span>
                      <span>{formatCurrency(totalPaid)}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-end space-x-2">
                      <span>(Cash: {formatCurrency(totalCash)}</span>
                      <span>•</span>
                      <span>Online: {formatCurrency(totalOnline)})</span>
                    </div>
                    <div className="pt-2 border-t border-white/10 flex justify-between font-black">
                      <span className="text-slate-300">Balance Pending:</span>
                      <span className={balanceDue > 0 ? 'text-rose-400 text-sm' : 'text-emerald-400'}>
                        {formatCurrency(balanceDue)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onOpenAddBillForOrg(org.id!)}
                    className="py-2.5 px-3 rounded-2xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Create Bill</span>
                  </button>

                  <button
                    onClick={() => onOpenAddPaymentForOrg(org.id!)}
                    className="py-2.5 px-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-95"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Record Pay</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
