export type CarCategory = 'citadine' | 'berline' | 'suv' | 'utilitaire';
export type FuelType = 'Essence' | 'Diesel' | 'Hybride' | 'Electrique';
export type TransmissionType = 'Manuelle' | 'Automatique';

// Machine à états stricte pour les véhicules :
// AVAILABLE -> RESERVED -> RENTED -> AVAILABLE (ou MAINTENANCE / INACTIVE)
export type CarStatus = 'AVAILABLE' | 'RESERVED' | 'RENTED' | 'MAINTENANCE' | 'INACTIVE';

// Données publiques d'une voiture (visibles sur la vitrine client)
export interface PublicCar {
  id: string;
  brand: string;
  model: string;
  year: number;
  category: CarCategory;
  fuelType: FuelType;
  transmission: TransmissionType;
  seats: number;
  doors: number;
  hasAC: boolean;
  hasGPS: boolean;
  hasBluetooth: boolean;
  pricePerDay: number; // en Dinars Algériens (DA)
  caution: number; // Caution en DA
  status: CarStatus;
  rentedUntil?: string; // Date de fin de location si louée/réservée
  imagesBase64: string[]; // Photos compressées en Base64
  color?: string;
  createdAt: string;
}

// Données internes de gestion de flotte (strictement confidentielles pour l'agence)
export interface CarInternalData {
  matricule: string;
  currentMileage: number;
  lastOilChangeMileage: number;
  nextOilChangeMileage: number;
  notes?: string;
}

// Modèle complet pour le logiciel de gestion interne
export interface Car extends PublicCar, CarInternalData {}

export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'completed';

export interface BookingDemand {
  id: string;
  carId: string;
  carName: string;
  carImage?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerWilaya: string;
  customerPermitNumber?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  pricePerDay: number;
  estimatedTotal: number;
  status: BookingStatus;
  agencyNotes?: string;
  createdAt: string;
}

export type FuelLevel = '1/4' | '1/2' | '3/4' | 'Plein';

export interface CarDamagePoint {
  id: string;
  location: 'avant' | 'arriere' | 'cote_gauche' | 'cote_droit' | 'toit' | 'pare_brise' | 'interieur';
  type: 'rayure' | 'enfoncement' | 'fissure' | 'tache' | 'autre';
  description: string;
}

export type ContractStatus = 'active' | 'completed' | 'cancelled';

// Gestion des statuts de paiement clairs
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export interface RentalContract {
  id: string;
  bookingId?: string;
  carId: string;
  carName: string;
  customerName: string;
  customerPhone: string;
  customerNationalId?: string;
  customerPermitNumber?: string;
  customerAddress?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  dailyRate: number;
  totalAmount: number; // Prix total de la location
  advancePaid: number; // Montant payé au départ pour la location
  remainingAmount: number; // Reste à payer sur la location
  paymentStatus: PaymentStatus; // 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'
  
  // Gestion de la Caution Séparée ("la caution w7dha")
  cautionAmount: number; // Montant caution déposé
  cautionType?: 'especes' | 'cheque' | 'passeport' | 'autre';
  cautionStatus?: 'held' | 'returned' | 'deducted'; // 'held' (au départ) | 'returned' (restituée) | 'deducted' (retenue pour dégâts)
  cautionReturnedAmount?: number; // Montant effectivement rendu au client
  cautionRetainedAmount?: number; // Montant conservé définitivement par l'agence (dégâts/indemnité)
  cautionNotes?: string;

  status: ContractStatus;
  
  // Bon d'état - Départ (Check-out)
  departureKm: number;
  departureFuel: FuelLevel;
  departureNotes?: string;
  departureDamages: CarDamagePoint[];
  departureDamagePhotosBase64?: string[];

  // Bon d'état - Retour (Check-in)
  returnDateActual?: string;
  returnKm?: number;
  returnFuel?: FuelLevel;
  returnNotes?: string;
  extraFees?: number; // Frais additionnels (retard, manque essence, dégâts)
  penaltyReason?: string;

  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory = 
  | 'vidange' 
  | 'reparation' 
  | 'assurance' 
  | 'controle_technique' 
  | 'lavage' 
  | 'pieces' 
  | 'carburant' 
  | 'loyer_agence' 
  | 'autre';

export interface Expense {
  id: string;
  carId?: string;
  carName?: string;
  category: ExpenseCategory;
  amount: number; // en DA
  date: string;
  mileageAtExpense?: number;
  supplier?: string;
  description: string;
  createdAt: string;
}

export interface AgencyMetrics {
  totalRevenue: number;
  totalCautionHeld: number; // Montant des cautions actuellement en séquestre/coffre (contrats actifs)
  totalCautionRetained: number; // Montant des cautions conservées définitivement (dégâts/indemnités)
  totalCaisseWithCaution: number; // Total liquide physique encaissé en caisse (Loyers + Cautions retenues + Cautions séquestre)
  totalExpenses: number;
  netProfit: number;
  activeRentalsCount: number;
  pendingBookingsCount: number;
  availableCarsCount: number;
  totalCarsCount: number;
  urgentVidangesCount: number;
}

export interface AgencySettings {
  agencyName: string;
  slogan: string;
  phonePrimary: string;
  phoneSecondary: string;
  whatsappNumber: string;
  address: string;
  zone: string;
  email: string;
  hoursWeekday: string;
  hoursWeekend: string;
  hoursNote: string;
  conditions: string[];
  dailyKmAllowance: number;
  extraKmFee: number;
}

export const defaultAgencySettings: AgencySettings = {
  agencyName: 'AutoLoc Prestige',
  slogan: 'Location de Voitures Récentes à Alger',
  phonePrimary: '0555 00 11 22',
  phoneSecondary: '0770 12 34 56',
  whatsappNumber: '213555001122',
  address: 'Rue Djenane El Malik, Hydra, Alger',
  zone: 'Alger & Environs • 7j/7',
  email: 'contact@autoloc-algerie.com',
  hoursWeekday: 'Du Samedi au Jeudi : 08h00 - 20h00',
  hoursWeekend: 'Vendredi : 14h30 - 19h30',
  hoursNote: 'Livraison aéroport Alger possible 24h/24 sur réservation',
  conditions: [
    'Âge minimum : 23 ans avec au moins 2 ans de permis valide',
    'Caution obligatoire (chèque de caution ou espèces restitué au retour)',
    "Pièce d'identité biométrique + Permis de conduire physique obligatoires",
    'Forfait kilométrique standard : 100 km / jour (dépassant facturé)',
    'Véhicule livré propre avec le plein, à restituer dans le même état',
  ],
  dailyKmAllowance: 100,
  extraKmFee: 25,
};
