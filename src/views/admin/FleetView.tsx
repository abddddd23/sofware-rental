import React, { useState } from 'react';
import type { Car, CarStatus } from '../../types';
import { CarService } from '../../services/dataService';
import { formatCurrency, formatMileage, getVidangeStatus } from '../../utils/formatters';
import { 
  Car as CarIcon, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Fuel,
  Gauge,
  History
} from 'lucide-react';

interface FleetViewProps {
  cars: Car[];
  onOpenNewCar: () => void;
  onEditCar: (car: Car) => void;
  onRentCar: (car: Car) => void;
  onViewHistory: (car: Car) => void;
}

export const FleetView: React.FC<FleetViewProps> = ({
  cars,
  onOpenNewCar,
  onEditCar,
  onRentCar,
  onViewHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = cars.filter((c) => {
    const matchesSearch =
      c.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.matricule.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusToggle = async (carId: string, newStatus: CarStatus) => {
    await CarService.updateCar(carId, { status: newStatus });
  };

  const handleDelete = async (car: Car) => {
    if (window.confirm(`Voulez-vous vraiment supprimer la ${car.brand} ${car.model} (${car.matricule}) ?`)) {
      await CarService.deleteCar(car.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <CarIcon className="w-6 h-6 text-amber-400" />
            Parc Automobile & Flotte de l'Agence
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gérez vos véhicules, tarifs en dinars, kilométrages, statuts et photos compressées Base64.
          </p>
        </div>

        <button
          onClick={onOpenNewCar}
          className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-400/10 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Ajouter un Véhicule
        </button>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher marque, modèle ou matricule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60 text-xs w-full sm:w-auto">
          {[
            { id: 'all', label: 'Toutes' },
            { id: 'available', label: 'Disponibles' },
            { id: 'rented', label: 'Louées' },
            { id: 'maintenance', label: 'En Révision' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === item.id
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grille des Voitures */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((car) => {
          const vidange = getVidangeStatus(car.currentMileage, car.nextOilChangeMileage);
          const photo = car.imagesBase64?.[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80';

          return (
            <div
              key={car.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg"
            >
              <div>
                {/* Photo & Badge Statut */}
                <div className="relative h-44 bg-slate-950 overflow-hidden">
                  <img src={photo} alt={car.model} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

                  {/* Status Dropdown avec machine à états stricte */}
                  <div className="absolute top-3 left-3">
                    <select
                      value={car.status}
                      onChange={(e) => handleStatusToggle(car.id, e.target.value as CarStatus)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                        car.status === 'AVAILABLE' || car.status === ('available' as any)
                          ? 'bg-emerald-500/90 text-slate-950 border-emerald-400'
                          : car.status === 'RESERVED'
                          ? 'bg-blue-500/90 text-white border-blue-400'
                          : car.status === 'RENTED' || car.status === ('rented' as any)
                          ? 'bg-amber-500/90 text-slate-950 border-amber-400'
                          : car.status === 'MAINTENANCE' || car.status === ('maintenance' as any)
                          ? 'bg-rose-500/90 text-white border-rose-400'
                          : 'bg-slate-700 text-slate-300 border-slate-600'
                      }`}
                    >
                      <option value="AVAILABLE">🟢 AVAILABLE (Disponible)</option>
                      <option value="RESERVED">🔵 RESERVED (Réservée)</option>
                      <option value="RENTED">🟡 RENTED (Louée)</option>
                      <option value="MAINTENANCE">🔴 MAINTENANCE (Révision)</option>
                      <option value="INACTIVE">⚪ INACTIVE (Désactivée)</option>
                    </select>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                    <span className="font-mono bg-black/70 px-2 py-0.5 rounded text-white font-bold">
                      {car.matricule}
                    </span>
                    <span className="text-amber-400 font-bold bg-slate-900/80 px-2 py-0.5 rounded">
                      {formatCurrency(car.pricePerDay)} / j
                    </span>
                  </div>
                </div>

                {/* Car Spec & Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{car.brand} {car.model} ({car.year})</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-amber-400" /> {car.transmission}
                      </span>
                      <span className="flex items-center gap-1">
                        <Fuel className="w-3.5 h-3.5 text-amber-400" /> {car.fuelType}
                      </span>
                      <span>Caution : {formatCurrency(car.caution)}</span>
                    </div>
                  </div>

                  {/* Compteurs KM & Vidange */}
                  <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Kilométrage Actuel :</span>
                      <strong className="text-white font-mono">{formatMileage(car.currentMileage)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Prochaine Vidange :</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${vidange.badgeColor}`}>
                        {vidange.statusText}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-2 bg-slate-950/40">
                {car.status === 'AVAILABLE' || car.status === ('available' as any) ? (
                  <button
                    onClick={() => onRentCar(car)}
                    className="flex-1 py-2 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Créer Contrat
                  </button>
                ) : (
                  <span className="flex-1 text-center py-2 text-xs text-slate-400 font-medium">
                    {car.status === 'RESERVED' ? 'Réservée par un client' : car.status === 'RENTED' || car.status === ('rented' as any) ? 'En cours de location' : 'Au garage / révision'}
                  </span>
                )}

                {/* Bouton Carnet de Vie (Historique complet) */}
                <button
                  onClick={() => onViewHistory(car)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 hover:border-amber-400/40"
                  title="Consulter le Carnet de Vie & Historique"
                >
                  <History className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onEditCar(car)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  title="Modifier les détails"
                >
                  <Edit className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(car)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700"
                  title="Supprimer de la flotte"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
