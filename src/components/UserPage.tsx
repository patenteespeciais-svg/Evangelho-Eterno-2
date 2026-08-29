import React, { useState, useRef } from 'react';
import { Shield, ShieldAlert, User, Users, UserCheck, Crown, AlertTriangle, VolumeX } from 'lucide-react';
import { RadioUser } from '../types';
import { AdminUserActionMenu, AdminActionType } from './AdminUserActionMenu';
import { processImageFile } from '../utils/imageUtils';
import { formatLoginTitleCase } from '../utils/formatUtils';
import { LargeAvatarUserData } from './LargeAvatarModal';

interface UserPageProps {
  isAdminLoggedIn: boolean;
  adminAvatar?: string | null;
  currentUser: RadioUser;
  onlineUsers?: RadioUser[];
  userRoles?: Record<string, string>;
  silencedUsers?: string[];
  alertedUsers?: string[];
  userAvailabilityMap?: Record<string, 'DISPONIVEL' | 'OCUPADO'>;
  myAvailability?: 'DISPONIVEL' | 'OCUPADO';
  onSelectUserAction?: (action: AdminActionType, userCallSign: string) => void;
  onUpdateAdminAvatar?: (photoUrl: string) => void;
  onUpdateUserAvatar?: (photoUrl: string) => void;
  onOpenLargeAvatar?: (userData: LargeAvatarUserData) => void;
}

