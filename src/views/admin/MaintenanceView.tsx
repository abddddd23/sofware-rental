import React, { useState } from 'react';
import type { Car, Expense } from '../../types';
import { CarService } from '../../services/dataService';
import { formatCurrency, formatMileage, getVidangeStatus, formatDate } from '../../utils/formatters';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Gauge, 
  Droplet, 
  Plus,
  Car as CarIcon,
  Edit3,
  X,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface MaintenanceViewProps {
  cars: Car[];
  expenses: Expense[];
  onLogVidange: (car: Car) => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  cars,
  expenses,
  onLogVidange,
}) => {
  // Filtrer les dépenses de type vidange
  const vidangeExpenses = expenses.filter((e) => e.category === 'vidange');

  // État Modal d'ajustement / correction des compteurs
  const [carToAdjust, setCarToAdjust] = useState<Car | null>(null);
  const [adjustCurrentKm, setAdjustCurrentKm] = useState<number>(0);
  const [adjustLastVidangeKm, setAdjustLastVidangeKm] = useState<number>(0);
  const [adjustNextVidangeKm, setAdjustNextVidangeKm] = useState<number>(0);
  const [isSavingAdjust, setIsSavingAdjust] = useState<boolean>(false);
  const [adjustError, setAdjustError] = useState<string>('');

  const handleOpenAdjustModal = (car: Car) => {
    setCarToAdjust(car);
    setAdjustCurrentKm(car.currentMileage);
    setAdjustLastVidangeKm(car.lastOilChangeMileage);
    setAdjustNextVidangeKm(car.nextOilChangeMileage);
    setAdjustError('');
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carToAdjust) return;

    if (Number(adjustLastVidangeKm) > Number(adjustCurrentKm)) {
      setAdjustError(
        `Incohérence : La dernière vidange (${formatMileage(Number(adjustLastVidangeKm))}) ne peut pas être supérieure au compteur actuel (${formatMileage(Number(adjustCurrentKm))}) !`
      );
      return;
    }

    setIsSavingAdjust(true);
    try {
      await CarService.updateCar(carToAdjust.id, {
        currentMileage: Number(adjustCurrentKm),
        lastOilChangeMileage: Number(adjustLastVidangeKm),
        nextOilChangeMileage: Number(adjustNextVidangeKm),
      });
      setCarToAdjust(null);
    } catch (err) {
      console.error('Erreur ajustement compteur:', err);
      setAdjustError('Erreur lors de la mise à jour du compteur.');
    } finally {
      setIsSavingAdjust(false);
    }
  };

  // Trier les voitures par urgence de vidange (les plus urgentes ou incohérentes en premier)
  const sortedCars = [...cars].sort((a, b) => {
    const isInconsistentA = a.lastOilChangeMileage > a.currentMileage;
    const isInconsistentB = b.lastOilChangeMileage > b.currentMileage;
    if (isInconsistentA && !isInconsistentB) return -1;
    if (!isInconsistentA && isInconsistentB) return 1;

    const remA = a.nextOilChangeMileage - a.currentMileage;
    const remB = b.nextOilChangeMileage - b.currentMileage;
    return remA - remB;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-amber-400" />
            Suivi Kilométrage & Vidanges de la Flotte
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Calcul automatique des kilomètres restants, détection des incohérences et ajustement rapide des compteurs.
          </p>
        </div>
      </div>

      {/* Cartes d'État de Vidange par Voiture */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCars.map((car) => {
          const isInconsistent = car.lastOilChangeMileage > car.currentMileage;
          const vidange = getVidangeStatus(car.currentMileage, car.nextOilChangeMileage, car.lastOilChangeMileage);
          const totalInterval = Math.max(1000, car.nextOilChangeMileage - car.lastOilChangeMileage || 10000);
          const drivenSinceVidange = isInconsistent ? 0 : Math.max(0, car.currentMileage - car.lastOilChangeMileage);
          const percentageUsed = isInconsistent ? 0 : Math.min(100, Math.max(0, Math.round((drivenSinceVidange / totalInterval) * 100)));

          return (
            <div
              key={car.id}
              className={`p-5 rounded-2xl bg-slate-900 border transition-all flex flex-col justify-between ${
                isInconsistent
                  ? 'border-rose-500/70 shadow-lg shadow-rose-500/10 bg-gradient-to-b from-slate-900 to-rose-950/20'
                  : vidange.isUrgent
                  ? 'border-rose-500/50 shadow-lg shadow-rose-500/5'
                  : vidange.isWarning
                  ? 'border-amber-500/50'
                  : 'border-slate-800'
              }`}
            >
              <div className="space-y-4">
                {/* Car Title & Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">{car.brand} {car.model}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{car.matricule}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${vidange.badgeColor}`}>
                    {vidange.statusText}
                  </span>
                </div>

                {/* Message d'incohérence si dernière vidange > km actuel */}
                {isInconsistent && (
                  <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-rose-200">
                        ⚠️ Incohérence Compteur Détectée :
                      </p>
                      <p className="text-[11px] text-rose-300/90 leading-relaxed">
                        La dernière vidange (<strong>{formatMileage(car.lastOilChangeMileage)}</strong>) est supérieure au compteur actuel (<strong>{formatMileage(car.currentMileage)}</strong>) !
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenAdjustModal(car)}
                        className="inline-flex items-center gap-1 mt-0.5 text-[11px] text-amber-300 hover:text-amber-200 font-bold underline cursor-pointer"
                      >
                        👉 Cliquez ici pour rectifier
                      </button>
                    </div>
                  </div>
                )}

                {/* Progress Bar Kilométrique */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Usure huile moteur :</span>
                    <span className={`font-bold ${
                      isInconsistent ? 'text-rose-400' : percentageUsed >= 100 ? 'text-rose-400' : percentageUsed >= 85 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {isInconsistent ? 'Compteur à vérifier' : `${percentageUsed}%`}
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isInconsistent
                          ? 'bg-rose-500/50'
                          : percentageUsed >= 100
                          ? 'bg-rose-500'
                          : percentageUsed >= 85
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${isInconsistent ? 100 : percentageUsed}%` }}
                    />
                  </div>
                </div>

                {/* Détails Compteur */}
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800/80 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-amber-400" /> KM Actuel :
                    </span>
                    <strong className="text-white font-mono">{formatMileage(car.currentMileage)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Dernière vidange à :
                    </span>
                    <span className={`font-mono ${isInconsistent ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                      {formatMileage(car.lastOilChangeMileage)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Droplet className="w-3.5 h-3.5 text-amber-400" /> Vidange requise à :
                    </span>
                    <strong className="text-amber-400 font-mono">{formatMileage(car.nextOilChangeMileage)}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons : Modifier / Corriger + Enregistrer Vidange */}
              <div className="mt-5 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAdjustModal(car)}
                  className="w-full py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Modifier ou corriger directement les compteurs de ce véhicule"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  Modifier / Corriger
                </button>
                <button
                  type="button"
                  onClick={() => onLogVidange(car)}
                  className="w-full py-2 px-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-amber-400/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Vidange Faite
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historique des Vidanges Récentes */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Droplet className="w-4 h-4 text-amber-400" />
          Historique des Vidanges Récentes Enregistrées
        </h3>

        {vidangeExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Véhicule</th>
                  <th className="p-3">Compteur (KM)</th>
                  <th className="p-3">Fournisseur / Station</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Coût (DA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {vidangeExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="p-3 font-semibold text-white">{e.carName || 'Général'}</td>
                    <td className="p-3 font-mono">{e.mileageAtExpense ? formatMileage(e.mileageAtExpense) : '-'}</td>
                    <td className="p-3 text-slate-400">{e.supplier || '-'}</td>
                    <td className="p-3 text-slate-300">{e.description}</td>
                    <td className="p-3 text-right font-bold text-amber-400">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-4 text-center">
            Aucun historique de vidange pour le moment.
          </p>
        )}
      </div>

      {/* MODAL : MODIFIER / CORRIGER COMPTEUR & VIDANGE DIRECTEMENT */}
      {carToAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Modifier Compteur & Vidange
                  </h3>
                  <p className="text-xs text-slate-400">
                    {carToAdjust.brand} {carToAdjust.model} • <span className="font-mono text-amber-400">{carToAdjust.matricule}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCarToAdjust(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSaveAdjust} className="p-6 space-y-4">
              {adjustError && (
                <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{adjustError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  1. Kilométrage Compteur Actuel (KM) *
                </label>
                <input
                  type="number"
                  value={adjustCurrentKm}
                  onChange={(e) => setAdjustCurrentKm(Number(e.target.value))}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-bold"
                />
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Le kilométrage réel qui apparaît sur le tableau de bord de la voiture.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  2. Kilométrage Dernière Vidange Faite (KM) *
                </label>
                <input
                  type="number"
                  value={adjustLastVidangeKm}
                  onChange={(e) => setAdjustLastVidangeKm(Number(e.target.value))}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Le kilométrage où l'huile a été changée pour la dernière fois.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  3. Kilométrage Prochaine Vidange Requise (KM) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={adjustNextVidangeKm}
                    onChange={(e) => setAdjustNextVidangeKm(Number(e.target.value))}
                    required
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-amber-400 font-bold focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustNextVidangeKm(Number(adjustLastVidangeKm) + 10000)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                  >
                    ⚡ +10 000 km
                  </button>
                </div>
              </div>

              {/* Message en direct si incohérence */}
              {Number(adjustLastVidangeKm) > Number(adjustCurrentKm) && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-xs text-rose-300 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Incohérence Détectée :</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    La dernière vidange ({formatMileage(Number(adjustLastVidangeKm))}) ne peut pas être supérieure au compteur actuel ({formatMileage(Number(adjustCurrentKm))}).
                  </p>
                  <button
                    type="button"
                    onClick={() => setAdjustCurrentKm(Number(adjustLastVidangeKm))}
                    className="w-full py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded-lg text-xs font-semibold cursor-pointer text-center"
                  >
                    🔧 Aligner le compteur actuel à {formatMileage(Number(adjustLastVidangeKm))}
                  </button>
                </div>
              )}

              {/* Boutons d'Action */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCarToAdjust(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingAdjust || Number(adjustLastVidangeKm) > Number(adjustCurrentKm)}
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-400/20 transition-all cursor-pointer"
                >
                  {isSavingAdjust ? 'Sauvegarde en cours...' : 'Enregistrer les Modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
