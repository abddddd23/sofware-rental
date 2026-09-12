import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  deleteField,
  onSnapshot, 
  query, 
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { Car, BookingDemand, RentalContract, Expense, AgencyMetrics, AgencySettings } from '../types';
import { defaultAgencySettings } from '../types';
import { initialCars, initialBookings, initialRentals, initialExpenses } from '../utils/seedData';

// Clés pour le stockage local de secours
const LOCAL_STORAGE_KEYS = {
  CARS: 'rental_cars_data',
  BOOKINGS: 'rental_bookings_data',
  RENTALS: 'rental_contracts_data',
  EXPENSES: 'rental_expenses_data',
  SETTINGS: 'rental_agency_settings',
};

// Émetteur d'événements simple pour la réactivité locale en temps réel
class LocalEventEmitter {
  private listeners: { [key: string]: Function[] } = {};

  subscribe(key: string, fn: Function) {
    if (!this.listeners[key]) this.listeners[key] = [];
    this.listeners[key].push(fn);
    return () => {
      this.listeners[key] = this.listeners[key].filter(l => l !== fn);
    };
  }

  emit(key: string, data: any) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(fn => fn(data));
    }
  }
}
const localEmitter = new LocalEventEmitter();

// Récupération initiale des données locales (tableaux)
function getLocal<T>(key: string, defaultValue: T[]): T[] {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(saved);
  } catch (_e) {
    return defaultValue;
  }
}

function saveLocal<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    localEmitter.emit(key, data);
  } catch (e) {
    console.error('Erreur de sauvegarde locale :', e);
  }
}

// Récupération d'un objet unique (ex: paramètres agence)
function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return { ...defaultValue, ...JSON.parse(saved) };
  } catch (_e) {
    return defaultValue;
  }
}

function saveLocalItem<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    localEmitter.emit(key, data);
  } catch (e) {
    console.error('Erreur de sauvegarde locale :', e);
  }
}

// Nettoyage des objets pour setDoc (Firestore rejette formellement toute valeur 'undefined')
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): any {
  const clean: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      clean[key] = obj[key];
    }
  }
  return clean;
}

// Nettoyage pour updateDoc : les champs undefined sont convertis en deleteField() pour supprimer proprement la clé
function sanitizeForUpdate<T extends Record<string, any>>(obj: T): any {
  const clean: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] === undefined) {
      clean[key] = deleteField();
    } else {
      clean[key] = obj[key];
    }
  }
  return clean;
}

// Champs internes de gestion de flotte (strictement confidentiels pour l'agence)
const PRIVATE_CAR_FIELDS = new Set([
  'matricule',
  'currentMileage',
  'lastOilChangeMileage',
  'nextOilChangeMileage',
  'notes',
]);

function splitCarData(car: Partial<Car>) {
  const publicData: Record<string, any> = {};
  const privateData: Record<string, any> = {};

  for (const [key, val] of Object.entries(car)) {
    if (PRIVATE_CAR_FIELDS.has(key)) {
      privateData[key] = val;
    } else {
      publicData[key] = val;
    }
  }

  return { publicData, privateData };
}

