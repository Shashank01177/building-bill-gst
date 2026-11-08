import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Wallet, 
  Edit, 
  Trash2,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { db, type Organization, type Bill, type Payment } from '../db';
import { formatCurrency, formatDate } from '../utils/formatters';

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
    <div className="space-y-4 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Business Organisations & Tenants
          </h2>
          <p className="text-xs text-slate-400">Manage companies staying in your building units</p>
        </div>
        <button
          onClick={onOpenAddOrg}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Business Tenant</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search organizations by name, unit no, contact, GSTIN..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
          {(['all', 'active', 'vacated'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === tab
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Organisations */}
      {filteredOrgs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-semibold text-sm">No businesses found</p>
          <p className="text-slate-500 text-xs mt-1">
            {searchTerm ? 'Try adjusting your search criteria' : 'Click "Add Business Tenant" to register your first organization'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-xl transition flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-800/40">
                          {org.unitNo}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            org.status === 'active'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {org.status}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1.5">{org.name}</h3>
                      {org.gstin && (
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          GSTIN: <span className="text-slate-300 font-medium">{org.gstin}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onEditOrg(org)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                        title="Edit organization"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrg(org)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-500 hover:text-red-400 transition"
                        title="Delete organization"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-slate-950/40 rounded-xl p-2.5 border border-slate-800/60 text-xs space-y-1 my-2.5">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Contact Person:</span>
                      <span className="font-semibold text-white">{org.contactPerson}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Phone:</span>
                      <a href={`tel:${org.phone}`} className="text-sky-400 hover:underline font-mono">
                        {org.phone}
                      </a>
                    </div>
                    {org.email && (
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Email:</span>
                        <a href={`mailto:${org.email}`} className="text-slate-400 hover:text-white truncate max-w-[180px]">
                          {org.email}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Financial Snapshot */}
                  <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Agreed Rent + Maint:</span>
                      <span className="text-white font-medium">
                        {formatCurrency(org.monthlyRent + org.monthlyMaintenance)} / mo
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Total Billed:</span>
                      <span className="text-slate-200">{formatCurrency(totalBilled)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>Total Collected:</span>
                      <span className="font-bold">{formatCurrency(totalPaid)}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-end space-x-2">
                      <span>(Cash: {formatCurrency(totalCash)}</span>
                      <span>•</span>
                      <span>Online: {formatCurrency(totalOnline)})</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold">
                      <span className="text-slate-300">Balance Pending:</span>
                      <span className={balanceDue > 0 ? 'text-rose-400 text-sm' : 'text-emerald-400'}>
                        {formatCurrency(balanceDue)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Quick Action Buttons */}
                <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={() => onOpenAddBillForOrg(org.id!)}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center justify-center space-x-1 transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Create Bill</span>
                  </button>

                  <button
                    onClick={() => onOpenAddPaymentForOrg(org.id!)}
                    className="py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center space-x-1 transition"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
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
