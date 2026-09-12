import React, { useState, useEffect } from 'react';
import type { Car, BookingDemand, RentalContract, Expense, AgencySettings } from './types';
import { defaultAgencySettings } from './types';
import { 
  CarService, 
  BookingService, 
  RentalService, 
  ExpenseService,
  AgencySettingsService
} from './services/dataService';
import { AuthService } from './services/authService';
import type { AdminUser } from './services/authService';
import { ShowroomView } from './views/client/ShowroomView';
import { AdminLayout } from './views/admin/AdminLayout';
import { AdminLoginView } from './components/admin/AdminLoginView';

export function App() {
  // Mode configuré via variable d'environnement : 'website' ou 'software'
  const appModeEnv = import.meta.env.VITE_APP_MODE as 'website' | 'software' | undefined;

  // Détermination du mode actuel
  const [isSoftwareMode, setIsSoftwareMode] = useState<boolean>(() => {
    // Si construit pour le site web client, TOUJOURS 'website' (accès logiciel totalement bloqué)
    if (appModeEnv === 'website') return false;
    // Si construit pour le logiciel d'agence, TOUJOURS 'software'
    if (appModeEnv === 'software') return true;

    // En mode de développement ou générique :
    // Le site public est affiché par défaut. Le logiciel d'agence est accessible uniquement
    // si l'application est lancée avec le paramètre dédié #software ou ?mode=software
    return window.location.hash === '#software' || window.location.search.includes('mode=software');
  });

  // État d'authentification administrateur
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => AuthService.getCurrentUser());

  // Données publiques (voitures et coordonnées agence)
  const [cars, setCars] = useState<Car[]>([]);
  const [agencySettings, setAgencySettings] = useState<AgencySettings>(defaultAgencySettings);

  // Données privées (réservées exclusivement aux gérants connectés)
  const [bookings, setBookings] = useState<BookingDemand[]>([]);
  const [rentals, setRentals] = useState<RentalContract[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // 1. Synchronisation de l'authentification et du hash URL
  useEffect(() => {
    const unsubAuth = AuthService.subscribe((user) => {
      setCurrentUser(user);
    });

    const handleLocationChange = () => {
      if (appModeEnv === 'website') {
        setIsSoftwareMode(false);
      } else if (appModeEnv === 'software') {
        setIsSoftwareMode(true);
      } else {
        setIsSoftwareMode(window.location.hash === '#software' || window.location.search.includes('mode=software'));
      }
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      unsubAuth();
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [appModeEnv]);

  // 2. Abonnements aux flux de données de la flotte et de l'agence
  useEffect(() => {
    const isInternalAuth = isSoftwareMode && !!currentUser;
    const unsubCars = CarService.subscribe(setCars, isInternalAuth);
    const unsubSettings = AgencySettingsService.subscribe(setAgencySettings);

    return () => {
      unsubCars();
      unsubSettings();
    };
  }, [isSoftwareMode, currentUser]);

  // 3. Abonnements aux flux de données privées (ACTIFS UNIQUEMENT POUR LES GÉRANTS CONNECTÉS)
  useEffect(() => {
    // Si l'utilisateur n'est pas connecté ou en mode site public : ZÉRO TÉLÉCHARGEMENT DE DONNÉES PRIVÉES (PII)
    if (!isSoftwareMode || !currentUser) {
      setBookings([]);
      setRentals([]);
      setExpenses([]);
      return;
    }

    const unsubBookings = BookingService.subscribe(setBookings);
    const unsubRentals = RentalService.subscribe(setRentals);
    const unsubExpenses = ExpenseService.subscribe(setExpenses);

    return () => {
      unsubBookings();
      unsubRentals();
      unsubExpenses();
    };
  }, [isSoftwareMode, currentUser]);

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentUser(null);
  };

  return (
    <div className={`w-full min-h-screen font-sans ${isSoftwareMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {isSoftwareMode ? (
        currentUser ? (
          /* LOGICIEL DÉDIÉ POUR L'AGENCE (GÉRANT AUTHENTIFIÉ) */
          <AdminLayout
            cars={cars}
            bookings={bookings}
            rentals={rentals}
            expenses={expenses}
            agencySettings={agencySettings}
            onLogout={handleLogout}
          />
        ) : (
          /* ÉCRAN DE CONNEXION OBLIGATOIRE (ACCÈS PRIVÉ PROTÉGÉ) */
          <AdminLoginView
            onLoginSuccess={(user) => setCurrentUser(user)}
            onBackToWeb={() => {
              setIsSoftwareMode(false);
              window.location.hash = '';
            }}
          />
        )
      ) : (
        /* SITE WEB PUBLIC (SHOWROOM CLIENT PUR - ZÉRO DONNÉE PRIVÉE TRANSMIS) */
        <ShowroomView 
          cars={cars} 
          agencySettings={agencySettings} 
        />
      )}
    </div>
  );
}

export default App;