// -------------------------------------------------------------
// SERVICE VOITURES (CARS)
// -------------------------------------------------------------
export const CarService = {
  subscribe(callback: (cars: Car[]) => void, isInternalAuthenticated = false) {
    if (isFirebaseConfigured && db) {
      const qPublic = query(collection(db, 'cars'));

      // 1. LOGICIEL INTERNE AUTHENTIFIÉ :
      // Combine les données publiques de /cars et les données internes de /cars_private
      if (isInternalAuthenticated) {
        let publicCars: any[] = [];
        let privateMap: Record<string, any> = {};

        const emitMerged = () => {
          const merged = publicCars.map(p => ({
            ...p,
            matricule: privateMap[p.id]?.matricule ?? '',
            currentMileage: privateMap[p.id]?.currentMileage ?? 0,
            lastOilChangeMileage: privateMap[p.id]?.lastOilChangeMileage ?? 0,
            nextOilChangeMileage: privateMap[p.id]?.nextOilChangeMileage ?? 0,
            notes: privateMap[p.id]?.notes ?? '',
          } as Car));
          callback(merged);
        };

        const unsubPublic = onSnapshot(qPublic, (snapshot) => {
          if (snapshot.empty && getLocal(LOCAL_STORAGE_KEYS.CARS, []).length === 0) {
            // Seeding initial partitionné si base vide
            initialCars.forEach(car => {
              const { publicData, privateData } = splitCarData(car);
              setDoc(doc(db!, 'cars', car.id), sanitizeForFirestore(publicData)).catch(() => {});
              setDoc(doc(db!, 'cars_private', car.id), sanitizeForFirestore(privateData)).catch(() => {});
              setDoc(doc(db!, 'cars', car.id, 'private', 'data'), sanitizeForFirestore(privateData)).catch(() => {});
            });
          }
          publicCars = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
          emitMerged();
        }, (err) => {
          console.warn('Firestore fallback to local for public cars:', err);
          callback(getLocal(LOCAL_STORAGE_KEYS.CARS, initialCars));
        });

        const qPrivate = query(collection(db, 'cars_private'));
        const unsubPrivate = onSnapshot(qPrivate, (snapshot) => {
          privateMap = {};
          snapshot.docs.forEach(d => {
            privateMap[d.id] = d.data();
          });
          emitMerged();
        }, (err) => {
          console.warn('Firestore fallback to local for private cars:', err);
        });

        return () => {
          unsubPublic();
          unsubPrivate();
        };
      }

      // 2. SITE WEB PUBLIC (VISITEUR ANONYME SANS LOGIN) :
      // Écoute exclusivement /cars (ZÉRO écoute ou requête sur /cars_private ou /private)
      return onSnapshot(qPublic, (snapshot) => {
        const publicOnlyCars = snapshot.docs.map(d => {
          const data = { ...d.data(), id: d.id } as any;
          // Élimination garantie de toute propriété interne résiduelle
          delete data.matricule;
          delete data.currentMileage;
          delete data.lastOilChangeMileage;
          delete data.nextOilChangeMileage;
          delete data.notes;
          return data as Car;
        });
        callback(publicOnlyCars);
      }, (err) => {
        console.warn('Firestore fallback to local for public cars:', err);
        callback(getLocal(LOCAL_STORAGE_KEYS.CARS, initialCars));
      });
    }

    // Mode Local
    callback(getLocal(LOCAL_STORAGE_KEYS.CARS, initialCars));
    return localEmitter.subscribe(LOCAL_STORAGE_KEYS.CARS, callback);
  },

  async addCar(car: Omit<Car, 'id' | 'createdAt'>): Promise<string> {
    const newId = 'car_' + Date.now().toString(36);
    const newCar: Car = {
      ...car,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    const { publicData, privateData } = splitCarData(newCar);

    if (isFirebaseConfigured && db) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'cars', newId), sanitizeForFirestore(publicData));
        batch.set(doc(db, 'cars_private', newId), sanitizeForFirestore(privateData));
        batch.set(doc(db, 'cars', newId, 'private', 'data'), sanitizeForFirestore(privateData));
        await batch.commit();
      } catch (err) {
        console.warn('Firestore addCar fallback to local:', err);
      }
      return newId;
    }

    const current = getLocal<Car>(LOCAL_STORAGE_KEYS.CARS, initialCars);
    saveLocal(LOCAL_STORAGE_KEYS.CARS, [newCar, ...current]);
    return newId;
  },

  async updateCar(id: string, updates: Partial<Car>): Promise<void> {
    const { publicData, privateData } = splitCarData(updates);

    if (isFirebaseConfigured && db) {
      try {
        const batch = writeBatch(db);
        if (Object.keys(publicData).length > 0) {
          batch.update(doc(db, 'cars', id), sanitizeForUpdate(publicData));
        }
        if (Object.keys(privateData).length > 0) {
          batch.set(doc(db, 'cars_private', id), sanitizeForUpdate(privateData), { merge: true });
          batch.set(doc(db, 'cars', id, 'private', 'data'), sanitizeForUpdate(privateData), { merge: true });
        }
        await batch.commit();
      } catch (err) {
        console.warn('Firestore updateCar fallback to local:', err);
      }
    }

    const current = getLocal<Car>(LOCAL_STORAGE_KEYS.CARS, initialCars);
    const updated = current.map(c => {
      if (c.id !== id) return c;
      const copy: any = { ...c, ...updates };
      for (const k of Object.keys(updates)) {
        if ((updates as any)[k] === undefined) {
          delete copy[k];
        }
      }
      return copy as Car;
    });
    saveLocal(LOCAL_STORAGE_KEYS.CARS, updated);
  },

  async deleteCar(id: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'cars', id));
        batch.delete(doc(db, 'cars_private', id));
        batch.delete(doc(db, 'cars', id, 'private', 'data'));
        await batch.commit();
      } catch (err) {
        console.warn('Firestore deleteCar fallback to local:', err);
      }
      return;
    }

    const current = getLocal<Car>(LOCAL_STORAGE_KEYS.CARS, initialCars);
    saveLocal(LOCAL_STORAGE_KEYS.CARS, current.filter(c => c.id !== id));
  }
};

