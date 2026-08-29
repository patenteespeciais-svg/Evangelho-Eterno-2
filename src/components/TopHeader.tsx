import React, { useState, useRef, useEffect } from 'react';
import {
  Radio,
  Shield,
  Zap,
  RadioTower,
  Award,
  Cpu,
  User,
  MoreVertical,
  CheckCircle2,
  Clock,
  LogOut,
  Camera,
  Trash2,
  Maximize2
} from 'lucide-react';
import { RadioUser, NavigationTab } from '../types';
import { formatTimeSeconds } from '../services/audioGenerator';
import { processImageFile } from '../utils/imageUtils';
import { LargeAvatarUserData } from './LargeAvatarModal';

interface TopHeaderProps {
  currentUser: RadioUser;
  currentChannel?: any;
  isConnected?: boolean;
  isTransmitting?: boolean;
  incomingSpeaker?: string | null;
  incomingSpeakerAvatar?: string | null;
  txTime?: number;
  activeTab?: NavigationTab;
  isAdminLoggedIn?: boolean;
  adminAvatar?: string | null;
  onUpdateAdminAvatar?: (photoUrl: string) => void;
  onUpdateUserAvatar?: (photoUrl: string) => void;
  onOpenLargeAvatar?: (userData: LargeAvatarUserData) => void;
  onlineCount?: number;
  currentAvailability?: 'DISPONIVEL' | 'OCUPADO';
  onStatusSelect?: (status: 'DISPONIVEL' | 'OCUPADO' | 'DESCONECTAR') => void;
  onClearChat?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  activeTab = 'RADIO',
  isAdminLoggedIn = false,
  adminAvatar = null,
  onUpdateAdminAvatar,
  onUpdateUserAvatar,
  onOpenLargeAvatar,
  onlineCount = 0,
  currentAvailability = 'DISPONIVEL',
  onStatusSelect,
  onClearChat,
  isTransmitting = false,
  incomingSpeaker = null,
  incomingSpeakerAvatar = null,
  txTime = 0,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [localAvailability, setLocalAvailability] = useState<'DISPONIVEL' | 'OCUPADO'>(currentAvailability);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveAvailability = currentAvailability || localAvailability;

  useEffect(() => {
    if (currentAvailability) {
      setLocalAvailability(currentAvailability);
    }
  }, [currentAvailability]);

  const isSpeaking = isTransmitting || Boolean(incomingSpeaker);
  const speakerName = incomingSpeaker
    ? incomingSpeaker
    : isAdminLoggedIn
    ? 'Salvador Silva'
    : currentUser.callSign || 'Operador 42';

  const isCurrentSpeakerMe = !incomingSpeaker;

  const speakerAvatar = incomingSpeaker
    ? incomingSpeakerAvatar
    : isAdminLoggedIn
    ? adminAvatar
    : currentUser.avatar && currentUser.avatar.startsWith('data:')
    ? currentUser.avatar
    : null;

  // Close floating menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close menu if switching away from RADIO tab
  useEffect(() => {
    if (activeTab !== 'RADIO') {
      setIsMenuOpen(false);
    }
  }, [activeTab]);

