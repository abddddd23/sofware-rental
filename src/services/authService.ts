import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';

const LOCAL_AUTH_KEY = 'autoloc_local_admin_session';

export interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export const AuthService = {
  /**
   * Connexion au logiciel d'agence avec Email et Mot de passe
   */
  async login(email: string, password: string): Promise<AdminUser> {
    if (isFirebaseConfigured && auth) {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const u = userCredential.user;
      return {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || 'Gérant Agence',
      };
    }

    // Fallback mode autonome local (si clés Firebase non encore activées)
    if (email.trim() && password.length >= 6) {
      const mockUser: AdminUser = {
        uid: 'local_admin_' + Date.now().toString(36),
        email: email.trim(),
        displayName: 'Administrateur Local',
      };
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(mockUser));
      return mockUser;
    }

    throw new Error('Identifiants invalides ou mot de passe trop court (min 6 caractères).');
  },

  /**
   * Déconnexion du logiciel d'agence
   */
  async logout(): Promise<void> {
    localStorage.removeItem(LOCAL_AUTH_KEY);
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
  },

  /**
   * Écoute de l'état d'authentification
   */
  subscribe(callback: (user: AdminUser | null) => void): () => void {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
        if (firebaseUser) {
          callback({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Gérant Agence',
          });
        } else {
          // SÉCURITÉ STRICTE : Si Firebase Auth est configuré, AUCUN bypass localStorage n'est autorisé.
          callback(null);
        }
      });
      return unsubscribe;
    }

    // Mode Local autonome uniquement (si Firebase n'est pas configuré dans .env)
    const localSession = localStorage.getItem(LOCAL_AUTH_KEY);
    if (localSession) {
      try {
        callback(JSON.parse(localSession));
      } catch {
        callback(null);
      }
    } else {
      callback(null);
    }

    return () => {};
  },

  /**
   * Utilisateur actuellement connecté
   */
  getCurrentUser(): AdminUser | null {
    if (isFirebaseConfigured && auth) {
      if (auth.currentUser) {
        return {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName || 'Gérant Agence',
        };
      }
      // SÉCURITÉ STRICTE : Si Firebase est actif et que l'utilisateur n'est pas loggé sur Firebase, renvoyer null
      return null;
    }

    // Mode Local autonome uniquement
    const local = localStorage.getItem(LOCAL_AUTH_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        return null;
      }
    }

    return null;
  }
};
