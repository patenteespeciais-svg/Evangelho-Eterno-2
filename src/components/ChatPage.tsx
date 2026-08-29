import React, { useState, useRef } from 'react';
import { Clock, User, Share2, Check, Send, Camera } from 'lucide-react';
import { ChatMessage, RadioUser } from '../types';
import { soundEffects } from '../services/audioEffects';
import { formatTimeSeconds } from '../services/audioGenerator';
import { processImageFile } from '../utils/imageUtils';
import { LargeAvatarUserData } from './LargeAvatarModal';

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
  const [sharedAudioId, setSharedAudioId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const chatFileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePlayVoice = (msg: ChatMessage) => {
    // Start audio playback from the beginning
    setPlayingAudioId(msg.id);
    if (msg.voiceAudioUrl) {
      soundEffects.playRadioTransmission(msg.voiceAudioUrl, () => {
        setPlayingAudioId((curr) => (curr === msg.id ? null : curr));
      });
    } else {
      soundEffects.playRogerBeep('motorola');
      setTimeout(() => {
        setPlayingAudioId((curr) => (curr === msg.id ? null : curr));
      }, (msg.voiceAudioDuration || 2) * 1000);
    }
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
        callSign: senderCallSign,
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
    const shareText = isAudio
      ? `Áudio gravado de ${msg.senderCallSign} (${duration}) - Evangelho Eterno`
      : `${msg.senderCallSign}: "${msg.text}" - Evangelho Eterno`;

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
              title={speakerName === myCallSign ? "Clique para alterar a foto do seu login" : `Clique para ver a foto de ${speakerName} em tamanho grande`}
              className="relative w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:scale-110 transition-transform"
            >
              {speakerAvatar ? (
                <img src={speakerAvatar} alt={speakerName} className="w-full h-full object-cover rounded-full" />
              ) : (
                <User className="w-3.5 h-3.5 text-neutral-300" />
              )}
            </button>

            <div className="flex flex-col text-left justify-center">
              <span className="font-tactical font-bold text-xs text-neutral-100 uppercase tracking-wide leading-tight">
                {speakerName}
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

            return (
              <div
                key={msg.id}
                id={`chat-item-${msg.id}`}
                className={`w-full border-y px-3 sm:px-5 py-1.5 flex items-center justify-between shadow-sm transition-colors ${
                  msg.isPrivateModeration
                    ? 'bg-amber-950/25 border-amber-500/40 hover:bg-amber-950/35'
                    : 'bg-neutral-900 border-neutral-800/80 hover:bg-neutral-900/90'
                }`}
              >
                {/* Lado Esquerdo: Avatar + Login + (Linha invisível para áudio / Texto para mensagem) */}
                <div className="flex items-center gap-2 sm:gap-2.5 max-w-[65%] sm:max-w-[75%]">
                  <button
                    type="button"
                    onClick={() => handleAvatarClick(msg.senderCallSign, msg.senderAvatar)}
                    title={isSenderMe ? "Clique para alterar a foto do seu login na galeria" : `Clique para ver a foto de ${msg.senderCallSign} em tamanho grande`}
                    className="relative w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:scale-110 transition-transform"
                  >
                    {msg.senderAvatar && (msg.senderAvatar.startsWith('data:') || msg.senderAvatar.startsWith('http') || msg.senderAvatar.startsWith('blob:')) ? (
                      <img src={msg.senderAvatar} alt={msg.senderCallSign} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                    )}
                  </button>
                  
                  <div className="flex flex-col text-left justify-center overflow-hidden">
                    {/* Login do Operador */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-tactical font-bold text-xs text-neutral-200 uppercase tracking-wide leading-tight">
                        {msg.senderCallSign}
                      </span>
                      {msg.isPrivateModeration && (
                        <span className="text-[9px] font-mono-code font-bold text-amber-400 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.2 rounded uppercase">
                          Moderação Privada
                        </span>
                      )}
                    </div>

                    {/* Se for áudio: Linha abaixo do login, começando pela letra: laranja normalmente, fica azul ao reproduzir */}
                    {isAudio ? (
                      <div
                        onClick={() => handlePlayVoice(msg)}
                        title="Clique para ouvir o áudio do início"
                        className="cursor-pointer py-1 group flex items-center"
                      >
                        <div
                          className={`h-[2px] rounded-full transition-all duration-300 ${
                            isPlaying
                              ? 'w-28 sm:w-44 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.9)] animate-pulse'
                              : 'w-20 sm:w-32 bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.6)] group-hover:bg-orange-400 group-hover:w-24'
                          }`}
                        />
                      </div>
                    ) : (
                      /* Se for mensagem de texto */
                      <p className="text-xs text-neutral-300 font-sans break-words mt-0.5 leading-snug">
                        {msg.text}
                      </p>
                    )}
                  </div>
                </div>

                {/* Lado Direito: Tempo Utilizado bem pertinho do Botão Compartilhar na lateral direita */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Tempo Percorrido / Horário */}
                  <div className="flex items-center gap-1 font-mono-code text-[11px] sm:text-xs text-neutral-300">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    <span>{isAudio ? formatTimeSeconds(durationSec) : formatMsgTime(msg.timestamp)}</span>
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
