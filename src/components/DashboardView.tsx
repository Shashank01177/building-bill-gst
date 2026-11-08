import React from 'react';
import { 
  Building2, 
  FileText, 
  CreditCard, 
  Receipt, 
  TrendingUp, 
  Banknote, 
  AlertCircle, 
  Plus, 
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Tenant, Invoice, PaymentReceipt, GstExpenseRecord, BuildingProfile } from '../types';

interface Props {
  tenants: Tenant[];
  invoices: Invoice[];
  payments: PaymentReceipt[];
  gstExpenses: GstExpenseRecord[];
  profile: BuildingProfile;
  onNavigate: (tab: 'dashboard' | 'invoices' | 'payments' | 'gst' | 'tenants') => void;
  onNewInvoice: () => void;
  onNewPayment: () => void;
  onNewGst: () => void;
}

export const DashboardView: React.FC<Props> = ({
  tenants,
  invoices,
  payments,
  gstExpenses,
  profile,
  onNavigate,
  onNewInvoice,
  onNewPayment,
  onNewGst,
}) => {
  const curr = profile.currencySymbol || '₹';

  // Calculate metrics
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalGstCollected = invoices.reduce((sum, inv) => sum + inv.totalGst, 0);
  
  // Payments breakup: Cash vs Online
  const totalCashPaid = payments.reduce((sum, p) => sum + p.cashAmount, 0);
  const totalOnlinePaid = payments.reduce((sum, p) => sum + p.onlineAmount, 0);
  const totalCollections = totalCashPaid + totalOnlinePaid;

  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

  // GST metrics
  const totalExpenseGst = gstExpenses
    .filter(g => g.recordType === 'EXPENSE_GST')
    .reduce((sum, g) => sum + g.totalGstPaid, 0);
  
  const totalChallanGst = gstExpenses
    .filter(g => g.recordType === 'GOVT_CHALLAN_PAYMENT')
    .reduce((sum, g) => sum + g.totalGstPaid, 0);

  const netGstPending = Math.max(0, totalGstCollected - totalExpenseGst - totalChallanGst);

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome & Building Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 border border-emerald-500/30">
              <Building2 className="w-3.5 h-3.5" />
              <span>Building Billing & GST Suite</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{profile.buildingName}</h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
              {profile.address} • GSTIN: <span className="font-mono text-emerald-400 font-semibold">{profile.landlordGstin}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onNewInvoice}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs md:text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Bill</span>
            </button>
            <button
              onClick={onNewPayment}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs md:text-sm font-semibold shadow-lg shadow-indigo-900/30 transition-all active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
            <button
              onClick={onNewGst}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs md:text-sm font-semibold transition-all active:scale-95"
            >
              <Receipt className="w-4 h-4 text-amber-400" />
              <span>GST Entry</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collections (Cash + Online) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Received</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {curr}{totalCollections.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span className="text-amber-400 font-medium">Cash: {curr}{totalCashPaid.toLocaleString('en-IN')}</span>
            <span className="text-cyan-400 font-medium">Online: {curr}{totalOnlinePaid.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Outstanding Dues */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Dues</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-rose-400 tracking-tight">
            {curr}{totalOutstanding.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>From {invoices.filter(i => i.balanceDue > 0).length} pending bills</span>
            <button onClick={() => onNavigate('invoices')} className="text-indigo-400 hover:underline">View</button>
          </div>
        </div>

        {/* GST Output Tax Collected */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">GST on Bills</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-indigo-300 tracking-tight">
            {curr}{totalGstCollected.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>18% commercial rent</span>
            <button onClick={() => onNavigate('gst')} className="text-indigo-400 hover:underline">Details</button>
          </div>
        </div>

        {/* GST Paid (ITC + Challans) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">GST Paid Out</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-amber-400 tracking-tight">
            {curr}{(totalExpenseGst + totalChallanGst).toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>ITC: {curr}{totalExpenseGst.toLocaleString('en-IN')}</span>
            <span>Challan: {curr}{totalChallanGst.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Cash vs Online Breakdown Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Banknote className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white">Payment Method Breakdown</h2>
          </div>
          <span className="text-xs font-medium text-slate-400">
            Total: {curr}{totalCollections.toLocaleString('en-IN')}
          </span>
        </div>

        {totalCollections > 0 ? (
          <div>
            <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              <div 
                style={{ width: `${(totalCashPaid / totalCollections) * 100}%` }}
                className="bg-amber-500 h-full transition-all duration-500"
                title={`Cash: ${((totalCashPaid / totalCollections) * 100).toFixed(1)}%`}
              />
              <div 
                style={{ width: `${(totalOnlinePaid / totalCollections) * 100}%` }}
                className="bg-cyan-500 h-full transition-all duration-500"
                title={`Online: ${((totalOnlinePaid / totalCollections) * 100).toFixed(1)}%`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold text-amber-300">Cash Payments</span>
                </div>
                <p className="text-lg font-bold text-amber-400 mt-1">{curr}{totalCashPaid.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-slate-400">
                  {totalCollections > 0 ? ((totalCashPaid / totalCollections) * 100).toFixed(1) : 0}% of all collections
                </p>
              </div>

              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500" />
                  <span className="text-xs font-semibold text-cyan-300">Online Payments (UPI/NEFT/Cheque)</span>
                </div>
                <p className="text-lg font-bold text-cyan-400 mt-1">{curr}{totalOnlinePaid.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-slate-400">
                  {totalCollections > 0 ? ((totalOnlinePaid / totalCollections) * 100).toFixed(1) : 0}% of all collections
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-3 text-center">No payment transactions recorded yet.</p>
        )}
      </div>

      {/* Two Columns: Recent Invoices & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bills Sent */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">Recent Bills Sent</h2>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
            >
              <span>View All ({invoices.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {invoices.slice(0, 4).map(inv => (
              <div
                key={inv.id}
                className="p-3 bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 rounded-xl flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-white">{inv.tenantName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                      {inv.unitNumber}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center space-x-2">
                    <span>{inv.invoiceNumber}</span>
                    <span>•</span>
                    <span>{inv.period}</span>
                    {inv.attachments.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded">
                        📎 {inv.attachments.length} bill doc
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-white">
                    {curr}{inv.totalAmount.toLocaleString('en-IN')}
                  </div>
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${
                    inv.status === 'PAID'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : inv.status === 'PARTIALLY_PAID'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {inv.status === 'PAID' ? 'Fully Paid' : inv.status === 'PARTIALLY_PAID' ? `Due: ${curr}${inv.balanceDue.toLocaleString('en-IN')}` : 'Unpaid'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payments Received */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">Recent Payments Received</h2>
            </div>
            <button
              onClick={() => onNavigate('payments')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
            >
              <span>View All ({payments.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {payments.slice(0, 4).map(pay => (
              <div
                key={pay.id}
                className="p-3 bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 rounded-xl flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-white">{pay.tenantName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                      {pay.receiptNumber}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                    {pay.cashAmount > 0 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-medium">
                        Cash: {curr}{pay.cashAmount.toLocaleString('en-IN')}
                      </span>
                    )}
                    {pay.onlineAmount > 0 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-medium">
                        Online: {curr}{pay.onlineAmount.toLocaleString('en-IN')}
                      </span>
                    )}
                    {pay.attachments.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                        📎 {pay.attachments.length} receipt
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-400">
                    +{curr}{pay.totalAmount.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {pay.paymentDate}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