// -------------------------------------------------------------
// SERVICE RÉSERVATIONS (BOOKINGS - DEMANDES CLIENTS)
// -------------------------------------------------------------
export const BookingService = {
  subscribe(callback: (bookings: BookingDemand[]) => void) {
    if (isFirebaseConfigured && db) {
      const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(100));
      return onSnapshot(q, (snapshot) => {
        const bookings = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as BookingDemand));
        callback(bookings);
      }, (err) => {
        console.warn('Firestore fallback to local for bookings:', err);
        callback(getLocal(LOCAL_STORAGE_KEYS.BOOKINGS, initialBookings));
      });
    }

    callback(getLocal(LOCAL_STORAGE_KEYS.BOOKINGS, initialBookings));
    return localEmitter.subscribe(LOCAL_STORAGE_KEYS.BOOKINGS, callback);
  },

  async createBooking(booking: Omit<BookingDemand, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const newId = 'book_' + Date.now().toString(36);
    const newBooking: BookingDemand = {
      ...booking,
      id: newId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const cleanData = sanitizeForFirestore(newBooking);

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'bookings', newId), cleanData);
        const current = getLocal<BookingDemand>(LOCAL_STORAGE_KEYS.BOOKINGS, initialBookings);
        saveLocal(LOCAL_STORAGE_KEYS.BOOKINGS, [newBooking, ...current.filter(b => b.id !== newId)]);
        return newId;
      } catch (err) {
        console.warn('Erreur Firestore pour la réservation, sauvegarde locale de secours :', err);
        const current = getLocal<BookingDemand>(LOCAL_STORAGE_KEYS.BOOKINGS, initialBookings);
        saveLocal(LOCAL_STORAGE_KEYS.BOOKINGS, [newBooking, ...current]);
        return newId;
      }
    }

    const current = getLocal<BookingDemand>(LOCAL_STORAGE_KEYS.BOOKINGS, initialBookings);
    saveLocal(LOCAL_STORAGE_KEYS.BOOKINGS, [newBooking, ...current]);
    return newId;
  },

  async updateBookingStatus(id: string, status: BookingDemand['status'], agencyNotes?: string): Promise<void> {
    const updates: Partial<BookingDemand> = { status };
    if (agencyNotes !== undefined) updates.agencyNotes = agencyNotes;

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'bookings', id), sanitizeForUpdate(updates));
      } catch (e) {
        console.warn('Firestore updateBookingStatus error:', e);
      }
    }

    const current = getLocal<BookingDemand>(LOCAL_STORAGE_KEYS.BOOKINGS, initialBookings);
    const updated = current.map(b => b.id === id ? { ...b, ...updates } : b);
    saveLocal(LOCAL_STORAGE_KEYS.BOOKINGS, updated);
  }
};

