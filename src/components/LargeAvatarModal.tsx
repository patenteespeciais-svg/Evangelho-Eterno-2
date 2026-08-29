import React, { useEffect } from 'react';
import { X, Camera, User, Shield, CheckCircle2, Clock, Crown, Sparkles } from 'lucide-react';
import { formatLoginTitleCase } from '../utils/formatUtils';

export interface LargeAvatarUserData {
  callSign: string;
  avatar?: string | null;
  role?: string;
  isOnline?: boolean;
  availability?: 'DISPONIVEL' | 'OCUPADO' | string;
  isMe?: boolean;
}

interface LargeAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: LargeAvatarUserData | null;
  onTriggerUpload?: () => void;
}

export const LargeAvatarModal: React.FC<LargeAvatarModalProps> = ({
  isOpen,
  onClose,
  userData,
  onTriggerUpload,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !userData) return null;

  const isPhoto = Boolean(
    userData.avatar &&
      (userData.avatar.startsWith('data:') ||
        userData.avatar.startsWith('http') ||
        userData.avatar.startsWith('blob:'))
  );

  const isOccupied = userData.availability === 'OCUPADO';

  return (
    <div
      id="large-avatar-modal-overlay"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="large-avatar-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm sm:max-w-md bg-neutral-900 border border-neutral-700/90 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/80 relative overflow-hidden flex flex-col items-center animate-in zoom-in-95 duration-150"
      >
        {/* Top Header Controls */}
        <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            {userData.role === 'Administrador' ? (
              <span className="flex items-center gap-1 text-[10px] font-tactical font-bold text-amber-400 bg-amber-950/70 border border-amber-500/50 px-2 py-0.5 rounded uppercase tracking-wider">
                <Crown className="w-3 h-3" />
                ADMINISTRADOR
              </span>
            ) : userData.role === 'Moderador' ? (
              <span className="text-[10px] font-tactical font-bold text-blue-400 bg-blue-950/70 border border-blue-500/50 px-2 py-0.5 rounded uppercase tracking-wider">
                MODERADOR
              </span>
            ) : userData.role === 'Usuário' ? (
              <span className="text-[10px] font-tactical font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/50 px-2 py-0.5 rounded uppercase tracking-wider">
                USUÁRIO
              </span>
            ) : (
              <span className="text-[10px] font-tactical font-bold text-neutral-400 bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded uppercase tracking-wider">
                OPERADOR
              </span>
            )}

            {userData.isMe && (
              <span className="text-[10px] font-mono-code font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">
                (Seu Perfil)
              </span>
            )}
          </div>

          <button
            id="close-large-avatar-btn"
            type="button"
            onClick={onClose}
            title="Fechar"
            aria-label="Fechar visualização de foto"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Large Avatar Photo Presentation */}
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl sm:rounded-3xl border-2 border-neutral-700 bg-neutral-950 shadow-[0_0_30px_rgba(0,0,0,0.9)] overflow-hidden flex items-center justify-center group mb-4">
          {isPhoto ? (
            <img
              src={userData.avatar!}
              alt={userData.callSign}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 text-neutral-400">
              <div className="w-20 h-20 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 shadow-inner">
                {userData.role === 'Administrador' ? (
                  <Shield className="w-10 h-10 text-neutral-300" />
                ) : (
                  <User className="w-10 h-10 text-neutral-300" />
                )}
              </div>
              <span className="text-xs font-mono-code text-neutral-500 uppercase tracking-wide">
                Sem foto personalizada
              </span>
            </div>
          )}

          {/* Status badge pinned on bottom right of photo */}
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-neutral-900/90 backdrop-blur-sm border border-neutral-700 flex items-center gap-1.5 shadow-md">
            <span
              className={`w-2 h-2 rounded-full ${
                isOccupied
                  ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.9)]'
                  : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse'
              }`}
            />
            <span className="text-[10px] font-tactical font-bold text-neutral-200 uppercase tracking-wide">
              {isOccupied ? 'OCUPADO' : 'DISPONÍVEL'}
            </span>
          </div>
        </div>

        {/* User Info Details */}
        <div className="w-full flex flex-col items-center text-center space-y-1 mb-4">
          <h3
            id="large-avatar-callsign"
            className="font-tactical font-bold text-lg sm:text-xl text-neutral-100 tracking-wider"
          >
            {formatLoginTitleCase(userData.callSign)}
          </h3>
          <div className="flex items-center gap-2 text-xs font-mono-code text-neutral-400">
            <span>Frequência QAP</span>
            <span>•</span>
            <span className="text-neutral-300">Canal Ativo</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-2 mt-1">
          {userData.isMe && onTriggerUpload && (
            <button
              id="change-photo-from-modal-btn"
              type="button"
              onClick={() => {
                onTriggerUpload();
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-tactical font-bold text-xs sm:text-sm uppercase tracking-wide transition-all shadow-md shadow-amber-500/20 active:scale-98"
            >
              <Camera className="w-4 h-4" />
              <span>Inserir Foto da Galeria</span>
            </button>
          )}

          <button
            id="dismiss-large-avatar-btn"
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-tactical font-bold text-xs sm:text-sm uppercase tracking-wide transition-all border border-neutral-700 active:scale-98"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
