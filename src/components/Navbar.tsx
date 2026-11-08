import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  CreditCard, 
  Receipt, 
  Building2, 
  Settings 
} from 'lucide-react';
import { BuildingProfile } from '../types';

export type ActiveTab = 'dashboard' | 'invoices' | 'payments' | 'gst' | 'tenants';

interface Props {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenProfile: () => void;
  profile: BuildingProfile;
  pendingInvoicesCount: number;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  onTabChange,
  onOpenProfile,
  profile,
  pendingInvoicesCount,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Bills Sent', icon: FileText, badge: pendingInvoicesCount },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'gst', label: 'GST Paid', icon: Receipt },
    { id: 'tenants', label: 'Tenants', icon: Building2 },
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            onClick={() => onTabChange('dashboard')}
            className="flex items-center space-x-2.5 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">EstatoBill</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-semibold border border-emerald-500/30">
                  GST APK
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[190px] sm:max-w-xs">
                {profile.buildingName}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all relative ${
                    isActive
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="ml-1 px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded-full text-[10px] font-bold">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Settings / Building Profile Trigger */}
          <button
            onClick={onOpenProfile}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
            title="Building & Landlord Profile"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1 shadow-2xl">
        <div className="flex items-center justify-around">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center py-1.5 px-2.5 rounded-xl transition-all relative ${
                  isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1 -right-2 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className={`text-[10px] mt-1 font-semibold ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