// -------------------------------------------------------------
// SERVICE CONTRATS & BON D'ÉTAT (RENTAL CONTRACTS)
// -------------------------------------------------------------
export const RentalService = {
  subscribe(callback: (rentals: RentalContract[]) => void) {
    if (isFirebaseConfigured && db) {
      const q = query(collection(db, 'rentals'), orderBy('createdAt', 'desc'), limit(100));
      return onSnapshot(q, (snapshot) => {
        const rentals = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as RentalContract));
        callback(rentals);
      }, (err) => {
        console.warn('Firestore fallback to local for rentals:', err);
        callback(getLocal(LOCAL_STORAGE_KEYS.RENTALS, initialRentals));
      });
    }

    callback(getLocal(LOCAL_STORAGE_KEYS.RENTALS, initialRentals));
    return localEmitter.subscribe(LOCAL_STORAGE_KEYS.RENTALS, callback);
  },

  async createContract(contractData: Omit<RentalContract, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const newId = 'rent_' + Date.now().toString(36);
    const cleanData = sanitizeForFirestore(contractData);
    const newContract: RentalContract = {
      ...cleanData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Écriture atomique Firestore (Contrat + Statut Voiture + Confirmation Réservation)
    if (isFirebaseConfigured && db) {
      try {
        const batch = writeBatch(db);
        const contractRef = doc(db, 'rentals', newId);
        batch.set(contractRef, sanitizeForFirestore(newContract));

        const carRef = doc(db, 'cars', contractData.carId);
        batch.update(carRef, sanitizeForUpdate({
          status: 'RENTED',
          rentedUntil: contractData.endDate,
        }));

        const carPrivateRef = doc(db, 'cars_private', contractData.carId);
        batch.set(carPrivateRef, sanitizeForUpdate({
          currentMileage: contractData.departureKm,
        }), { merge: true });

        const carSubPrivateRef = doc(db, 'cars', contractData.carId, 'private', 'data');
        batch.set(carSubPrivateRef, sanitizeForUpdate({
          currentMileage: contractData.departureKm,
        }), { merge: true });

        if (contractData.bookingId) {
          const bookingRef = doc(db, 'bookings', contractData.bookingId);
          batch.update(bookingRef, sanitizeForUpdate({
            status: 'confirmed',
          }));
        }

        await batch.commit();
      } catch (err) {
        console.warn('Firestore createContract batch fallback to local:', err);
      }
    }

    // Sauvegarde locale miroir
    const currentRentals = getLocal<RentalContract>(LOCAL_STORAGE_KEYS.RENTALS, initialRentals);
    saveLocal(LOCAL_STORAGE_KEYS.RENTALS, [newContract, ...currentRentals]);

    const currentCars = getLocal<Car>(LOCAL_STORAGE_KEYS.CARS, initialCars);
    saveLocal(LOCAL_STORAGE_KEYS.CARS, currentCars.map(c => c.id === contractData.carId ? {
      ...c,
      status: 'RENTED' as const,
      rentedUntil: contractData.endDate,
      currentMileage: contractData.departureKm,
    } : c));

    if (contractData.bookingId) {
      const currentBookings = getLocal<BookingDemand>(LOCAL_STORAGE_KEYS.BOOKINGS, initialBookings);
      saveLocal(LOCAL_STORAGE_KEYS.BOOKINGS, currentBookings.map(b => b.id === contractData.bookingId ? {
        ...b,
        status: 'confirmed' as const,
      } : b));
    }

    return newId;
  },

  async completeContract(
    contractId: string, 
    returnDetails: {
      returnKm: number;
      returnFuel: RentalContract['departureFuel'];
      returnNotes?: string;
      extraFees?: number;
      penaltyReason?: string;
      settlePayment?: boolean;
      postReturnStatus?: 'AVAILABLE' | 'MAINTENANCE';
      cautionStatus?: 'returned' | 'deducted' | 'held';
      cautionReturnedAmount?: number;
      cautionRetainedAmount?: number;
      cautionNotes?: string;
    }
  ): Promise<void> {
    let contract: RentalContract | undefined;

    if (isFirebaseConfigured && db) {
      try {
        const currentRentals = await getDocs(collection(db, 'rentals'));
        const found = currentRentals.docs.find(d => d.id === contractId);
        if (found) contract = found.data() as RentalContract;
      } catch (e) {
        console.warn('Firestore fallback on get contract:', e);
      }
    }
    
    if (!contract) {
      const current = getLocal<RentalContract>(LOCAL_STORAGE_KEYS.RENTALS, initialRentals);
      contract = current.find(r => r.id === contractId);
    }

    if (!contract) return;

    const updates: Partial<RentalContract> = {
      status: 'completed',
      returnDateActual: new Date().toISOString(),
      returnKm: returnDetails.returnKm,
      returnFuel: returnDetails.returnFuel,
      returnNotes: returnDetails.returnNotes || '',
      extraFees: returnDetails.extraFees || 0,
      penaltyReason: returnDetails.penaltyReason || '',
      cautionStatus: returnDetails.cautionStatus || 'returned',
      cautionReturnedAmount: returnDetails.cautionReturnedAmount ?? contract.cautionAmount,
      cautionRetainedAmount: returnDetails.cautionRetainedAmount ?? (
        returnDetails.cautionStatus === 'deducted'
          ? Math.max(0, (contract.cautionAmount || 0) - (returnDetails.cautionReturnedAmount ?? 0))
          : 0
      ),
      cautionNotes: returnDetails.cautionNotes || '',
      updatedAt: new Date().toISOString(),
    };

    if (returnDetails.settlePayment) {
      updates.remainingAmount = 0;
      updates.paymentStatus = 'PAID';
    }

    const targetStatus = returnDetails.postReturnStatus || 'AVAILABLE';

    // Écriture atomique Firestore (Clôture Contrat + Libération / Maintenance Véhicule)
    if (isFirebaseConfigured && db) {
      try {
        const batch = writeBatch(db);
        const contractRef = doc(db, 'rentals', contractId);
        batch.update(contractRef, sanitizeForUpdate(updates));

        const carRef = doc(db, 'cars', contract.carId);
        batch.update(carRef, sanitizeForUpdate({
          status: targetStatus,
          rentedUntil: undefined,
        }));

        const carPrivateRef = doc(db, 'cars_private', contract.carId);
        batch.set(carPrivateRef, sanitizeForUpdate({
          currentMileage: returnDetails.returnKm,
        }), { merge: true });

        const carSubPrivateRef = doc(db, 'cars', contract.carId, 'private', 'data');
        batch.set(carSubPrivateRef, sanitizeForUpdate({
          currentMileage: returnDetails.returnKm,
        }), { merge: true });

        await batch.commit();
      } catch (err) {
        console.warn('Firestore completeContract batch fallback to local:', err);
      }
    }

    // Sauvegarde locale miroir
    const currentRentals = getLocal<RentalContract>(LOCAL_STORAGE_KEYS.RENTALS, initialRentals);
    saveLocal(LOCAL_STORAGE_KEYS.RENTALS, currentRentals.map(r => r.id === contractId ? { ...r, ...updates } : r));

    const currentCars = getLocal<Car>(LOCAL_STORAGE_KEYS.CARS, initialCars);
    saveLocal(LOCAL_STORAGE_KEYS.CARS, currentCars.map(c => c.id === contract!.carId ? {
      ...c,
      status: targetStatus,
      rentedUntil: undefined,
      currentMileage: returnDetails.returnKm,
    } : c));
  },

  async updateContract(contractId: string, updates: Partial<RentalContract>): Promise<void> {
    const cleanUpdates = sanitizeForUpdate({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'rentals', contractId), cleanUpdates);
      } catch (err) {
        console.warn('Firestore updateContract fallback to local:', err);
      }
    }

    const current = getLocal<RentalContract>(LOCAL_STORAGE_KEYS.RENTALS, initialRentals);
    const target = current.find(r => r.id === contractId);
    saveLocal(LOCAL_STORAGE_KEYS.RENTALS, current.map(r => r.id === contractId ? { ...r, ...cleanUpdates } : r));

    // Si contrat actif et dates ou KM modifiés, synchroniser la voiture
    if (target && target.status === 'active') {
      const carUpdates: Partial<Car> = {};
      if (updates.endDate) carUpdates.rentedUntil = updates.endDate;
      if (updates.departureKm !== undefined) carUpdates.currentMileage = Number(updates.departureKm);
      if (Object.keys(carUpdates).length > 0) {
        await CarService.updateCar(target.carId, carUpdates);
      }
    } else if (target && target.status === 'completed' && updates.returnKm !== undefined) {
      // Si contrat clôturé et que le compteur retour est modifié, synchroniser le kilométrage actuel du véhicule
      await CarService.updateCar(target.carId, {
        currentMileage: Number(updates.returnKm),
      });
    }
  },

  async deleteContract(contractId: string): Promise<void> {
    const current = getLocal<RentalContract>(LOCAL_STORAGE_KEYS.RENTALS, initialRentals);
    const target = current.find(r => r.id === contractId);

    // Écriture atomique Firestore (Suppression Contrat + Libération Véhicule si actif)
    if (isFirebaseConfigured && db) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'rentals', contractId));
        if (target && target.status === 'active') {
          batch.update(doc(db, 'cars', target.carId), sanitizeForUpdate({
            status: 'AVAILABLE',
            rentedUntil: undefined,
          }));
        }
        await batch.commit();
      } catch (err) {
        console.warn('Firestore deleteContract batch fallback to local:', err);
      }
    }

    saveLocal(LOCAL_STORAGE_KEYS.RENTALS, current.filter(r => r.id !== contractId));

    // Si le contrat supprimé était actif, libérer la voiture localement
    if (target && target.status === 'active') {
      const currentCars = getLocal<Car>(LOCAL_STORAGE_KEYS.CARS, initialCars);
      saveLocal(LOCAL_STORAGE_KEYS.CARS, currentCars.map(c => c.id === target.carId ? {
        ...c,
        status: 'AVAILABLE' as const,
        rentedUntil: undefined,
      } : c));
    }
  }
};

