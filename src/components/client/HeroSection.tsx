import React from 'react';
import type { AgencySettings } from '../../types';
import { defaultAgencySettings } from '../../types';
import { Calendar, Shield, Award, Clock, ArrowRight, MessageCircle } from 'lucide-react';

interface HeroSectionProps {
  onExploreClick: () => void;
  settings?: AgencySettings;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ 
  onExploreClick,
  settings = defaultAgencySettings 
}) => {
  const cleanWhatsapp = (settings.whatsappNumber || '213555001122').replace(/\D/g, '');
  const waUrl = `https://wa.me/${cleanWhatsapp}?text=Bonjour%20${encodeURIComponent(settings.agencyName)},%20je%20souhaite%20louer%20une%20voiture`;

  return (
    <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-slate-900">
      {/* Background Video CLAIRE & VIVIDE (Haute Visibilité) */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-90 pointer-events-none"
      >
        <source src="/72541-543403676_medium.mp4" type="video/mp4" />
      </video>

      {/* Dégradé subtil pour fondre doucement dans le blanc de la page */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-slate-50 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Boîte Centrale en Verre Dépoli Blanc (Texte Parfaitement Lisible) */}
        <div className="text-center max-w-3xl mx-auto bg-white/92 backdrop-blur-md rounded-3xl p-6 sm:p-10 shadow-2xl border border-white/60">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs font-bold uppercase tracking-wider mb-4">
            <Award className="w-4 h-4 text-amber-600" />
            {settings.slogan}
          </div>

          {/* Titre Principal */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Louez Votre Voiture en Toute Sérénité avec <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600">{settings.agencyName}</span>
          </h1>

          {/* Sous-titre */}
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-medium">
            Parc automobile premium, climatisé et rigoureusement entretenu. Réservez votre véhicule en quelques clics et prenez la route sans mauvaise surprise.
          </p>

          {/* Boutons d'Action */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onExploreClick}
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm sm:text-base font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-400/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Calendar className="w-5 h-5" />
              Consulter les Voitures Disponibles
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 text-sm sm:text-base font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors shadow-sm"
            >
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              Contact WhatsApp Direct
            </a>
          </div>
        </div>

        {/* Cartes de Confiance en Blanc */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">Assurance Tous Risques</p>
              <p className="text-[11px] text-slate-500">Couverture maximale incluse</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">Assistance 24h/24</p>
              <p className="text-[11px] text-slate-500">Partout en Algérie</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">Véhicules Révisés</p>
              <p className="text-[11px] text-slate-500">Vidange & contrôles à jour</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">Tarifs Dégressifs</p>
              <p className="text-[11px] text-slate-500">Remises dès 7 jours</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
