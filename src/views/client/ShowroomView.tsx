import React, { useState, useRef } from 'react';
import type { Car, AgencySettings } from '../../types';
import { defaultAgencySettings } from '../../types';
import { ClientNavbar } from '../../components/client/ClientNavbar';
import { HeroSection } from '../../components/client/HeroSection';
import { CarCard } from '../../components/client/CarCard';
import { BookingModal } from '../../components/client/BookingModal';
import { ClientFooter } from '../../components/client/ClientFooter';
import { Search, SlidersHorizontal, CheckCircle2, Sparkles } from 'lucide-react';

interface ShowroomViewProps {
  cars: Car[];
  agencySettings?: AgencySettings;
}

export const ShowroomView: React.FC<ShowroomViewProps> = ({ 
  cars, 
  agencySettings = defaultAgencySettings,
}) => {
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTransmission, setSelectedTransmission] = useState<string>('all');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);

  const catalogRef = useRef<HTMLDivElement>(null);

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleReserve = (car: Car) => {
    setSelectedCar(car);
    setIsModalOpen(true);
  };

  // Filtrage des voitures
  const filteredCars = cars.filter((car) => {
    const matchesSearch =
      car.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car.model.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || car.category === selectedCategory;

    const matchesTransmission =
      selectedTransmission === 'all' || car.transmission === selectedTransmission;

    const matchesAvailability = !onlyAvailable || car.status === 'AVAILABLE' || car.status === ('available' as any);

    return matchesSearch && matchesCategory && matchesTransmission && matchesAvailability;
  });

  const availableCount = cars.filter((c) => c.status === 'AVAILABLE' || c.status === ('available' as any)).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navigation Client (Pure Vitrine) */}
      <ClientNavbar onScrollToCatalog={scrollToCatalog} settings={agencySettings} />

      {/* Hero Section */}
      <HeroSection onExploreClick={scrollToCatalog} settings={agencySettings} />

      {/* Catalogue & Filtres */}
      <main ref={catalogRef} className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Notre Parc Automobile
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Choisissez Votre Véhicule
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Des tarifs clairs en dinars algériens, zéro frais cachés, assurance comprise.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {availableCount} véhicule(s) disponible(s) aujourd'hui
            </span>
          </div>
        </div>

        {/* Barre de Filtres */}
        <div className="my-8 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher une marque ou modèle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-amber-400 placeholder:text-slate-400 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              {['all', 'citadine', 'berline', 'suv'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${
                    selectedCategory === cat
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat === 'all' ? 'Toutes' : cat}
                </button>
              ))}
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              {[
                { label: 'Toutes boîtes', val: 'all' },
                { label: 'Automatique', val: 'Automatique' },
                { label: 'Manuelle', val: 'Manuelle' },
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => setSelectedTransmission(item.val)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    selectedTransmission === item.val
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 cursor-pointer hover:border-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-white border-slate-300"
              />
              <span className="font-medium">Disponibles seulement</span>
            </label>
          </div>
        </div>

        {/* Grille des Voitures */}
        {filteredCars.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCars.map((car) => (
              <CarCard key={car.id} car={car} onReserve={handleReserve} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 p-8 rounded-2xl bg-white border border-dashed border-slate-300 shadow-xs">
            <SlidersHorizontal className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">Aucun véhicule ne correspond à vos critères</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Essayez de modifier ou réinitialiser vos filtres de recherche.
            </p>
          </div>
        )}
      </main>

      {/* Modal de Réservation Client */}
      <BookingModal
        car={selectedCar}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Footer */}
      <ClientFooter settings={agencySettings} />
    </div>
  );
};
