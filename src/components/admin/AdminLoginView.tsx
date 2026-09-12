import React, { useState } from 'react';
import { AuthService } from '../../services/authService';
import type { AdminUser } from '../../services/authService';
import { Shield, Lock, Mail, ArrowRight, ArrowLeft, AlertCircle, Building2, KeyRound } from 'lucide-react';

interface AdminLoginViewProps {
  onLoginSuccess: (user: AdminUser) => void;
  onBackToWeb?: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onLoginSuccess,
  onBackToWeb,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Veuillez saisir votre adresse email professionnelle.');
      return;
    }

    if (!password) {
      setErrorMessage('Veuillez saisir votre mot de passe administrateur.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await AuthService.login(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      console.error('Erreur connexion administrateur :', err);
      let message = 'Identifiants invalides. Veuillez vérifier votre email et mot de passe.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'Email ou mot de passe incorrect.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Trop de tentatives échouées. Compte temporairement bloqué, réessayez plus tard.';
      } else if (err.message) {
        message = err.message;
      }
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Halo d'ambiance en arrière-plan */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Carte Centrale de Connexion */}
      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* En-tête / Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-400/30 text-amber-400 shadow-lg shadow-amber-400/10 mb-1">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Espace Gérance Agence
          </h1>
          <p className="text-xs text-slate-400">
            Accès sécurisé réservé à l'équipe de direction et d'accueil
          </p>
        </div>

        {/* Message d'erreur */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="font-medium leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Formulaire de Connexion */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Adresse Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@autoloc-algerie.com"
                autoComplete="email"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Mot de Passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Vérification en cours...
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                Se Connecter au Logiciel
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Note informative Firebase Auth */}
        <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1 bg-slate-950/40 -mx-6 -mb-6 p-4 rounded-b-3xl">
          <p className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            Compte Gérance Firebase Authentication :
          </p>
          <p className="text-slate-400 leading-normal">
            Les comptes d'accès sont créés et gérés dans votre console Firebase (Rubrique <em>Authentication &gt; Users</em>).
          </p>
        </div>
      </div>

      {/* Lien retour site public */}
      {onBackToWeb && (
        <button
          type="button"
          onClick={onBackToWeb}
          className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retourner au Showroom Public (Visiteur)
        </button>
      )}
    </div>
  );
};
