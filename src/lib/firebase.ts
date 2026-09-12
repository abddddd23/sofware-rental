import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('your_api_key')
);

let app;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // PERSISTANCE HORS-LIGNE (OFFLINE CACHE) :
    // Permet au logiciel de l'agence de fonctionner à 100% même SANS connexion Internet !
    // Toutes les modifications sont stockées en local et synchronisées dès que la connexion revient.
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });

    auth = getAuth(app);
    console.log('✅ Firebase connecté avec Persistance Hors-Ligne (Offline Ready)');
  } catch (error) {
    console.warn('⚠️ Erreur initialisation Firebase, passage en mode autonome local :', error);
  }
} else {
  console.info('ℹ️ Firebase non configuré dans .env. Mode autonome LocalStorage activé.');
}

export { app, db, auth };
