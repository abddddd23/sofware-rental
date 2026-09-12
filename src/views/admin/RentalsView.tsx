import React, { useState } from 'react';
import type { RentalContract, Car } from '../../types';
import { formatCurrency, formatMileage, formatDate, getContractCautionDetails } from '../../utils/formatters';
import { 
  FileText, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Phone, 
  Gauge, 
  Fuel, 
  DollarSign, 
  AlertTriangle,
  Search,
  Plus,
  Shield,
  Printer,
  Pencil
} from 'lucide-react';

interface RentalsViewProps {
  rentals: RentalContract[];
  cars: Car[];
  onOpenNewContract: () => void;
  onCheckInContract: (contract: RentalContract) => void;
  onPrintContract: (contract: RentalContract) => void;
  onEditContract: (contract: RentalContract) => void;
}

export const RentalsView: React.FC<RentalsViewProps> = ({
  rentals,
  cars,
  onOpenNewContract,
  onCheckInContract,
  onPrintContract,
  onEditContract,
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = rentals.filter((r) => {
    const matchesTab = activeTab === 'active' ? r.status === 'active' : r.status === 'completed';
    const matchesSearch =
      r.carName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerPhone.includes(searchTerm);

    return matchesTab && matchesSearch;
  });

  const activeCount = rentals.filter((r) => r.status === 'active').length;
  const completedCount = rentals.filter((r) => r.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-amber-400" />
            Contrats de Location & Bons d'État
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gérez les sorties (check-out) et retours (check-in) avec relevé de compteur KM et carnet d'état.
          </p>
        </div>

        <button
          onClick={onOpenNewContract}
          className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-400/10 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nouveau Bon de Sortie
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60 text-xs w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${
              activeTab === 'active'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            En Cours de Location ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${
              activeTab === 'completed'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Contrats Clôturés / Historique ({completedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher contrat, client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Liste des Contrats */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((contract) => {
            const caution = getContractCautionDetails(contract);
            return (
            <div
              key={contract.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
            >
              {/* Infos Véhicule & Client */}
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-white">{contract.carName}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      contract.status === 'active'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {contract.status === 'active' ? 'Véhicule Sorti (Sur la route)' : 'Restitué / Terminé'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      contract.paymentStatus === 'PAID'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : contract.paymentStatus === 'PARTIALLY_PAID'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {contract.paymentStatus === 'PAID'
                      ? 'Payé intégralement'
                      : contract.paymentStatus === 'PARTIALLY_PAID'
                      ? 'Acompte versé'
                      : 'Non payé'}
                  </span>
                  {contract.cautionAmount > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                        contract.status === 'active'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : caution.isDeducted
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      {contract.status === 'active'
                        ? `Caution en coffre : ${formatCurrency(contract.cautionAmount)}`
                        : caution.isDeducted
                        ? `Caution gardée : ${formatCurrency(caution.retainedAmount)} (Dégâts) • Rendu : ${formatCurrency(caution.returnedAmount)}`
                        : `Caution 100% restituée (${formatCurrency(caution.returnedAmount)})`}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300">
                  Locataire : <strong className="text-white">{contract.customerName}</strong> •{' '}
                  <a href={`tel:${contract.customerPhone}`} className="text-amber-400 hover:underline">
                    {contract.customerPhone}
                  </a>
                  {contract.customerNationalId && (
                    <span className="text-slate-400"> (NIN : {contract.customerNationalId})</span>
                  )}
                </p>

                {/* Bon d'état info */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    Départ : {formatMileage(contract.departureKm)}
                    {contract.returnKm ? (
                      <>
                        {' '}➔ Retour : {formatMileage(contract.returnKm)}{' '}
                        <span className="text-white font-bold">
                          (Parcouru : {formatMileage(contract.returnKm - contract.departureKm)})
                        </span>
                      </>
                    ) : (
                      <> • Forfait max : {formatMileage(contract.departureKm + (contract.totalDays * 100))}</>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-amber-400" />
                    Essence : {contract.departureFuel}
                    {contract.returnFuel && ` ➔ ${contract.returnFuel}`}
                  </span>
                  <span className="text-[11px] text-amber-400/90 font-medium">
                    Forfait : {contract.totalDays * 100} km inclus ({contract.totalDays}j × 100 km/j)
                  </span>
                  {contract.returnKm && (
                    (contract.returnKm - contract.departureKm) > (contract.totalDays * 100) ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                        Dépassement : +{(contract.returnKm - contract.departureKm) - (contract.totalDays * 100)} km
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        Dans le forfait ({contract.returnKm - contract.departureKm} / {contract.totalDays * 100} km)
                      </span>
                    )
                  )}
                </div>

                {contract.departureDamages?.length > 0 && (
                  <div className="text-[11px] text-amber-400/90 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 max-w-lg">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {contract.departureDamages.length} rayure(s) ou choc(s) noté(s) au départ
                    </span>
                  </div>
                )}
              </div>

              {/* Dates & Drahm */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-6 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-800">
                <div className="text-left sm:text-right space-y-1">
                  <p className="text-xs text-slate-400 flex items-center sm:justify-end gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Du {contract.startDate} au {contract.endDate} ({contract.totalDays} jours)
                  </p>
                  <p className="text-sm font-black text-white">
                    Total Location : {formatCurrency(contract.totalAmount)}
                  </p>
                  <p className="text-xs text-emerald-400 font-semibold">
                    Acompte location : {formatCurrency(contract.advancePaid)}
                  </p>
                  {contract.status === 'active' && (
                    <p className="text-xs text-amber-400 font-bold">
                      Reste à régler au retour : {formatCurrency(contract.remainingAmount)}
                    </p>
                  )}
                  {contract.extraFees && contract.extraFees > 0 ? (
                    <p className="text-xs text-rose-400">
                      + Frais supp. : {formatCurrency(contract.extraFees)} ({contract.penaltyReason})
                    </p>
                  ) : null}
                  <div className="pt-1 border-t border-slate-800 text-[11px]">
                    <span className="text-slate-400">Caution : </span>
                    <strong className="text-amber-400">{formatCurrency(contract.cautionAmount)}</strong>
                    <span className="text-slate-500"> ({contract.cautionType === 'especes' ? 'espèces' : contract.cautionType || 'garantie'})</span>
                    {contract.status === 'completed' && (
                      <div className="mt-0.5 space-y-0.5">
                        {caution.isDeducted ? (
                          <>
                            <span className="block font-bold text-rose-400">
                              💰 Retenu définitivement (dégâts) : {formatCurrency(caution.retainedAmount)}
                            </span>
                            <span className="block font-medium text-emerald-400">
                              💵 Rendu au client : {formatCurrency(caution.returnedAmount)}
                            </span>
                          </>
                        ) : (
                          <span className="block font-bold text-emerald-400">
                            ✅ Caution 100% rendue au client
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Contrat : Modifier, Imprimer & Retour */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-stretch sm:self-auto">
                  <button
                    type="button"
                    onClick={() => onEditContract(contract)}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center cursor-pointer shadow-sm"
                    title="Modifier ou corriger les informations du contrat"
                  >
                    <Pencil className="w-3.5 h-3.5 text-amber-400" />
                    Modifier
                  </button>

                  <button
                    type="button"
                    onClick={() => onPrintContract(contract)}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center cursor-pointer shadow-sm"
                    title="Imprimer le bon officiel pour le client"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    Bon
                  </button>

                  {contract.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => onCheckInContract(contract)}
                      className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center cursor-pointer whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Bon Retour
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Aucun contrat dans cette catégorie</h3>
          <p className="text-xs text-slate-400 mt-1">
            Les contrats établis lors des sorties de véhicules s'affichent ici avec leur bon d'état.
          </p>
        </div>
      )}
    </div>
  );
};
