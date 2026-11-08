import React, { useState } from 'react';
import { Building2, X, Download, Upload, Shield, CheckCircle2 } from 'lucide-react';
import { BuildingProfile } from '../types';
import { StorageService } from '../services/storage';

interface Props {
  profile: BuildingProfile;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ProfileModal: React.FC<Props> = ({ profile, isOpen, onClose, onSaved }) => {
  const [formData, setFormData] = useState<BuildingProfile>({ ...profile });
  const [statusMsg, setStatusMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleChange = (field: keyof BuildingProfile, val: any) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveProfile(formData);
    setStatusMsg('Building profile updated successfully!');
    setTimeout(() => {
      setStatusMsg('');
      onSaved();
      onClose();
    }, 600);
  };

  const handleExportBackup = () => {
    const jsonStr = StorageService.exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `building_bills_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const success = StorageService.importBackupJson(reader.result as string);
      if (success) {
        alert('Data imported and restored successfully!');
        onSaved();
        onClose();
      } else {
        alert('Invalid backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 text-white">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold">Building & Landlord Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {statusMsg && (
            <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl text-xs flex items-center space-x-2 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Building Name & Landlord */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Building / Complex Name *</label>
            <input
              type="text"
              required
              value={formData.buildingName}
              onChange={e => handleChange('buildingName', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Building Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={e => handleChange('address', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Owner / Landlord Entity Name</label>
            <input
              type="text"
              value={formData.landlordName}
              onChange={e => handleChange('landlordName', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>

          {/* GSTIN & PAN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Landlord GSTIN *</label>
              <input
                type="text"
                value={formData.landlordGstin}
                onChange={e => handleChange('landlordGstin', e.target.value.toUpperCase())}
                placeholder="29AAACR1234F1Z8"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono uppercase font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">PAN Number</label>
              <input
                type="text"
                value={formData.landlordPan}
                onChange={e => handleChange('landlordPan', e.target.value.toUpperCase())}
                placeholder="AAACR1234F"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.contactPhone}
                onChange={e => handleChange('contactPhone', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={e => handleChange('contactEmail', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          {/* Bank & UPI for Invoices */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Bank & UPI Details (Auto-printed on Invoices)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={e => handleChange('bankName', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Account Number</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={e => handleChange('accountNumber', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={formData.ifscCode}
                  onChange={e => handleChange('ifscCode', e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">UPI ID (VPA)</label>
                <input
                  type="text"
                  value={formData.upiId}
                  onChange={e => handleChange('upiId', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-cyan-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Backup & Restore Data */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-400 block mb-2">Offline Data Backup & Restore</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Full Backup</span>
              </button>

              <label className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Import Backup</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-900/30"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