// -------------------------------------------------------------
// SERVICE DÉPENSES & CHARGES (EXPENSES)
// -------------------------------------------------------------
export const ExpenseService = {
  subscribe(callback: (expenses: Expense[]) => void) {
    if (isFirebaseConfigured && db) {
      const q = query(collection(db, 'expenses'), orderBy('date', 'desc'), limit(100));
      return onSnapshot(q, (snapshot) => {
        const expenses = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Expense));
        callback(expenses);
      }, (err) => {
        console.warn('Firestore fallback to local for expenses:', err);
        callback(getLocal(LOCAL_STORAGE_KEYS.EXPENSES, initialExpenses));
      });
    }

    callback(getLocal(LOCAL_STORAGE_KEYS.EXPENSES, initialExpenses));
    return localEmitter.subscribe(LOCAL_STORAGE_KEYS.EXPENSES, callback);
  },

  async addExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<string> {
    const newId = 'exp_' + Date.now().toString(36);
    const newExpense: Expense = {
      ...expense,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'expenses', newId), sanitizeForFirestore(newExpense));
      } catch (err) {
        console.warn('Firestore addExpense fallback to local:', err);
      }
    }

    const current = getLocal<Expense>(LOCAL_STORAGE_KEYS.EXPENSES, initialExpenses);
    saveLocal(LOCAL_STORAGE_KEYS.EXPENSES, [newExpense, ...current]);

    // Si la dépense est une vidange pour une voiture, mettre à jour le kilométrage de vidange
    if (expense.category === 'vidange' && expense.carId && expense.mileageAtExpense) {
      const currentCars = getLocal<Car>(LOCAL_STORAGE_KEYS.CARS, initialCars);
      const targetCar = currentCars.find(c => c.id === expense.carId);
      const updatedMileage = targetCar ? Math.max(targetCar.currentMileage, expense.mileageAtExpense) : expense.mileageAtExpense;
      await CarService.updateCar(expense.carId, {
        currentMileage: updatedMileage,
        lastOilChangeMileage: expense.mileageAtExpense,
        nextOilChangeMileage: expense.mileageAtExpense + 10000, // Prochaine vidange dans 10 000 km
      });
    }

    return newId;
  },

  async deleteExpense(id: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'expenses', id));
      } catch (err) {
        console.warn('Firestore deleteExpense fallback to local:', err);
      }
    }

    const current = getLocal<Expense>(LOCAL_STORAGE_KEYS.EXPENSES, initialExpenses);
    saveLocal(LOCAL_STORAGE_KEYS.EXPENSES, current.filter(e => e.id !== id));
  }
};

