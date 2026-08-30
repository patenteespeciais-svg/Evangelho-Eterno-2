import React, { useState } from 'react';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  BadgeAlert,
  ArrowLeft,
  Radio,
  Volume2,
  Mic,
  Smartphone,
  ShieldCheck,
  Headphones,
  Zap,
  Check
} from 'lucide-react';

interface RegisterUserPageProps {
  onNavigateToLogin?: () => void;
  onRegisterSuccess?: (userData: { callSign: string; fullName: string; email?: string; role?: string; avatar?: string }) => void;
  onBackToApp?: () => void;
}

type RegistrationStep = 'FORM' | 'BACKGROUND_PERMISSION' | 'MICROPHONE_PERMISSION' | 'FINALIZING';

export const RegisterUserPage: React.FC<RegisterUserPageProps> = ({
  onNavigateToLogin,
  onRegisterSuccess,
  onBackToApp,
}) => {
  const [step, setStep] = useState<RegistrationStep>('FORM');
  const [fullName, setFullName] = useState('');
  const [callSign, setCallSign] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingLogin, setIsCheckingLogin] = useState(false);
  const [loginStatus, setLoginStatus] = useState<{ available: boolean; text: string } | null>(null);
  const [isRequestingMic, setIsRequestingMic] = useState(false);

  // Helper para verificar se o login já existe localmente ou no servidor
  const checkLoginExists = async (loginToCheck: string): Promise<boolean> => {
    const normalized = loginToCheck.trim().toLowerCase();
    if (!normalized) return false;

    // 1. Verificação local em contas salvas
    try {
      const savedUsersRaw = localStorage.getItem('walkie_all_registered_users');
      if (savedUsersRaw) {
        const savedUsers = JSON.parse(savedUsersRaw);
        if (Array.isArray(savedUsers)) {
          const existsLocal = savedUsers.some(
            (u: any) =>
              String(u.callSign || '').trim().toLowerCase() === normalized ||
              String(u.login || '').trim().toLowerCase() === normalized
          );
          if (existsLocal) return true;
        }
      }

      // Verificação do usuário atual salvo
      const currentSavedUser = localStorage.getItem('walkie_registered_user');
      if (currentSavedUser) {
        const parsed = JSON.parse(currentSavedUser);
        if (
          String(parsed.callSign || '').trim().toLowerCase() === normalized ||
          String(parsed.fullName || '').trim().toLowerCase() === normalized
        ) {
          return true;
        }
      }
    } catch (e) {
      console.warn('Erro ao checar localStorage:', e);
    }

    // 2. Verificação de nomes reservados como Administrador Salvador Silva
    if (
      normalized === 'salvador' ||
      normalized === 'salvador silva' ||
      normalized === 'admin'
    ) {
      return true;
    }

    // 3. Verificação no servidor via API
    try {
      const res = await fetch(`/api/users/check-login?login=${encodeURIComponent(normalized)}`);
      if (res.ok) {
        const data = await res.json();
        return Boolean(data.exists);
      }
    } catch {
      // Falha de rede: confia nas validações locais
    }

    return false;
  };

  // Checagem em tempo real / blur no campo de login
  const handleCallSignBlur = async () => {
    const trimmed = callSign.trim();
    if (!trimmed) {
      setLoginStatus(null);
      return;
    }
    if (trimmed.length < 2) {
      setLoginStatus({ available: false, text: 'O login deve ter pelo menos 2 caracteres.' });
      return;
    }

    setIsCheckingLogin(true);
    const exists = await checkLoginExists(trimmed);
    setIsCheckingLogin(false);

    if (exists) {
      setLoginStatus({
        available: false,
        text: `O login "${trimmed}" já foi criado. Escolha outro nome.`,
      });
      setErrorMessage(`O login "${trimmed}" já está cadastrado. Não é permitido criar dois logins com o mesmo nome.`);
    } else {
      setLoginStatus({
        available: true,
        text: `Login "${trimmed}" disponível!`,
      });
      if (errorMessage && errorMessage.includes('já está cadastrado')) {
        setErrorMessage(null);
      }
    }
  };

  // Validação do formulário e abertura da 1ª aba (Segundo Plano)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedFullName = fullName.trim();
    const trimmedCallSign = callSign.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedFullName) {
      setErrorMessage('Informe seu nome completo.');
      return;
    }

    if (!trimmedCallSign) {
      setErrorMessage('Informe seu login.');
      return;
    }

    if (trimmedCallSign.length < 2) {
      setErrorMessage('O login deve ter pelo menos 2 caracteres.');
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage('Informe seu e-mail.');
      return;
    }

    // Validação básica de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Informe um e-mail válido.');
      return;
    }

    if (!password) {
      setErrorMessage('Defina uma senha de acesso.');
      return;
    }

    if (password.length < 4) {
      setErrorMessage('A senha deve conter no mínimo 4 dígitos.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('A confirmação de senha não confere.');
      return;
    }

    // Validação de unicidade do Login
    setIsLoading(true);
    const alreadyExists = await checkLoginExists(trimmedCallSign);
    setIsLoading(false);

    if (alreadyExists) {
      setErrorMessage(
        `O login "${trimmedCallSign}" já foi criado no sistema. Não é possível criar outro com o mesmo nome. Por favor, escolha outro nome ou faça login.`
      );
      setLoginStatus({
        available: false,
        text: `O login "${trimmedCallSign}" já está em uso.`,
      });
      return;
    }

    // Passou em todos os requisitos -> Abre a 1ª aba: Permissão para funcionar em Segundo Plano
    setErrorMessage(null);
    setStep('BACKGROUND_PERMISSION');
  };

  // Usuário permite o funcionamento em segundo plano -> Abre a 2ª aba: Permissão de Microfone
  const handleAllowBackground = async () => {
    try {
      // Salva preferência local de segundo plano
      if (typeof window !== 'undefined') {
        localStorage.setItem('walkie_bg_audio_enabled', 'true');
        
        // Tenta solicitar permissão de notificação para manter serviço ativo se disponível
        if ('Notification' in window && Notification.permission === 'default') {
          try {
            await Notification.requestPermission();
          } catch {
            // Silently ignore if not supported in iframe
          }
        }
      }
    } catch (e) {
      console.warn('Background audio setup info:', e);
    }

    // Avança para a 2ª aba: Permissão do Microfone
    setStep('MICROPHONE_PERMISSION');
  };

  // Usuário autoriza o microfone -> Conclui o cadastro e entra direto na rádio
  const handleAllowMicrophoneAndEnter = async () => {
    setIsRequestingMic(true);
    setErrorMessage(null);

    const trimmedFullName = fullName.trim();
    const trimmedCallSign = callSign.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Verificação final no servidor antes de confirmar
    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: trimmedFullName,
          callSign: trimmedCallSign,
          email: trimmedEmail,
          password: password,
        }),
      });

      if (!response.ok && response.status === 409) {
        setIsRequestingMic(false);
        setStep('FORM');
        setErrorMessage(
          `O login "${trimmedCallSign}" já foi criado por outro usuário. Por favor, escolha outro login.`
        );
        return;
      }
    } catch (err) {
      console.warn('Aviso de registro no backend:', err);
    }

    try {
      // Solicita permissão real do microfone ao navegador
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Fecha as faixas de teste após confirmar permissão
        stream.getTracks().forEach((track) => track.stop());
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('walkie_mic_permission_granted', 'true');
      }
    } catch (err) {
      console.warn('Microphone permission result:', err);
      // Mesmo se o navegador em sandbox restringir, prossegue com o cadastro
    }

    setStep('FINALIZING');
    setIsRequestingMic(false);

    // Salva o cadastro do usuário
    const isSalvador =
      trimmedFullName.toLowerCase() === 'salvador silva' ||
      trimmedCallSign.toLowerCase() === 'salvador silva' ||
      trimmedCallSign.toLowerCase() === 'salvador' ||
      trimmedFullName.toLowerCase().includes('salvador silva');
    const assignedRole = isSalvador ? 'Administrador' : 'Operador';

    try {
      if (typeof window !== 'undefined') {
        const newUser = {
          fullName: trimmedFullName,
          callSign: trimmedCallSign,
          login: trimmedCallSign.toLowerCase(),
          email: trimmedEmail,
          role: assignedRole,
          createdAt: Date.now(),
        };

        // Salva usuário ativo
        localStorage.setItem('walkie_registered_user', JSON.stringify(newUser));
        localStorage.setItem('walkie_current_callsign', trimmedCallSign);
        localStorage.setItem('walkie_callsign', trimmedCallSign);
        if (isSalvador) {
          localStorage.setItem('walkie_is_admin', 'true');
        }

        // Salva na lista cumulativa de todos os usuários registrados
        const existingAllRaw = localStorage.getItem('walkie_all_registered_users');
        let allUsersList = [];
        if (existingAllRaw) {
          try {
            allUsersList = JSON.parse(existingAllRaw);
            if (!Array.isArray(allUsersList)) allUsersList = [];
          } catch {
            allUsersList = [];
          }
        }
        if (!allUsersList.some((u: any) => String(u.callSign || '').toLowerCase() === trimmedCallSign.toLowerCase())) {
          allUsersList.push(newUser);
          localStorage.setItem('walkie_all_registered_users', JSON.stringify(allUsersList));
        }
      }
    } catch (e) {
      console.error('Error saving user to storage:', e);
    }

    setTimeout(() => {
      if (onRegisterSuccess) {
        onRegisterSuccess({
          fullName: trimmedFullName,
          callSign: trimmedCallSign,
          email: trimmedEmail,
          role: assignedRole,
        });
      }
    }, 500);
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex flex-col justify-between items-center p-4 sm:p-6 select-none">
      {/* Barra de Retorno */}
      <div className="w-full max-w-lg flex items-center justify-between mb-2">
        {onBackToApp && step === 'FORM' ? (
          <button
            type="button"
            onClick={onBackToApp}
            className="text-xs font-mono-code text-neutral-400 hover:text-amber-400 transition-colors flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>Voltar ao Rádio</span>
          </button>
        ) : step !== 'FORM' && step !== 'FINALIZING' ? (
          <button
            type="button"
            onClick={() => setStep('FORM')}
            className="text-xs font-mono-code text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-neutral-400" />
            <span>Voltar aos dados</span>
          </button>
        ) : <div />}
      </div>

      <div className="w-full max-w-lg my-auto py-4">
        {/* ========================================================================= */}
        {/* ETAPA 1 DO CADASTRO: FORMULÁRIO PRINCIPAL */}
        {/* ========================================================================= */}
        {step === 'FORM' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-sm relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-emerald-500/80 to-transparent" />

            {/* Cabeçalho */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <UserCheck className="w-7 h-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-tactical font-black text-neutral-100 tracking-wider uppercase">
                CRIAR CONTA
              </h1>
            </div>

            {/* Feedback de Mensagens */}
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

            {/* Formulário */}
            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Nome Completo */}
              <div>
                <label
                  htmlFor="register-fullname"
                  className="block text-xs font-tactical font-bold text-neutral-300 uppercase tracking-wide mb-1.5"
                >
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="register-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Salvador Silva"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono-code text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Login */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="register-callsign"
                    className="block text-xs font-tactical font-bold text-neutral-300 uppercase tracking-wide"
                  >
                    Login
                  </label>
                  {isCheckingLogin ? (
                    <span className="text-[10px] font-mono-code text-neutral-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full border border-neutral-400 border-t-transparent animate-spin" />
                      Verificando disponibilidade...
                    </span>
                  ) : loginStatus ? (
                    <span
                      className={`text-[10px] font-mono-code font-bold ${
                        loginStatus.available ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {loginStatus.text}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono-code text-neutral-500">
                      Nome exclusivo de acesso
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="register-callsign"
                    type="text"
                    value={callSign}
                    onChange={(e) => {
                      setCallSign(e.target.value);
                      if (loginStatus) setLoginStatus(null);
                      if (errorMessage && errorMessage.includes('login')) setErrorMessage(null);
                    }}
                    onBlur={handleCallSignBlur}
                    placeholder="Ex: seu_login"
                    className={`w-full bg-neutral-950 border rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono-code text-neutral-100 placeholder:text-neutral-600 focus:outline-none transition-all ${
                      loginStatus && !loginStatus.available
                        ? 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : loginStatus && loginStatus.available
                        ? 'border-emerald-500/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                        : 'border-neutral-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* E-mail */}
              <div>
                <label
                  htmlFor="register-email"
                  className="block text-xs font-tactical font-bold text-neutral-300 uppercase tracking-wide mb-1.5"
                >
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono-code text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 lowercase transition-all"
                  />
                </div>
              </div>

              {/* Grid Senha e Confirmação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="register-password"
                    className="block text-xs font-tactical font-bold text-neutral-300 uppercase tracking-wide mb-1.5"
                  >
                    Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-10 py-2.5 text-sm font-mono-code text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="register-confirm-password"
                    className="block text-xs font-tactical font-bold text-neutral-300 uppercase tracking-wide mb-1.5"
                  >
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="register-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-10 py-2.5 text-sm font-mono-code text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Botão de Registro */}
              <button
                id="btn-submit-register"
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-neutral-950 font-tactical font-black text-sm uppercase tracking-wider py-3 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <BadgeAlert className="w-4 h-4" />
                    <span>CONCLUIR CADASTRO</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 1 DE PERMISSÃO: FUNCIONAR EM SEGUNDO PLANO / TELA APAGADA */}
        {/* ========================================================================= */}
        {step === 'BACKGROUND_PERMISSION' && (
          <div className="bg-neutral-900 border-2 border-emerald-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/90 backdrop-blur-md relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_25px_rgba(16,185,129,0.25)] animate-pulse">
                <Volume2 className="w-8 h-8" />
              </div>
              <span className="text-[11px] font-mono-code text-emerald-400 uppercase tracking-widest font-bold">
                ETAPA 1 DE 2 • AUTORIZAÇÃO DE ÁUDIO
              </span>
              <h2 className="text-xl sm:text-2xl font-tactical font-black text-neutral-100 tracking-wider uppercase mt-1">
                FUNCIONAR EM SEGUNDO PLANO
              </h2>
              <p className="text-xs text-neutral-300 font-mono-code mt-2 max-w-md leading-relaxed">
                Permita que o rádio continue funcionando em segundo plano para ouvir quem fala mesmo com a tela apagada se conectado.
              </p>
            </div>

            {/* Cartões informativos de benefícios */}
            <div className="space-y-2.5 mb-6">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-tactical font-bold text-neutral-200 uppercase tracking-wide">
                    Ouvir com a Tela Apagada
                  </h3>
                  <p className="text-[11px] font-mono-code text-neutral-400 leading-normal mt-0.5">
                    Receba e reproduza transmissões de voz instantâneas com o celular no bolso ou bloqueado.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-tactical font-bold text-neutral-200 uppercase tracking-wide">
                    Conexão Ativa na Frequência
                  </h3>
                  <p className="text-[11px] font-mono-code text-neutral-400 leading-normal mt-0.5">
                    Mantém sua frequência sintonizada sem congelar ou interromper o canal.
                  </p>
                </div>
              </div>
            </div>

            {/* Botão de Permitir */}
            <button
              type="button"
              id="btn-allow-background"
              onClick={handleAllowBackground}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-neutral-950 font-tactical font-black text-sm uppercase tracking-wider py-3.5 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>PERMITIR E CONTINUAR</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2 DE PERMISSÃO: USO DO MICROFONE (ENTRA DIRETO NO RÁDIO) */}
        {/* ========================================================================= */}
        {step === 'MICROPHONE_PERMISSION' && (
          <div className="bg-neutral-900 border-2 border-emerald-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/90 backdrop-blur-md relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-pulse">
                <Mic className="w-8 h-8" />
              </div>
              <span className="text-[11px] font-mono-code text-emerald-400 uppercase tracking-widest font-bold">
                ETAPA 2 DE 2 • AUTORIZAÇÃO DE TRANSMISSÃO
              </span>
              <h2 className="text-xl sm:text-2xl font-tactical font-black text-neutral-100 tracking-wider uppercase mt-1">
                PERMITIR USO DO MICROFONE
              </h2>
              <p className="text-xs text-neutral-300 font-mono-code mt-2 max-w-md leading-relaxed">
                Autorize o microfone para transmitir sua voz ao pressionar o botão PTT. Se autorizado, você entrará direto na rádio.
              </p>
            </div>

            {/* Cartões informativos de benefícios */}
            <div className="space-y-2.5 mb-6">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-tactical font-bold text-neutral-200 uppercase tracking-wide">
                    Transmissão Push-to-Talk (PTT)
                  </h3>
                  <p className="text-[11px] font-mono-code text-neutral-400 leading-normal mt-0.5">
                    O microfone só é acionado enquanto você segura ou ativa o botão de transmissão.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-tactical font-bold text-neutral-200 uppercase tracking-wide">
                    Privacidade e Segurança
                  </h3>
                  <p className="text-[11px] font-mono-code text-neutral-400 leading-normal mt-0.5">
                    Nenhum áudio é captado fora de suas transmissões voluntárias na frequência.
                  </p>
                </div>
              </div>
            </div>

            {/* Botão de Autorizar Microfone e Entrar Direto */}
            <button
              type="button"
              id="btn-allow-mic-and-enter"
              onClick={handleAllowMicrophoneAndEnter}
              disabled={isRequestingMic}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-neutral-950 font-tactical font-black text-sm uppercase tracking-wider py-3.5 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isRequestingMic ? (
                <div className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  <span>AUTORIZAR E ENTRAR NO RÁDIO</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ETAPA FINAL: ENTRANDO NO RÁDIO */}
        {/* ========================================================================= */}
        {step === 'FINALIZING' && (
          <div className="bg-neutral-900 border border-emerald-500/40 rounded-2xl p-8 shadow-2xl shadow-black/90 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-tactical font-black text-neutral-100 uppercase tracking-wider">
              CADASTRO CONCLUÍDO!
            </h2>
            <p className="text-xs text-neutral-400 font-mono-code mt-2">
              Sintonizando frequência e conectando ao canal de rádio...
            </p>
            <div className="mt-4 w-32 h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
              <div className="h-full bg-emerald-500 animate-pulse rounded-full w-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

