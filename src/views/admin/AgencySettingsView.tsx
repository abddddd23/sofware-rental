import React, { useState, useEffect } from 'react';
import type { AgencySettings } from '../../types';
import { defaultAgencySettings } from '../../types';
import { AgencySettingsService } from '../../services/dataService';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Save, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Globe, 
  Sparkles,
  ExternalLink,
  Gauge
} from 'lucide-react';

interface AgencySettingsViewProps {
  settings: AgencySettings;
}

export const AgencySettingsView: React.FC<AgencySettingsViewProps> = ({ settings }) => {
  const [formData, setFormData] = useState<AgencySettings>(() => settings || defaultAgencySettings);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [newCondition, setNewCondition] = useState('');

  // Synchroniser quand les props changent (ex: depuis Firestore)
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (field: keyof AgencySettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddCondition = () => {
    if (!newCondition.trim()) return;
    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition.trim()],
    }));
    setNewCondition('');
  };

  const handleRemoveCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const handleConditionChange = (index: number, val: string) => {
    setFormData(prev => {
      const updated = [...prev.conditions];
      updated[index] = val;
      return { ...prev, conditions: updated };
    });
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Voulez-vous réinitialiser tous les paramètres aux valeurs d\'origine ?')) {
      setFormData(defaultAgencySettings);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await AgencySettingsService.updateSettings(formData);
      setShowSavedToast(true);
      setTimeout(() => {
        setShowSavedToast(false);
      }, 4000);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde :', err);
      alert('Une erreur est survenue lors de l\'enregistrement des paramètres.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4 text-amber-400" />
            Configuration Agence & Showroom Web
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Paramètres de l'Agence
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Modifiez ici le nom, les téléphones, WhatsApp, horaires et conditions. Les changements apparaissent <strong className="text-emerald-400 font-semibold">immédiatement sur le site web public</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Valeurs par défaut
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-400/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4 text-slate-950" />
            )}
            {isSaving ? 'Enregistrement...' : 'Sauvegarder les modifications'}
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {showSavedToast && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 flex items-center justify-between shadow-lg shadow-emerald-950/40 animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-200">Paramètres sauvegardés avec succès !</p>
              <p className="text-xs text-emerald-400/80">Le site web public et le logiciel poste fixe sont désormais parfaitement synchronisés en temps réel.</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-900/50 px-3 py-1 rounded-full border border-emerald-500/20">
            Synchro Cloud OK
          </span>
        </div>
      )}

      {/* Form Grid */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne Principale (2 colonnes) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1 : Identité & Marque */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                1. Identité de l'Agence & Titre Public
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Nom commercial de l'agence *
                </label>
                <input
                  type="text"
                  required
                  value={formData.agencyName}
                  onChange={(e) => handleChange('agencyName', e.target.value)}
                  placeholder="Ex: AutoLoc Prestige"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">Apparaît sur le logo, la barre de navigation, l'en-tête et le pied de page.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Zone couverte / Badge d'accueil *
                </label>
                <input
                  type="text"
                  required
                  value={formData.zone}
                  onChange={(e) => handleChange('zone', e.target.value)}
                  placeholder="Ex: Alger & Environs • 7j/7"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">Affiché sous le logo dans la barre de navigation haute du site.</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Slogan ou phrase d'accroche principale *
                </label>
                <input
                  type="text"
                  required
                  value={formData.slogan}
                  onChange={(e) => handleChange('slogan', e.target.value)}
                  placeholder="Ex: Location de Voitures Récentes à Alger"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">Badge d'accroche visible dans la bannière vidéo du site public.</p>
              </div>
            </div>
          </div>

          {/* Section 2 : Coordonnées, Téléphones & WhatsApp */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Phone className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                2. Contact, Téléphones & WhatsApp Direct
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Téléphone Principal (Hotline Navbar & Footer) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.phonePrimary}
                  onChange={(e) => handleChange('phonePrimary', e.target.value)}
                  placeholder="Ex: 0555 00 11 22"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">Numéro cliquable directement depuis la barre de navigation.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Téléphone Secondaire (Footer)
                </label>
                <input
                  type="text"
                  value={formData.phoneSecondary}
                  onChange={(e) => handleChange('phoneSecondary', e.target.value)}
                  placeholder="Ex: 0770 12 34 56"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">Numéro complémentaire affiché dans le bas de page.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Numéro WhatsApp (Format international sans +) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">+</span>
                  <input
                    type="text"
                    required
                    value={formData.whatsappNumber}
                    onChange={(e) => handleChange('whatsappNumber', e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 213555001122"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px] text-slate-500">Pour l'Algérie : commence par 213 suivi des 9 chiffres.</p>
                  {formData.whatsappNumber && (
                    <a
                      href={`https://wa.me/${formData.whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      Tester le lien WhatsApp <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Adresse Email de contact *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Ex: contact@autoloc-algerie.com"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">Adresse électronique indiquée aux clients dans le footer.</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Adresse physique du local de l'agence *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Ex: Rue Djenane El Malik, Hydra, Alger"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">Adresse où les clients se rendent pour récupérer et restituer les voitures.</p>
              </div>
            </div>
          </div>

          {/* Section 3 : Horaires d'Ouverture & Accueil */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Clock className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                3. Horaires & Accueil Clients
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Horaires Semaine (Samedi - Jeudi) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.hoursWeekday}
                  onChange={(e) => handleChange('hoursWeekday', e.target.value)}
                  placeholder="Ex: Du Samedi au Jeudi : 08h00 - 20h00"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Horaires Vendredi *
                </label>
                <input
                  type="text"
                  required
                  value={formData.hoursWeekend}
                  onChange={(e) => handleChange('hoursWeekend', e.target.value)}
                  placeholder="Ex: Vendredi : 14h30 - 19h30"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Permanence spéciale / Aéroport *
                </label>
                <input
                  type="text"
                  required
                  value={formData.hoursNote}
                  onChange={(e) => handleChange('hoursNote', e.target.value)}
                  placeholder="Ex: Livraison aéroport Alger possible 24h/24 sur réservation"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">Mise en avant en vert sous les horaires dans le pied de page du site.</p>
              </div>
            </div>
          </div>

          {/* Section 4 : Forfait Kilométrique & Conditions de Location */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                4. Forfait Kilométrique & Conditions de Location
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Forfait Kilométrique Inclus (KM / Jour) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.dailyKmAllowance}
                    onChange={(e) => handleChange('dailyKmAllowance', Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    KM / Jour
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Ex: 100 km par jour = 1 000 km autorisés pour 10 jours de location.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Tarif du KM supplémentaire en dépassement *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.extraKmFee}
                    onChange={(e) => handleChange('extraKmFee', Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">
                    DA / KM
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Appliqué automatiquement dans le bon de retour lors du calcul de la pénalité.</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-400">
                Clauses et conditions de location affichées aux clients (Footer du site)
              </label>

              <div className="space-y-2">
                {formData.conditions.map((cond, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs font-mono w-5 text-right">{index + 1}.</span>
                    <input
                      type="text"
                      value={cond}
                      onChange={(e) => handleConditionChange(index, e.target.value)}
                      className="flex-1 px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(index)}
                      className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
                      title="Supprimer cette ligne"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Ajouter une nouvelle condition */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCondition(); } }}
                  placeholder="Ajouter une nouvelle clause (ex: Interdiction formelle de fumer)..."
                  className="flex-1 px-3.5 py-2 bg-slate-800/60 border border-dashed border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={handleAddCondition}
                  disabled={!newCondition.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-amber-400 disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Colonne Latérale : Aperçu en Direct (Showroom Live Preview) */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-6 sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Aperçu du Site Public
                </h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Temps Réel
              </span>
            </div>

            {/* Mockup Barre Haute (Navbar) */}
            <div className="p-3.5 rounded-xl bg-white text-slate-900 shadow-sm border border-slate-200 text-left space-y-2">
              <p className="text-[10px] font-bold uppercase text-slate-400">1. Barre de navigation haute</p>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <p className="text-xs font-black uppercase text-slate-900">
                    {formData.agencyName}
                  </p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-amber-500" /> {formData.zone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400">Assistance</p>
                  <p className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5 text-amber-500" /> {formData.phonePrimary}
                  </p>
                </div>
              </div>
            </div>

            {/* Mockup Bannière Hero */}
            <div className="p-3.5 rounded-xl bg-slate-800 text-white shadow-sm border border-slate-700 text-left space-y-2">
              <p className="text-[10px] font-bold uppercase text-amber-400">2. Bannière d'accueil (Hero)</p>
              <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-700/60">
                <span className="inline-block px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold mb-1">
                  {formData.slogan}
                </span>
                <p className="text-xs font-bold text-white">
                  Louez avec <span className="text-amber-400">{formData.agencyName}</span>
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold flex items-center gap-1">
                    WhatsApp: {formData.whatsappNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Mockup Pied de Page (Footer) */}
            <div className="p-3.5 rounded-xl bg-slate-100 text-slate-800 shadow-sm border border-slate-300 text-left space-y-2">
              <p className="text-[10px] font-bold uppercase text-slate-500">3. Pied de page (Footer)</p>
              <div className="space-y-1.5 text-[11px]">
                <p className="font-bold text-slate-900">{formData.agencyName}</p>
                <p className="text-slate-600 text-[10px] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-500 shrink-0" /> {formData.address}
                </p>
                <p className="text-slate-600 text-[10px] flex items-center gap-1">
                  <Phone className="w-3 h-3 text-amber-500 shrink-0" /> {formData.phonePrimary} / {formData.phoneSecondary}
                </p>
                <p className="text-slate-600 text-[10px] flex items-center gap-1">
                  <Mail className="w-3 h-3 text-amber-500 shrink-0" /> {formData.email}
                </p>
                <div className="pt-1 border-t border-slate-200">
                  <p className="font-semibold text-slate-800 text-[10px]">Horaires :</p>
                  <p className="text-slate-600 text-[9px]">{formData.hoursWeekday}</p>
                  <p className="text-slate-600 text-[9px]">{formData.hoursWeekend}</p>
                  <p className="text-emerald-700 font-bold text-[9px]">{formData.hoursNote}</p>
                </div>
              </div>
            </div>

            {/* Mockup Forfait Kilométrique */}
            <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-left space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold uppercase">
                <Gauge className="w-3.5 h-3.5" /> Forfait Kilométrique
              </div>
              <p className="text-xs font-semibold text-white">
                {formData.dailyKmAllowance} KM inclus / jour
              </p>
              <p className="text-[10px] text-slate-400">
                Dépassement : {formData.extraKmFee} DA par km supplémentaire
              </p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-400/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-950" />
              Enregistrer pour le Showroom
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
