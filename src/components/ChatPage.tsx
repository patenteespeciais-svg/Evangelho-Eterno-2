import React, { useState, useRef, useEffect } from 'react';
import { Clock, User, Share2, Check, Send, Camera } from 'lucide-react';
import { ChatMessage, RadioUser } from '../types';
import { soundEffects } from '../services/audioEffects';
import { formatTimeSeconds } from '../services/audioGenerator';
import { processImageFile } from '../utils/imageUtils';
import { formatLoginTitleCase } from '../utils/formatUtils';
import { LargeAvatarUserData } from './LargeAvatarModal';
import { audioIntensityService } from '../services/audioIntensityService';

interface ChatPageProps {
  messages: ChatMessage[];
  currentUser: RadioUser;
  isTransmitting?: boolean;
  incomingSpeaker?: string | null;
  txTime?: number;
  isAdminLoggedIn?: boolean;
  adminAvatar?: string | null;
  onSendMessage?: (text: string) => void;
  onUpdateAdminAvatar?: (photoUrl: string) => void;
  onUpdateUserAvatar?: (photoUrl: string) => void;
  onOpenLargeAvatar?: (userData: LargeAvatarUserData) => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({
  messages,
  currentUser,
  isTransmitting = false,
  incomingSpeaker = null,
  txTime = 0,
  isAdminLoggedIn = false,
  adminAvatar = null,
  onSendMessage,
  onUpdateAdminAvatar,
  onUpdateUserAvatar,
  onOpenLargeAvatar,
}) => {
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isAudioPaused, setIsAudioPaused] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [sharedAudioId, setSharedAudioId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // Audio Playback References
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioMsgRef = useRef<ChatMessage | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const syntheticTimerRef = useRef<number | null>(null);
  const syntheticRemainingMsRef = useRef<number>(0);
  const syntheticStartTimestampRef = useRef<number>(0);

  const myCallSign = isAdminLoggedIn ? 'Salvador Silva' : (currentUser.callSign || 'Operador 42');

  const isSpeaking = isTransmitting || Boolean(incomingSpeaker);
  const speakerName = incomingSpeaker
    ? incomingSpeaker
    : myCallSign;

  const speakerAvatar =
    !incomingSpeaker && isAdminLoggedIn && adminAvatar
      ? adminAvatar
      : !incomingSpeaker && currentUser.avatar && currentUser.avatar.startsWith('data:')
      ? currentUser.avatar
      : null;

  const stopAllPlayback = () => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current.onended = null;
      } catch {}
      currentAudioRef.current = null;
    }
    if (syntheticTimerRef.current !== null) {
      clearTimeout(syntheticTimerRef.current);
      syntheticTimerRef.current = null;
    }
    soundEffects.stopCurrentRadioTransmission();
    audioIntensityService.stopAll();
    setPlayingAudioId(null);
    setIsAudioPaused(false);
    setAudioProgress(0);
    activeAudioMsgRef.current = null;
  };

  useEffect(() => {
    return () => {
      stopAllPlayback();
    };
  }, []);

  // Smooth real-time progress tracking animation loop (60fps)
  useEffect(() => {
    if (!playingAudioId || isAudioPaused) {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const updateProgressLoop = () => {
      if (currentAudioRef.current && activeAudioMsgRef.current) {
        const audio = currentAudioRef.current;
        const dur = audio.duration || activeAudioMsgRef.current.voiceAudioDuration || 2;
        if (dur > 0 && !isNaN(audio.currentTime)) {
          const pct = Math.min(100, Math.max(0, (audio.currentTime / dur) * 100));
          setAudioProgress(pct);
        }
      } else if (activeAudioMsgRef.current && syntheticStartTimestampRef.current) {
        const totalMs = (activeAudioMsgRef.current.voiceAudioDuration || 2) * 1000;
        const elapsed = (Date.now() - syntheticStartTimestampRef.current) + (totalMs - syntheticRemainingMsRef.current);
        const pct = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
        setAudioProgress(pct);
      }

      animFrameRef.current = requestAnimationFrame(updateProgressLoop);
    };

    animFrameRef.current = requestAnimationFrame(updateProgressLoop);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [playingAudioId, isAudioPaused]);

  const startAudioFromOffset = async (msg: ChatMessage, startOffsetSec: number = 0) => {
    // Clean prior state
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.onended = null;
      } catch {}
      currentAudioRef.current = null;
    }
    if (syntheticTimerRef.current !== null) {
      clearTimeout(syntheticTimerRef.current);
      syntheticTimerRef.current = null;
    }

    activeAudioMsgRef.current = msg;
    setPlayingAudioId(msg.id);
    setIsAudioPaused(false);
    const initialPct = startOffsetSec > 0 ? (startOffsetSec / (msg.voiceAudioDuration || 2)) * 100 : 0;
    setAudioProgress(initialPct);
    audioIntensityService.startIncomingTracking();

    if (msg.voiceAudioUrl) {
      try {
        const audio = new Audio(msg.voiceAudioUrl);
        currentAudioRef.current = audio;
        audio.currentTime = startOffsetSec;
        audio.volume = 0.95;

        audio.onended = () => {
          soundEffects.playSquelch(100, 0.25);
          stopAllPlayback();
        };

        if (startOffsetSec === 0) {
          soundEffects.playSquelch(60, 0.15);
        }
        await audio.play();
      } catch {
        stopAllPlayback();
      }
    } else {
      if (startOffsetSec === 0) {
        soundEffects.playRogerBeep('motorola');
      }
      const totalDuration = (msg.voiceAudioDuration || 2) * 1000;
      const remainingMs = Math.max(500, totalDuration - startOffsetSec * 1000);
      syntheticRemainingMsRef.current = remainingMs;
      syntheticStartTimestampRef.current = Date.now();

      syntheticTimerRef.current = window.setTimeout(() => {
        stopAllPlayback();
      }, remainingMs);
    }
  };

  // Click on audio line: Play or Pause
  const handleAudioClick = (msg: ChatMessage) => {
    // 1. If currently playing this audio and NOT paused -> PAUSE
    if (playingAudioId === msg.id && !isAudioPaused) {
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
        } catch {}
      }
      if (syntheticTimerRef.current !== null) {
        clearTimeout(syntheticTimerRef.current);
        syntheticTimerRef.current = null;
        const elapsed = Date.now() - syntheticStartTimestampRef.current;
        syntheticRemainingMsRef.current = Math.max(0, syntheticRemainingMsRef.current - elapsed);
      }
      setIsAudioPaused(true);
      audioIntensityService.stopAll();
      return;
    }

    // 2. If currently paused on this audio -> RESUME
    if (playingAudioId === msg.id && isAudioPaused) {
      setIsAudioPaused(false);
      audioIntensityService.startIncomingTracking();

      if (currentAudioRef.current) {
        currentAudioRef.current.play().catch(() => {
          stopAllPlayback();
        });
      } else {
        syntheticStartTimestampRef.current = Date.now();
        syntheticTimerRef.current = window.setTimeout(() => {
          stopAllPlayback();
        }, syntheticRemainingMsRef.current || 1000);
      }
      return;
    }

    // 3. Otherwise: Start playing from beginning (0s)
    startAudioFromOffset(msg, 0);
  };

  // Double Click on audio line: RESTART from beginning (0s)
  const handleAudioDoubleClick = (msg: ChatMessage, e: React.MouseEvent) => {
    e.stopPropagation();
    startAudioFromOffset(msg, 0);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedUrl = await processImageFile(file);
        if (isAdminLoggedIn && onUpdateAdminAvatar) {
          onUpdateAdminAvatar(compressedUrl);
        } else if (onUpdateUserAvatar) {
          onUpdateUserAvatar(compressedUrl);
        }
      } catch (err) {
        console.error('Erro ao carregar foto do chat:', err);
      }
    }
    e.target.value = '';
  };

  const handleAvatarClick = (senderCallSign: string, senderAvatar?: string | null) => {
    const isMe = senderCallSign === myCallSign;
    if (isMe) {
      if (chatFileInputRef.current) {
        chatFileInputRef.current.click();
      }
    } else if (onOpenLargeAvatar) {
      onOpenLargeAvatar({
        callSign: formatLoginTitleCase(senderCallSign),
        avatar: senderAvatar,
        role: senderCallSign === 'Salvador Silva' ? 'Administrador' : 'Operador',
        isOnline: true,
        availability: 'DISPONIVEL',
        isMe: false,
      });
    }
  };

  const handleShareAudio = async (msg: ChatMessage) => {
    const isAudio = Boolean(msg.voiceAudioUrl || msg.voiceAudioDuration);
    const duration = formatTimeSeconds(Math.round(msg.voiceAudioDuration || 1));
    const formattedSender = formatLoginTitleCase(msg.senderCallSign);
    const shareText = isAudio
      ? `Áudio gravado de ${formattedSender} (${duration}) - Evangelho Eterno`
      : `${formattedSender}: "${msg.text}" - Evangelho Eterno`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Evangelho Eterno',
          text: shareText,
          url: window.location.href,
        });
        setSharedAudioId(msg.id);
        setTimeout(() => setSharedAudioId(null), 2000);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        setSharedAudioId(msg.id);
        setTimeout(() => setSharedAudioId(null), 2000);
      }
    } catch {
      setSharedAudioId(msg.id);
      setTimeout(() => setSharedAudioId(null), 2000);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !onSendMessage) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const formatMsgTime = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full flex flex-col items-center select-none pb-28 animate-in fade-in duration-200">
      {/* Input oculto para carregar foto da galeria */}
      <input
        ref={chatFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      
      {/* 1. ABAIXO DA TARJA SUPERIOR: ENQUANTO LIGADO O MICROFONE (Lado esquerdo Login / Lado direito Gravando) */}
      {isSpeaking && (
        <div
          id="chat-recording-banner"
          className="w-full bg-neutral-900 border-y border-neutral-800 py-1.5 px-3 sm:px-5 flex items-center justify-between shadow-sm mb-3 animate-in fade-in duration-150"
        >
          {/* LADO ESQUERDO: Login do Operador */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => handleAvatarClick(speakerName, speakerAvatar)}
              title={speakerName === myCallSign ? "Clique para alterar a foto do seu login" : `Clique para ver a foto de ${formatLoginTitleCase(speakerName)} em tamanho grande`}
              className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform"
            >
              {speakerAvatar ? (
                <img src={speakerAvatar} alt={formatLoginTitleCase(speakerName)} className="w-full h-full object-cover rounded-full" />
              ) : (
                <User className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-neutral-300" />
              )}
            </button>

            <div className="flex flex-col text-left justify-center">
              <span className="font-tactical font-bold text-xs text-neutral-100 tracking-wide leading-tight">
                {formatLoginTitleCase(speakerName)}
              </span>
            </div>
          </div>

          {/* LADO DIREITO: Gravando */}
          <div className="flex items-center gap-1.5 text-neutral-300 font-tactical font-bold text-xs tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
            <span className="text-neutral-200">gravando</span>
            <span className="font-mono-code text-neutral-400 font-semibold text-[11px] ml-0.5">
              {formatTimeSeconds(txTime)}
            </span>
          </div>
        </div>
      )}

      {/* 2. LISTAGEM DE ÁUDIOS E MENSAGENS */}
      <div className="w-full flex flex-col space-y-1.5">
        {messages.filter((msg) => {
          if (!msg.isPrivateModeration) return true;
          // Private moderation messages are strictly visible ONLY to Admin and the targeted person
          if (isAdminLoggedIn) return true;
          return msg.senderCallSign === myCallSign || msg.targetUserCallSign === myCallSign;
        }).length === 0 && !isSpeaking ? (
          <div className="w-full py-12 text-center text-neutral-500 font-mono-code text-xs">
            Nenhuma mensagem ou áudio gravado no momento.
          </div>
        ) : (
          messages
            .filter((msg) => {
              if (!msg.isPrivateModeration) return true;
              if (isAdminLoggedIn) return true;
              return msg.senderCallSign === myCallSign || msg.targetUserCallSign === myCallSign;
            })
            .map((msg) => {
            const isAudio = Boolean(msg.voiceAudioUrl || msg.voiceAudioDuration);
            const isPlaying = playingAudioId === msg.id;
            const isShared = sharedAudioId === msg.id;
            const durationSec = Math.round(msg.voiceAudioDuration || 1);
            const isSenderMe = msg.senderCallSign === myCallSign;
            const currentElapsedSec = isPlaying
              ? Math.min(durationSec, Math.floor((audioProgress / 100) * durationSec))
              : durationSec;

            return (
              <div
                key={msg.id}
                id={`chat-item-${msg.id}`}
                className={`w-full border-y px-3 sm:px-5 py-1.5 flex items-center justify-between gap-2.5 sm:gap-4 shadow-sm transition-colors ${
                  msg.isPrivateModeration
                    ? 'bg-amber-950/25 border-amber-500/40 hover:bg-amber-950/35'
                    : 'bg-neutral-900 border-neutral-800/80 hover:bg-neutral-900/90'
                }`}
              >
                {/* Lado Esquerdo: Avatar */}
                <button
                  type="button"
                  onClick={() => handleAvatarClick(msg.senderCallSign, msg.senderAvatar)}
                  title={isSenderMe ? "Clique para alterar a foto do seu login na galeria" : `Clique para ver a foto de ${formatLoginTitleCase(msg.senderCallSign)} em tamanho grande`}
                  className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform"
                >
                  {msg.senderAvatar && (msg.senderAvatar.startsWith('data:') || msg.senderAvatar.startsWith('http') || msg.senderAvatar.startsWith('blob:')) ? (
                    <img src={msg.senderAvatar} alt={formatLoginTitleCase(msg.senderCallSign)} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-neutral-400" />
                  )}
                </button>
                
                {/* Centro: Login + Linha de Áudio percurso até perto de Compartilhar OU Texto */}
                <div className="flex-1 flex flex-col justify-center min-w-0 pr-1">
                  {/* Login do Operador */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-tactical font-bold text-xs text-neutral-200 tracking-wide leading-tight">
                      {formatLoginTitleCase(msg.senderCallSign)}
                    </span>
                    {msg.isPrivateModeration && (
                      <span className="text-[9px] font-mono-code font-bold text-amber-400 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.2 rounded uppercase">
                        Moderação Privada
                      </span>
                    )}
                  </div>

                  {/* Se for áudio: Linha quase invisível com percurso até pertinho do botão compartilhar */}
                  {isAudio ? (
                    <div
                      id={`audio-line-btn-${msg.id}`}
                      onClick={() => handleAudioClick(msg)}
                      onDoubleClick={(e) => handleAudioDoubleClick(msg, e)}
                      title={
                        isPlaying && !isAudioPaused
                          ? 'Clique para pausar • Duplo clique para reiniciar'
                          : isPlaying && isAudioPaused
                          ? 'Clique para continuar ouvindo • Duplo clique para reiniciar'
                          : 'Clique para reproduzir • Duplo clique para reiniciar'
                      }
                      className="cursor-pointer py-1.5 group w-full flex items-center select-none"
                    >
                      {/* Linha quase invisível por todo o percurso */}
                      <div className="relative w-full h-[2.5px] sm:h-[3px] bg-neutral-700/25 border border-neutral-700/20 rounded-full overflow-hidden transition-all group-hover:bg-neutral-600/35">
                        {/* Azul começa do zero e preenche a linha até o final perto de Compartilhar */}
                        <div
                          className={`h-full rounded-full transition-all duration-75 ${
                            isPlaying
                              ? isAudioPaused
                                ? 'bg-blue-400/80 shadow-[0_0_6px_#3b82f6]'
                                : 'bg-blue-500 shadow-[0_0_10px_#3b82f6,0_0_3px_#2563eb]'
                              : 'bg-transparent'
                          }`}
                          style={{
                            width: isPlaying ? `${Math.min(100, Math.max(0, audioProgress))}%` : '0%',
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Se for mensagem de texto */
                    <p className="text-xs text-neutral-300 font-sans break-words mt-0.5 leading-snug">
                      {msg.text}
                    </p>
                  )}
                </div>

                {/* Lado Direito: Tempo Utilizado bem pertinho do Botão Compartilhar na lateral direita */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Tempo Percorrido / Horário */}
                  <div className="flex items-center gap-1 font-mono-code text-[11px] sm:text-xs text-neutral-300">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    <span>{isAudio ? (isPlaying ? formatTimeSeconds(currentElapsedSec) : formatTimeSeconds(durationSec)) : formatMsgTime(msg.timestamp)}</span>
                  </div>

                  {/* Bem na lateral direita: Botão Compartilhar */}
                  <button
                    type="button"
                    id={`chat-share-btn-${msg.id}`}
                    onClick={() => handleShareAudio(msg)}
                    title={isAudio ? "Compartilhar áudio" : "Compartilhar mensagem"}
                    aria-label={isAudio ? "Compartilhar áudio" : "Compartilhar mensagem"}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono-code font-semibold transition-all border ${
                      isShared
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border-neutral-700 active:scale-95'
                    }`}
                  >
                    {isShared ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="hidden sm:inline">COPIADO</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3 h-3" />
                        <span className="hidden sm:inline">COMPARTILHAR</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. CAMPO DE MENSAGEM E ENVIAR COLADO À TARJA INFERIOR DE MENU */}
      <div
        id="chat-input-bar-container"
        className="fixed bottom-[64px] sm:bottom-[76px] inset-x-0 z-40 px-3 pointer-events-none select-none flex justify-center"
      >
        <form
          onSubmit={handleFormSubmit}
          className="w-full max-w-xs sm:max-w-sm bg-neutral-950/95 border border-neutral-800/90 backdrop-blur-xl p-1 rounded-xl shadow-xl shadow-black/80 flex items-center gap-1.5 pointer-events-auto ring-1 ring-white/5"
        >
          <input
            id="chat-message-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/80 transition-colors"
          />
          <button
            id="chat-send-btn"
            type="submit"
            disabled={!inputText.trim()}
            title="Enviar mensagem"
            aria-label="Enviar mensagem"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:hover:bg-amber-500 text-neutral-950 transition-all active:scale-95 shrink-0"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>

    </div>
  );
};
