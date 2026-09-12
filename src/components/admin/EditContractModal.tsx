import React, { useState, useEffect } from 'react';
import type { RentalContract, FuelLevel, PaymentStatus } from '../../types';
import { RentalService } from '../../services/dataService';
import { formatCurrency } from '../../utils/formatters';
import { 
  X, 
  Save, 
  Trash2, 
  User, 
  Calendar, 
  Shield, 
  Gauge,
  AlertCircle
} from 'lucide-react';

interface EditContractModalProps {
  contract: RentalContract | null;
  isOpen: boolean;
  onClose: () => void;
  onContractUpdated?: (updatedContract: RentalContract) => void;
  onContractDeleted?: (contractId: string) => void;
}

export const EditContractModal: React.FC<EditContractModalProps> = ({
  contract,
  isOpen,
  onClose,
  onContractUpdated,
  onContractDeleted,
}) => {
  // 1. Locataire
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNationalId, setCustomerNationalId] = useState('');
  const [customerPermitNumber, setCustomerPermitNumber] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // 2. Dates & Tarifs
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalDays, setTotalDays] = useState(1);
  const [dailyRate, setDailyRate] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('UNPAID');

  // 3. Caution
  const [cautionAmount, setCautionAmount] = useState(0);
  const [cautionType, setCautionType] = useState<any>('especes');
  const [cautionStatus, setCautionStatus] = useState<any>('held');
  const [cautionRetainedAmount, setCautionRetainedAmount] = useState(0);
  const [cautionReturnedAmount, setCautionReturnedAmount] = useState(0);
  const [cautionNotes, setCautionNotes] = useState('');

  // 4. KM & Carburant
  const [departureKm, setDepartureKm] = useState(0);
  const [departureFuel, setDepartureFuel] = useState<FuelLevel>('Plein');
  const [departureNotes, setDepartureNotes] = useState('');
  const [returnKm, setReturnKm] = useState(0);
  const [returnFuel, setReturnFuel] = useState<FuelLevel>('Plein');
  const [extraFees, setExtraFees] = useState(0);
  const [penaltyReason, setPenaltyReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Synchronisation systématique dès que le contrat change ou la modale s'ouvre
  useEffect(() => {
    if (!contract) return;

    setCustomerName(contract.customerName || '');
    setCustomerPhone(contract.customerPhone || '');
    setCustomerNationalId(contract.customerNationalId || '');
    setCustomerPermitNumber(contract.customerPermitNumber || '');
    setCustomerAddress(contract.customerAddress || '');

    setStartDate(contract.startDate || '');
    setEndDate(contract.endDate || '');
    setTotalDays(contract.totalDays || 1);
    setDailyRate(contract.dailyRate || 0);
    setTotalAmount(contract.totalAmount || 0);
    setAdvancePaid(contract.advancePaid || 0);
    setRemainingAmount(contract.remainingAmount || 0);
    setPaymentStatus(contract.paymentStatus || 'UNPAID');

    setCautionAmount(contract.cautionAmount || 0);
    setCautionType(contract.cautionType || 'especes');
    setCautionStatus(contract.cautionStatus || 'held');

    const retained = contract.cautionRetainedAmount ?? (
      contract.cautionStatus === 'deducted' 
        ? Math.max(0, (contract.cautionAmount || 0) - (contract.cautionReturnedAmount || 0)) 
        : 0
    );
    setCautionRetainedAmount(retained);

    const returned = contract.cautionReturnedAmount ?? (
      contract.cautionStatus === 'deducted'
        ? Math.max(0, (contract.cautionAmount || 0) - retained)
        : contract.cautionAmount || 0
    );
    setCautionReturnedAmount(returned);

    setCautionNotes(contract.cautionNotes || '');
    setDepartureKm(contract.departureKm || 0);
    setDepartureFuel(contract.departureFuel || 'Plein');
    setDepartureNotes(contract.departureNotes || '');
    setReturnKm(contract.returnKm || 0);
    setReturnFuel(contract.returnFuel || 'Plein');
    setExtraFees(contract.extraFees || 0);
    setPenaltyReason(contract.penaltyReason || '');
    setReturnNotes(contract.returnNotes || '');
    setErrorMessage('');
  }, [contract, isOpen]);

  // Si fermée ou contrat absent, aucun affichage (placé après tous les hooks)
  if (!isOpen || !contract) return null;

  // Recalcul auto jours quand dates changent
  const handleDatesChange = (newStart: string, newEnd: string) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    if (newStart && newEnd) {
      const d1 = new Date(newStart);
      const d2 = new Date(newEnd);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      setTotalDays(diffDays);
      const newTotal = diffDays * dailyRate;
      setTotalAmount(newTotal);
      setRemainingAmount(Math.max(0, newTotal - advancePaid));
    }
  };

  const handleAdvancePaidChange = (val: number) => {
    const adv = Math.max(0, val);
    setAdvancePaid(adv);
    const rem = Math.max(0, totalAmount - adv);
    setRemainingAmount(rem);
    if (adv >= totalAmount) {
      setPaymentStatus('PAID');
    } else if (adv > 0) {
      setPaymentStatus('PARTIALLY_PAID');
    } else {
      setPaymentStatus('UNPAID');
    }
  };

  const handleCautionRetainedChange = (val: number) => {
    const ret = Math.max(0, Math.min(cautionAmount, val));
    setCautionRetainedAmount(ret);
    setCautionReturnedAmount(Math.max(0, cautionAmount - ret));
    if (ret > 0) {
      setCautionStatus('deducted');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validation des invariants
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('Veuillez renseigner le nom et le numéro de téléphone du locataire.');
      return;
    }

    if (Number(cautionRetainedAmount) > Number(cautionAmount)) {
      setErrorMessage(`Le montant retenu (${formatCurrency(cautionRetainedAmount)}) ne peut pas dépasser le montant total de la caution (${formatCurrency(cautionAmount)}).`);
      return;
    }

    if (contract.status === 'completed' && Number(returnKm) < Number(departureKm)) {
      setErrorMessage(`Le compteur au retour (${returnKm} km) ne peut pas être inférieur au compteur de départ (${departureKm} km).`);
      return;
    }

    setIsSaving(true);
    try {
      const updates: Partial<RentalContract> = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerNationalId: customerNationalId.trim(),
        customerPermitNumber: customerPermitNumber.trim(),
        customerAddress: customerAddress.trim(),
        startDate,
        endDate,
        totalDays: Number(totalDays) || 1,
        dailyRate: Number(dailyRate) || 0,
        totalAmount: Number(totalAmount) || 0,
        advancePaid: Number(advancePaid) || 0,
        remainingAmount: Number(remainingAmount) || 0,
        paymentStatus,
        cautionAmount: Number(cautionAmount) || 0,
        cautionType,
        cautionStatus,
        cautionRetainedAmount: Number(cautionRetainedAmount) || 0,
        cautionReturnedAmount: Number(cautionReturnedAmount) || 0,
        cautionNotes: cautionNotes.trim(),
        departureKm: Number(departureKm) || 0,
        departureFuel,
        departureNotes: departureNotes.trim(),
        returnKm: contract.status === 'completed' ? Number(returnKm) : undefined,
        returnFuel: contract.status === 'completed' ? returnFuel : undefined,
        extraFees: Number(extraFees || 0),
        penaltyReason: penaltyReason.trim(),
        returnNotes: returnNotes.trim(),
      };

      await RentalService.updateContract(contract.id, updates);

      const updatedContract: RentalContract = {
        ...contract,
        ...updates,
      };

      if (onContractUpdated) {
        onContractUpdated(updatedContract);
      }

      onClose();
    } catch (err) {
      console.error('Erreur sauvegarde contrat:', err);
      setErrorMessage('Erreur lors de la mise à jour du contrat.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm(
      `⚠️ Confirmer la suppression du contrat #${contract.id} ?\n\n` +
      `Client : ${contract.customerName}\n` +
      `Véhicule : ${contract.carName}\n\n` +
      `Cette action est irréversible. Si le contrat est en cours, le véhicule redeviendra disponible.`
    );
    if (!ok) return;

    setIsDeleting(true);
    try {
      await RentalService.deleteContract(contract.id);
      if (onContractDeleted) {
        onContractDeleted(contract.id);
      }
      onClose();
    } catch (err) {
      console.error('Erreur suppression contrat:', err);
      setErrorMessage('Erreur lors de la suppression.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Modifier le Contrat #{contract.id.slice(-6).toUpperCase()}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  contract.status === 'active' 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {contract.status === 'active' ? 'En cours' : 'Clôturé'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Véhicule : <strong className="text-amber-300">{contract.carName}</strong> • Corrigez les erreurs de saisie
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message d'erreur visible si présent */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1 : Locataire */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-700/60 pb-2">
              <User className="w-4 h-4" />
              1. Informations du Locataire
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Nom & Prénom *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Numéro de Téléphone *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">N° Carte d'identité / NIN</label>
                <input
                  type="text"
                  value={customerNationalId}
                  onChange={(e) => setCustomerNationalId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  placeholder="Ex: 10987654321..."
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">N° Permis de Conduire</label>
                <input
                  type="text"
                  value={customerPermitNumber}
                  onChange={(e) => setCustomerPermitNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  placeholder="Ex: 16/012345 ou D123456789"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">Adresse</label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                placeholder="Ex: Bab Ezzouar, Alger"
              />
            </div>
          </div>

          {/* Section 2 : Dates & Tarifs */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-700/60 pb-2">
              <Calendar className="w-4 h-4" />
              2. Dates, Tarifs & Paiement de la Location (Kré)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Date Début</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => handleDatesChange(e.target.value, endDate)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Date Fin</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => handleDatesChange(startDate, e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Nombre de Jours</label>
                <input
                  type="number"
                  min={1}
                  value={totalDays}
                  onChange={(e) => {
                    const days = Math.max(1, Number(e.target.value));
                    setTotalDays(days);
                    const newTot = days * dailyRate;
                    setTotalAmount(newTot);
                    setRemainingAmount(Math.max(0, newTot - advancePaid));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Tarif / Jour (DA)</label>
                <input
                  type="number"
                  min={0}
                  value={dailyRate}
                  onChange={(e) => {
                    const rate = Math.max(0, Number(e.target.value));
                    setDailyRate(rate);
                    const newTot = totalDays * rate;
                    setTotalAmount(newTot);
                    setRemainingAmount(Math.max(0, newTot - advancePaid));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Total Location (DA)</label>
                <input
                  type="number"
                  min={0}
                  value={totalAmount}
                  onChange={(e) => {
                    const tot = Math.max(0, Number(e.target.value));
                    setTotalAmount(tot);
                    setRemainingAmount(Math.max(0, tot - advancePaid));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-amber-400 font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Acompte Versé au Départ (DA)</label>
                <input
                  type="number"
                  min={0}
                  max={totalAmount}
                  value={advancePaid}
                  onChange={(e) => handleAdvancePaidChange(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Reste à Payer au Retour (DA)</label>
                <input
                  type="number"
                  min={0}
                  value={remainingAmount}
                  onChange={(e) => setRemainingAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-rose-400 font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Statut de Paiement</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="PAID">PAID (Payé intégralement)</option>
                  <option value="PARTIALLY_PAID">PARTIALLY_PAID (Acompte versé)</option>
                  <option value="UNPAID">UNPAID (Non payé)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3 : Caution (Damana) */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-amber-500/20 pb-2">
              <Shield className="w-4 h-4 text-amber-400" />
              3. Gestion de la Caution (Dépôt de Garantie Séparé)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Montant Caution Déposé (DA)</label>
                <input
                  type="number"
                  min={0}
                  value={cautionAmount}
                  onChange={(e) => {
                    const c = Math.max(0, Number(e.target.value));
                    setCautionAmount(c);
                    setCautionReturnedAmount(Math.max(0, c - cautionRetainedAmount));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-amber-400 font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Support de Garantie</label>
                <select
                  value={cautionType}
                  onChange={(e) => setCautionType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="especes">Espèces (Liquide en coffre)</option>
                  <option value="cheque">Chèque de caution</option>
                  <option value="passeport">Passeport / Document</option>
                  <option value="autre">Autre garantie</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Statut Caution</label>
                <select
                  value={cautionStatus}
                  onChange={(e) => setCautionStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="held">En séquestre / Coffre (Contrat actif)</option>
                  <option value="returned">100% Restituée au client</option>
                  <option value="deducted">Retenue pour dégâts / casse</option>
                </select>
              </div>
            </div>

            {/* Détail Retenue Définitive vs Restitué */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/20 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-rose-300 mb-1 font-semibold">
                    💰 Montant Gardé Définitivement par l'Agence (Dégâts) (DA) :
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={cautionAmount}
                    value={cautionRetainedAmount}
                    onChange={(e) => handleCautionRetainedChange(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-rose-500/40 rounded-xl px-3 py-2 text-sm text-rose-400 font-black focus:outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-emerald-300 mb-1 font-semibold">
                    💵 Montant Rendu au Client (DA) :
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={cautionAmount}
                    value={cautionReturnedAmount}
                    onChange={(e) => {
                      const ret = Math.max(0, Number(e.target.value));
                      setCautionReturnedAmount(ret);
                      setCautionRetainedAmount(Math.max(0, cautionAmount - ret));
                    }}
                    className="w-full bg-slate-800 border border-emerald-500/40 rounded-xl px-3 py-2 text-sm text-emerald-400 font-black focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Motif de Retenue / Remarques Caution</label>
                <input
                  type="text"
                  value={cautionNotes}
                  onChange={(e) => setCautionNotes(e.target.value)}
                  placeholder="Ex: 50 000 DA gardés pour pare-choc fissuré, 10 000 DA rendus"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Section 4 : Relevé Compteur & Carburant */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-700/60 pb-2">
              <Gauge className="w-4 h-4" />
              4. Relevé Compteur (KM), Carburant & Suppléments
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Compteur Départ (KM)</label>
                <input
                  type="number"
                  min={0}
                  value={departureKm}
                  onChange={(e) => setDepartureKm(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Carburant Départ</label>
                <select
                  value={departureFuel}
                  onChange={(e) => setDepartureFuel(e.target.value as FuelLevel)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="Plein">Plein (1/1)</option>
                  <option value="3/4">3/4</option>
                  <option value="1/2">1/2</option>
                  <option value="1/4">1/4 (Réserve)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Notes Départ</label>
                <input
                  type="text"
                  value={departureNotes}
                  onChange={(e) => setDepartureNotes(e.target.value)}
                  placeholder="Remarques départ..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {contract.status === 'completed' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-700/50">
                <div>
                  <label className="block text-xs text-slate-300 mb-1 font-medium">Compteur Retour (KM)</label>
                  <input
                    type="number"
                    min={departureKm}
                    value={returnKm}
                    onChange={(e) => setReturnKm(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1 font-medium">Carburant Retour</label>
                  <select
                    value={returnFuel}
                    onChange={(e) => setReturnFuel(e.target.value as FuelLevel)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="Plein">Plein (1/1)</option>
                    <option value="3/4">3/4</option>
                    <option value="1/2">1/2</option>
                    <option value="1/4">1/4 (Réserve)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1 font-medium">Frais Supp. Retour (DA)</label>
                  <input
                    type="number"
                    min={0}
                    value={extraFees}
                    onChange={(e) => setExtraFees(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-rose-400 font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer w-full sm:w-auto justify-center"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Suppression...' : 'Supprimer ce Contrat'}
            </button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving || isDeleting}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-400/15 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Enregistrement...' : 'Enregistrer les Corrections'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
