import React from 'react';
import { Radio, User, MessageSquare, Wifi, WifiOff, Battery, Volume2, ShieldAlert } from 'lucide-react';
import { NavigationTab, RadioUser, Channel } from '../types';

interface NavbarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  currentUser: RadioUser;
  currentChannel: Channel;
  isConnected: boolean;
  isTransmitting: boolean;
  incomingSpeaker: string | null;
  unreadChatCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  currentChannel,
  isConnected,
  isTransmitting,
  incomingSpeaker,
  unreadChatCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-neutral-950/95 border-b border-neutral-800/80 backdrop-blur-md px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: App Title & Hardware Tag */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 shadow-inner">
              <Radio className="w-5 h-5 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-neutral-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-tactical font-bold text-base tracking-wider text-neutral-100 uppercase">
                  Walkie Talkie
                </span>
                <span className="text-[10px] font-mono-code font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-amber-400 border border-amber-500/20">
                  PTT-PRO
                </span>
              </div>
              <p className="text-[11px] font-mono-code text-neutral-400 flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">{currentChannel.code}</span>
                <span>•</span>
                <span className="text-neutral-300">{currentChannel.frequency}</span>
              </p>
            </div>
          </div>

          {/* Live Audio Status Mobile Indicator */}
          <div className="md:hidden flex items-center gap-2">
            {isTransmitting ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/80 border border-red-500 text-red-400 text-xs font-mono-code font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                TX
              </span>
            ) : incomingSpeaker ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-500 text-emerald-400 text-xs font-mono-code font-bold animate-pulse">
                <Volume2 className="w-3.5 h-3.5" />
                RX
              </span>
            ) : null}
          </div>
        </div>

        {/* Center: Main Navigation Menu Tabs [RADIO / USUÁRIO / CHAT] */}
        <nav
          id="main-nav-menu"
          aria-label="Menu Principal"
          className="flex items-center bg-neutral-900/90 p-1 rounded-xl border border-neutral-800 w-full md:w-auto justify-center"
        >
          <button
            id="tab-btn-radio"
            onClick={() => setActiveTab('RADIO')}
            className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-tactical font-bold tracking-wide transition-all ${
              activeTab === 'RADIO'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>RADIO</span>
          </button>

          <button
            id="tab-btn-usuario"
            onClick={() => setActiveTab('USUARIO')}
            className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-tactical font-bold tracking-wide transition-all ${
              activeTab === 'USUARIO'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>USUÁRIO</span>
          </button>

          <button
            id="tab-btn-chat"
            onClick={() => setActiveTab('CHAT')}
            className={`relative flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-tactical font-bold tracking-wide transition-all ${
              activeTab === 'CHAT'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>CHAT</span>
            {unreadChatCount > 0 && activeTab !== 'CHAT' && (
              <span className="ml-1 px-1.5 py-0.2 bg-red-500 text-white text-[10px] font-bold rounded-full animate-bounce">
                {unreadChatCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right: Device Telemetry & Live TX/RX state */}
        <div className="hidden md:flex items-center gap-3">
          {/* TX / RX Live pill */}
          {isTransmitting ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-950/70 border border-red-500/80 rounded-md text-red-400 text-xs font-mono-code font-bold shadow-sm shadow-red-500/20 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-md shadow-red-500" />
              <span>TRANSMITINDO (TX)</span>
            </div>
          ) : incomingSpeaker ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/70 border border-emerald-500/80 rounded-md text-emerald-400 text-xs font-mono-code font-bold shadow-sm shadow-emerald-500/20 animate-pulse">
              <Volume2 className="w-4 h-4" />
              <span className="truncate max-w-[120px]">RECEBENDO (RX)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-md text-neutral-400 text-xs font-mono-code">
              <span className="w-2 h-2 rounded-full bg-neutral-600" />
              <span>STANDBY (QAP)</span>
            </div>
          )}

          {/* User CallSign Badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-xs font-mono-code">
            <span className="text-amber-400 font-bold">{currentUser.callSign}</span>
            <span className="text-neutral-500">|</span>
            <span className={`font-semibold ${currentUser.status === 'EMERGENCY' ? 'text-red-400' : 'text-emerald-400'}`}>
              {currentUser.status}
            </span>
          </div>

          {/* Connection & Battery Telemetry */}
          <div className="flex items-center gap-2 text-neutral-400 text-xs font-mono-code bg-neutral-900/80 px-2.5 py-1 rounded-md border border-neutral-800">
            {isConnected ? (
              <span className="flex items-center gap-1 text-emerald-400" title="WebSocket Conectado">
                <Wifi className="w-3.5 h-3.5" />
                <span className="text-[11px]">ONLINE</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-500" title="Reconectando / Sincronizado localmente">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="text-[11px]">SYNC</span>
              </span>
            )}
            <span className="text-neutral-700">|</span>
            <div className="flex items-center gap-1 text-neutral-300">
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentUser.batteryLevel}%</span>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};
