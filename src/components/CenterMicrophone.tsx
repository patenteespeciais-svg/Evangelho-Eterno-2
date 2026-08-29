import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, ShieldAlert, AlertTriangle, Lock, CheckCircle, PhoneOff, Clock } from 'lucide-react';

interface CenterMicrophoneProps {
  isTransmitting?: boolean;
  isReceiving?: boolean;
  incomingSpeaker?: string | null;
  onToggleTransmission?: () => void;
  isSilenced?: boolean;
  isAlerted?: boolean;
  isOccupied?: boolean;
  moderationRequestSent?: boolean;
  isModerationActive?: boolean;
  moderationPartner?: string | null;
  onRequestModeration?: () => void;
  onEndModeration?: () => void;
  onUnsilence?: () => void;
  isAdmin?: boolean;
}

export const CenterMicrophone: React.FC<CenterMicrophoneProps> = ({
  isTransmitting = false,
  isReceiving = false,
  incomingSpeaker = null,
  onToggleTransmission,
  isSilenced = false,
  isAlerted = false,
  isOccupied = false,
  moderationRequestSent = false,
  isModerationActive = false,
  moderationPartner = null,
  onRequestModeration,
  onEndModeration,
  onUnsilence,
  isAdmin = false,
}) => {
  const [clickedWhileSilenced, setClickedWhileSilenced] = useState(false);
  const [clickedWhileOccupied, setClickedWhileOccupied] = useState(false);

  // Auto clear occupied flash
  useEffect(() => {
    if (clickedWhileOccupied) {
      const timer = setTimeout(() => setClickedWhileOccupied(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [clickedWhileOccupied]);

  // When occupied, user hears nobody
  const isListening = !isOccupied && Boolean(isReceiving || incomingSpeaker);
  const status = isTransmitting ? 'transmitting' : isListening ? 'receiving' : 'idle';

  const handleMicClick = () => {
    // If user is occupied, block mic transmission and prominently display warning
    if (isOccupied) {
      setClickedWhileOccupied(true);
      return;
    }

    // If user is silenced and not currently in an active moderation session, block transmission and display prompt
    if (isSilenced && !isModerationActive) {
      setClickedWhileSilenced(true);
      return;
    }

    // If user is alerted (or normal), they continue talking normally
    if (onToggleTransmission) {
      onToggleTransmission();
    }
  };

  // Determine if the red moderation prompt should show (silenced user)
  const showSilencedPrompt = !isOccupied && isSilenced && !isModerationActive && (clickedWhileSilenced || moderationRequestSent);

  // Determine if the orange moderation prompt should show (alerted user - continues speaking)
  const showAlertedPrompt = !isOccupied && isAlerted && !isSilenced && !isModerationActive;

  return (
    <div
      id="center-microphone-container"
      className="w-full flex flex-col items-center justify-center p-4 select-none my-auto relative"
    >
      {/* Texto em LARANJA quando OCUPADO: ATUALMENTE VOCÊ ESTÁ OCUPADO */}
      {(isOccupied || clickedWhileOccupied) && (
        <div className="mb-4 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200 z-30 max-w-md text-center">
          <div className="px-5 py-2.5 bg-neutral-900/95 border-2 border-orange-500 rounded-2xl shadow-[0_0_30px_rgba(249,115,22,0.5)] flex flex-col items-center gap-1 animate-pulse">
            <div className="flex items-center gap-2 text-orange-400 font-tactical font-black text-xs sm:text-sm tracking-wider uppercase">
              <Clock className="w-4 h-4 text-orange-500 shrink-0" />
              <span>ATUALMENTE VOCÊ ESTÁ OCUPADO</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono-code">
              Microfone bloqueado e áudio desativado. Mude para DISPONÍVEL na tarja superior para falar e ouvir.
            </span>
          </div>
        </div>
      )}

      {/* Texto em LARANJA ACIMA do círculo quando ALERTADO: PROCURE URGENTE A MODERAÇÃO (mas continua falando) */}
      {showAlertedPrompt && (
        <div className="mb-4 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200 z-30">
          {!moderationRequestSent ? (
            <button
              type="button"
              id="moderation-alert-urgent-btn"
              onClick={() => {
                if (onRequestModeration) {
                  onRequestModeration();
                }
              }}
              className="px-4 py-2 bg-orange-950/80 hover:bg-orange-900 border-2 border-orange-500 rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.7)] text-orange-400 hover:text-orange-300 font-tactical font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2 cursor-pointer transition-all active:scale-95 animate-pulse"
              title="Você foi alertado pela moderação. Clique para solicitar atendimento direto."
            >
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
              <span>PROCURE URGENTE A MODERAÇÃO</span>
            </button>
          ) : (
            <div className="px-4 py-2 bg-neutral-900/95 border border-orange-500/80 rounded-2xl shadow-[0_0_15px_rgba(249,115,22,0.4)] text-center">
              <span className="block text-orange-400 font-tactical font-bold text-xs tracking-wide uppercase">
                SOLICITAÇÃO ENVIADA À ADMINISTRAÇÃO
              </span>
              <span className="block text-[10px] text-neutral-400 font-mono-code mt-0.5">
                Aguarde o Administrador conectar o canal privado (você pode continuar falando)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Texto em VERMELHO ACIMA do círculo quando SILENCIADO: PROCURE URGENTE A MODERAÇÃO (transmissão bloqueada) */}
      {showSilencedPrompt && (
        <div className="mb-4 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200 z-30">
          {!moderationRequestSent ? (
            <button
              type="button"
              id="moderation-urgent-btn"
              onClick={() => {
                if (onRequestModeration) {
                  onRequestModeration();
                }
              }}
              className="px-4 py-2 bg-red-950/80 hover:bg-red-900 border-2 border-red-500 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.7)] text-red-400 hover:text-red-300 font-tactical font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2 cursor-pointer transition-all active:scale-95 animate-pulse"
              title="Clique para enviar mensagem urgente ao Administrador"
            >
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <span>PROCURE URGENTE A MODERAÇÃO</span>
            </button>
          ) : (
            <div className="px-4 py-2 bg-neutral-900/95 border border-red-500/80 rounded-2xl shadow-[0_0_15px_rgba(239,68,68,0.4)] text-center">
              <span className="block text-red-400 font-tactical font-bold text-xs tracking-wide uppercase">
                SOLICITAÇÃO ENVIADA À ADMINISTRAÇÃO
              </span>
              <span className="block text-[10px] text-neutral-400 font-mono-code mt-0.5">
                Aguarde o Administrador (Salvador Silva) conectar o canal privado
              </span>
            </div>
          )}
        </div>
      )}

      {/* Banner de Canal Privado de Moderação Ativo */}
      {isModerationActive && (
        <div className="mb-4 w-full max-w-sm px-4 py-2.5 bg-neutral-900/95 border-2 border-amber-500/80 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.35)] flex flex-col items-center text-center gap-1.5 animate-in fade-in zoom-in-95 duration-200 z-30">
          <div className="flex items-center gap-2 text-amber-400 font-tactical font-bold text-xs uppercase tracking-wider">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>MODERAÇÃO PRIVADA DIRETA 1-ON-1</span>
          </div>
          <span className="text-[11px] text-neutral-300 font-medium">
            Conectado com: <strong className="text-amber-300 uppercase">{moderationPartner || 'Administrador'}</strong>
          </span>
          <span className="text-[10px] text-emerald-400 font-mono-code">
            Microfone liberado exclusivamente entre vocês. Ninguém mais tem acesso.
          </span>

          {/* Ações para o Administrador dentro da Moderação */}
          {isAdmin && (
            <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-neutral-800 w-full justify-center">
              {onUnsilence && (
                <button
                  type="button"
                  onClick={onUnsilence}
                  className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-400 rounded-lg text-[10px] font-tactical font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>Liberar Usuário</span>
                </button>
              )}
              {onEndModeration && (
                <button
                  type="button"
                  onClick={onEndModeration}
                  className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-lg text-[10px] font-tactical font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                >
                  <PhoneOff className="w-3 h-3" />
                  <span>Encerrar</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grande Círculo */}
      <button
        id="large-circle"
        type="button"
        onClick={handleMicClick}
        aria-pressed={isTransmitting}
        aria-label={
          isOccupied
            ? 'ATUALMENTE VOCÊ ESTÁ OCUPADO'
            : isSilenced && !isModerationActive
            ? 'Microfone silenciado pela moderação'
            : isAlerted && !isModerationActive
            ? 'Usuário alertado pela moderação (microfone ativo)'
            : status === 'transmitting'
            ? 'Transmitindo (Vermelho) - Clique para desligar'
            : status === 'receiving'
            ? 'Ouvindo (Azul)'
            : 'Aperte para falar (Laranja)'
        }
        className={`relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-full border-4 bg-neutral-950/50 backdrop-blur-sm transition-all duration-300 cursor-pointer outline-none focus:ring-4 focus:ring-amber-500/20 active:scale-95 ${
          isOccupied
            ? 'border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.4)] ring-2 ring-orange-500/30'
            : isSilenced && !isModerationActive
            ? 'border-red-600/80 shadow-[0_0_40px_rgba(220,38,38,0.3)]'
            : isAlerted && !isModerationActive && !isTransmitting && !isReceiving
            ? 'border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.45)] ring-2 ring-orange-500/30'
            : isModerationActive
            ? status === 'transmitting'
              ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)] scale-105'
              : 'border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.35)]'
            : status === 'transmitting'
            ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.35)] scale-105'
            : status === 'receiving'
            ? 'border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.35)] scale-105'
            : 'border-orange-500/70 hover:border-orange-400 hover:shadow-[0_0_40px_rgba(249,115,22,0.25)]'
        }`}
      >
        {/* Anel sutil externo pulsante quando transmitindo (vermelho) ou ouvindo (azul) */}
        {status === 'transmitting' && (
          <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping pointer-events-none" />
        )}
        {status === 'receiving' && (
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 animate-ping pointer-events-none" />
        )}

        {/* Pequeno Microfone no Centro */}
        <div
          id="center-mic-icon-wrapper"
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 pointer-events-none ${
            isOccupied
              ? 'bg-orange-950/80 text-orange-400 border border-orange-500/60 shadow-md shadow-orange-950/60'
              : isSilenced && !isModerationActive
              ? 'bg-red-950/60 text-red-500 border border-red-500/40 shadow-md shadow-black/60'
              : isAlerted && !isModerationActive && !isTransmitting && !isReceiving
              ? 'bg-orange-950/60 text-orange-400 border border-orange-500/50 shadow-md shadow-orange-950/50'
              : isModerationActive
              ? status === 'transmitting'
                ? 'bg-red-500/20 text-red-500 shadow-lg shadow-red-500/30 ring-1 ring-red-500/50'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-md shadow-black/60'
              : status === 'transmitting'
              ? 'bg-red-500/20 text-red-500 shadow-lg shadow-red-500/30 ring-1 ring-red-500/50'
              : status === 'receiving'
              ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/30 ring-1 ring-blue-500/50'
              : 'bg-neutral-900/90 text-orange-400 border border-orange-500/30 shadow-md shadow-black/60 hover:text-orange-300'
          }`}
        >
          {isOccupied ? (
            <MicOff className="w-5 h-5" />
          ) : status === 'receiving' ? (
            <Volume2 className="w-5 h-5 animate-pulse" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </div>
      </button>
    </div>
  );
};