// -------------------------------------------------------------
// SERVICE PARAMÈTRES AGENCE & SHOWROOM WEB (SETTINGS)
// -------------------------------------------------------------
export const AgencySettingsService = {
  subscribe(callback: (settings: AgencySettings) => void) {
    if (isFirebaseConfigured && db) {
      const docRef = doc(db, 'settings', 'agency_config');
      return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<AgencySettings>;
          const mergedSettings: AgencySettings = {
            ...defaultAgencySettings,
            ...data,
            conditions: Array.isArray(data.conditions) && data.conditions.length > 0
              ? data.conditions
              : defaultAgencySettings.conditions,
          };
          saveLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, mergedSettings);
          callback(mergedSettings);
        } else {
          callback(getLocalItem<AgencySettings>(LOCAL_STORAGE_KEYS.SETTINGS, defaultAgencySettings));
        }
      }, (err) => {
        console.warn('Firestore fallback to local for settings:', err);
        callback(getLocalItem<AgencySettings>(LOCAL_STORAGE_KEYS.SETTINGS, defaultAgencySettings));
      });
    }

    callback(getLocalItem<AgencySettings>(LOCAL_STORAGE_KEYS.SETTINGS, defaultAgencySettings));
    return localEmitter.subscribe(LOCAL_STORAGE_KEYS.SETTINGS, callback);
  },

  async updateSettings(settings: AgencySettings): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'settings', 'agency_config');
        await setDoc(docRef, sanitizeForFirestore(settings), { merge: true });
      } catch (err) {
        console.warn('Firestore updateSettings fallback to local:', err);
      }
    }
    saveLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, settings);
  }
};

