import React, { useState } from 'react';
import type { Car, RentalContract, Expense, BookingDemand } from '../../types';
import { formatCurrency, formatMileage, formatDate } from '../../utils/formatters';
import { 
  X, 
  Car as CarIcon, 
  FileText, 
  Wrench, 
  Droplet, 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  History,
  Clock
} from 'lucide-react';

interface CarHistoryModalProps {
  car: Car | null;
  rentals: RentalContract[];
  expenses: Expense[];
  bookings: BookingDemand[];
  isOpen: boolean;
  onClose: () => void;
}

interface TimelineEvent {
  id: string;
  date: string;
  type: 'rental' | 'vidange' | 'repair' | 'wash' | 'expense' | 'booking';
  title: string;
  subtitle: string;
  details?: string;
  amount?: number;
  isIncome?: boolean;
  mileage?: number;
}

export const CarHistoryModal: React.FC<CarHistoryModalProps> = ({
  car,
  rentals,
  expenses,
  bookings,
  isOpen,
  onClose,
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  // Filtrer les données liées à cette voiture spécifique
  const carRentals = car ? rentals.filter((r) => r.carId === car.id) : [];
  const carExpenses = car ? expenses.filter((e) => e.carId === car.id) : [];
  const carBookings = car ? bookings.filter((b) => b.carId === car.id) : [];

  // Construire la liste unifiée des événements chronologiques
  const events: TimelineEvent[] = [];

  // 1. Locations (Contrats)
  carRentals.forEach((r) => {
    const cautionRetained = r.cautionRetainedAmount ?? (
      r.cautionStatus === 'deducted' ? Math.max(0, (r.cautionAmount || 0) - (r.cautionReturnedAmount || 0)) : 0
    );
    const rentCollected = Math.max(0, (r.totalAmount || 0) - (r.remainingAmount || 0));
    const rentalAmount = rentCollected + (r.extraFees || 0) + cautionRetained;

    events.push({
      id: `rent_${r.id}`,
      date: r.startDate,
      type: 'rental',
      title: `Location - ${r.customerName}`,
      subtitle: `Du ${formatDate(r.startDate)} au ${formatDate(r.endDate)} (${r.totalDays} jours)`,
      details: r.departureDamages?.length ? `${r.departureDamages.length} rayure(s) notée(s)` : undefined,
      amount: rentalAmount,
      isIncome: true,
      mileage: r.departureKm,
    });
  });

  // 2. Dépenses & Entretiens
  carExpenses.forEach((e) => {
    let eventType: TimelineEvent['type'] = 'expense';
    let title = `Dépense : ${e.category}`;

    if (e.category === 'vidange') {
      eventType = 'vidange';
      title = 'Vidange Moteur & Filtres';
    } else if (e.category === 'reparation' || e.category === 'pieces') {
      eventType = 'repair';
      title = 'Réparation & Pièces';
    } else if (e.category === 'lavage') {
      eventType = 'wash';
      title = 'Lavage & Préparation Carrosserie';
    }

    events.push({
      id: `exp_${e.id}`,
      date: e.date,
      type: eventType,
      title,
      subtitle: e.supplier ? `Prestataire : ${e.supplier}` : 'Entretien Agence',
      details: e.description,
      amount: e.amount,
      isIncome: false,
      mileage: e.mileageAtExpense,
    });
  });

  // Trier par date décroissante (le plus récent en premier)
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filtrer
  const filteredEvents = events.filter((ev) => {
    if (filterType === 'all') return true;
    if (filterType === 'rental') return ev.type === 'rental';
    if (filterType === 'maintenance') return ev.type === 'vidange' || ev.type === 'repair' || ev.type === 'wash';
    return true;
  });

  // Totaux financiers pour cette voiture
  const totalRevenue = carRentals.reduce((sum, r) => {
    const rentCollected = Math.max(0, (r.totalAmount || 0) - (r.remainingAmount || 0));
    const cautionRetained = r.cautionRetainedAmount ?? (
      r.cautionStatus === 'deducted' ? Math.max(0, (r.cautionAmount || 0) - (r.cautionReturnedAmount || 0)) : 0
    );
    return sum + rentCollected + (r.extraFees || 0) + cautionRetained;
  }, 0);
  const totalExpense = carExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpense;

  if (!isOpen || !car) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  Carnet de Vie & Historique
                </h3>
                <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-amber-400 font-bold">
                  {car.matricule}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {car.brand} {car.model} ({car.year}) • Compteur actuel : <strong className="text-white">{formatMileage(car.currentMileage)}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bilan Financier Véhicule */}
        <div className="p-6 bg-slate-950/40 border-b border-slate-800 grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-semibold uppercase">Revenus Locations</span>
            <p className="text-lg font-black text-emerald-400 mt-1">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-semibold uppercase">Frais & Réparations</span>
            <p className="text-lg font-black text-rose-400 mt-1">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30">
            <span className="text-[11px] text-amber-400 font-semibold uppercase">Bénéfice Net Voiture</span>
            <p className={`text-lg font-black mt-1 ${netProfit >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
              {formatCurrency(netProfit)}
            </p>
          </div>
        </div>

        {/* Filtres de la timeline */}
        <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-semibold">Événements enregistrés ({filteredEvents.length})</span>
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'rental', label: 'Locations' },
              { id: 'maintenance', label: 'Entretiens / Vidanges' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setFilterType(item.id)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filterType === item.id
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline des Événements */}
        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-4">
          {filteredEvents.length > 0 ? (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
              {filteredEvents.map((ev) => (
                <div key={ev.id} className="relative group">
                  {/* Dot icon */}
                  <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-slate-900 text-[10px] ${
                    ev.type === 'rental'
                      ? 'bg-emerald-500 text-slate-950'
                      : ev.type === 'vidange'
                      ? 'bg-amber-500 text-slate-950'
                      : ev.type === 'repair'
                      ? 'bg-rose-500 text-white'
                      : 'bg-blue-500 text-white'
                  }`}>
                    {ev.type === 'rental' && <CarIcon className="w-3 h-3" />}
                    {ev.type === 'vidange' && <Droplet className="w-3 h-3" />}
                    {ev.type === 'repair' && <Wrench className="w-3 h-3" />}
                    {ev.type === 'wash' && <Sparkles className="w-3 h-3" />}
                    {ev.type === 'expense' && <TrendingDown className="w-3 h-3" />}
                  </div>

                  {/* Card Event */}
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 group-hover:border-slate-700 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{ev.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDate(ev.date)}
                        </span>
                      </div>

                      {ev.amount !== undefined && (
                        <span className={`text-xs font-black ${ev.isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {ev.isIncome ? '+' : '-'}{formatCurrency(ev.amount)}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 mt-1">{ev.subtitle}</p>

                    {ev.details && (
                      <p className="text-xs text-slate-400 italic mt-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        {ev.details}
                      </p>
                    )}

                    {ev.mileage && (
                      <p className="text-[11px] text-amber-400 font-mono mt-1">
                        Compteur au moment de l'événement : {formatMileage(ev.mileage)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              <History className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              Aucun événement dans l'historique pour le moment.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
