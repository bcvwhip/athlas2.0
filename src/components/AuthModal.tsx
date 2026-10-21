import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Cloud,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { createGuestUser, loginUser, registerUser } from '../lib/api.js';
import { AuthResponse } from '../types.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (authData: AuthResponse) => void;
  initialMode?: 'register' | 'login';
  currentGuestId?: string;
  hasExistingConversations?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'register',
  currentGuestId,
  hasExistingConversations = false,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<{
    userName: string;
    migratedCount?: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setSuccessData(null);
    }
  }, [isOpen, initialMode]);

  // Password strength calculator
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: 'Vuota', color: 'bg-gray-700' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 1, label: 'Debole', color: 'bg-rose-500' };
    if (score === 2 || score === 3) return { score: 2, label: 'Media', color: 'bg-amber-500' };
    if (score === 4) return { score: 3, label: 'Forte', color: 'bg-emerald-500' };
    return { score: 4, label: 'Eccellente', color: 'bg-emerald-400' };
  }, [password]);

  const passwordsMatch = !confirmPassword || password === confirmPassword;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Inserisci il tuo nome o pseudonimo');
        return;
      }
      if (password.length < 6) {
        setError('La password deve contenere almeno 6 caratteri');
        return;
      }
      if (password !== confirmPassword) {
        setError('Le due password non corrispondono');
        return;
      }
      if (!acceptTerms) {
        setError('È necessario accettare i termini di servizio per registrarsi');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'register') {
        const data = await registerUser(email, password, name.trim(), currentGuestId);
        const migratedCount = data.migrationStats?.migratedConversations || 0;
        setSuccessData({
          userName: data.user.name,
          migratedCount,
        });
        setTimeout(() => {
          onAuthSuccess(data);
          onClose();
        }, 1200);
      } else {
        const data = await loginUser(email, password);
        onAuthSuccess(data);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante l\'autenticazione';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await createGuestUser();
      onAuthSuccess(data);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore accesso ospite';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#111111] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Chiudi finestra di registrazione"
          className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1F1F1F] transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="pt-6 px-6 sm:px-8 pb-4 border-b border-[#222222] bg-[#141414]">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(255,255,255,0.2)] shrink-0">
              3
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-semibold tracking-tight text-white">
                  3 athlas
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/20">
                  {mode === 'register' ? 'Registrazione' : 'Accesso'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {mode === 'register'
                  ? 'Crea il tuo profilo permanente per salvare le tue chat e i tuoi progetti'
                  : 'Bentornato nella tua piattaforma AI intelligente'}
              </p>
            </div>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0B0B0B] border border-[#222222] text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                mode === 'register'
                  ? 'bg-[#222222] text-white shadow-sm font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Registrati (Crea Account)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                mode === 'login'
                  ? 'bg-[#222222] text-white shadow-sm font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Accedi</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-5 flex-1">
          {/* Success screen */}
          {successData ? (
            <div className="py-8 flex flex-col items-center text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-bounce">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">
                  Registrazione Completata!
                </h4>
                <p className="text-sm text-gray-400 mt-1">
                  Benvenuto in 3 athlas, <span className="text-white font-medium">{successData.userName}</span>.
                </p>
                {successData.migratedCount !== undefined && successData.migratedCount > 0 && (
                  <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs">
                    <Cloud className="w-3.5 h-3.5 shrink-0" />
                    <span>{successData.migratedCount} conversazioni ospite salvate nel tuo account!</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">Accesso alla piattaforma in corso...</p>
            </div>
          ) : (
            <>
              {/* Migration / Existing Session Banner */}
              {mode === 'register' && hasExistingConversations && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border border-blue-500/30 flex items-start space-x-2.5 text-xs text-blue-200">
                  <Cloud className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Conservazione automatica delle chat:</span>
                    <p className="text-[11px] text-blue-300/80 mt-0.5">
                      Registrandoti ora, tutte le conversazioni, i documenti e le immagini generate in questa sessione verranno salvati nel tuo nuovo account.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Box */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 font-mono">
                      Nome e Cognome o Pseudonimo
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Es. Leonardo Da Vinci"
                        className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 font-mono">
                    Indirizzo Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@esempio.com"
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono">
                      Password
                    </label>
                    {mode === 'register' && password && (
                      <span className="text-[10px] font-mono text-gray-400">
                        Sicurezza: <span className="font-semibold text-white">{passwordStrength.label}</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimo 6 caratteri"
                      className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 transition-colors"
                      aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password strength bar */}
                  {mode === 'register' && password && (
                    <div className="mt-2 space-y-1.5">
                      <div className="h-1.5 w-full bg-[#222222] rounded-full overflow-hidden flex">
                        <div
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <span>Min. 6 caratteri</span>
                        <span>Lettere, numeri e simboli consigliati</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password (Registration only) */}
                {mode === 'register' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono">
                        Conferma Password
                      </label>
                      {confirmPassword && (
                        <span
                          className={`text-[10px] font-medium flex items-center space-x-1 ${
                            passwordsMatch ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {passwordsMatch ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Corrispondono</span>
                            </>
                          ) : (
                            <span>Non corrispondono</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Reinserisci la tua password"
                        className={`w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl bg-[#1A1A1A] border text-gray-100 placeholder-gray-500 focus:outline-none transition-colors ${
                          confirmPassword && !passwordsMatch
                            ? 'border-rose-500 focus:border-rose-400'
                            : 'border-[#2A2A2A] focus:border-white'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 transition-colors"
                        aria-label={showConfirmPassword ? 'Nascondi password' : 'Mostra password'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Terms agreement (Registration only) */}
                {mode === 'register' && (
                  <label className="flex items-start space-x-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-0.5 rounded border-[#333333] bg-[#1A1A1A] text-white focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-[11px] text-gray-400 leading-relaxed select-none">
                      Accetto i Termini di Servizio e confermo che i miei dati verranno protetti secondo la Privacy Policy di 3 athlas.
                    </span>
                  </label>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || (mode === 'register' && !acceptTerms)}
                  className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm tracking-wide hover:bg-gray-200 shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Elaborazione in corso...</span>
                    </div>
                  ) : mode === 'register' ? (
                    <>
                      <span>Crea il tuo Account Gratuito</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Accedi al tuo Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Registration Benefits List */}
              {mode === 'register' && (
                <div className="pt-4 border-t border-[#222222] space-y-2.5">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
                    Vantaggi dell'Account Registrato:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-400">
                    <div className="flex items-center space-x-2 p-2 rounded-lg bg-[#141414] border border-[#222222]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">Archivio crittografato</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded-lg bg-[#141414] border border-[#222222]">
                      <Cloud className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">Sincronizzazione cloud</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded-lg bg-[#141414] border border-[#222222]">
                      <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">Generazione immagini & file</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded-lg bg-[#141414] border border-[#222222]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                      <span className="truncate">100% Gratuito</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Guest continuation option */}
              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={handleGuestAccess}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Oppure continua come <span className="underline text-gray-400">Ospite temporaneo</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
