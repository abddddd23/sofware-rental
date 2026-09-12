import React, { useState, useEffect } from 'react';
import type { Car } from '../../types';
import { BookingService } from '../../services/dataService';
import { formatCurrency, calculateDaysBetween, formatDate } from '../../utils/formatters';
import { 
  X, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  CheckCircle, 
  Car as CarIcon, 
  AlertCircle,
  Info,
  ShieldCheck
} from 'lucide-react';

interface BookingModalProps {
  car: Car | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ 
  car, 
  isOpen, 
  onClose 
}) => {
  // Dates par défaut : Demain jusqu'à 3 jours plus tard
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultStart = tomorrow.toISOString().split('T')[0];

  const inFourDays = new Date();
  inFourDays.setDate(inFourDays.getDate() + 4);
  const defaultEnd = inFourDays.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [wilaya, setWilaya] = useState('Alger (16)');
  const [permitNumber, setPermitNumber] = useState('');
  const [notes, setNotes] = useState('');

  // États de validation et erreurs champ par champ
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Réinitialisation du formulaire à chaque ouverture
  useEffect(() => {
    if (isOpen && car) {
      setStartDate(defaultStart);
      setEndDate(defaultEnd);
      setName('');
      setPhone('');
      setEmail('');
      setWilaya('Alger (16)');
      setPermitNumber('');
      setNotes('');
      setFieldErrors({});
      setIsSubmitting(false);
      setIsSuccess(false);
      setSubmitError('');
    }
  }, [isOpen, car]);

  const days = calculateDaysBetween(startDate, endDate);
  const dailyRate = car?.pricePerDay || 7000;
  const estimatedTotal = days * dailyRate;

  // Information de disponibilité publique minimale (sans fuite PII)
  const isCurrentlyRented = car ? (car.status === 'RENTED' && Boolean(car.rentedUntil)) : false;
  const rentalWarning = isCurrentlyRented && car?.rentedUntil && startDate <= car.rentedUntil
    ? `Ce véhicule est actuellement loué jusqu'au ${formatDate(car.rentedUntil)}. L'agence vérifiera la disponibilité exacte lors de la confirmation téléphonique.`
    : null;

  // Validation détaillée champ par champ ("Warih wina h ghalt")
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Nom & Prénom
    if (!name.trim()) {
      errors.name = 'Veuillez saisir votre nom et prénom.';
    } else if (name.trim().length < 3) {
      errors.name = 'Le nom doit comporter au moins 3 caractères.';
    }

    // 2. Téléphone (Format Algérie : 05, 06, 07, 02X, etc.)
    const cleanPhone = phone.replace(/[\s\-.]/g, '');
    if (!cleanPhone) {
      errors.phone = 'Le numéro de téléphone est obligatoire.';
    } else if (!/^(0[567234]\d{8}|(?:\+?213)[567234]\d{8}|\d{9,12})$/.test(cleanPhone)) {
      errors.phone = 'Numéro invalide. Format attendu : 05 / 06 / 07 XX XX XX XX (10 chiffres)';
    }

    // 3. Email (Optionnel, mais si saisi, doit être valide)
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Format d\'adresse email invalide (ex: nom@domaine.com)';
    }

    // 4. Numéro de Permis de conduire (Optionnel)
    if (permitNumber.trim()) {
      if (!/^[a-zA-Z0-9/\-\s]{2,25}$/.test(permitNumber.trim())) {
        errors.permitNumber = 'Caractères non valides. Lettres et chiffres acceptés (ex: 16/123456 ou code biométrique)';
      }
    }

    // 5. Dates
    if (days <= 0 || new Date(startDate) > new Date(endDate)) {
      errors.dates = 'La date de restitution doit être postérieure à la date de prise en charge.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!car) return;

    const isValid = validateForm();
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await BookingService.createBooking({
        carId: car.id,
        carName: `${car.brand} ${car.model}`,
        carImage: car.imagesBase64?.[0] || '',
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        customerWilaya: wilaya,
        customerPermitNumber: permitNumber.trim() || undefined,
        startDate,
        endDate,
        totalDays: days,
        pricePerDay: car.pricePerDay,
        estimatedTotal,
        agencyNotes: notes.trim() ? `Note client : ${notes.trim()}` : undefined,
      });

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Erreur réservation :', err);
      setSubmitError('Une erreur est survenue lors de l\'enregistrement. Vos informations ont été mémorisées.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    onClose();
  };

  if (!isOpen || !car) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
      {/* Fenêtre Modale Adaptative (Hauteur max 92vh, aucun dézoom requis sur Chrome mobile ou PC) */}
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Fixe (Toujours visible en haut) */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            {car.imagesBase64?.[0] ? (
              <img 
                src={car.imagesBase64[0]} 
                alt={`${car.brand} ${car.model}`}
                className="w-12 h-10 object-cover rounded-lg border border-slate-200 shrink-0" 
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <CarIcon className="w-5 h-5 text-amber-500" />
              </div>
            )}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                Réservation : {car.brand} {car.model}
              </h3>
              <p className="text-xs text-slate-500">
                Année {car.year} • <strong className="text-slate-800">{formatCurrency(car.pricePerDay)}/jour</strong> • Caution {formatCurrency(car.caution)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200/60 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu */}
        {isSuccess ? (
          <div className="p-6 sm:p-8 text-center overflow-y-auto">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h4 className="text-2xl font-black text-slate-900">Demande Transmise avec Succès !</h4>
            <p className="mt-2 text-sm text-slate-600">
              Merci <span className="font-bold text-slate-900">{name}</span>. Votre demande de réservation pour la <span className="text-amber-600 font-bold">{car.brand} {car.model}</span> est bien enregistrée dans le logiciel de l'agence.
            </p>
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-700 space-y-1.5">
              <p><strong className="text-slate-900">Période :</strong> Du {formatDate(startDate)} au {formatDate(endDate)} ({days} jour{days > 1 ? 's' : ''})</p>
              <p><strong className="text-slate-900">Montant total estimé :</strong> {formatCurrency(estimatedTotal)}</p>
              <p><strong className="text-slate-900">Téléphone de contact :</strong> {phone}</p>
              {permitNumber && (
                <p><strong className="text-slate-900">N° de permis transmis :</strong> {permitNumber}</p>
              )}
            </div>
            <p className="mt-4 text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Notre équipe va vous contacter par téléphone pour confirmer la remise des clés.
            </p>
            <button
              onClick={handleReset}
              className="mt-6 w-full py-3 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl transition-colors shadow-md shadow-amber-400/20 cursor-pointer"
            >
              Fermer et Retourner aux Voitures
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            {/* Corps Déroulant (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
              
              {/* Information de Disponibilité / Avertissement si véhicule en cours de location */}
              {rentalWarning && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-950 font-bold block mb-0.5">Information sur la disponibilité</strong>
                    <span>{rentalWarning}</span>
                  </div>
                </div>
              )}

              {/* Erreur de Soumission Globale si nécessaire */}
              {submitError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Récapitulatif Tarif & Caution */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <span className="text-slate-500 font-medium">Tarif journalier</span>
                  <p className="text-sm sm:text-base font-bold text-slate-900">{formatCurrency(car.pricePerDay)} / jour</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-medium">Caution requise</span>
                  <p className="text-sm sm:text-base font-bold text-amber-600">{formatCurrency(car.caution)}</p>
                </div>
              </div>

              {/* Dates de Prise en Charge et Restitution */}
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      <Calendar className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                      Date de prise en charge *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        clearFieldError('dates');
                      }}
                      className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none transition-colors ${
                        fieldErrors.dates
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                          : 'border-slate-300 focus:border-amber-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      <Calendar className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                      Date de restitution *
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        clearFieldError('dates');
                      }}
                      className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none transition-colors ${
                        fieldErrors.dates
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                          : 'border-slate-300 focus:border-amber-400'
                      }`}
                    />
                  </div>
                </div>

                {fieldErrors.dates && (
                  <p className="text-xs text-rose-600 flex items-center gap-1 mt-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {fieldErrors.dates}
                  </p>
                )}
              </div>

              {/* Estimation Total & Forfait Kilométrique Inclus */}
              <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-700 font-medium">
                    Durée : <strong className="text-slate-900">{days} jour{days > 1 ? 's' : ''}</strong>
                  </span>
                  <span className="text-amber-700 font-bold text-sm sm:text-base">
                    Total Estimé : {formatCurrency(estimatedTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 border-t border-amber-200/60 pt-1 font-medium">
                  <span>🛣️ Forfait inclus :</span>
                  <strong className="text-slate-900 font-mono">{days * 100} km (100 km / jour)</strong>
                </div>
              </div>

              {/* Coordonnées Client */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Vos Coordonnées
                </h4>

                {/* Champ Nom & Prénom */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    <User className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                    Nom & Prénom *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Yacine Benali"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearFieldError('name');
                    }}
                    className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none transition-colors ${
                      fieldErrors.name
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                        : 'border-slate-300 focus:border-amber-400'
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-xs text-rose-600 flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                {/* Téléphone & Wilaya */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      <Phone className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                      Numéro de Téléphone *
                    </label>
                    <input
                      type="tel"
                      placeholder="05 / 06 / 07 XX XX XX XX"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        clearFieldError('phone');
                      }}
                      className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none transition-colors ${
                        fieldErrors.phone
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                          : 'border-slate-300 focus:border-amber-400'
                      }`}
                    />
                    {fieldErrors.phone && (
                      <p className="text-xs text-rose-600 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {fieldErrors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      <MapPin className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                      Wilaya de Résidence
                    </label>
                    <select
                      value={wilaya}
                      onChange={(e) => setWilaya(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="Alger (16)">16 - Alger</option>
                      <option value="Blida (09)">09 - Blida</option>
                      <option value="Boumerdès (35)">35 - Boumerdès</option>
                      <option value="Tipaza (42)">42 - Tipaza</option>
                      <option value="Oran (31)">31 - Oran</option>
                      <option value="Constantine (25)">25 - Constantine</option>
                      <option value="Sétif (19)">19 - Sétif</option>
                      <option value="Tizi Ouzou (15)">15 - Tizi Ouzou</option>
                      <option value="Béjaïa (06)">06 - Béjaïa</option>
                      <option value="Annaba (23)">23 - Annaba</option>
                      <option value="Chlef (02)">02 - Chlef</option>
                      <option value="Autre wilaya">Autre Wilaya</option>
                    </select>
                  </div>
                </div>

                {/* Email & Permis de Conduire */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email (Optionnel)
                    </label>
                    <input
                      type="email"
                      placeholder="exemple@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFieldError('email');
                      }}
                      className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none transition-colors ${
                        fieldErrors.email
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                          : 'border-slate-300 focus:border-amber-400'
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="text-xs text-rose-600 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>
                        <CreditCard className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                        N° Permis de conduire (Optionnel)
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Lettres & Chiffres OK</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 16/123456 ou code biométrique"
                      value={permitNumber}
                      onChange={(e) => {
                        setPermitNumber(e.target.value);
                        clearFieldError('permitNumber');
                      }}
                      className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none transition-colors ${
                        fieldErrors.permitNumber
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                          : 'border-slate-300 focus:border-amber-400'
                      }`}
                    />
                    {fieldErrors.permitNumber ? (
                      <p className="text-xs text-rose-600 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {fieldErrors.permitNumber}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1">
                        Permis classique ou biométrique. Peut être présenté le jour de la prise en charge.
                      </p>
                    )}
                  </div>
                </div>

                {/* Remarques particulières */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Remarques ou besoins particuliers (Aéroport, siège bébé...)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Précisez ici vos besoins (ex: Arrivée aéroport Houari Boumediene vers 14h)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>
              </div>

            </div>

            {/* Pied de Page Fixe (Bouton d'envoi TOUJOURS VISIBLE sans dézoomer) */}
            <div className="shrink-0 p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200">
              <button
                type="submit"
                disabled={isSubmitting || days <= 0}
                className={`w-full py-3.5 px-4 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 cursor-pointer ${
                  days <= 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-400/25 active:scale-[0.99]'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Envoi de votre réservation en cours...
                  </span>
                ) : days <= 0 ? (
                  <span>Dates invalides</span>
                ) : (
                  <span>Envoyer ma Demande de Réservation</span>
                )}
              </button>
              <p className="text-[11px] text-slate-500 text-center mt-1.5 font-medium">
                Zéro paiement en ligne • Règlement à la prise du véhicule avec l'agence
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