export const SettingsService = AgencySettingsService;

// -------------------------------------------------------------
// CALCUL DES MÉTRIQUES GLOBALES ("DRAHM" & FLOTTE)
// -------------------------------------------------------------
export function calculateAgencyMetrics(
  cars: Car[], 
  rentals: RentalContract[], 
  expenses: Expense[], 
  bookings: BookingDemand[]
): AgencyMetrics {
  // 1. Total des recettes de location perçues (Loyers encaissés réels + suppléments)
  const totalRevenue = rentals.reduce((sum, r) => {
    const rentCollected = Math.max(0, (r.totalAmount || 0) - (r.remainingAmount || 0));
    return sum + rentCollected + (r.extraFees || 0);
  }, 0);

  // 2. Total des cautions en séquestre/coffre (contrats actifs, en attente de restitution)
  const totalCautionHeld = rentals.reduce((sum, r) => {
    if (r.status === 'active' && (r.cautionStatus === 'held' || !r.cautionStatus)) {
      return sum + (r.cautionAmount || 0);
    }
    return sum;
  }, 0);

  // 3. Total des cautions retenues définitivement par l'agence (dédommagement dégâts / casse / infractions)
  const totalCautionRetained = rentals.reduce((sum, r) => {
    if (r.cautionRetainedAmount !== undefined && r.cautionRetainedAmount > 0) {
      return sum + r.cautionRetainedAmount;
    }
    if (r.cautionStatus === 'deducted') {
      const deduction = Math.max(0, (r.cautionAmount || 0) - (r.cautionReturnedAmount || 0));
      return sum + deduction;
    }
    return sum;
  }, 0);

  // 4. Total liquide physique présent en caisse :
  // Loyers + Cautions retenues définitivement + Cautions temporairement en séquestre
  const totalCaisseWithCaution = totalRevenue + totalCautionRetained + totalCautionHeld;

  // 5. Total des dépenses opérationnelles réelles (vidanges, réparations, assurance, etc.)
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // 6. Bénéfice net réel dégagé par l'agence :
  // (Loyers perçus + Cautions dégâts gardées) - Dépenses opérationnelles
  // Note : les cautions en séquestre (totalCautionHeld) sont exclues car elles appartiennent aux clients
  const netProfit = (totalRevenue + totalCautionRetained) - totalExpenses;

  // Voitures et contrats
  const activeRentalsCount = rentals.filter(r => r.status === 'active').length;
  const pendingBookingsCount = bookings.filter(b => b.status === 'pending').length;
  const availableCarsCount = cars.filter(c => c.status === 'AVAILABLE' || c.status === ('available' as any)).length;

  // Voitures dont la vidange est dépassée ou urgente (moins de 500 km)
  const urgentVidangesCount = cars.filter(c => (c.nextOilChangeMileage - c.currentMileage) <= 500).length;

  return {
    totalRevenue,
    totalCautionHeld,
    totalCautionRetained,
    totalCaisseWithCaution,
    totalExpenses,
    netProfit,
    activeRentalsCount,
    pendingBookingsCount,
    availableCarsCount,
    totalCarsCount: cars.length,
    urgentVidangesCount,
  };
}