export const UserPage: React.FC<UserPageProps> = ({
  isAdminLoggedIn,
  adminAvatar,
  currentUser,
  onlineUsers = [],
  userRoles = {},
  silencedUsers = [],
  alertedUsers = [],
  userAvailabilityMap = {},
  myAvailability = 'DISPONIVEL',
  onSelectUserAction,
  onUpdateAdminAvatar,
  onUpdateUserAvatar,
  onOpenLargeAvatar,
}) => {
  const [selectedUserForAction, setSelectedUserForAction] = useState<string | null>(null);
  const userFileInputRef = useRef<HTMLInputElement>(null);

  // Consolidate all users (online users + current user + default mock users if empty)
  const myCallSign = isAdminLoggedIn ? 'Salvador Silva' : (currentUser.callSign || 'Operador 42');

  const baseUsersList = [
    ...onlineUsers.filter((u) => u.callSign !== 'Salvador Silva'),
    ...(!onlineUsers.some((u) => u.callSign === myCallSign) && myCallSign !== 'Salvador Silva'
      ? [{ ...currentUser, callSign: myCallSign }]
      : []),
    ...(onlineUsers.length === 0 && !isAdminLoggedIn
      ? [
          { id: 'usr-default-1', callSign: 'Operador 42', role: 'Visitante' },
          { id: 'usr-default-2', callSign: 'Operador 43', role: 'Visitante' },
        ]
      : []),
  ].filter((v, i, a) => a.findIndex((t) => t.callSign === v.callSign) === i);

  // Group users by effective role (from userRoles map or user object)
  const getUserRole = (callSign: string, defaultRole = 'Visitante'): string => {
    return userRoles[callSign] || defaultRole;
  };

  const adminUsers = baseUsersList.filter((u) => getUserRole(u.callSign) === 'Administrador');
  const moderatorUsers = baseUsersList.filter((u) => getUserRole(u.callSign) === 'Moderador');
  const regularUsers = baseUsersList.filter((u) => getUserRole(u.callSign) === 'Usuário');
  const visitorUsers = baseUsersList.filter(
    (u) => {
      const role = getUserRole(u.callSign);
      return role === 'Visitante' || (!['Administrador', 'Moderador', 'Usuário'].includes(role));
    }
  );

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
        console.error('Erro ao selecionar foto:', err);
      }
    }
    e.target.value = '';
  };

  const handleAvatarClick = (
    e: React.MouseEvent,
    userCallSign: string,
    userAvatar?: string | null,
    role = 'Usuário',
    availability: 'DISPONIVEL' | 'OCUPADO' = 'DISPONIVEL'
  ) => {
    e.stopPropagation();
    const isMe = userCallSign === myCallSign;
    if (isMe) {
      userFileInputRef.current?.click();
    } else if (onOpenLargeAvatar) {
      onOpenLargeAvatar({
        callSign: formatLoginTitleCase(userCallSign),
        avatar: userAvatar,
        role: role,
        isOnline: true,
        availability: availability,
        isMe: false,
      });
    }
  };

  const renderUserCard = (
    user: { id?: string; callSign: string; avatar?: string },
    badgeColor: string,
    badgeText: string,
    roleCategory: string
  ) => {
    const isSilenced = silencedUsers.includes(user.callSign);
    const isAlerted = alertedUsers.includes(user.callSign);
    const isMe = user.callSign === myCallSign;
    const effectiveAvailability = userAvailabilityMap[user.callSign] || (isMe ? myAvailability : 'DISPONIVEL');
    const isOccupied = effectiveAvailability === 'OCUPADO';

    const effectiveAvatar = isMe && !isAdminLoggedIn && currentUser.avatar
      ? currentUser.avatar
      : user.avatar;

    const formattedLogin = formatLoginTitleCase(user.callSign);

    return (
      <div key={user.id || user.callSign} className="relative">
        <div
          onClick={() => {
            if (isAdminLoggedIn) {
              setSelectedUserForAction((prev) => (prev === user.callSign ? null : user.callSign));
            }
          }}
          className={`w-full border-y px-4 sm:px-6 py-2 flex items-center justify-between transition-colors shadow-sm ${
            isSilenced
              ? 'bg-red-950/30 border-red-800/60 hover:bg-red-950/40'
              : isAlerted
              ? 'bg-orange-950/30 border-orange-800/60 hover:bg-orange-950/40'
              : isOccupied
              ? 'bg-orange-950/20 border-neutral-800/80 hover:bg-neutral-900/90'
              : 'bg-neutral-900/60 border-neutral-800/80 hover:bg-neutral-900/90'
          } ${isAdminLoggedIn ? 'cursor-pointer active:bg-neutral-800' : ''}`}
        >
          <div className="flex items-center gap-3">
            {/* Avatar Ball */}
            <button
              type="button"
              onClick={(e) => handleAvatarClick(e, user.callSign, effectiveAvatar, roleCategory, effectiveAvailability)}
              title={isMe ? 'Clique para inserir/alterar foto do seu login na galeria' : `Clique para ver a foto de ${formattedLogin} em tamanho grande`}
              className={`relative w-8 h-8 rounded-full border flex items-center justify-center text-neutral-300 shrink-0 overflow-hidden cursor-pointer hover:scale-110 transition-transform ${
                isSilenced
                  ? 'bg-red-950 border-red-500 text-red-400'
                  : isAlerted
                  ? 'bg-orange-950 border-orange-500 text-orange-400'
                  : isOccupied
                  ? 'bg-neutral-800 border-orange-500/60 text-orange-300'
                  : 'bg-neutral-800 border-neutral-700'
              }`}
            >
              {effectiveAvatar && (effectiveAvatar.startsWith('data:') || effectiveAvatar.startsWith('http') || effectiveAvatar.startsWith('blob:')) ? (
                <img src={effectiveAvatar} alt={formattedLogin} className="w-full h-full object-cover rounded-full" />
              ) : (
                <User className="w-4 h-4" />
              )}
              <span
                className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-neutral-900 ${
                  isSilenced
                    ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]'
                    : isAlerted
                    ? 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]'
                    : isOccupied
                    ? 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]'
                    : 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]'
                }`}
              />
            </button>

            {/* Nome e Status */}
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-tactical font-bold text-xs sm:text-sm text-neutral-200 tracking-wide leading-tight">
                  {formattedLogin}
                </span>
                {isMe && !isAdminLoggedIn && (
                  <span className="text-[9px] font-mono-code text-neutral-400 bg-neutral-800 px-1 rounded">
                    (Você)
                  </span>
                )}
                {badgeText && (
                  <span
                    className={`text-[9px] font-tactical font-bold uppercase px-1.5 py-0.2 rounded border ${badgeColor}`}
                  >
                    {badgeText}
                  </span>
                )}
                {isSilenced && (
                  <span className="text-[9px] font-tactical font-bold text-red-400 bg-red-950/80 border border-red-600/60 px-1.5 py-0.2 rounded flex items-center gap-1">
                    <VolumeX className="w-2.5 h-2.5" />
                    SILENCIADO
                  </span>
                )}
                {isAlerted && !isSilenced && (
                  <span className="text-[9px] font-tactical font-bold text-orange-400 bg-orange-950/80 border border-orange-600/60 px-1.5 py-0.2 rounded flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    ALERTADO
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-mono-code font-medium ${
                  isSilenced
                    ? 'text-red-400'
                    : isAlerted
                    ? 'text-orange-400'
                    : isOccupied
                    ? 'text-orange-400'
                    : 'text-blue-400'
                }`}
              >
                {isSilenced
                  ? 'Transmissão Bloqueada'
                  : isAlerted
                  ? 'Aviso de Moderação'
                  : isOccupied
                  ? 'Ocupado'
                  : 'Disponível'}
              </span>
            </div>
          </div>

          {isAdminLoggedIn && (
            <span className="text-[10px] font-tactical font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase">
              Gerenciar
            </span>
          )}
        </div>

        {/* Floating action menu for Admin */}
        {isAdminLoggedIn && selectedUserForAction === user.callSign && (
          <div className="px-4 sm:px-6 py-2 bg-neutral-950/90 border-b border-neutral-800">
            <AdminUserActionMenu
              targetUserCallSign={user.callSign}
              onSelectAction={(action, name) => {
                if (onSelectUserAction) {
                  onSelectUserAction(action, name);
                }
                setSelectedUserForAction(null);
              }}
              onClose={() => setSelectedUserForAction(null)}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="user-page-container" className="w-full h-full pb-8 select-none animate-in fade-in duration-200">
      {/* Input oculto para carregar foto da galeria */}
      <input
        ref={userFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="w-full flex flex-col space-y-4 text-left">
        {/* 1. SEÇÃO ADMINISTRADOR */}
        <section id="section-admin" className="w-full flex flex-col space-y-2">
          {/* Tarja fina de ponta a ponta sem destaque */}
          <div className="w-full bg-neutral-900 border-y border-neutral-800 px-4 sm:px-6 py-1 flex items-center gap-2 shadow-sm">
            <Crown className="w-4 h-4 text-neutral-400 shrink-0" />
            <h2 className="font-tactical font-bold text-xs sm:text-sm tracking-wider text-neutral-300 uppercase">
              ADMINISTRADOR
            </h2>
          </div>

          {/* Área do Administrador: Salvador Silva quando logado, vazia quando não logado */}
          <div className="min-h-[44px]">
            {isAdminLoggedIn ? (
              <div className="w-full">
                <div
                  id="admin-user-card"
                  className="w-full bg-neutral-900/60 border-y border-neutral-800/80 px-4 sm:px-6 py-2 flex items-center gap-3 hover:bg-neutral-900/90 transition-colors shadow-sm"
                >
                  {/* Avatar Salvador Silva */}
                  <button
                    type="button"
                    onClick={(e) => handleAvatarClick(e, 'Salvador Silva', adminAvatar, 'Administrador', 'DISPONIVEL')}
                    title={isAdminLoggedIn ? 'Clique para inserir/alterar sua foto na galeria' : 'Clique para ver a foto de Salvador Silva em tamanho grande'}
                    className="relative w-9 h-9 rounded-full bg-neutral-800 border-2 border-neutral-600 flex items-center justify-center overflow-hidden shrink-0 shadow-sm cursor-pointer hover:scale-110 transition-transform"
                  >
                    {adminAvatar ? (
                      <img
                        src={adminAvatar}
                        alt="Salvador Silva"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <Shield className="w-4 h-4 text-neutral-400" />
                    )}
                    {/* Status Online dot */}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-neutral-900 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                  </button>

                  {/* Dados do Administrador */}
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-tactical font-bold text-xs sm:text-sm text-neutral-100 tracking-wide">
                        Salvador Silva
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-neutral-800 border border-neutral-700 text-[9px] font-tactical font-bold text-neutral-300 uppercase">
                        ADMIN
                      </span>
                    </div>
                    <span className="text-[10px] font-mono-code text-neutral-400">
                      Status: Online
                    </span>
                  </div>
                </div>
              </div>
            ) : adminUsers.length === 0 ? (
              /* Quando não logado esta área fica vazia */
              <div className="px-4 sm:px-6 py-1 text-xs font-mono-code text-neutral-600 italic">
                (Área desocupada no momento)
              </div>
            ) : null}

            {/* Any users promoted to Administrator */}
            {adminUsers.map((user) =>
              renderUserCard(
                user,
                'text-amber-400 bg-amber-950/60 border-amber-500/40',
                'ADMIN',
                'Administrador'
              )
            )}
          </div>
        </section>

        {/* 2. SEÇÃO MODERADORES */}
        <section id="section-moderators" className="w-full flex flex-col space-y-2">
          {/* Tarja fina de ponta a ponta sem destaque */}
          <div className="w-full bg-neutral-900 border-y border-neutral-800 px-4 sm:px-6 py-1 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-neutral-400 shrink-0" />
              <h2 className="font-tactical font-bold text-xs sm:text-sm tracking-wider text-neutral-300 uppercase">
                MODERADORES
              </h2>
            </div>
            {moderatorUsers.length > 0 && (
              <span className="text-xs font-mono-code text-neutral-500 font-bold">
                ({moderatorUsers.length})
              </span>
            )}
          </div>

          <div className="min-h-[36px]">
            {moderatorUsers.length > 0 ? (
              <div className="w-full flex flex-col space-y-1">
                {moderatorUsers.map((mod) =>
                  renderUserCard(
                    mod,
                    'text-cyan-400 bg-cyan-950/60 border-cyan-500/40',
                    'MODERADOR',
                    'Moderador'
                  )
                )}
              </div>
            ) : (
              <div className="px-4 sm:px-6 py-1 text-xs font-mono-code text-neutral-600 italic">
                (Nenhum moderador no momento)
              </div>
            )}
          </div>
        </section>

        {/* 3. SEÇÃO USUÁRIOS */}
        <section id="section-users" className="w-full flex flex-col space-y-2">
          {/* Tarja fina de ponta a ponta sem destaque */}
          <div className="w-full bg-neutral-900 border-y border-neutral-800 px-4 sm:px-6 py-1 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-neutral-400 shrink-0" />
              <h2 className="font-tactical font-bold text-xs sm:text-sm tracking-wider text-neutral-300 uppercase">
                USUÁRIOS
              </h2>
            </div>
            {regularUsers.length > 0 && (
              <span className="text-xs font-mono-code text-neutral-500 font-bold">
                ({regularUsers.length})
              </span>
            )}
          </div>

          <div className="min-h-[36px]">
            {regularUsers.length > 0 ? (
              <div className="w-full flex flex-col space-y-1">
                {regularUsers.map((usr) =>
                  renderUserCard(
                    usr,
                    'text-emerald-400 bg-emerald-950/60 border-emerald-500/40',
                    'USUÁRIO',
                    'Usuário'
                  )
                )}
              </div>
            ) : (
              <div className="px-4 sm:px-6 py-1 text-xs font-mono-code text-neutral-600 italic">
                (Nenhum usuário no momento)
              </div>
            )}
          </div>
        </section>

        {/* 4. SEÇÃO VISITANTES */}
        <section id="section-visitors" className="w-full flex flex-col space-y-2">
          {/* Tarja fina de ponta a ponta sem destaque */}
          <div className="w-full bg-neutral-900 border-y border-neutral-800 px-4 sm:px-6 py-1 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-400 shrink-0" />
              <h2 className="font-tactical font-bold text-xs sm:text-sm tracking-wider text-neutral-300 uppercase">
                VISITANTES
              </h2>
            </div>
            <span className="text-xs font-mono-code text-neutral-500 font-bold">
              ({visitorUsers.length})
            </span>
          </div>

          {/* Tarja do login operador de ponta a ponta da direita a esquerda */}
          <div className="min-h-[44px]">
            {visitorUsers.length > 0 ? (
              <div className="w-full flex flex-col space-y-1">
                {visitorUsers.map((visitor) =>
                  renderUserCard(
                    visitor,
                    '',
                    '',
                    'Visitante'
                  )
                )}
              </div>
            ) : (
              <div className="px-4 sm:px-6 py-1 text-xs font-mono-code text-neutral-600 italic">
                (Nenhum visitante conectado no momento)
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};


