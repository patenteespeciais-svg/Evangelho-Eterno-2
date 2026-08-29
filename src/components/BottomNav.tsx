import React from 'react';
import { Radio, User, MessageSquare } from 'lucide-react';
import { NavigationTab } from '../types';
import { AudioIntensityMeter } from './AudioIntensityMeter';

interface BottomNavProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  unreadChatCount?: number;
  isAudioActive?: boolean;
  audioLevel?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  unreadChatCount = 0,
  isAudioActive = false,
  audioLevel = 0,
}) => {
  const handleTabClick = (tab: NavigationTab) => {
    setActiveTab(tab);
  };

  return (
    <div
      id="bottom-navigation-container"
      className="fixed bottom-7 sm:bottom-9 inset-x-0 z-40 px-4 pointer-events-none select-none flex flex-col items-center"
    >
      <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center">
        {/* Luzes de intensidade de áudio (VU Meter LEDs) exibidas exclusivamente na aba RADIO */}
        {activeTab === 'RADIO' && (
          <AudioIntensityMeter isActive={isAudioActive} audioLevel={audioLevel} />
        )}

        <nav
          id="bottom-navigation-menu"
          aria-label="Navegação Inferior"
          className="w-full bg-neutral-950/95 border border-neutral-800/80 backdrop-blur-xl p-1 rounded-xl shadow-xl shadow-black/70 pointer-events-auto ring-1 ring-white/5 relative z-10"
        >
          <div className="flex items-center justify-between gap-1">
            {/* TAB 1: RADIO */}
            <button
              id="bottom-tab-radio"
              type="button"
              onClick={() => handleTabClick('RADIO')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-tactical text-[11px] sm:text-xs font-bold tracking-wider ${
                activeTab === 'RADIO'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>RADIO</span>
            </button>

            {/* TAB 2: USUÁRIO */}
            <button
              id="bottom-tab-usuario"
              type="button"
              onClick={() => handleTabClick('USUARIO')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-tactical text-[11px] sm:text-xs font-bold tracking-wider ${
                activeTab === 'USUARIO'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>USUÁRIO</span>
            </button>

            {/* TAB 3: CHAT */}
            <button
              id="bottom-tab-chat"
              type="button"
              onClick={() => handleTabClick('CHAT')}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-tactical text-[11px] sm:text-xs font-bold tracking-wider ${
                activeTab === 'CHAT'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>CHAT</span>
              {unreadChatCount > 0 && activeTab !== 'CHAT' && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white font-mono-code text-[9px] flex items-center justify-center font-bold animate-pulse">
                  {unreadChatCount}
                </span>
              )}
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