// -------------------------------------------------------------
// RÉINITIALISATION DE LA CAISSE (0 DA) & RESTAURATION DÉMO
// -------------------------------------------------------------
export async function resetAgencyFinancials(): Promise<void> {
  // 1. Vidage des contrats et dépenses locaux
  saveLocal(LOCAL_STORAGE_KEYS.RENTALS, []);
  saveLocal(LOCAL_STORAGE_KEYS.EXPENSES, []);

  // 2. Nettoyage Firestore si connecté
  if (isFirebaseConfigured && db) {
    try {
      const rentalsSnap = await getDocs(collection(db, 'rentals'));
      for (const d of rentalsSnap.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
      const expSnap = await getDocs(collection(db, 'expenses'));
      for (const d of expSnap.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore reset financial collections error:', e);
    }
  }

  // 3. Remise de toutes les voitures en statut disponible (AVAILABLE)
  const currentCars = getLocal<Car>(LOCAL_STORAGE_KEYS.CARS, initialCars);
  const resetCars = currentCars.map(c => ({
    ...c,
    status: 'AVAILABLE' as const,
    rentedUntil: undefined,
  }));
  saveLocal(LOCAL_STORAGE_KEYS.CARS, resetCars);

  if (isFirebaseConfigured && db) {
    try {
      for (const c of resetCars) {
        const { publicData, privateData } = splitCarData(c);
        await setDoc(doc(db, 'cars', c.id), sanitizeForFirestore(publicData), { merge: true }).catch(() => {});
        await setDoc(doc(db, 'cars_private', c.id), sanitizeForFirestore(privateData), { merge: true }).catch(() => {});
        await setDoc(doc(db, 'cars', c.id, 'private', 'data'), sanitizeForFirestore(privateData), { merge: true }).catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore reset cars error:', e);
    }
  }
}

export async function restoreDemoData(): Promise<void> {
  saveLocal(LOCAL_STORAGE_KEYS.RENTALS, initialRentals);
  saveLocal(LOCAL_STORAGE_KEYS.EXPENSES, initialExpenses);
  saveLocal(LOCAL_STORAGE_KEYS.CARS, initialCars);
  saveLocal(LOCAL_STORAGE_KEYS.BOOKINGS, initialBookings);

  if (isFirebaseConfigured && db) {
    try {
      for (const r of initialRentals) {
        await setDoc(doc(db, 'rentals', r.id), sanitizeForFirestore(r)).catch(() => {});
      }
      for (const e of initialExpenses) {
        await setDoc(doc(db, 'expenses', e.id), sanitizeForFirestore(e)).catch(() => {});
      }
      for (const c of initialCars) {
        const { publicData, privateData } = splitCarData(c);
        await setDoc(doc(db, 'cars', c.id), sanitizeForFirestore(publicData)).catch(() => {});
        await setDoc(doc(db, 'cars_private', c.id), sanitizeForFirestore(privateData)).catch(() => {});
        await setDoc(doc(db, 'cars', c.id, 'private', 'data'), sanitizeForFirestore(privateData)).catch(() => {});
      }
      for (const b of initialBookings) {
        await setDoc(doc(db, 'bookings', b.id), sanitizeForFirestore(b)).catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore restore demo error:', e);
    }
  }
}
