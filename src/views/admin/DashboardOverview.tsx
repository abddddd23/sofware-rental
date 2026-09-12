import React, { useState } from 'react';
import type { Car, BookingDemand, RentalContract, Expense } from '../../types';
import { calculateAgencyMetrics, resetAgencyFinancials, restoreDemoData } from '../../services/dataService';
import { formatCurrency, getVidangeStatus } from '../../utils/formatters';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Car as CarIcon, 
  Inbox, 
  Wrench, 
  Plus, 
  Phone, 
  CheckCircle2, 
  RotateCcw,
  RefreshCw,
  Shield,
  ShieldAlert,
  Banknote
} from 'lucide-react';

interface DashboardOverviewProps {
  cars: Car[];
  bookings: BookingDemand[];
  rentals: RentalContract[];
  expenses: Expense[];
  onOpenNewCar: () => void;
  onOpenNewRental: () => void;
  onOpenNewExpense: () => void;
  onSelectBooking: (booking: BookingDemand) => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  cars,
  bookings,
  rentals,
  expenses,
  onOpenNewCar,
  onOpenNewRental,
  onOpenNewExpense,
  onSelectBooking,
  onNavigateToTab,
}) => {
  const metrics = calculateAgencyMetrics(cars, rentals, expenses, bookings);
  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const urgentCars = cars.filter((c) => (c.nextOilChangeMileage - c.currentMileage) <= 1000);

  const [isResetting, setIsResetting] = useState(false);

  const handleResetCaisse = async () => {
    const confirmation = window.prompt(
      "⚠️ ACTION IRRÉVERSIBLE : Remise à zéro de la Caisse (0 DA) !\n\n" +
      "Voulez-vous réinitialiser tous les contrats et dépenses à zéro ?\n" +
      "Toutes les voitures redeviendront disponibles.\n\n" +
      "Pour confirmer définitivement, tapez exactement SUPPRIMER :"
    );
    if (confirmation !== 'SUPPRIMER') {
      if (confirmation !== null) {
        alert("Action annulée : mot de confirmation incorrect.");
      }
      return;
    }

    setIsResetting(true);
    try {
      await resetAgencyFinancials();
    } catch (err) {
      console.error('Erreur reset caisse:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleRestoreDemo = async () => {
    const ok = window.confirm("Restaurer les contrats et dépenses de démonstration ?");
    if (!ok) return;

    setIsResetting(true);
    try {
      await restoreDemoData();
    } catch (err) {
      console.error('Erreur restore démo:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Tableau de Bord de l'Agence</h1>
          <p className="text-xs text-slate-400 mt-1">
            Supervision en temps réel de votre flotte, des réservations et des finances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenNewRental}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-400/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nouveau Contrat
          </button>
          <button
            onClick={onOpenNewCar}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <CarIcon className="w-4 h-4 text-amber-400" />
            Ajouter Voiture
          </button>
          <button
            onClick={onOpenNewExpense}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Wallet className="w-4 h-4 text-rose-400" />
            Ajouter Dépense
          </button>

          {rentals.length > 0 || expenses.length > 0 ? (
            <button
              onClick={handleResetCaisse}
              disabled={isResetting}
              title="Remettre les chiffres et contrats de test à zéro (0 DA) pour tester vos calculs"
              className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              {isResetting ? 'Remise à zéro...' : 'Remise à zéro (0 DA)'}
            </button>
          ) : (
            <button
              onClick={handleRestoreDemo}
              disabled={isResetting}
              title="Restaurer les données d'exemple"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              Restaurer Démo
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards ("Drahm" & Opérations) */}
      <div className="space-y-4">
        {/* Ligne 1 : Les 4 Flux de Recettes & Caisse */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Recettes Locations */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recettes Locations</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-emerald-400">{formatCurrency(metrics.totalRevenue)}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Loyer perçu (acomptes + soldes)</p>
            </div>
          </div>

          {/* 2. Cautions Définitivement Gardées (Dégâts) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-rose-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Cautions Gardées (Dégâts)</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-rose-400">{formatCurrency(metrics.totalCautionRetained)}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Retenues définitives (dédommagement)</p>
            </div>
          </div>

          {/* 3. Cautions en Séquestre (En cours) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Cautions en Séquestre</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-amber-300">{formatCurrency(metrics.totalCautionHeld)}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Damana en coffre (à restituer au retour)</p>
            </div>
          </div>

          {/* 4. Total Caisse (Total Liquide Physique) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/40 shadow-lg shadow-indigo-500/5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Total Caisse (Tout compris)</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-indigo-300">{formatCurrency(metrics.totalCaisseWithCaution)}</h3>
              <p className="text-[11px] text-indigo-200/80 mt-0.5">Loyers + Cautions gardées + Séquestre</p>
            </div>
          </div>
        </div>

        {/* Ligne 2 : Dépenses, Bénéfice Net Réel & Flotte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 5. Total Charges & Dépenses */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Charges & Dépenses</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-rose-400">{formatCurrency(metrics.totalExpenses)}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Vidanges, pièces, réparations, local...</p>
            </div>
          </div>

          {/* 6. Bénéfice Net Réel */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Bénéfice Net ("Drahm")</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className={`text-2xl font-black ${metrics.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(metrics.netProfit)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                (Loyers + Cautions dégâts) − Dépenses
              </p>
            </div>
          </div>

          {/* 7. Disponibilité Flotte */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Disponibilité Flotte</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <CarIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-white">{metrics.availableCarsCount}</h3>
                <span className="text-xs text-slate-400">/ {metrics.totalCarsCount} libres</span>
              </div>
              <p className="text-[11px] text-amber-400 mt-0.5">
                {metrics.activeRentalsCount} en location active
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid 2 colonnes : Demandes en attente & Alertes Vidanges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne 1 : Dernières Demandes du Site Web */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Inbox className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Demandes Récentes du Site Web</h3>
            </div>
            <button
              onClick={() => onNavigateToTab('bookings')}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              Voir tout ({pendingBookings.length})
            </button>
          </div>

          {pendingBookings.length > 0 ? (
            <div className="space-y-3">
              {pendingBookings.slice(0, 3).map((booking) => {
                const targetCar = cars.find((c) => c.id === booking.carId);
                const officialDailyRate = targetCar ? targetCar.pricePerDay : booking.pricePerDay;
                const officialTotal = booking.totalDays * officialDailyRate;
                const hasPriceMismatch = targetCar && (
                  booking.pricePerDay !== targetCar.pricePerDay ||
                  booking.estimatedTotal !== officialTotal
                );

                return (
                  <div
                    key={booking.id}
                    className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{booking.customerName}</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                          En attente
                        </span>
                        {hasPriceMismatch && (
                          <span
                            className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold"
                            title={`Devis manipulé : client a envoyé ${booking.estimatedTotal} DA (${booking.pricePerDay} DA/j)`}
                          >
                            ⚠️ Prix anormal
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-medium mt-0.5">{booking.carName}</p>
                      <p className="text-[11px] text-slate-400">
                        Du {booking.startDate} au {booking.endDate} ({booking.totalDays}j) • <strong className="text-amber-400">{formatCurrency(officialTotal)}</strong>
                      </p>
                    </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${booking.customerPhone}`}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                      title="Appeler le client"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    </a>
                    <button
                      onClick={() => onSelectBooking(booking)}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                    >
                      Traiter
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              Toutes les demandes de réservation web ont été traitées !
            </div>
          )}
        </div>

        {/* Colonne 2 : Alertes Vidanges & Contrôles KM */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Alertes Vidanges & Entretien Flotte</h3>
            </div>
            <button
              onClick={() => onNavigateToTab('maintenance')}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              Voir planning
            </button>
          </div>

          {urgentCars.length > 0 ? (
            <div className="space-y-3">
              {urgentCars.map((car) => {
                const status = getVidangeStatus(car.currentMileage, car.nextOilChangeMileage);

                return (
                  <div
                    key={car.id}
                    className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{car.brand} {car.model}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({car.matricule})</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Compteur : <strong className="text-white">{car.currentMileage} km</strong> (Prochaine : {car.nextOilChangeMileage} km)
                      </p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${status.badgeColor}`}>
                      {status.statusText}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              Toutes les vidanges sont à jour. Aucun véhicule n'est en zone critique !
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
