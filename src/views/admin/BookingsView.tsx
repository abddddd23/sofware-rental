import React, { useState } from 'react';
import type { BookingDemand, Car } from '../../types';
import { BookingService } from '../../services/dataService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  Inbox, 
  Phone, 
  Calendar, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Clock, 
  Search,
  AlertTriangle
} from 'lucide-react';

interface BookingsViewProps {
  bookings: BookingDemand[];
  cars?: Car[];
  onTransformToContract: (booking: BookingDemand) => void;
}

export const BookingsView: React.FC<BookingsViewProps> = ({
  bookings,
  cars = [],
  onTransformToContract,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filtered = bookings.filter((b) => {
    const matchesFilter = filterStatus === 'all' || b.status === filterStatus;
    const matchesSearch =
      b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customerPhone.includes(searchTerm) ||
      b.carName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleStatusChange = async (id: string, status: BookingDemand['status']) => {
    await BookingService.updateBookingStatus(id, status);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Inbox className="w-6 h-6 text-amber-400" />
            Demandes de Réservation du Site Web
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Les clients qui ont réservé sur la vitrine arrivent ici en direct. Contactez-les pour valider la commande.
          </p>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher nom, téléphone ou véhicule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60 text-xs w-full sm:w-auto">
          {[
            { id: 'all', label: 'Toutes' },
            { id: 'pending', label: 'En attente' },
            { id: 'confirmed', label: 'Confirmées' },
            { id: 'rejected', label: 'Refusées' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterStatus(item.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterStatus === item.id
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des Demandes */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((b) => {
            const targetCar = cars.find((c) => c.id === b.carId);
            const officialDailyRate = targetCar ? targetCar.pricePerDay : b.pricePerDay;
            const officialTotal = b.totalDays * officialDailyRate;
            const hasPriceMismatch = targetCar && (
              b.pricePerDay !== targetCar.pricePerDay ||
              b.estimatedTotal !== officialTotal
            );

            return (
              <div
                key={b.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
              {/* Info Client & Véhicule */}
              <div className="flex items-start gap-4">
                {b.carImage ? (
                  <img
                    src={b.carImage}
                    alt={b.carName}
                    className="w-20 h-16 rounded-xl object-cover border border-slate-800 shrink-0 hidden sm:block"
                  />
                ) : (
                  <div className="w-20 h-16 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 text-slate-500 text-xs font-bold hidden sm:block">
                    Photo
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-white">{b.customerName}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : b.status === 'confirmed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {b.status === 'pending' ? 'En attente d\'appel' : b.status === 'confirmed' ? 'Validée / Contrat' : 'Refusée'}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDate(b.createdAt)}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-amber-400">{b.carName}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <a href={`tel:${b.customerPhone}`} className="hover:underline font-mono">
                        {b.customerPhone}
                      </a>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      {b.customerWilaya}
                    </span>
                    {b.customerPermitNumber && (
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                        Permis : {b.customerPermitNumber}
                      </span>
                    )}
                  </div>

                  {b.agencyNotes && (
                    <p className="text-xs text-slate-400 italic bg-slate-800/40 px-2 py-1 rounded-lg border border-slate-800">
                      {b.agencyNotes}
                    </p>
                  )}
                </div>
              </div>

              {/* Dates & Tarifs */}
              <div className="flex items-center justify-between w-full lg:w-auto lg:text-right border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                <div className="space-y-0.5 mr-6">
                  <p className="text-xs text-slate-400 flex items-center lg:justify-end gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Du {b.startDate} au {b.endDate}
                  </p>
                  <p className="text-xs text-slate-300">
                    {b.totalDays} jour(s) × {formatCurrency(officialDailyRate)}
                  </p>
                  <p className="text-base font-black text-amber-400">
                    Total officiel : {formatCurrency(officialTotal)}
                  </p>
                  {hasPriceMismatch && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>⚠️ Devis client manipulé : {formatCurrency(b.estimatedTotal)} ({formatCurrency(b.pricePerDay)}/j)</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${b.customerPhone}`}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
                    title="Appeler le client maintenant"
                  >
                    <Phone className="w-4 h-4 text-emerald-400" />
                  </a>

                  {b.status === 'pending' && (
                    <>
                      <button
                        onClick={() => onTransformToContract(b)}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-400/10"
                        title="Créer le bon d'état et le contrat de location"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Faire le Contrat
                      </button>

                      <button
                        onClick={() => handleStatusChange(b.id, 'rejected')}
                        className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors"
                        title="Refuser ou annuler la demande"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {b.status === 'confirmed' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" />
                      Contrat Établi
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      ) : (
        <div className="text-center py-16 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800">
          <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Aucune demande trouvée</h3>
          <p className="text-xs text-slate-400 mt-1">
            Les réservations faites par les clients sur le site web apparaîtront ici immédiatement.
          </p>
        </div>
      )}
    </div>
  );
};
