import React from 'react';
import type { Car } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Fuel, Gauge, Users, Wind, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

interface CarCardProps {
  car: Car;
  onReserve: (car: Car) => void;
}

export const CarCard: React.FC<CarCardProps> = ({ car, onReserve }) => {
  const isAvailable = car.status === 'AVAILABLE' || car.status === ('available' as any);
  const isReserved = car.status === 'RESERVED';
  const isRented = car.status === 'RENTED' || car.status === ('rented' as any);
  const mainImage = car.imagesBase64?.[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-amber-400 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col">
      {/* Image & Status Badge */}
      <div className="relative h-52 sm:h-56 overflow-hidden bg-slate-100">
        <img
          src={mainImage}
          alt={`${car.brand} ${car.model}`}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          {isAvailable ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Disponible
            </span>
          ) : isReserved ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 shadow-md">
              <Clock className="w-3.5 h-3.5" />
              Réservée
            </span>
          ) : isRented ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-amber-400 shadow-md">
              <Clock className="w-3.5 h-3.5" />
              Louée {car.rentedUntil ? `jusqu'au ${formatDate(car.rentedUntil)}` : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500 text-white shadow-md">
              <ShieldAlert className="w-3.5 h-3.5" />
              En maintenance
            </span>
          )}
        </div>

        {/* Year Tag */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 shadow-xs">
          {car.year}
        </div>

        {/* Category Badge */}
        <div className="absolute bottom-3 left-3">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-800 bg-white/90 backdrop-blur-sm px-2.5 py-0.5 rounded shadow-xs">
            {car.category}
          </span>
        </div>
      </div>

      {/* Car Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & Model */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">{car.brand}</p>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{car.model}</h3>
            </div>
            {car.color && (
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                {car.color}
              </span>
            )}
          </div>

          {/* Specs Grid */}
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <Gauge className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{car.transmission}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <Fuel className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{car.fuelType}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <Users className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{car.seats} Places</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <Wind className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{car.hasAC ? 'Climatisation' : 'Non climatisée'}</span>
            </div>
          </div>
        </div>

        {/* Price & Action */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">Tarif location</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">
                {formatCurrency(car.pricePerDay).replace(' DA', '')}
              </span>
              <span className="text-xs font-bold text-slate-500">DA / jour</span>
            </div>
            <p className="text-[11px] text-slate-400">Caution : {formatCurrency(car.caution)}</p>
          </div>

          <button
            onClick={() => onReserve(car)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              isAvailable
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            {isAvailable ? 'Réserver' : 'Pré-réserver'}
          </button>
        </div>
      </div>
    </div>
  );
};
