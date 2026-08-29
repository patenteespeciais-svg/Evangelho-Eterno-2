import React from 'react';
import { ShieldAlert, Volume2, X, Radio } from 'lucide-react';
import { soundEffects } from '../services/audioEffects';

interface EmergencyModalProps {
  alertData: {
    senderCallSign: string;
    channelId: number;
    timestamp: number;
    messageText?: string;
  } | null;
  onDismiss: () => void;
  onTuneInChannel: (channelId: number) => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  alertData,
  onDismiss,
  onTuneInChannel,
}) => {
  if (!alertData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="max-w-md w-full bg-neutral-950 border-2 border-red-500 rounded-3xl p-6 shadow-2xl shadow-red-500/40 relative overflow-hidden animate-pulse">
        
        {/* Top visual warning stripe */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500">
              <ShieldAlert className="w-7 h-7 animate-bounce" />
            </div>
            <div>
              <span className="text-xs font-mono-code font-bold text-red-400 uppercase tracking-widest block">
                PRIORIDADE ZERO // ALERTA
              </span>
              <h3 className="text-xl font-tactical font-bold text-neutral-100 uppercase">
                SOS Disparado no Rádio
              </h3>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-2 rounded-xl bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-red-950/40 border border-red-900/80 rounded-2xl p-4 my-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono-code text-neutral-300">
            <span>OPERADOR EMISSOR:</span>
            <strong className="text-amber-400 text-sm">{alertData.senderCallSign}</strong>
          </div>
          <div className="flex items-center justify-between text-xs font-mono-code text-neutral-300">
            <span>CANAL / FREQUÊNCIA:</span>
            <strong className="text-emerald-400">CH-{alertData.channelId}</strong>
          </div>
          <div className="flex items-center justify-between text-xs font-mono-code text-neutral-300">
            <span>HORÁRIO:</span>
            <span>{new Date(alertData.timestamp).toLocaleTimeString()}</span>
          </div>
          {alertData.messageText && (
            <p className="text-xs font-mono-code text-neutral-200 pt-2 border-t border-red-900/60">
              {alertData.messageText}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button
            onClick={() => {
              soundEffects.playPttClick(true);
              onTuneInChannel(alertData.channelId);
              onDismiss();
            }}
            className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-tactical font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-red-600/30 flex items-center justify-center gap-2"
          >
            <Radio className="w-4 h-4" />
            <span>SINTONIZAR CANAL</span>
          </button>

          <button
            onClick={onDismiss}
            className="py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-tactical font-bold text-xs tracking-wider uppercase border border-neutral-700 transition-all"
          >
            CONFIRMAR & FECHAR
          </button>
        </div>

      </div>
    </div>
  );
};
