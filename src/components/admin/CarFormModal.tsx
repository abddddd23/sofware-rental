import React, { useState, useEffect } from 'react';
import type { Car, CarCategory, FuelType, TransmissionType, CarStatus } from '../../types';
import { CarService } from '../../services/dataService';
import { compressImageToBase64 } from '../../utils/imageCompressor';
import { X, Upload, Image as ImageIcon, Trash2, AlertCircle } from 'lucide-react';

interface CarFormModalProps {
  carToEdit?: Car | null;
  isOpen: boolean;
  onClose: () => void;
}

const MAX_CAR_IMAGES = 5;
const MAX_TOTAL_IMAGE_BYTES = 600 * 1024; // 600 KB total for Firestore document safety

export const CarFormModal: React.FC<CarFormModalProps> = ({ carToEdit, isOpen, onClose }) => {
  const [brand, setBrand] = useState(carToEdit?.brand || '');
  const [model, setModel] = useState(carToEdit?.model || '');
  const [year, setYear] = useState<number>(carToEdit?.year || new Date().getFullYear());
  const [matricule, setMatricule] = useState(carToEdit?.matricule || '');
  const [category, setCategory] = useState<CarCategory>(carToEdit?.category || 'citadine');
  const [fuelType, setFuelType] = useState<FuelType>(carToEdit?.fuelType || 'Essence');
  const [transmission, setTransmission] = useState<TransmissionType>(carToEdit?.transmission || 'Manuelle');
  const [seats, setSeats] = useState<number>(carToEdit?.seats || 5);
  const [hasAC, setHasAC] = useState<boolean>(carToEdit?.hasAC ?? true);
  const [hasGPS, setHasGPS] = useState<boolean>(carToEdit?.hasGPS ?? true);
  const [pricePerDay, setPricePerDay] = useState<number>(carToEdit?.pricePerDay || 7000);
  const [caution, setCaution] = useState<number>(carToEdit?.caution || 30000);
  const [currentMileage, setCurrentMileage] = useState<number>(carToEdit?.currentMileage || 30000);
  const [lastOilChangeMileage, setLastOilChangeMileage] = useState<number>(carToEdit?.lastOilChangeMileage || 25000);
  const [nextOilChangeMileage, setNextOilChangeMileage] = useState<number>(carToEdit?.nextOilChangeMileage || 35000);
  const [status, setStatus] = useState<CarStatus>(carToEdit?.status || 'AVAILABLE');
  const [color, setColor] = useState(carToEdit?.color || '');
  const [notes, setNotes] = useState(carToEdit?.notes || '');

  const [imagesBase64, setImagesBase64] = useState<string[]>(carToEdit?.imagesBase64 || []);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Synchroniser le formulaire à l'ouverture ou changement de véhicule
  useEffect(() => {
    if (isOpen) {
      setBrand(carToEdit?.brand || '');
      setModel(carToEdit?.model || '');
      setYear(carToEdit?.year || new Date().getFullYear());
      setMatricule(carToEdit?.matricule || '');
      setCategory(carToEdit?.category || 'citadine');
      setFuelType(carToEdit?.fuelType || 'Essence');
      setTransmission(carToEdit?.transmission || 'Manuelle');
      setSeats(carToEdit?.seats || 5);
      setHasAC(carToEdit?.hasAC ?? true);
      setHasGPS(carToEdit?.hasGPS ?? true);
      setPricePerDay(carToEdit?.pricePerDay || 7000);
      setCaution(carToEdit?.caution || 30000);
      setCurrentMileage(carToEdit?.currentMileage || 30000);
      setLastOilChangeMileage(carToEdit?.lastOilChangeMileage || 25000);
      setNextOilChangeMileage(carToEdit?.nextOilChangeMileage || 35000);
      setStatus(carToEdit?.status || 'AVAILABLE');
      setColor(carToEdit?.color || '');
      setNotes(carToEdit?.notes || '');
      setImagesBase64(carToEdit?.imagesBase64 || []);
      setErrorMsg('');
      setCompressionInfo('');
    }
  }, [carToEdit, isOpen]);

  // Gestion de l'upload et compression d'image en Base64 avec limite stricte
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (imagesBase64.length + files.length > MAX_CAR_IMAGES) {
      setErrorMsg(`Limite atteinte : maximum ${MAX_CAR_IMAGES} photos par véhicule (${imagesBase64.length} déjà enregistrées).`);
      e.target.value = '';
      return;
    }

    setIsCompressing(true);
    setCompressionInfo('');
    setErrorMsg('');

    try {
      const newImages: string[] = [];
      let totalKb = 0;
      let existingBytes = imagesBase64.reduce((sum, img) => sum + img.length, 0);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { base64, sizeKb } = await compressImageToBase64(file, {
          maxWidth: 1080,
          maxHeight: 810,
          quality: 0.75,
          outputFormat: 'image/webp',
        });

        if (existingBytes + base64.length > MAX_TOTAL_IMAGE_BYTES) {
          setErrorMsg(`Plafond de taille dépassé (~600 Ko max pour préserver le document Firestore). La photo ${file.name} n'a pas pu être ajoutée.`);
          break;
        }

        existingBytes += base64.length;
        newImages.push(base64);
        totalKb += sizeKb;
      }

      if (newImages.length > 0) {
        setImagesBase64((prev) => [...prev, ...newImages]);
        setCompressionInfo(`✅ ${newImages.length} photo(s) compressée(s) en WebP (~${totalKb} Ko total). Conforme limite Firestore !`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erreur lors de la compression de l\'image.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImagesBase64((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!brand.trim() || !model.trim() || !matricule.trim()) {
      setErrorMsg('Veuillez renseigner la marque, le modèle et le matricule');
      return;
    }

    if (Number(lastOilChangeMileage) > Number(currentMileage)) {
      setErrorMsg(`Incohérence de compteur : La dernière vidange (${Number(lastOilChangeMileage).toLocaleString()} km) ne peut pas être supérieure au compteur actuel (${Number(currentMileage).toLocaleString()} km) !`);
      return;
    }

    setIsSubmitting(true);
    try {
      const carData = {
        brand,
        model,
        year: Number(year),
        matricule,
        category,
        fuelType,
        transmission,
        seats: Number(seats),
        doors: 5,
        hasAC,
        hasGPS,
        hasBluetooth: true,
        pricePerDay: Number(pricePerDay),
        caution: Number(caution),
        currentMileage: Number(currentMileage),
        lastOilChangeMileage: Number(lastOilChangeMileage),
        nextOilChangeMileage: Number(nextOilChangeMileage),
        status,
        color,
        notes,
        imagesBase64: imagesBase64.length > 0 
          ? imagesBase64 
          : ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'],
      };

      if (carToEdit) {
        await CarService.updateCar(carToEdit.id, carData);
      } else {
        await CarService.addCar(carData);
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erreur lors de l\'enregistrement du véhicule');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <h3 className="text-base font-bold text-white">
            {carToEdit ? `Modifier : ${carToEdit.brand} ${carToEdit.model}` : 'Ajouter un Nouveau Véhicule à la Flotte'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Informations Générales */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Identité du Véhicule</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Marque *</label>
                <input
                  type="text"
                  placeholder="Ex: Renault, Golf, Hyundai..."
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Modèle *</label>
                <input
                  type="text"
                  placeholder="Ex: Clio 5, Tucson..."
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Année</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Matricule (Plaque) *</label>
                <input
                  type="text"
                  placeholder="Ex: 01845-123-16"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CarCategory)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="citadine">Citadine</option>
                  <option value="berline">Berline</option>
                  <option value="suv">SUV</option>
                  <option value="utilitaire">Utilitaire</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Couleur</label>
                <input
                  type="text"
                  placeholder="Ex: Gris Titane, Blanc..."
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Boîte de vitesses</label>
                <select
                  value={transmission}
                  onChange={(e) => setTransmission(e.target.value as TransmissionType)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Manuelle">Manuelle</option>
                  <option value="Automatique">Automatique</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Carburant</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as FuelType)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Essence">Essence</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Hybride">Hybride</option>
                  <option value="Electrique">Electrique</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Statut Actuel</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CarStatus)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="AVAILABLE">Disponible</option>
                  <option value="RESERVED">Réservée</option>
                  <option value="RENTED">Louée (En cours)</option>
                  <option value="MAINTENANCE">En Maintenance / Garage</option>
                  <option value="INACTIVE">Inactive / Retirée</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tarification */}
          <div className="space-y-4 pt-3 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Tarification & Caution (DA)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Prix de location / Jour (DA) *</label>
                <input
                  type="number"
                  step="500"
                  value={pricePerDay}
                  onChange={(e) => setPricePerDay(Number(e.target.value))}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Montant Caution (DA) *</label>
                <input
                  type="number"
                  step="5000"
                  value={caution}
                  onChange={(e) => setCaution(Number(e.target.value))}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Kilométrage & Vidanges */}
          <div className="space-y-4 pt-3 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Suivi Kilométrage & Vidange (KM)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Kilométrage Actuel (KM) *</label>
                <input
                  type="number"
                  value={currentMileage}
                  onChange={(e) => setCurrentMileage(Number(e.target.value))}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Dernière Vidange à (KM)</label>
                <input
                  type="number"
                  value={lastOilChangeMileage}
                  onChange={(e) => setLastOilChangeMileage(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Prochaine Vidange à (KM) *</label>
                <input
                  type="number"
                  value={nextOilChangeMileage}
                  onChange={(e) => setNextOilChangeMileage(Number(e.target.value))}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-bold text-amber-400"
                />
              </div>
            </div>

            {/* Détection d'incohérence entre compteur et vidange */}
            {Number(lastOilChangeMileage) > Number(currentMileage) && (
              <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-start gap-3 text-xs text-rose-300 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <p className="font-bold text-rose-200">
                    ⚠️ Incohérence Logique Détectée :
                  </p>
                  <p className="text-[11px] text-rose-300/90 leading-relaxed">
                    La dernière vidange (<strong>{Number(lastOilChangeMileage).toLocaleString()} km</strong>) ne peut pas être supérieure au compteur actuel (<strong>{Number(currentMileage).toLocaleString()} km</strong>). Un véhicule ne peut pas avoir effectué sa vidange dans le futur !
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCurrentMileage(Number(lastOilChangeMileage))}
                      className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      🔧 Mettre le compteur actuel à {Number(lastOilChangeMileage).toLocaleString()} km
                    </button>
                    <button
                      type="button"
                      onClick={() => setLastOilChangeMileage(Math.max(0, Number(currentMileage) - 5000))}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Ajuster dernière vidange à {Math.max(0, Number(currentMileage) - 5000).toLocaleString()} km
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Raccourci pour fixer prochaine vidange à +10 000 km */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNextOilChangeMileage(Number(lastOilChangeMileage || currentMileage) + 10000)}
                className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                ⚡ Fixer prochaine vidange à +10 000 km ({Number(Number(lastOilChangeMileage || currentMileage) + 10000).toLocaleString()} km)
              </button>
            </div>
          </div>

          {/* Module Photos & Compression Base64 */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Photos du Véhicule (Compression Base64 Intégrée)
              </h4>
              <span className="text-[11px] text-slate-400">Limite Firestore : 1 Mo (Sécurisé)</span>
            </div>

            {/* Upload Zone */}
            <div className="border-2 border-dashed border-slate-700 hover:border-amber-400/50 rounded-2xl p-5 text-center transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                id="car-photos"
                onChange={handleImageUpload}
                disabled={isCompressing}
                className="hidden"
              />
              <label htmlFor="car-photos" className="cursor-pointer flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-white">
                  {isCompressing ? 'Compression en cours...' : 'Cliquez pour ajouter des photos depuis votre appareil'}
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm">
                  Chaque photo est automatiquement compressée en WebP Base64 (~100 Ko) pour un stockage 100% gratuit dans Firestore.
                </p>
              </label>
            </div>

            {compressionInfo && (
              <p className="text-xs text-emerald-400 font-medium bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                {compressionInfo}
              </p>
            )}

            {/* Aperçu des photos sélectionnées */}
            {imagesBase64.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
                {imagesBase64.map((img, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video bg-slate-950 border border-slate-800">
                    <img src={img} alt="car preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[9px] font-bold bg-black/70 text-white rounded">
                      Photo {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Boutons Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-md shadow-amber-400/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : carToEdit ? 'Mettre à jour' : 'Ajouter à la Flotte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
