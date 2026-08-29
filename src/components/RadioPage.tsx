import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Play,
  RotateCcw,
  Activity,
  Sliders,
  Sparkles,
  Search,
  RadioTower,
  Headphones
} from 'lucide-react';
import { Channel, RadioUser, Transmission, AudioSettings } from '../types';
import { RADIO_CHANNELS } from '../data/channels';
import { soundEffects } from '../services/audioEffects';

interface RadioPageProps {
  currentChannel: Channel;
  onSelectChannel: (channel: Channel) => void;
  currentUser: RadioUser;
  onlineUsers: RadioUser[];
  isTransmitting: boolean;
  onStartTransmission: () => void;
  onStopTransmission: () => void;
  incomingSpeaker: string | null;
  audioSettings: AudioSettings;
  onUpdateAudioSettings: (settings: Partial<AudioSettings>) => void;
  transmissions: Transmission[];
  onTriggerEmergency: () => void;
  micAnalyser: AnalyserNode | null;
}

export const RadioPage: React.FC<RadioPageProps> = ({
  currentChannel,
  onSelectChannel,
  currentUser,
  onlineUsers,
  isTransmitting,
  onStartTransmission,
  onStopTransmission,
  incomingSpeaker,
  audioSettings,
  onUpdateAudioSettings,
  transmissions,
  onTriggerEmergency,
  micAnalyser,
}) => {
  const [isLockedPtt, setIsLockedPtt] = useState(false);
  const [txTimer, setTxTimer] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTabSub, setActiveTabSub] = useState<'DEVICE' | 'CHANNELS' | 'LOGS'>('DEVICE');
  const [playingTxId, setPlayingTxId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Transmission timer
  useEffect(() => {
    let interval: number | null = null;
    if (isTransmitting) {
      setTxTimer(0);
      interval = window.setInterval(() => {
        setTxTimer((prev) => prev + 0.1);
      }, 100);
    } else {
      setTxTimer(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTransmitting]);

  // Frequency Scanner simulation
  useEffect(() => {
    let scanInterval: number | null = null;
    if (isScanning) {
      scanInterval = window.setInterval(() => {
        const randomIndex = Math.floor(Math.random() * RADIO_CHANNELS.length);
        onSelectChannel(RADIO_CHANNELS[randomIndex]);
        soundEffects.playSquelch(40, 0.15);
      }, 900);
    }
    return () => {
      if (scanInterval) clearInterval(scanInterval);
    };
  }, [isScanning, onSelectChannel]);

  // Real-time Canvas Waveform / Spectrum LCD visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localAnalyser = micAnalyser;
    const dataArray = new Uint8Array(localAnalyser ? localAnalyser.frequencyBinCount : 64);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Background subtle grid
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 12) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (isTransmitting && micAnalyser) {
        // Active TX: draw real microphone frequency bars & waveform
        micAnalyser.getByteFrequencyData(dataArray);

        const barWidth = (width / dataArray.length) * 2.2;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const barHeight = (dataArray[i] / 255) * (height * 0.85);

          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, '#15803d');
          gradient.addColorStop(0.6, '#4ade80');
          gradient.addColorStop(1, '#ef4444');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

          x += barWidth;
        }

        // Center line
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;
          ctx.lineTo((i * width) / dataArray.length, y);
        }
        ctx.stroke();
      } else if (incomingSpeaker) {
        // Incoming RX: Simulated radio frequency waves
        const time = Date.now() * 0.008;
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 8;
        ctx.beginPath();

        for (let x = 0; x < width; x += 3) {
          const y = height / 2 + Math.sin(x * 0.08 + time) * 18 * Math.cos(x * 0.03 + time * 0.5);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Idle standby noise floor
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const time = Date.now() * 0.002;
        for (let x = 0; x < width; x += 4) {
          const jitter = (Math.random() - 0.5) * 3;
          const y = height / 2 + Math.sin(x * 0.05 + time) * 3 + jitter;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isTransmitting, incomingSpeaker, micAnalyser]);

  // Channel navigation
  const currentIndex = RADIO_CHANNELS.findIndex((c) => c.id === currentChannel.id);
  const handlePrevChannel = () => {
    soundEffects.playPttClick(false);
    const prevIndex = (currentIndex - 1 + RADIO_CHANNELS.length) % RADIO_CHANNELS.length;
    onSelectChannel(RADIO_CHANNELS[prevIndex]);
  };

  const handleNextChannel = () => {
    soundEffects.playPttClick(false);
    const nextIndex = (currentIndex + 1) % RADIO_CHANNELS.length;
    onSelectChannel(RADIO_CHANNELS[nextIndex]);
  };

  // PTT Handlers
  const handlePttDown = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (isTransmitting) return;
    soundEffects.playPttClick(true);
    onStartTransmission();
  };

  const handlePttUp = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!isLockedPtt && isTransmitting) {
      soundEffects.playPttClick(false);
      onStopTransmission();
    }
  };

  const togglePttLock = () => {
    soundEffects.playPttClick(true);
    if (isLockedPtt) {
      setIsLockedPtt(false);
      if (isTransmitting) {
        onStopTransmission();
      }
    } else {
      setIsLockedPtt(true);
      if (!isTransmitting) {
        onStartTransmission();
      }
    }
  };

  const channelUsers = onlineUsers.filter((u) => u.channelId === currentChannel.id);
  const channelTransmissions = transmissions.filter((t) => t.channelId === currentChannel.id);

  const handlePlayVoice = (tx: Transmission) => {
    if (!tx.audioData) return;
    setPlayingTxId(tx.id);
    soundEffects.playRadioTransmission(tx.audioData, () => {
      setPlayingTxId(null);
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-3 py-6 space-y-6">
      
      {/* Top Banner Alert for Incoming Transmission */}
      {incomingSpeaker && (
        <div className="bg-emerald-950/90 border-2 border-emerald-500 rounded-xl p-3.5 flex items-center justify-between shadow-lg shadow-emerald-500/10 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Headphones className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <span className="text-xs font-mono-code font-bold text-emerald-400 uppercase tracking-widest block">
                [RECEBENDO ÁUDIO NA FREQUÊNCIA]
              </span>
              <span className="text-sm font-tactical font-bold text-neutral-100">
                Operador <span className="text-emerald-300 underline">{incomingSpeaker}</span> está falando no {currentChannel.code}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded bg-emerald-500 text-neutral-950 text-xs font-mono-code font-bold">
              RX ATIVO
            </span>
          </div>
        </div>
      )}

      {/* Sub-navigation tabs on radio page */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTabSub('DEVICE')}
            className={`px-4 py-1.5 rounded-lg text-xs font-tactical font-bold transition-all ${
              activeTabSub === 'DEVICE'
                ? 'bg-neutral-800 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            DISPOSITIVO WALKIE TALKIE
          </button>
          <button
            onClick={() => setActiveTabSub('CHANNELS')}
            className={`px-4 py-1.5 rounded-lg text-xs font-tactical font-bold transition-all ${
              activeTabSub === 'CHANNELS'
                ? 'bg-neutral-800 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            SELETOR DE CANAIS ({RADIO_CHANNELS.length})
          </button>
          <button
            onClick={() => setActiveTabSub('LOGS')}
            className={`px-4 py-1.5 rounded-lg text-xs font-tactical font-bold transition-all ${
              activeTabSub === 'LOGS'
                ? 'bg-neutral-800 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            GRAVAÇÕES DO CANAL ({channelTransmissions.length})
          </button>
        </div>

        {/* Quick Scan Button */}
        <button
          onClick={() => {
            soundEffects.playPttClick(true);
            setIsScanning(!isScanning);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-code font-semibold border transition-all ${
            isScanning
              ? 'bg-amber-500 text-neutral-950 border-amber-400 animate-pulse font-bold'
              : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>{isScanning ? 'ESCANEANDO...' : 'SCAN FREQUÊNCIAS'}</span>
        </button>
      </div>

      {activeTabSub === 'DEVICE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Tactical Walkie-Talkie Chassis (Left & Center) */}
          <div className="lg:col-span-8 bg-neutral-900/90 border-2 border-neutral-800 rounded-3xl p-6 relative shadow-2xl overflow-hidden">
            
            {/* Top Antenna and Knobs visual representation */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-10 bg-neutral-800 rounded-t-sm border-x border-neutral-700 relative">
                  <div className="w-1.5 h-12 bg-neutral-600 rounded-t mx-auto -mt-6 border-t border-neutral-500" />
                </div>
                <div>
                  <span className="text-[11px] font-mono-code text-neutral-400 uppercase tracking-wider block">
                    TRANSCEPTOR MIL-SPEC
                  </span>
                  <span className="text-xs font-tactical font-bold text-neutral-200">
                    VHF/UHF DUAL BAND 5W
                  </span>
                </div>
              </div>

              {/* Status Leds */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full transition-all ${isTransmitting ? 'bg-red-500 shadow-md shadow-red-500 animate-ping opacity-100' : 'bg-transparent border-transparent opacity-0'}`} />
                  <span className="text-[10px] font-mono-code font-bold text-neutral-400">TX</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full transition-all ${incomingSpeaker ? 'bg-emerald-500 shadow-md shadow-emerald-500 animate-ping opacity-100' : 'bg-transparent border-transparent opacity-0'}`} />
                  <span className="text-[10px] font-mono-code font-bold text-neutral-400">RX</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-md shadow-amber-500" />
                  <span className="text-[10px] font-mono-code font-bold text-neutral-400">PWR</span>
                </div>
              </div>
            </div>

            {/* Tactical LCD Screen */}
            <div className="lcd-screen-bg border-2 border-neutral-700/80 rounded-2xl p-5 mb-6 text-emerald-400 shadow-inner relative">
              
              {/* LCD Top Status Bar */}
              <div className="flex items-center justify-between text-xs font-lcd border-b border-emerald-900/60 pb-2 mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold tracking-widest text-emerald-300">
                    {isTransmitting ? '● TX TRANSMIT' : incomingSpeaker ? '▲ RX RECEIVE' : '■ STANDBY QAP'}
                  </span>
                  <span className="text-emerald-600">|</span>
                  <span className="text-emerald-400">{currentChannel.code}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-emerald-500">CTCSS 67.0Hz</span>
                  <span className="text-emerald-400 font-bold">SQL: {audioSettings.squelchLevel}%</span>
                  <span className="text-emerald-300 font-bold">VOL: {audioSettings.volume}%</span>
                </div>
              </div>

              {/* LCD Main Frequency Display */}
              <div className="flex flex-col md:flex-row items-baseline justify-between gap-2 my-2">
                <div>
                  <div className="text-3xl md:text-5xl font-lcd font-bold tracking-wider lcd-glow-green text-emerald-300">
                    {currentChannel.frequency}
                  </div>
                  <div className="text-sm font-lcd tracking-wide text-emerald-400 mt-1 uppercase font-semibold">
                    CANAL {currentChannel.id}: {currentChannel.name}
                  </div>
                </div>

                {/* Signal RSSI Meter */}
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-lcd text-emerald-500 uppercase tracking-widest mb-1">
                    SINAL RSSI
                  </span>
                  <div className="flex items-end gap-1">
                    {[1, 2, 3, 4, 5].map((bar) => (
                      <div
                        key={bar}
                        className={`w-2.5 rounded-xs transition-all ${
                          bar <= currentUser.signalStrength
                            ? bar > 3
                              ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                              : 'bg-emerald-500'
                            : 'bg-emerald-950'
                        }`}
                        style={{ height: `${bar * 5 + 4}px` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* LCD Waveform / Spectrum Visualizer */}
              <div className="mt-3 relative rounded-lg overflow-hidden border border-emerald-900/80 bg-black/40">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={90}
                  className="w-full h-20 md:h-24 block"
                />
                
                {/* Overlay live text inside LCD */}
                <div className="absolute top-2 left-3 text-[11px] font-lcd text-emerald-300/80 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  <span>
                    {isTransmitting
                      ? `TRANSMITINDO VOZ (${txTimer.toFixed(1)}s)`
                      : incomingSpeaker
                      ? `RECEBENDO DE: ${incomingSpeaker}`
                      : `CANAL LIVRE // ${channelUsers.length} OPERADORES NA FREQUÊNCIA`}
                  </span>
                </div>
              </div>

              {/* LCD Description footer */}
              <div className="mt-3 text-[11px] font-lcd text-emerald-400/80 flex items-center justify-between">
                <span>{currentChannel.description}</span>
                {currentChannel.isEncrypted && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[10px] text-emerald-300 font-bold">
                    CRIPTOGRAFADO
                  </span>
                )}
              </div>
            </div>

            {/* Hardware PTT & Channel Selector Area */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              
              {/* Channel Stepper Knobs (Left) */}
              <div className="sm:col-span-4 bg-neutral-950/70 p-4 rounded-2xl border border-neutral-800 flex flex-col items-center justify-center gap-3">
                <span className="text-[11px] font-mono-code font-bold text-neutral-400 uppercase tracking-wider">
                  CANAL / FREQUÊNCIA
                </span>

                <div className="flex items-center gap-3 w-full justify-between">
                  <button
                    id="btn-prev-channel"
                    onClick={handlePrevChannel}
                    className="p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 active:scale-95 transition-all border border-neutral-700 shadow-md"
                    title="Canal Anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="text-center">
                    <span className="text-2xl font-tactical font-bold text-amber-400 block">
                      {currentChannel.code}
                    </span>
                    <span className="text-[10px] font-mono-code text-neutral-400">
                      CH {currentChannel.id} / 12
                    </span>
                  </div>

                  <button
                    id="btn-next-channel"
                    onClick={handleNextChannel}
                    className="p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 active:scale-95 transition-all border border-neutral-700 shadow-md"
                    title="Próximo Canal"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="w-full pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono-code text-neutral-400">
                  <span>Operadores ativos:</span>
                  <span className="text-emerald-400 font-bold">{channelUsers.length}</span>
                </div>
              </div>

              {/* Big Tactical PUSH-TO-TALK Button (Center & Right) */}
              <div className="sm:col-span-8 flex flex-col items-center justify-center gap-3 bg-neutral-950/70 p-5 rounded-2xl border border-neutral-800">
                
                <div className="w-full flex items-center justify-between">
                  <span className="text-[11px] font-mono-code text-neutral-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    ATALHO: <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200 text-[10px] border border-neutral-700">ESPAÇO</kbd>
                  </span>

                  {/* PTT Lock Toggle */}
                  <button
                    id="btn-lock-ptt"
                    onClick={togglePttLock}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono-code font-bold transition-all border ${
                      isLockedPtt
                        ? 'bg-red-500 text-white border-red-400 shadow-md shadow-red-500/30'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                    }`}
                  >
                    {isLockedPtt ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{isLockedPtt ? 'PTT TRAVADO (TX CONTÍNUO)' : 'TRAVAR PTT'}</span>
                  </button>
                </div>

                {/* Primary PTT Button with hold gesture */}
                <div className="relative my-2">
                  {/* Glowing ring when transmitting */}
                  {isTransmitting && (
                    <div className="absolute -inset-3 rounded-full bg-red-500/30 animate-ping pointer-events-none" />
                  )}

                  <button
                    id="btn-push-to-talk"
                    onMouseDown={handlePttDown}
                    onMouseUp={handlePttUp}
                    onTouchStart={handlePttDown}
                    onTouchEnd={handlePttUp}
                    className={`relative w-44 h-44 rounded-full flex flex-col items-center justify-center select-none cursor-pointer transition-all active:scale-95 shadow-2xl border-4 ${
                      isTransmitting
                        ? 'bg-gradient-to-b from-red-600 to-red-800 border-red-400 text-white shadow-red-500/50 scale-95'
                        : 'bg-gradient-to-b from-neutral-800 to-neutral-950 border-neutral-700 text-amber-400 hover:border-amber-500/60 hover:text-amber-300'
                    }`}
                  >
                    <div className="p-3 rounded-full bg-black/30 mb-1">
                      {isTransmitting ? (
                        <Mic className="w-10 h-10 animate-bounce text-white" />
                      ) : (
                        <Radio className="w-9 h-9" />
                      )}
                    </div>
                    <span className="font-tactical font-extrabold text-xl tracking-wider uppercase">
                      {isTransmitting ? 'TRANSMITINDO' : 'PUSH TO TALK'}
                    </span>
                    <span className="text-[10px] font-mono-code text-neutral-300 uppercase mt-0.5">
                      {isTransmitting ? `${txTimer.toFixed(1)}s (FALE AGORA)` : 'SEGURE P/ FALAR'}
                    </span>
                  </button>
                </div>

                <div className="text-[11px] font-mono-code text-neutral-400 text-center">
                  {isTransmitting ? (
                    <span className="text-red-400 font-bold animate-pulse">
                      ● MICROFONE ATIVO — TRANSMITINDO AO VIVO NO CANAL
                    </span>
                  ) : (
                    <span>Pressione e segure o botão ou use a barra de espaço para falar</span>
                  )}
                </div>

              </div>

            </div>

            {/* Tactical Dials & Controls (Bottom) */}
            <div className="mt-5 pt-4 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Volume Slider */}
              <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between text-xs font-mono-code text-neutral-400 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    VOLUME
                  </span>
                  <span className="text-neutral-200 font-bold">{audioSettings.volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={audioSettings.volume}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onUpdateAudioSettings({ volume: val });
                    soundEffects.setMasterVolume(val);
                  }}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                />
              </div>

              {/* Squelch Slider */}
              <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between text-xs font-mono-code text-neutral-400 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    SQUELCH (SILENCIADOR)
                  </span>
                  <span className="text-neutral-200 font-bold">{audioSettings.squelchLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={audioSettings.squelchLevel}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onUpdateAudioSettings({ squelchLevel: val });
                  }}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                />
              </div>

              {/* Roger Beep & Audio Filter Quick Badges */}
              <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono-code text-neutral-400 block uppercase">
                    ROGER BEEP
                  </span>
                  <span className="text-xs font-tactical font-bold text-amber-400 uppercase">
                    {audioSettings.rogerBeepType}
                  </span>
                </div>
                <button
                  onClick={() => soundEffects.playRogerBeep(audioSettings.rogerBeepType)}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono-code border border-neutral-700"
                  title="Testar som do Roger Beep"
                >
                  Testar Beep
                </button>
              </div>

            </div>

          </div>

          {/* Right Sidebar: Active Channel Operators & Quick Info */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Active Operators on Channel Card */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <RadioTower className="w-4 h-4 text-emerald-400" />
                  <span className="font-tactical font-bold text-sm text-neutral-200 uppercase tracking-wide">
                    Operadores na Frequência
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-xs font-mono-code font-bold border border-emerald-800">
                  {channelUsers.length} QAP
                </span>
              </div>

              {channelUsers.length === 0 ? (
                <div className="py-6 text-center text-neutral-500 text-xs font-mono-code">
                  Nenhum outro operador conectado nesta frequência no momento.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {channelUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        user.id === currentUser.id
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                          : user.isTransmitting
                          ? 'bg-red-950/60 border-red-500/60 text-red-300 animate-pulse'
                          : 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center font-tactical font-bold text-xs text-neutral-200 border border-neutral-700">
                          {user.callSign.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-tactical font-bold text-sm">
                              {user.callSign}
                            </span>
                            {user.id === currentUser.id && (
                              <span className="text-[10px] font-mono-code text-amber-400 font-bold">
                                (VOCÊ)
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono-code text-neutral-400 block">
                            {user.role}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {user.isTransmitting ? (
                          <span className="px-2 py-0.5 rounded bg-red-500 text-white text-[10px] font-mono-code font-bold animate-pulse">
                            TX FALANDO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-neutral-800 text-emerald-400 text-[10px] font-mono-code font-bold">
                            {user.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Emergency SOS Broadcast Button */}
            <div className="bg-red-950/40 border-2 border-red-900/80 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-2.5 mb-2">
                <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
                <span className="font-tactical font-bold text-sm text-red-400 uppercase tracking-wide">
                  Canal de Emergência / SOS
                </span>
              </div>
              <p className="text-xs text-neutral-400 mb-3 font-mono-code">
                Dispara um alerta sonoro de socorro para todos os operadores conectados em qualquer frequência.
              </p>
              <button
                id="btn-broadcast-emergency"
                onClick={onTriggerEmergency}
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-tactical font-bold text-sm tracking-wider uppercase transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>DISPARAR ALERTA SOS</span>
              </button>
            </div>

            {/* Channel Recent Audio Log */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
                <span className="font-tactical font-bold text-xs text-neutral-300 uppercase">
                  Última Transmissão no Canal
                </span>
                <span className="text-[10px] font-mono-code text-neutral-500">
                  {channelTransmissions.length} gravadas
                </span>
              </div>

              {channelTransmissions.length === 0 ? (
                <p className="text-xs font-mono-code text-neutral-500 py-3 text-center">
                  Nenhum áudio transmitido ainda neste canal.
                </p>
              ) : (
                <div className="space-y-2">
                  {channelTransmissions.slice(-3).reverse().map((tx) => (
                    <div
                      key={tx.id}
                      className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2 text-xs font-mono-code"
                    >
                      <div>
                        <span className="text-amber-400 font-bold block">{tx.senderCallSign}</span>
                        <span className="text-[10px] text-neutral-500">
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} ({Math.round(tx.duration)}s)
                        </span>
                      </div>
                      {tx.audioData && (
                        <button
                          onClick={() => handlePlayVoice(tx)}
                          disabled={playingTxId === tx.id}
                          className={`p-2 rounded-lg transition-all ${
                            playingTxId === tx.id
                              ? 'bg-emerald-500 text-neutral-950 font-bold'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                          }`}
                          title="Ouvir gravação"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* SUB-VIEW 2: CHANNELS SELECTION GRID */}
      {activeTabSub === 'CHANNELS' && (
        <div className="space-y-4">
          <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800">
            <h3 className="font-tactical font-bold text-base text-neutral-100 uppercase tracking-wide mb-1">
              Frequências e Canais Disponíveis (VHF/UHF)
            </h3>
            <p className="text-xs font-mono-code text-neutral-400">
              Selecione uma frequência para sintonizar seu transceptor Walkie Talkie.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {RADIO_CHANNELS.map((ch) => {
              const isActive = ch.id === currentChannel.id;
              const count = onlineUsers.filter((u) => u.channelId === ch.id).length;

              return (
                <div
                  key={ch.id}
                  onClick={() => {
                    soundEffects.playPttClick(true);
                    onSelectChannel(ch);
                    setActiveTabSub('DEVICE');
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-500 text-neutral-100 shadow-lg shadow-amber-500/10 scale-[1.02]'
                      : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:bg-neutral-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded bg-neutral-800 text-amber-400 font-mono-code font-bold text-xs border border-amber-500/20">
                      {ch.code}
                    </span>
                    <div className="flex items-center gap-2">
                      {ch.isEmergency && (
                        <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 text-[10px] font-mono-code font-bold border border-red-800">
                          SOS
                        </span>
                      )}
                      <span className="text-[11px] font-mono-code text-emerald-400">
                        {count} online
                      </span>
                    </div>
                  </div>

                  <h4 className="font-tactical font-bold text-base text-neutral-100 mb-1">
                    {ch.name}
                  </h4>
                  <div className="text-sm font-lcd font-bold text-emerald-400 mb-2">
                    {ch.frequency}
                  </div>
                  <p className="text-xs text-neutral-400 font-mono-code">
                    {ch.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs font-tactical font-bold">
                    <span className={isActive ? 'text-amber-400' : 'text-neutral-500'}>
                      {isActive ? '● CANAL SINTONIZADO' : 'CLIQUE PARA SINTONIZAR'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: AUDIO RECORDINGS LOG */}
      {activeTabSub === 'LOGS' && (
        <div className="space-y-4">
          <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="font-tactical font-bold text-base text-neutral-100 uppercase tracking-wide">
                Histórico de Transmissões de Áudio ({channelTransmissions.length})
              </h3>
              <p className="text-xs font-mono-code text-neutral-400">
                Transmissões gravadas no canal {currentChannel.code} ({currentChannel.frequency})
              </p>
            </div>
            <button
              onClick={() => soundEffects.playSquelch(100, 0.2)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono-code text-neutral-300 border border-neutral-700"
            >
              Testar Squelch
            </button>
          </div>

          {channelTransmissions.length === 0 ? (
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-500 font-mono-code text-sm">
              Nenhuma gravação de áudio encontrada para este canal. Segure o botão PTT para transmitir!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {channelTransmissions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-tactical font-bold">
                      {tx.senderCallSign.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-tactical font-bold text-neutral-100 block">
                        {tx.senderCallSign}
                      </span>
                      <span className="text-xs font-mono-code text-neutral-400">
                        {new Date(tx.timestamp).toLocaleString()} • {Math.round(tx.duration)}s
                      </span>
                    </div>
                  </div>

                  {tx.audioData && (
                    <button
                      onClick={() => handlePlayVoice(tx)}
                      disabled={playingTxId === tx.id}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono-code font-bold transition-all ${
                        playingTxId === tx.id
                          ? 'bg-emerald-500 text-neutral-950 animate-pulse'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{playingTxId === tx.id ? 'REPRODUZINDO...' : 'OUVIR'}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
