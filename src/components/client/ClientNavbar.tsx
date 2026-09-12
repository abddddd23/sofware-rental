import React from 'react';
import type { AgencySettings } from '../../types';
import { defaultAgencySettings } from '../../types';
import { Car, Phone, ShieldCheck, MapPin } from 'lucide-react';

interface ClientNavbarProps {
  onScrollToCatalog: () => void;
  settings?: AgencySettings;
}

export const ClientNavbar: React.FC<ClientNavbarProps> = ({ 
  onScrollToCatalog,
  settings = defaultAgencySettings 
}) => {
  const telHref = settings.phonePrimary ? `tel:${settings.phonePrimary.replace(/\s+/g, '')}` : 'tel:0555001122';

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo & Brand (Client Public) */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Car className="w-7 h-7 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900 uppercase">
                {settings.agencyName}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                Showroom
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-amber-500" /> {settings.zone}
            </p>
          </div>
        </div>

        {/* Coordonnées & Bouton Catalogue - AUCUN BOUTON ADMIN POUR LES CLIENTS */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-3 pr-4 border-r border-slate-200 text-right">
            <div>
              <p className="text-xs text-slate-500">Assistance & Réservations</p>
              <a href={telHref} className="text-sm font-bold text-slate-900 hover:text-amber-600 flex items-center gap-1.5 transition-colors">
                <Phone className="w-3.5 h-3.5 text-amber-500" /> {settings.phonePrimary}
              </a>
            </div>
          </div>

          <button
            onClick={onScrollToCatalog}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-md shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-slate-950" />
            Voir les Voitures
          </button>
        </div>
      </div>
    </header>
  );
};
