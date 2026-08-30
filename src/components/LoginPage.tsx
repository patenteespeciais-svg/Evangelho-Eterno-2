import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  Radio,
  ArrowRight,
  UserPlus,
  KeyRound,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface LoginPageProps {
  onNavigateToRegister?: () => void;
  onLoginSuccess?: (callSign: string) => void;
  onBackToApp?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateToRegister,
  onLoginSuccess,
  onBackToApp,
}) => {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedLogin = loginInput.trim();

    if (!trimmedLogin) {
      setErrorMessage('Informe seu login.');
      return;
    }

    if (!password) {
      setErrorMessage('Informe sua senha de acesso.');
      return;
    }

    if (password.length < 4) {
      setErrorMessage('A senha deve conter pelo menos 4 caracteres.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage(`Acesso autorizado para ${trimmedLogin}`);
      if (onLoginSuccess) {
        setTimeout(() => {
          onLoginSuccess(trimmedLogin);
        }, 600);
      }
    }, 700);
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex flex-col justify-center items-center p-4 sm:p-6 select-none">
      {/* Botão de Retorno ao Rádio */}
      {onBackToApp && (
        <div className="w-full max-w-md flex justify-start mb-3">
          <button
            type="button"
            onClick={onBackToApp}
            className="text-xs font-mono-code text-neutral-400 hover:text-amber-400 transition-colors flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180 text-amber-400" />
            <span>Voltar ao Rádio</span>
          </button>
        </div>
      )}

      <div className="w-full max-w-md my-auto">
        {/* Card Principal */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-amber-500/80 to-transparent" />

          {/* Cabeçalho */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <Radio className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-tactical font-black text-neutral-100 tracking-wider uppercase">
              LOGIN
            </h1>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/50 flex items-center gap-2.5 text-red-300 text-xs font-mono-code">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 flex items-center gap-2.5 text-emerald-300 text-xs font-mono-code">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-callsign"
                className="block text-xs font-tactical font-bold text-neutral-300 uppercase tracking-wide mb-1.5"
              >
                Login
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-callsign"
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Ex: seu_login"
                  autoComplete="username"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono-code text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-tactical font-bold text-neutral-300 uppercase tracking-wide"
                >
                  Senha
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-11 py-2.5 text-sm font-mono-code text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-neutral-950 border-neutral-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-900 cursor-pointer"
                />
                <span className="text-xs font-mono-code text-neutral-400">
                  Manter conectado neste dispositivo
                </span>
              </label>
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-tactical font-black text-sm uppercase tracking-wider py-3 rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>ENTRAR</span>
                </>
              )}
            </button>
          </form>

          {/* Botão para Navegar para Cadastro */}
          <button
            type="button"
            id="btn-go-to-register"
            onClick={onNavigateToRegister}
            className="w-full mt-4 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 text-neutral-200 hover:text-white font-tactical font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>CRIAR CONTA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
