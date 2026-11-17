import React, { useState } from 'react';
import { X, Building, Download, Upload, Smartphone, CheckCircle2, ShieldCheck, Database, Layers } from 'lucide-react';
import { db, clearAllData, type BuildingProfile } from '../db';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: BuildingProfile | null;
  onProfileUpdated: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated
}) => {
  const [buildingName, setBuildingName] = useState(profile?.buildingName || '');
  const [ownerName, setOwnerName] = useState(profile?.ownerName || '');
  const [ownerPhone, setOwnerPhone] = useState(profile?.ownerPhone || '');
  const [ownerEmail, setOwnerEmail] = useState(profile?.ownerEmail || '');
  const [ownerGstin, setOwnerGstin] = useState(profile?.ownerGstin || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [bankName, setBankName] = useState(profile?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(profile?.accountNumber || '');
  const [ifscCode, setIfscCode] = useState(profile?.ifscCode || '');
  const [upiId, setUpiId] = useState(profile?.upiId || '');

  const [activeTab, setActiveTab] = useState<'profile' | 'backup' | 'apk'>('profile');
  const [msg, setMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (profile) {
      setBuildingName(profile.buildingName);
      setOwnerName(profile.ownerName);
      setOwnerPhone(profile.ownerPhone);
      setOwnerEmail(profile.ownerEmail || '');
      setOwnerGstin(profile.ownerGstin || '');
      setAddress(profile.address);
      setBankName(profile.bankName || '');
      setAccountNumber(profile.accountNumber || '');
      setIfscCode(profile.ifscCode || '');
      setUpiId(profile.upiId || '');
    }
  }, [profile, isOpen]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: BuildingProfile = {
      id: 1,
      buildingName: buildingName.trim() || 'My Building',
      ownerName: ownerName.trim() || 'Owner',
      ownerPhone: ownerPhone.trim(),
      ownerEmail: ownerEmail.trim() || undefined,
      ownerGstin: ownerGstin.trim().toUpperCase() || undefined,
      address: address.trim(),
      bankName: bankName.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
      ifscCode: ifscCode.trim().toUpperCase() || undefined,
      upiId: upiId.trim() || undefined
    };

    await db.profile.put(updated);
    setMsg('Building profile updated successfully!');
    setTimeout(() => setMsg(null), 3000);
    onProfileUpdated();
  };

  const handleExportBackup = async () => {
    const orgs = await db.organizations.toArray();
    const bills = await db.bills.toArray();
    const payments = await db.payments.toArray();
    const gstExp = await db.gstExpenses.toArray();
    const prof = await db.profile.toArray();

    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: prof,
      organizations: orgs,
      bills,
      payments,
      gstExpenses: gstExp
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BuildingBills_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (confirm('Importing this backup will restore your data. Do you wish to continue?')) {
        if (data.organizations?.length) {
          await db.organizations.clear();
          await db.organizations.bulkAdd(data.organizations);
        }
        if (data.bills?.length) {
          await db.bills.clear();
          await db.bills.bulkAdd(data.bills);
        }
        if (data.payments?.length) {
          await db.payments.clear();
          await db.payments.bulkAdd(data.payments);
        }
        if (data.gstExpenses?.length) {
          await db.gstExpenses.clear();
          await db.gstExpenses.bulkAdd(data.gstExpenses);
        }
        if (data.profile?.length) {
          await db.profile.clear();
          await db.profile.bulkAdd(data.profile);
        }

        setMsg('Backup restored successfully!');
        setTimeout(() => {
          setMsg(null);
          onProfileUpdated();
          window.location.reload();
        }, 1200);
      }
    } catch (err) {
      alert('Failed to read or parse the backup file.');
    }
  };

  
  const handleWipeAllData = async () => {
    if (confirm('⚠️ WARNING: This will permanently delete all tenants, payments, bills and GST records, resetting the app as completely fresh. Do you want to proceed?')) {
      await clearAllData();
      localStorage.setItem('clean_fresh_purged_v2', 'true');
      setMsg('All data wiped! App reset to completely clean and fresh.');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f172a]/95 border border-white/10 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Settings & Data</h2>
              <p className="text-xs text-slate-400">Building profile, backup & APK guide</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="flex border-b border-white/[0.08] bg-black/20 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Building Profile
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'backup'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Backup & Restore
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'apk'
                ? 'bg-emerald-500 text-slate-950 font-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Android APK
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {msg && (
            <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-2xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{msg}</span>
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Building / Complex Name *
                </label>
                <input
                  type="text"
                  required
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  placeholder="e.g. Apex Commercial Plaza"
                  className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Owner / Management Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Building Owner GSTIN
                  </label>
                  <input
                    type="text"
                    value={ownerGstin}
                    onChange={(e) => setOwnerGstin(e.target.value)}
                    placeholder="27AAAAA0000A1Z5"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white font-mono uppercase focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Owner Email
                  </label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="billing@apexcomplex.com"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Building Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot 42, Commercial Avenue, City"
                  className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              {/* Bank Details Card */}
              <div className="rounded-3xl p-4 bg-white/[0.02] border border-white/10 space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Payment Collection Bank & UPI Details (Printed on Invoices)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="HDFC / SBI / ICICI"
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="502000xxxx"
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                      placeholder="HDFC0001234"
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono uppercase focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">UPI ID (GPay/PhonePe/Paytm)</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="building@upi"
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition active:scale-95 flex items-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Building Profile</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="rounded-3xl p-4 bg-indigo-500/10 border border-indigo-500/20 flex items-start space-x-3">
                <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">100% Offline & Private</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    All your tenant information, sent bills, cash & online payment slips, and vendor GST receipts are stored locally on your device in secure IndexedDB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="rounded-3xl p-5 bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                      <Download className="w-5 h-5" />
                      <span className="font-bold text-sm text-white">Export Full Backup</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-4">
                      Download a complete JSON file containing all tenants, bills, payment vouchers, and bill photos.
                    </p>
                  </div>
                  <button
                    onClick={handleExportBackup}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition active:scale-95 shadow-md shadow-indigo-600/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download JSON Backup</span>
                  </button>
                </div>

                <div className="rounded-3xl p-5 bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 text-emerald-400 mb-2">
                      <Upload className="w-5 h-5" />
                      <span className="font-bold text-sm text-white">Restore Backup</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-4">
                      Select a previously downloaded backup JSON file to restore all your bills and records.
                    </p>
                  </div>
                  <label className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer transition active:scale-95 text-center">
                    <Database className="w-4 h-4" />
                    <span>Select Backup File</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Danger Zone: Wipe Everything */}
              <div className="rounded-3xl p-5 bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <div>
                  <h4 className="text-sm font-bold text-rose-300">Wipe & Reset Everything</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Delete all records and make the app completely fresh and brand new.</p>
                </div>
                <button
                  type="button"
                  onClick={handleWipeAllData}
                  className="px-4 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shrink-0 transition active:scale-95 shadow-md shadow-rose-500/20"
                >
                  Clear All Data
                </button>
              </div>
            </div>
          )}

          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="rounded-3xl p-4 bg-emerald-500/10 border border-emerald-500/20 flex items-start space-x-3">
                <Smartphone className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-300">How to Install on Your Android Phone</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Two instantaneous ways to run this on your mobile device:
                  </p>
                </div>
              </div>

              {/* Option 1: Live PWA */}
              <div className="rounded-3xl p-5 bg-white/[0.02] border border-white/10 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center">1</span>
                  <h5 className="text-sm font-bold text-white">Instant 1-Click Install on Android (PWA)</h5>
                </div>
                <p className="text-xs text-slate-300 pl-8 leading-relaxed">
                  Open <strong>https://shashank01177.github.io/building-bill-gst/</strong> on your Android phone in Google Chrome. Tap the <strong>three dots menu (⋮)</strong> and select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                </p>
                <div className="pl-8 text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 space-y-1">
                  <div>✓ Installs as an app with its own icon on your phone home screen</div>
                  <div>✓ Fullscreen standalone display without browser URL bar</div>
                  <div>✓ Camera bill scanning and offline storage</div>
                </div>
              </div>

              {/* Option 2: Standalone APK */}
              <div className="rounded-3xl p-5 bg-white/[0.02] border border-white/10 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-black flex items-center justify-center">2</span>
                  <h5 className="text-sm font-bold text-white">Standalone Native APK Build</h5>
                </div>
                <p className="text-xs text-slate-300 pl-8 leading-relaxed">
                  The repository includes full Capacitor Android project and a GitHub Actions workflow (<code className="text-indigo-300">build-apk.yml</code>) to compile a native Android release APK.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