  const handleSelectOption = (option: 'DISPONIVEL' | 'OCUPADO' | 'DESCONECTAR') => {
    if (option === 'DISPONIVEL' || option === 'OCUPADO') {
      setLocalAvailability(option);
    }
    setIsMenuOpen(false);
    if (onStatusSelect) {
      onStatusSelect(option);
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
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
        console.error('Erro ao processar imagem:', err);
      }
    }
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const handleSpeakerAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenLargeAvatar) {
      onOpenLargeAvatar({
        callSign: speakerName,
        avatar: speakerAvatar,
        role: incomingSpeaker ? 'Operador' : isAdminLoggedIn ? 'Administrador' : 'Usuário',
        isOnline: true,
        availability: 'DISPONIVEL',
        isMe: isCurrentSpeakerMe,
      });
    }
  };

  // Render user or tactical avatar icon in the circular avatar ball
  const renderAvatarContent = () => {
    if (isAdminLoggedIn && adminAvatar) {
      return (
        <img
          src={adminAvatar}
          alt="Salvador Silva"
          className="w-full h-full object-cover rounded-full"
        />
      );
    }

    if (!isAdminLoggedIn && currentUser.avatar && (currentUser.avatar.startsWith('data:') || currentUser.avatar.startsWith('http') || currentUser.avatar.startsWith('blob:'))) {
      return (
        <img
          src={currentUser.avatar}
          alt={currentUser.callSign || 'Meu Login'}
          className="w-full h-full object-cover rounded-full"
        />
      );
    }

    if (isAdminLoggedIn) {
      return <Shield className="w-5 h-5" />;
    }

    switch (currentUser.avatar) {
      case 'shield':
        return <Shield className="w-5 h-5" />;
      case 'eagle':
        return <Zap className="w-5 h-5" />;
      case 'tower':
        return <RadioTower className="w-5 h-5" />;
      case 'radio':
        return <Radio className="w-5 h-5" />;
      case 'medic':
        return <Award className="w-5 h-5" />;
      case 'cyber':
        return <Cpu className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  return (
    <div id="top-header-wrapper" className="w-full pt-7 sm:pt-9 select-none relative z-50">
      <header
        id="top-header-strip"
        className="w-full h-[1.5cm] min-h-[1.5cm] max-h-[1.5cm] bg-neutral-900/90 border-y border-neutral-800 rounded-none backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shadow-md shadow-black/40 relative"
      >
        {/* Input oculto para carregar foto da galeria */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Esquerda: Bola Avatar do Login + (EVANGELHO ETERNO ou Avatar+Login falando) */}
        <div className="flex items-center gap-3">
          {/* 1. Bola Avatar do Login (Clique abre a galeria para inserir foto) */}
          <button
            type="button"
            id="avatar-ball"
            onClick={handleAvatarClick}
            title="Clique no avatar do seu login para inserir foto da galeria"
            aria-label="Clique no avatar do seu login para inserir foto da galeria"
            className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 shadow-sm shrink-0 overflow-hidden cursor-pointer ring-1 ring-neutral-700 hover:ring-amber-400 hover:scale-105 transition-all focus:outline-none"
          >
            {renderAvatarContent()}
            
            {/* Indicador de câmera no hover para avisar que abre a galeria */}
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4 text-amber-300 drop-shadow" />
            </div>
          </button>

          {/* 2. Cobertura: Se falando, cobre EVANGELHO ETERNO, ONLINE e 1 com Avatar+Login e falando - 0:47 */}
          {isSpeaking ? (
            <div id="header-speaking-active" className="flex items-center gap-2.5 animate-in fade-in duration-150">
              {/* Segundo Avatar: Avatar do Operador/Login que está falando (clique abre aba flutuante grande) */}
              <button
                type="button"
                onClick={handleSpeakerAvatarClick}
                title="Clique para ver a foto em tamanho grande"
                aria-label={`Ver foto de ${speakerName} em tamanho grande`}
                className="relative w-10 h-10 rounded-full bg-neutral-800 border-2 border-red-500 flex items-center justify-center overflow-hidden shrink-0 shadow-[0_0_12px_rgba(239,68,68,0.6)] cursor-pointer hover:scale-105 transition-transform"
              >
                {speakerAvatar && (speakerAvatar.startsWith('data:') || speakerAvatar.startsWith('http') || speakerAvatar.startsWith('blob:')) ? (
                  <img src={speakerAvatar} alt={speakerName} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <User className="w-5 h-5 text-red-400" />
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping ring-2 ring-neutral-900" />
              </button>

              {/* Login e Linha falando - 0:47 */}
              <div className="flex flex-col text-left justify-center">
                <span className="font-tactical font-bold text-xs sm:text-sm text-neutral-100 uppercase tracking-wide leading-tight">
                  {speakerName}
                </span>
                <span className="text-[10px] sm:text-xs font-mono-code text-red-400 font-semibold leading-none mt-0.5">
                  falando - {formatTimeSeconds(txTime)}
                </span>
              </div>
            </div>
          ) : (
            /* Estado Normal: EVANGELHO ETERNO e ONLINE */
            <div className="flex flex-col justify-center">
              <h1
                id="header-app-name"
                className="font-tactical font-bold text-sm sm:text-base tracking-wider text-neutral-100 uppercase leading-snug"
              >
                EVANGELHO ETERNO
              </h1>
              <div
                id="header-online-status"
                className="flex items-center gap-1.5 text-[10px] sm:text-xs font-tactical font-semibold tracking-wider leading-none"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                <span className="text-blue-400 font-bold">ONLINE:</span>
                <span className="text-white dark:text-white font-bold">
                  {onlineCount}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Direita: Três Pontinhos (somente na aba RÁDIO) */}
        {activeTab === 'RADIO' && (
          <div className="relative" ref={menuRef}>
            <button
              id="top-header-three-dots-btn"
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`p-1.5 text-neutral-400 hover:text-neutral-200 active:scale-95 transition-colors rounded-lg ${
                isMenuOpen ? 'bg-neutral-800 text-white' : 'hover:bg-neutral-800/60'
              }`}
              aria-label="Mais opções"
              aria-expanded={isMenuOpen}
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Aba Flutuante Branca de Cantos Arredondados */}
            {isMenuOpen && (
              <div
                id="floating-options-menu"
                className="absolute right-0 top-full mt-2 w-48 sm:w-52 bg-white text-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
              >
                {/* DISPONÍVEL (AZUL) */}
                <button
                  id="menu-opt-disponivel"
                  type="button"
                  onClick={() => handleSelectOption('DISPONIVEL')}
                  className={`w-full px-4 py-2.5 text-left text-xs sm:text-sm font-tactical font-bold tracking-wider flex items-center justify-between transition-colors ${
                    effectiveAvailability === 'DISPONIVEL'
                      ? 'bg-blue-50 text-blue-700 border-y border-blue-200/60'
                      : 'text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                    <span className={effectiveAvailability === 'DISPONIVEL' ? 'text-blue-700' : 'text-neutral-900'}>
                      DISPONÍVEL
                    </span>
                  </div>
                  {effectiveAvailability === 'DISPONIVEL' && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </button>

                {/* OCUPADO (LARANJA) */}
                <button
                  id="menu-opt-ocupado"
                  type="button"
                  onClick={() => handleSelectOption('OCUPADO')}
                  className={`w-full px-4 py-2.5 text-left text-xs sm:text-sm font-tactical font-bold tracking-wider flex items-center justify-between transition-colors ${
                    effectiveAvailability === 'OCUPADO'
                      ? 'bg-orange-50 text-orange-700 border-y border-orange-200/60'
                      : 'text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
                    <span className={effectiveAvailability === 'OCUPADO' ? 'text-orange-700' : 'text-neutral-900'}>
                      OCUPADO
                    </span>
                  </div>
                  {effectiveAvailability === 'OCUPADO' && (
                    <Clock className="w-4 h-4 text-orange-600" />
                  )}
                </button>

                <div className="my-1 border-t border-neutral-100" />

                {/* DESCONECTAR */}
                <button
                  id="menu-opt-desconectar"
                  type="button"
                  onClick={() => handleSelectOption('DESCONECTAR')}
                  className="w-full px-4 py-2.5 text-left text-xs sm:text-sm font-tactical font-bold tracking-wider text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-500 shrink-0" />
                  <span>DESCONECTAR</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Direita: Lixeira para Excluir Áudios e Mensagens (somente na aba CHAT) */}
        {activeTab === 'CHAT' && (
          <button
            id="chat-clear-trash-btn"
            type="button"
            onClick={onClearChat}
            title="Excluir áudios e mensagens"
            aria-label="Excluir áudios e mensagens"
            className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800/80 active:scale-95 transition-all rounded-lg flex items-center justify-center"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </header>
    </div>
  );
};

