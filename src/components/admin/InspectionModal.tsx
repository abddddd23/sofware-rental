import React, { useState, useEffect } from 'react';
import type { Car, BookingDemand, RentalContract, FuelLevel, CarDamagePoint, PaymentStatus } from '../../types';
import { RentalService } from '../../services/dataService';
import { formatCurrency, calculateDaysBetween, formatMileage } from '../../utils/formatters';
import { X, ShieldCheck, Gauge, DollarSign, AlertTriangle, AlertCircle, Shield, CheckCircle2, Banknote } from 'lucide-react';

interface InspectionModalProps {
  mode: 'departure' | 'return';
  car?: Car | null;
  booking?: BookingDemand | null;
  activeContract?: RentalContract | null;
  availableCars: Car[];
  isOpen: boolean;
  onClose: () => void;
  onContractCreated?: (contract: RentalContract) => void;
  onContractUpdated?: (contract: RentalContract) => void;
  dailyKmAllowance?: number;
  extraKmFee?: number;
}

export const InspectionModal: React.FC<InspectionModalProps> = ({
  mode,
  car,
  booking,
  activeContract,
  availableCars,
  isOpen,
  onClose,
  onContractCreated,
  onContractUpdated,
  dailyKmAllowance = 100,
  extraKmFee = 25,
}) => {
  // Règle d'agence paramétrable
  const KM_PER_DAY_ALLOWANCE = dailyKmAllowance;

  // INITIALISATION MODE DÉPART
  const [selectedCarId, setSelectedCarId] = useState<string>(
    car?.id || booking?.carId || (availableCars.length > 0 ? availableCars[0].id : '')
  );
  const targetCar = car || availableCars.find((c) => c.id === selectedCarId);

  const [customerName, setCustomerName] = useState(booking?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(booking?.customerPhone || '');
  const [customerNationalId, setCustomerNationalId] = useState('');
  const [customerPermitNumber, setCustomerPermitNumber] = useState(booking?.customerPermitNumber || '');
  const [startDate, setStartDate] = useState(booking?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    booking?.endDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );
  
  const days = calculateDaysBetween(startDate, endDate);
  const dailyRate = targetCar?.pricePerDay || 7000;
  const totalAmount = days * dailyRate;

  const [departureKm, setDepartureKm] = useState<number>(targetCar?.currentMileage || 30000);
  const [departureFuel, setDepartureFuel] = useState<FuelLevel>('Plein');
  // Section Paiement Location (Kré) - Raccourci sélectionné & Acompte
  const [paymentOption, setPaymentOption] = useState<'full' | 'half' | 'zero' | 'custom'>('full');
  const [advancePaid, setAdvancePaid] = useState<number>(totalAmount);
  // Section Caution (Dépôt de garantie indépendant)
  const [cautionAmount, setCautionAmount] = useState<number>(targetCar?.caution || 30000);
  const [cautionType, setCautionType] = useState<'especes' | 'cheque' | 'passeport' | 'autre'>('especes');
  const [departureNotes, setDepartureNotes] = useState('');
  
  // Rayures / Dégâts constatés
  const [damages, setDamages] = useState<CarDamagePoint[]>([]);
  const [damageLocation, setDamageLocation] = useState<CarDamagePoint['location']>('avant');
  const [damageType, setDamageType] = useState<CarDamagePoint['type']>('rayure');
  const [damageDesc, setDamageDesc] = useState('');

  // INITIALISATION MODE RETOUR (Check-in)
  const [returnKm, setReturnKm] = useState<number>(
    activeContract ? activeContract.departureKm + (activeContract.totalDays * KM_PER_DAY_ALLOWANCE) : 30500
  );
  const [returnFuel, setReturnFuel] = useState<FuelLevel>('Plein');
  const [returnNotes, setReturnNotes] = useState('');
  const [extraFees, setExtraFees] = useState<number>(0);
  const [penaltyReason, setPenaltyReason] = useState('');
  const [settlePayment, setSettlePayment] = useState<boolean>(true); // Encaisser le solde restant
  const [postReturnStatus, setPostReturnStatus] = useState<'AVAILABLE' | 'MAINTENANCE'>('AVAILABLE');

  // Gestion Restitution de la Caution au retour ("Rdolah caution si loto jat kima madinaha")
  const [cautionAction, setCautionAction] = useState<'return_full' | 'deduct'>('return_full');
  const [cautionDeduction, setCautionDeduction] = useState<number>(0);
  const [cautionDeductionReason, setCautionDeductionReason] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Synchronisation des champs mode départ à l'ouverture ou changement de cible
  useEffect(() => {
    if (mode === 'departure' && isOpen) {
      setSelectedCarId(car?.id || booking?.carId || (availableCars.length > 0 ? availableCars[0].id : ''));
      setCustomerName(booking?.customerName || '');
      setCustomerPhone(booking?.customerPhone || '');
      setCustomerNationalId('');
      setCustomerPermitNumber(booking?.customerPermitNumber || '');
      setStartDate(booking?.startDate || new Date().toISOString().split('T')[0]);
      setEndDate(booking?.endDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]);
      setDepartureNotes('');
      setDamages([]);
      setPaymentOption('full');
      setErrorMessage('');
    }
  }, [mode, isOpen, booking, car]);

  // Synchronisation du KM et de la caution dès que le véhicule change
  useEffect(() => {
    if (mode === 'departure' && targetCar) {
      setDepartureKm(targetCar.currentMileage);
      if (targetCar.caution) {
        setCautionAmount(targetCar.caution);
      }
    }
  }, [mode, targetCar, selectedCarId]);

  // Synchronisation immédiate du montant encaissé (acompte/solde) dès que les dates ou le véhicule changent
  useEffect(() => {
    if (mode === 'departure') {
      if (paymentOption === 'full') {
        setAdvancePaid(totalAmount);
      } else if (paymentOption === 'half') {
        setAdvancePaid(Math.round(totalAmount * 0.5));
      } else if (paymentOption === 'zero') {
        setAdvancePaid(0);
      } else {
        setAdvancePaid((prev) => Math.min(totalAmount, prev));
      }
    }
  }, [totalAmount, paymentOption, mode]);

  // Synchronisation du KM de retour estimé et reset caution dès que le contrat actif change
  useEffect(() => {
    if (mode === 'return' && activeContract && isOpen) {
      const allowed = (activeContract.totalDays || 1) * KM_PER_DAY_ALLOWANCE;
      setReturnKm(activeContract.departureKm + allowed);
      setReturnFuel('Plein');
      setReturnNotes('');
      setExtraFees(0);
      setPenaltyReason('');
      setSettlePayment(true);
      setPostReturnStatus('AVAILABLE');
      setCautionAction('return_full');
      setCautionDeduction(0);
      setCautionDeductionReason('');
      setErrorMessage('');
    }
  }, [mode, isOpen, activeContract]);

  // Ajout d'un point de dégât
  const handleAddDamage = () => {
    if (!damageDesc.trim()) return;
    const newDamage: CarDamagePoint = {
      id: 'dmg_' + Date.now().toString(36),
      location: damageLocation,
      type: damageType,
      description: damageDesc,
    };
    setDamages([...damages, newDamage]);
    setDamageDesc('');
  };

  const handleRemoveDamage = (id: string) => {
    setDamages(damages.filter((d: CarDamagePoint) => d.id !== id));
  };

  // Soumission Bon de Sortie (Check-out)
  const handleDepartureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCar) {
      setErrorMessage('Veuillez sélectionner un véhicule valide.');
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage('Le nom complet du client est obligatoire.');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMessage('Le numéro de téléphone du client est obligatoire.');
      return;
    }
    if (days <= 0) {
      setErrorMessage('La date de restitution doit être postérieure à la date de départ.');
      return;
    }
    if (Number(departureKm) < 0) {
      setErrorMessage('Le kilométrage au compteur ne peut pas être négatif.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const adv = Math.min(totalAmount, Math.max(0, Number(advancePaid)));
      const rem = Math.max(0, totalAmount - adv);
      const paymentStatus: PaymentStatus = adv >= totalAmount ? 'PAID' : adv > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

      const contractPayload: any = {
        carId: targetCar.id,
        carName: `${targetCar.brand} ${targetCar.model}`,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerNationalId: customerNationalId.trim(),
        customerPermitNumber: customerPermitNumber.trim(),
        startDate,
        endDate,
        totalDays: days,
        dailyRate,
        totalAmount,
        advancePaid: adv,
        remainingAmount: rem,
        cautionAmount: Number(cautionAmount),
        cautionType,
        cautionStatus: 'held',
        paymentStatus,
        status: 'active',
        departureKm: Number(departureKm),
        departureFuel,
        departureNotes: departureNotes || '',
        departureDamages: damages || [],
      };

      if (booking?.id) {
        contractPayload.bookingId = booking.id;
      }

      const newContractId = await RentalService.createContract(contractPayload);
      
      const createdContract: RentalContract = {
        ...contractPayload,
        id: newContractId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (onContractCreated) {
        onContractCreated(createdContract);
      }

      onClose();
    } catch (err: any) {
      console.error('Erreur validation contrat:', err);
      setErrorMessage(err?.message || 'Une erreur est survenue lors de la validation du bon de sortie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Soumission Bon de Retour (Check-in)
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContract) {
      setErrorMessage('Aucun contrat actif sélectionné.');
      return;
    }
    if (Number(returnKm) < activeContract.departureKm) {
      setErrorMessage(`Le kilométrage de retour (${formatMileage(Number(returnKm))}) ne peut pas être inférieur au kilométrage de départ (${formatMileage(activeContract.departureKm)}).`);
      return;
    }
    if (cautionAction === 'deduct') {
      const deductionNum = Number(cautionDeduction || 0);
      if (deductionNum <= 0) {
        setErrorMessage('Veuillez renseigner un montant de retenue supérieur à 0 DA.');
        return;
      }
      if (deductionNum > (activeContract.cautionAmount || 0)) {
        setErrorMessage(`Le montant retenu (${formatCurrency(deductionNum)}) ne peut pas excéder la caution initiale (${formatCurrency(activeContract.cautionAmount || 0)}).`);
        return;
      }
      if (!cautionDeductionReason.trim()) {
        setErrorMessage('Veuillez spécifier le motif de la retenue sur la caution.');
        return;
      }
    }
    if (Number(extraFees || 0) > 0 && !penaltyReason.trim()) {
      setErrorMessage('Veuillez préciser le motif des frais supplémentaires.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const cautionStatus = cautionAction === 'return_full' ? 'returned' : 'deducted';
      const cautionRetainedAmount = cautionAction === 'deduct' ? Number(cautionDeduction || 0) : 0;
      const cautionReturnedAmount = cautionAction === 'return_full'
        ? (activeContract.cautionAmount || 0)
        : Math.max(0, (activeContract.cautionAmount || 0) - cautionRetainedAmount);
      const cautionNotes = cautionAction === 'deduct'
        ? `Retenue de ${formatCurrency(cautionRetainedAmount)} gardée définitivement : ${cautionDeductionReason || 'Dégâts constatés'}`
        : 'Caution intégralement restituée (véhicule conforme)';

      await RentalService.completeContract(activeContract.id, {
        returnKm: Number(returnKm),
        returnFuel: returnFuel,
        returnNotes: returnNotes || '',
        extraFees: Number(extraFees || 0),
        penaltyReason: penaltyReason || '',
        settlePayment,
        postReturnStatus,
        cautionStatus,
        cautionReturnedAmount,
        cautionRetainedAmount,
        cautionNotes,
      });

      if (onContractUpdated) {
        onContractUpdated({
          ...activeContract,
          status: 'completed',
          returnDateActual: new Date().toISOString(),
          returnKm: Number(returnKm),
          returnFuel: returnFuel,
          returnNotes: returnNotes || '',
          extraFees: Number(extraFees || 0),
          penaltyReason: penaltyReason || '',
          paymentStatus: settlePayment ? 'PAID' : activeContract.paymentStatus,
          remainingAmount: settlePayment ? 0 : activeContract.remainingAmount,
          cautionStatus,
          cautionReturnedAmount,
          cautionRetainedAmount,
          cautionNotes,
        });
      }

      onClose();
    } catch (err: any) {
      console.error('Erreur clôture contrat:', err);
      setErrorMessage(err?.message || 'Une erreur est survenue lors de la clôture du contrat.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              mode === 'departure' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'departure' ? 'Bon d\'État & Contrat de Départ (Sortie)' : 'Bon d\'État de Clôture & Restitution (Retour)'}
              </h3>
              <p className="text-xs text-slate-400">
                {mode === 'departure' 
                  ? 'Met automatiquement le véhicule en statut « Loué » sur le showroom' 
                  : 'Rend le véhicule immédiatement disponible et met à jour le KM'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-400 text-xs shrink-0 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Content */}
        {mode === 'departure' ? (
          /* FORMULAIRE DE SORTIE */
          <form onSubmit={handleDepartureSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 overscroll-contain">
              {/* Choix Véhicule */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
              <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
                Véhicule à Louer
              </label>
              {car ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{car.brand} {car.model} ({car.matricule})</p>
                    <p className="text-xs text-slate-400">Kilométrage actuel : {formatMileage(car.currentMileage)}</p>
                  </div>
                  <span className="text-sm font-bold text-amber-400">{formatCurrency(car.pricePerDay)} / j</span>
                </div>
              ) : (
                <select
                  value={selectedCarId}
                  onChange={(e) => {
                    setSelectedCarId(e.target.value);
                    const c = availableCars.find((x) => x.id === e.target.value);
                    if (c) setDepartureKm(c.currentMileage);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  {availableCars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} {c.model} - {c.matricule} ({formatCurrency(c.pricePerDay)}/j)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Coordonnées Client */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Informations Locataire</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Nom & Prénom *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">N° Carte d'identité / Passeport</label>
                  <input
                    type="text"
                    placeholder="1098..."
                    value={customerNationalId}
                    onChange={(e) => setCustomerNationalId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">N° Permis de conduire</label>
                  <input
                    type="text"
                    placeholder="16/..."
                    value={customerPermitNumber}
                    onChange={(e) => setCustomerPermitNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Période */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Date Départ</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Date Retour Prévue</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Inspection Compteur & Essence */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Gauge className="w-4 h-4" />
                Contrôle au Départ
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Kilométrage Compteur (KM) *</label>
                  <input
                    type="number"
                    value={departureKm}
                    onChange={(e) => setDepartureKm(Number(e.target.value))}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Jauge Carburant</label>
                  <select
                    value={departureFuel}
                    onChange={(e) => setDepartureFuel(e.target.value as FuelLevel)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Plein">Plein (100%)</option>
                    <option value="3/4">3/4</option>
                    <option value="1/2">1/2</option>
                    <option value="1/4">1/4 (Réserve)</option>
                  </select>
                </div>
              </div>

              {/* Forfait kilométrique inclus */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-slate-300">
                  🛣️ Forfait inclus : <strong>{KM_PER_DAY_ALLOWANCE} km / jour</strong> (soit <strong>{days * KM_PER_DAY_ALLOWANCE} km</strong> autorisés pour {days} jours)
                </span>
                <span className="text-amber-400 font-bold font-mono">
                  Compteur max sans frais : {formatMileage(Number(departureKm) + (days * KM_PER_DAY_ALLOWANCE))}
                </span>
              </div>
            </div>

            {/* Dégâts existants (Relevé d'état) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Rayures & Dégâts Préexistants (Pour éviter tout litige)
                </h4>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={damageLocation}
                  onChange={(e) => setDamageLocation(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  <option value="avant">Avant</option>
                  <option value="arriere">Arrière</option>
                  <option value="cote_gauche">Côté Gauche</option>
                  <option value="cote_droit">Côté Droit</option>
                  <option value="toit">Toit</option>
                  <option value="pare_brise">Pare-brise</option>
                  <option value="interieur">Intérieur</option>
                </select>

                <select
                  value={damageType}
                  onChange={(e) => setDamageType(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  <option value="rayure">Rayure</option>
                  <option value="enfoncement">Enfoncement</option>
                  <option value="fissure">Fissure</option>
                  <option value="tache">Tache</option>
                  <option value="autre">Autre</option>
                </select>

                <input
                  type="text"
                  placeholder="Description (ex: rayure légère porte passager)"
                  value={damageDesc}
                  onChange={(e) => setDamageDesc(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                />

                <button
                  type="button"
                  onClick={handleAddDamage}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl text-xs font-bold"
                >
                  + Noter
                </button>
              </div>

              {damages.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {damages.map((d: CarDamagePoint) => (
                    <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
                      <span>
                        <strong className="capitalize text-amber-400">{d.location}</strong> ({d.type}) : {d.description}
                      </span>
                      <button type="button" onClick={() => handleRemoveDamage(d.id)} className="text-rose-400 hover:underline">
                        Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 1. PAIEMENT LOCATION (KRÉ) - SÉPARÉ */}
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-700/60 pb-2.5">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    1. Prix de la Location (Kré)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Durée : <strong className="text-white">{days} jour{days > 1 ? 's' : ''}</strong> × {formatCurrency(dailyRate)}/j
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-slate-400 block">Total Location</span>
                  <span className="text-base font-black text-amber-400">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* Raccourcis rapides d'encaissement */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentOption('full');
                    setAdvancePaid(totalAmount);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    paymentOption === 'full' || advancePaid === totalAmount
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  🟢 Tout payé d'avance ({formatCurrency(totalAmount)})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentOption('half');
                    setAdvancePaid(Math.round(totalAmount * 0.5));
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    paymentOption === 'half' || (advancePaid === Math.round(totalAmount * 0.5) && advancePaid !== totalAmount)
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  🟠 Acompte 50% ({formatCurrency(Math.round(totalAmount * 0.5))})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentOption('zero');
                    setAdvancePaid(0);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    paymentOption === 'zero' || advancePaid === 0
                      ? 'bg-slate-200 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  ⚪ 0 DA (Règlement au retour)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs text-slate-300 mb-1 font-semibold">
                    Montant Encaissé au Départ (DA) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={totalAmount}
                    value={advancePaid}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      setPaymentOption('custom');
                      setAdvancePaid(Math.min(totalAmount, val));
                    }}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex flex-col justify-center p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                  <span className="text-slate-400">Reste dû sur la location :</span>
                  <span className={`text-sm font-black ${totalAmount - advancePaid > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {totalAmount - advancePaid > 0 ? formatCurrency(totalAmount - advancePaid) : '0 DA (Soldé)'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {advancePaid >= totalAmount ? '✅ Location 100% payée d\'avance' : 'À régler au retour du véhicule'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. LA CAUTION (DÉPÔT DE GARANTIE) - SÉPARÉE DE LA LOCATION */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="border-b border-amber-500/20 pb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-400" />
                  2. La Caution (Dépôt de Garantie - Indépendant)
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Gardé en sécurité par l'agence et <strong>restitué à 100% au client au retour</strong> si le véhicule revient conforme.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1 font-semibold">
                    Montant Caution Reçue (DA) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={cautionAmount}
                    onChange={(e) => setCautionAmount(Math.max(0, Number(e.target.value)))}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1 font-semibold">
                    Type de Caution Déposée
                  </label>
                  <select
                    value={cautionType}
                    onChange={(e) => setCautionType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="especes">💵 Espèces (Liquide gardé en coffre)</option>
                    <option value="cheque">📑 Chèque de caution</option>
                    <option value="passeport">🛂 Passeport / Pièce d'identité originale</option>
                    <option value="autre">📝 Autre garantie</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. RÉCAPITULATIF ENCAISSEMENT AU DÉPART */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Location encaissée au départ :</span>
                <span className="font-bold text-white">{formatCurrency(advancePaid)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Caution reçue ({cautionType === 'especes' ? 'en espèces' : cautionType === 'cheque' ? 'en chèque' : 'en passeport'}) :</span>
                <span className="font-bold text-amber-400">{formatCurrency(cautionAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-black border-t border-slate-800 pt-2 text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <Banknote className="w-4 h-4" />
                  Total espèces reçu en main propre au départ :
                </span>
                <span>
                  {formatCurrency(advancePaid + (cautionType === 'especes' ? cautionAmount : 0))}
                </span>
              </div>
              {cautionType !== 'especes' && (
                <p className="text-[10px] text-slate-400 italic">
                  * Dont {formatCurrency(advancePaid)} en espèces pour la location + garantie déposée sous forme de {cautionType}.
                </p>
              )}
            </div>
          </div>

          {/* Footer submit (Fixe en bas) */}
          <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-950/70 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-400/20 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Validation...' : 'Valider le Bon de Sortie & Bloquer la Voiture'}
            </button>
          </div>
        </form>
      ) : (
        /* FORMULAIRE DE RETOUR (CHECK-IN) */
        <form onSubmit={handleReturnSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 overscroll-contain">
            {activeContract && (
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2 text-xs">
                <p><strong className="text-white">Véhicule :</strong> {activeContract.carName}</p>
                <p><strong className="text-white">Locataire :</strong> {activeContract.customerName} ({activeContract.customerPhone})</p>
                <p><strong className="text-white">KM au départ :</strong> {formatMileage(activeContract.departureKm)}</p>
                <p><strong className="text-white">Reste dû prévu :</strong> {formatCurrency(activeContract.remainingAmount)}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Kilométrage Compteur au Retour (KM) *</label>
                <input
                  type="number"
                  value={returnKm}
                  min={activeContract?.departureKm || 0}
                  onChange={(e) => setReturnKm(Number(e.target.value))}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-bold text-amber-400"
                />
                {activeContract && (
                  <span className="text-[11px] text-slate-400">
                    Distance parcourue : {formatMileage(returnKm - activeContract.departureKm)}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Niveau Essence au Retour</label>
                <select
                  value={returnFuel}
                  onChange={(e) => setReturnFuel(e.target.value as FuelLevel)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Plein">Plein (100%)</option>
                  <option value="3/4">3/4</option>
                  <option value="1/2">1/2</option>
                  <option value="1/4">1/4 (Réserve)</option>
                </select>
              </div>
            </div>

            {/* Calcul automatique du Forfait Kilométrique & Dépassement */}
            {activeContract && (() => {
              const actualKmDriven = Math.max(0, returnKm - activeContract.departureKm);
              const allowedKm = activeContract.totalDays * KM_PER_DAY_ALLOWANCE;
              const excessKm = Math.max(0, actualKmDriven - allowedKm);

              return (
                <div className="space-y-2">
                  {excessKm > 0 ? (
                    <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-rose-300 font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          Dépassement de Forfait Kilométrique !
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-rose-500/30 text-rose-200 font-mono font-bold text-xs">
                          +{excessKm} km en surplus
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Forfait inclus : <strong>{allowedKm} km</strong> ({activeContract.totalDays} jours × {KM_PER_DAY_ALLOWANCE} km/j). Distance réelle parcourue : <strong>{actualKmDriven} km</strong>.
                      </p>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-rose-500/20">
                        <span className="text-xs text-amber-400 font-bold">
                          Pénalité calculée ({extraKmFee} DA / km) : {formatCurrency(excessKm * extraKmFee)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const fee = excessKm * extraKmFee;
                            setExtraFees(fee);
                            setPenaltyReason(`Dépassement de forfait de ${excessKm} km (${extraKmFee} DA/km)`);
                          }}
                          className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                        >
                          Facturer ce dépassement (+{formatCurrency(excessKm * extraKmFee)})
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <ShieldCheck className="w-4 h-4" />
                        Respect du forfait ({actualKmDriven} km réels / {allowedKm} km autorisés)
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        Marge restante : {allowedKm - actualKmDriven} km
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Frais supplémentaires éventuels */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pénalités ou Frais Additionnels (Optionnel)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Frais Supplémentaires (DA)</label>
                  <input
                    type="number"
                    value={extraFees}
                    onChange={(e) => setExtraFees(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-rose-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Motif (Retard, Manque essence, Lavage...)</label>
                  <input
                    type="text"
                    placeholder="Ex: Retour avec 3h de retard"
                    value={penaltyReason}
                    onChange={(e) => setPenaltyReason(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
            </div>

            {/* Remarques */}
            <div>
              <label className="block text-xs text-slate-300 mb-1">Remarques de Clôture</label>
              <textarea
                rows={2}
                placeholder="État général au retour..."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white resize-none"
              />
            </div>

            {/* 1. RÈGLEMENT DU SOLDE LOCATION (KRÉ) */}
            {activeContract && (
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    1. Règlement Solde Location (Kré)
                  </h4>
                  <span className="text-xs text-slate-300">
                    Déjà versé au départ : <strong className="text-emerald-400">{formatCurrency(activeContract.advancePaid)}</strong>
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-700">
                  <div>
                    <span className="text-xs text-slate-400 block">Total Solde Location à Encaisser :</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black text-amber-400">
                        {formatCurrency(activeContract.remainingAmount + Number(extraFees || 0))}
                      </span>
                      {Number(extraFees || 0) > 0 && (
                        <span className="text-[11px] text-rose-400">
                          (dont +{formatCurrency(extraFees || 0)} pénalités / surplus)
                        </span>
                      )}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3.5 py-2.5 rounded-xl border border-emerald-500/20">
                    <input
                      type="checkbox"
                      checked={settlePayment}
                      onChange={(e) => setSettlePayment(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    Encaisser le solde & marquer la location PAYÉE
                  </label>
                </div>
              </div>
            )}

            {/* 2. RESTITUTION DE LA CAUTION ("Rdolah caution si loto jat kima madinaha") */}
            {activeContract && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="border-b border-amber-500/20 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-400" />
                    2. Restitution de la Caution (Dépôt de Garantie)
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Caution déposée au départ : <strong className="text-amber-400">{formatCurrency(activeContract.cautionAmount || 0)}</strong> ({activeContract.cautionType === 'especes' ? 'en espèces' : activeContract.cautionType === 'cheque' ? 'en chèque' : activeContract.cautionType === 'passeport' ? 'passeport gardé' : 'autre'})
                  </p>
                </div>

                {/* 2 Choix très clairs : Véhicule Conforme vs Retenue */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCautionAction('return_full');
                      setCautionDeduction(0);
                    }}
                    className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      cautionAction === 'return_full'
                        ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${cautionAction === 'return_full' ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div>
                      <p className="text-xs font-bold text-emerald-400">
                        ✅ Véhicule Conforme (Loto jat kima madinaha)
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                        Restituer <strong>100% de la caution</strong> au locataire (Rendre <strong>{formatCurrency(activeContract.cautionAmount || 0)}</strong>).
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCautionAction('deduct')}
                    className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      cautionAction === 'deduct'
                        ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${cautionAction === 'deduct' ? 'text-rose-400' : 'text-slate-500'}`} />
                    <div>
                      <p className="text-xs font-bold text-rose-400">
                        ⚠️ Retenue sur la Caution (Dégâts / Nettoyage)
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                        Déduire un montant pour réparation/lavage, et restituer le reste au client.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Si Retenue sélectionnée */}
                {cautionAction === 'deduct' && (
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 space-y-3 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-300 mb-1 font-semibold">
                          Montant Retenu sur la Caution (DA)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={activeContract.cautionAmount || 0}
                          value={cautionDeduction}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            setCautionDeduction(Math.min(activeContract.cautionAmount || 0, val));
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-rose-400 font-bold focus:outline-none focus:border-rose-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 mb-1 font-semibold">
                          Motif de la Retenue
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Rayure pare-choc ou lavage extrême"
                          value={cautionDeductionReason}
                          onChange={(e) => setCautionDeductionReason(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-400"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 pt-1">
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-xs flex items-center justify-between text-rose-300">
                        <span className="flex items-center gap-1.5 font-medium">
                          💰 Caution gardée définitivement par l'agence (Dégâts) :
                        </span>
                        <strong className="text-sm font-black text-rose-400">
                          {formatCurrency(Number(cautionDeduction || 0))}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs flex items-center justify-between text-emerald-300">
                        <span className="flex items-center gap-1.5 font-medium">
                          💵 Reste de caution à restituer au client :
                        </span>
                        <strong className="text-sm font-black text-emerald-400">
                          {formatCurrency(Math.max(0, (activeContract.cautionAmount || 0) - Number(cautionDeduction || 0)))}
                        </strong>
                      </div>
                      <p className="text-[11px] text-slate-400 italic px-1">
                        ℹ️ Le montant gardé ({formatCurrency(Number(cautionDeduction || 0))}) sera immédiatement enregistré dans votre caisse et votre bénéfice net comme dédommagement dégâts.
                      </p>
                    </div>
                  </div>
                )}

                {/* Confirmation restitution directe */}
                {cautionAction === 'return_full' && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Restitution confirmée : Vous rendez <strong>{formatCurrency(activeContract.cautionAmount || 0)}</strong> en main propre au locataire ({activeContract.cautionType === 'especes' ? 'espèces sorties du coffre' : activeContract.cautionType === 'cheque' ? 'restitution du chèque' : 'restitution du passeport'}).
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 3. STATUT DU VÉHICULE POST-RETOUR */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
              <label className="block text-xs text-slate-300 font-semibold">Statut du Véhicule après clôture :</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPostReturnStatus('AVAILABLE')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    postReturnStatus === 'AVAILABLE'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Disponible (Showroom)
                </button>
                <button
                  type="button"
                  onClick={() => setPostReturnStatus('MAINTENANCE')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    postReturnStatus === 'MAINTENANCE'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Maintenance / Vidange
                </button>
              </div>
            </div>
          </div>

          {/* Footer submit (Fixe en bas) */}
          <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-950/70 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors">
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                {isSubmitting ? 'Clôture...' : 'Valider le Retour & Libérer le Véhicule'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
