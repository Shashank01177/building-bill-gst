import React, { useState } from 'react';
import { X, Building, Download, Upload, Smartphone, CheckCircle2, ShieldCheck, Database } from 'lucide-react';
import { db, type BuildingProfile } from '../db';

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

      if (confirm('Importing this backup will merge or restore your data. Do you wish to continue?')) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Building & App Settings</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'profile'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Building Profile
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'backup'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Data Backup & Restore
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'apk'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📱 Android APK Installation
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {msg && (
            <div className="mb-4 p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{msg}</span>
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Building / Complex Name *</label>
                <input
                  type="text"
                  required
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  placeholder="e.g. Apex Commercial Plaza"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Owner / Management Name *</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Phone *</label>
                  <input
                    type="tel"
                    required
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Owner GSTIN (For Invoicing)</label>
                  <input
                    type="text"
                    value={ownerGstin}
                    onChange={(e) => setOwnerGstin(e.target.value)}
                    placeholder="27AAAAA0000A1Z5"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Email</label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="billing@apexcomplex.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Building Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot 42, Commercial Avenue, City"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              {/* Bank Details */}
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/80 space-y-2.5">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Payment Collection Bank & UPI Details (Printed on Invoices)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="HDFC / SBI / ICICI"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="502000xxxx"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                      placeholder="HDFC0001234"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-white font-mono uppercase focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">UPI ID (GPay / PhonePe / Paytm)</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="building@upi"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 flex items-start space-x-3">
                <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-white">100% Offline & Private</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    All your tenant information, sent bills, cash & online payment records, and GST receipts are stored securely right in your device's browser/app storage (IndexedDB).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                      <Download className="w-5 h-5" />
                      <span className="font-semibold text-sm text-white">Export Full Backup</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-4">
                      Download a complete JSON backup containing all tenants, bills, payment vouchers, and bill images.
                    </p>
                  </div>
                  <button
                    onClick={handleExportBackup}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download JSON Backup</span>
                  </button>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 text-emerald-400 mb-2">
                      <Upload className="w-5 h-5" />
                      <span className="font-semibold text-sm text-white">Restore from Backup</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-4">
                      Select a previously downloaded JSON backup file to restore all your bills and records.
                    </p>
                  </div>
                  <label className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition text-center">
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
            </div>
          )}

          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-800/60 flex items-start space-x-3">
                <Smartphone className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-emerald-300">How to Use & Install as an APK on Android</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    You have two instantaneous ways to run this on your Android device:
                  </p>
                </div>
              </div>

              {/* Option 1: Instant PWA APK */}
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">1</span>
                  <h5 className="text-sm font-bold text-white">Instant 1-Click Install on Android Phone (Recommended)</h5>
                </div>
                <p className="text-xs text-slate-300 pl-8">
                  Open this application in Google Chrome on your Android phone. Tap the <strong>three dots menu (⋮)</strong> at top right and choose <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                </p>
                <div className="pl-8 text-[11px] text-emerald-400 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800/30">
                  ✓ Installs with its own app icon on your phone launcher<br />
                  ✓ Opens in full-screen standalone window without browser address bar<br />
                  ✓ Works 100% offline with camera bill scanning and local receipt storage
                </div>
              </div>

              {/* Option 2: Capacitor Native APK */}
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">2</span>
                  <h5 className="text-sm font-bold text-white">Direct Standalone .APK File</h5>
                </div>
                <p className="text-xs text-slate-300 pl-8">
                  This project includes full <strong>Capacitor Android</strong> configuration and an automated <strong>GitHub Actions CI workflow</strong> (<code className="text-indigo-300">.github/workflows/build-apk.yml</code>).
                </p>
                <p className="text-xs text-slate-300 pl-8">
                  Pushing this repository to GitHub automatically builds the release <code className="text-emerald-300">app-release-unsigned.apk</code> in GitHub Actions releases/artifacts for you to download directly onto your phone!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
