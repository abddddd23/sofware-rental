import React, { useState, useEffect } from 'react';
import type { Car, ExpenseCategory } from '../../types';
import { ExpenseService } from '../../services/dataService';
import { X, DollarSign, Wrench, AlertCircle } from 'lucide-react';

interface ExpenseModalProps {
  cars: Car[];
  isOpen: boolean;
  onClose: () => void;
  preselectedCarId?: string;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  cars,
  isOpen,
  onClose,
  preselectedCarId,
}) => {
  const [carId, setCarId] = useState<string>(preselectedCarId || (cars.length > 0 ? cars[0].id : ''));
  const [category, setCategory] = useState<ExpenseCategory>('vidange');
  const [amount, setAmount] = useState<number>(8500);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mileageAtExpense, setMileageAtExpense] = useState<number>(() => {
    const initialId = preselectedCarId || (cars.length > 0 ? cars[0].id : '');
    const target = cars.find((c) => c.id === initialId);
    return target ? target.currentMileage : 30000;
  });
  const [supplier, setSupplier] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronisation automatique et immédiate du kilométrage réel du véhicule à l'ouverture
  useEffect(() => {
    if (isOpen) {
      const targetId = preselectedCarId || (cars.length > 0 ? cars[0].id : '');
      setCarId(targetId);
      const target = cars.find((c) => c.id === targetId);
      if (target) {
        setMileageAtExpense(target.currentMileage);
      }
      setAmount(8500);
      setCategory('vidange');
      setDate(new Date().toISOString().split('T')[0]);
      setSupplier('');
      setDescription('');
      setErrorMsg('');
    }
  }, [isOpen, preselectedCarId, cars]);

  const selectedCar = cars.find((c) => c.id === carId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!amount || amount <= 0) {
      setErrorMsg('Veuillez saisir un montant supérieur à 0');
      return;
    }

    setIsSubmitting(true);
    try {
      await ExpenseService.addExpense({
        carId: carId || undefined,
        carName: selectedCar ? `${selectedCar.brand} ${selectedCar.model}` : undefined,
        category,
        amount: Number(amount),
        date,
        mileageAtExpense: category === 'vidange' ? Number(mileageAtExpense) : undefined,
        supplier,
        description: description || `Dépense : ${category}`,
      });

      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erreur lors de l\'enregistrement de la dépense');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Enregistrer une Dépense / Charge</h3>
              <p className="text-xs text-slate-400">Comptabilité des dépenses pour le calcul du bénéfice net</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Catégorie */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Catégorie de la dépense *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
            >
              <option value="vidange">🛢️ Vidange & Filtres (Met à jour le compteur)</option>
              <option value="pieces">⚙️ Pièces & Réparations mécaniques</option>
              <option value="assurance">🛡️ Assurance flotte</option>
              <option value="controle_technique">📋 Contrôle Technique</option>
              <option value="lavage">🧼 Lavage & Entretien carrosserie</option>
              <option value="carburant">⛽ Carburant d'appoint</option>
              <option value="loyer_agence">🏢 Loyer & Charges Agence</option>
              <option value="autre">📦 Autre dépense diverse</option>
            </select>
          </div>

          {/* Véhicule concerné */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Véhicule concerné</label>
            <select
              value={carId}
              onChange={(e) => {
                setCarId(e.target.value);
                const found = cars.find((c) => c.id === e.target.value);
                if (found) setMileageAtExpense(found.currentMileage);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
            >
              <option value="">-- Dépense générale de l'agence (Aucun véhicule spécifique) --</option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand} {c.model} ({c.matricule})
                </option>
              ))}
            </select>
          </div>

          {/* Si Vidange : Kilométrage automatique */}
          {category === 'vidange' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <Wrench className="w-4 h-4" />
                <span>Mise à jour automatique du carnet d'entretien</span>
              </div>
              <p className="text-[11px] text-slate-300">
                La prochaine vidange de ce véhicule sera automatiquement fixée à <strong>KM actuel + 10 000 km</strong>.
              </p>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Kilométrage Compteur au moment de la vidange *</label>
                <input
                  type="number"
                  value={mileageAtExpense}
                  onChange={(e) => setMileageAtExpense(Number(e.target.value))}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold"
                />
              </div>
            </div>
          )}

          {/* Montant & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Montant Payé (DA) *</label>
              <input
                type="number"
                step="100"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-amber-400 font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Fournisseur */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Fournisseur / Prestataire (Optionnel)</label>
            <input
              type="text"
              placeholder="Ex: Naftal, Mécanicien Samir, Assurance SAA..."
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Détails de la facture</label>
            <textarea
              rows={2}
              placeholder="Ex: Huile 5W40 Castrol + filtre à huile et main d'œuvre..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-slate-400">
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-400/20 transition-all"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer la Dépense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
