import React from 'react';
import type { AgencySettings } from '../../types';
import { defaultAgencySettings } from '../../types';
import { Car, Phone, Mail, MapPin, ShieldCheck, Clock } from 'lucide-react';

interface ClientFooterProps {
  settings?: AgencySettings;
}

export const ClientFooter: React.FC<ClientFooterProps> = ({ 
  settings = defaultAgencySettings 
}) => {
  const primaryTelHref = settings.phonePrimary ? `tel:${settings.phonePrimary.replace(/\s+/g, '')}` : 'tel:0555001122';

  return (
    <footer className="bg-slate-100 border-t border-slate-200 pt-16 pb-12 text-slate-600 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Logo & Présentation */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Car className="w-6 h-6 text-amber-500" />
              </div>
              <span className="text-lg font-black tracking-tight text-slate-900 uppercase">
                {settings.agencyName}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Votre agence de référence pour la location de véhicules récents, citadines, berlines et SUV en Algérie. Service personnalisé et assistance continue.
            </p>
          </div>

          {/* Conditions de Location */}
          <div className="space-y-3">
            <h4 className="text-slate-900 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              Conditions de Location
            </h4>
            <ul className="text-xs space-y-2 text-slate-600">
              {settings.conditions && settings.conditions.length > 0 ? (
                settings.conditions.map((cond, index) => (
                  <li key={index} className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{cond}</span>
                  </li>
                ))
              ) : (
                <>
                  <li>• Âge minimum : 23 ans avec permis valide</li>
                  <li>• Caution obligatoire restituée au retour</li>
                  <li>• Pièce d'identité biométrique + Permis obligatoires</li>
                  <li>• Forfait kilométrique standard : {settings.dailyKmAllowance} km / jour</li>
                </>
              )}
            </ul>
          </div>

          {/* Horaires & Accueil */}
          <div className="space-y-3">
            <h4 className="text-slate-900 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Horaires & Accueil
            </h4>
            <div className="text-xs space-y-2 text-slate-600">
              <p>{settings.hoursWeekday}</p>
              <p>{settings.hoursWeekend}</p>
              {settings.hoursNote && (
                <p className="text-emerald-700 font-bold mt-2">{settings.hoursNote}</p>
              )}
            </div>
          </div>

          {/* Coordonnées de contact */}
          <div className="space-y-3">
            <h4 className="text-slate-900 font-bold text-sm uppercase tracking-wider">Contactez l'Agence</h4>
            <div className="text-xs space-y-2.5 text-slate-600">
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{settings.address}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                <a href={primaryTelHref} className="text-slate-900 font-bold hover:text-amber-600 transition-colors">
                  {settings.phonePrimary} {settings.phoneSecondary ? `/ ${settings.phoneSecondary}` : ''}
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                <a href={`mailto:${settings.email}`} className="hover:text-amber-600 transition-colors">
                  {settings.email}
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} {settings.agencyName} Algérie. Tous droits réservés.</p>
          <p className="text-slate-600 font-medium">
            Réservation de véhicules en ligne 7j/7
          </p>
        </div>
      </div>
    </footer>
  );
};
