import React from 'react';
import { 
  LayoutDashboard, 
  Inbox, 
  Car, 
  FileText, 
  Wrench, 
  Wallet, 
  Wifi,
  WifiOff,
  Database,
  Settings
} from 'lucide-react';

export type AdminTab = 
  | 'dashboard' 
  | 'bookings' 
  | 'fleet' 
  | 'rentals' 
  | 'maintenance' 
  | 'finances'
  | 'settings';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  pendingBookingsCount: number;
  urgentVidangesCount: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingBookingsCount,
  urgentVidangesCount,
}) => {
  const isOnline = navigator.onLine;

  const navItems = [
    {
      id: 'dashboard' as AdminTab,
      label: 'Tableau de bord',
      icon: LayoutDashboard,
    },
    {
      id: 'bookings' as AdminTab,
      label: 'Demandes Web',
      icon: Inbox,
      badge: pendingBookingsCount > 0 ? pendingBookingsCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'fleet' as AdminTab,
      label: 'Flotte & Véhicules',
      icon: Car,
    },
    {
      id: 'rentals' as AdminTab,
      label: 'Contrats & Bon d\'État',
      icon: FileText,
    },
    {
      id: 'maintenance' as AdminTab,
      label: 'Vidanges & Entretien',
      icon: Wrench,
      badge: urgentVidangesCount > 0 ? urgentVidangesCount : undefined,
      badgeColor: 'bg-rose-500 text-white font-bold animate-pulse',
    },
    {
      id: 'finances' as AdminTab,
      label: 'Caisse & Dépenses',
      icon: Wallet,
    },
    {
      id: 'settings' as AdminTab,
      label: 'Paramètres Agence & Site',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-tight">
                Auto<span className="text-amber-400">Loc</span> ERP
              </h2>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Logiciel de Gestion Agence
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5">
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Gestion Quotidienne
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`px-2 py-0.5 text-[10px] rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer : Indicateur Hors-Ligne & Synchronisation */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-2">
        <div className="flex items-center justify-between px-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-amber-400" /> Cache Local :
          </span>
          <span className="text-emerald-400 font-bold text-[11px]">Actif (Offline)</span>
        </div>

        <div className="flex items-center justify-between px-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            Connexion Cloud :
          </span>
          <span className={`text-[11px] font-bold ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isOnline ? 'Synchronisé' : 'Hors-Ligne'}
          </span>
        </div>

        <p className="text-[10px] text-slate-500 text-center pt-1 border-t border-slate-800/60">
          Logiciel Poste Fixe Agence v1.0
        </p>
      </div>
    </aside>
  );
};
