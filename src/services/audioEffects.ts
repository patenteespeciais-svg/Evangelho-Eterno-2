import { RogerBeepType } from '../types';

class SoundEffectsService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMasterVolume(volumePercent: number) {
    if (this.masterGain && this.ctx) {
      const clamped = Math.max(0, Math.min(1, volumePercent / 100));
      this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }
  }

  // Tactical click when PTT button is pressed
  public playPttClick(isPress: boolean) {
    try {
      const ctx = this.initContext();
      if (!ctx || !this.masterGain) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = isPress ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isPress ? 600 : 400, now);
      osc.frequency.exponentialRampToValueAtTime(isPress ? 120 : 80, now + 0.04);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  // Realistic Squelch noise burst (radio static tail)
  public playSquelch(durationMs = 90, volume = 0.25) {
    try {
      const ctx = this.initContext();
      if (!ctx || !this.masterGain) return;

      const bufferSize = Math.floor(ctx.sampleRate * (durationMs / 1000));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Generate pink/white noise
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // boost
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // Bandpass filter for authentic radio noise
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 1.5;

      const gain = ctx.createGain();
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (durationMs / 1000));

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noiseSource.start(now);
      noiseSource.stop(now + (durationMs / 1000));
    } catch {
      // Audio context might be restricted
    }
  }

  // Distinct Roger Beep signatures
  public playRogerBeep(type: RogerBeepType) {
    if (type === 'none') return;
    try {
      const ctx = this.initContext();
      if (!ctx || !this.masterGain) return;
      const now = ctx.currentTime;

      switch (type) {
        case 'quindar': {
          // Classic Apollo/NASA Quindar Outro Beep (2475 Hz for ~250ms)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(2475, now);
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
          gain.gain.setValueAtTime(0.4, now + 0.22);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.25);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.26);
          break;
        }

        case 'motorola': {
          // 2-tone melodic Motorola style roger chirp (1100 Hz -> 1500 Hz)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1100, now);
          osc.frequency.setValueAtTime(1500, now + 0.08);

          gain.gain.setValueAtTime(0.35, now);
          gain.gain.setValueAtTime(0.35, now + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.19);
          break;
        }

        case 'military': {
          // 3-tone fast tactical burst
          const tones = [880, 1174, 1480];
          tones.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const tStart = now + idx * 0.05;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, tStart);
            gain.gain.setValueAtTime(0.3, tStart);
            gain.gain.exponentialRampToValueAtTime(0.001, tStart + 0.045);

            osc.connect(gain);
            gain.connect(this.masterGain!);
            osc.start(tStart);
            osc.stop(tStart + 0.05);
          });
          break;
        }

        case 'sonar': {
          // Resonant ping
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1850, now);
          osc.frequency.exponentialRampToValueAtTime(1600, now + 0.3);

          gain.gain.setValueAtTime(0.45, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.36);
          break;
        }

        case 'classic':
        default: {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1000, now);

          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.13);
          break;
        }
      }
    } catch {
      // Silently catch audio restrictions
    }
  }

  // Emergency SOS broadcast siren
  public playEmergencySiren() {
    try {
      const ctx = this.initContext();
      if (!ctx || !this.masterGain) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';

      // 3 pulses
      for (let i = 0; i < 3; i++) {
        const t = now + i * 0.35;
        osc.frequency.setValueAtTime(650, t);
        osc.frequency.linearRampToValueAtTime(1200, t + 0.15);
        osc.frequency.linearRampToValueAtTime(650, t + 0.3);
      }

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.setValueAtTime(0.4, now + 1.0);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2500;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 1.2);
    } catch {
      // Audio context restricted
    }
  }

  // Create real-time audio pipeline with Walkie-Talkie Bandpass and Mic Visualizer
  public createMicrophonePipeline(
    stream: MediaStream,
    enableVintageFilter: boolean,
    micGainValue: number
  ): {
    analyser: AnalyserNode;
    destinationStream: MediaStream;
    cleanup: () => void;
  } {
    const ctx = this.initContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;

    const gainNode = ctx.createGain();
    gainNode.gain.value = micGainValue;

    let destinationNode: AudioNode = gainNode;

    if (enableVintageFilter) {
      // Authentic Walkie-Talkie Bandpass (350Hz - 3400Hz telephone/tactical filter)
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 350;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 3400;

      // Slight peak at 2000Hz for voice clarity
      const peak = ctx.createBiquadFilter();
      peak.type = 'peaking';
      peak.frequency.value = 2100;
      peak.gain.value = 4.0;
      peak.Q.value = 1.2;

      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(peak);
      peak.connect(gainNode);
    } else {
      source.connect(gainNode);
    }

    gainNode.connect(analyser);

    // Create stream destination for MediaRecorder or WebRTC
    const destination = ctx.createMediaStreamDestination();
    gainNode.connect(destination);

    return {
      analyser,
      destinationStream: destination.stream,
      cleanup: () => {
        try {
          source.disconnect();
          gainNode.disconnect();
          analyser.disconnect();
        } catch {
          // ignore
        }
      },
    };
  }

  private currentRadioAudio: HTMLAudioElement | null = null;

  public stopCurrentRadioTransmission() {
    if (this.currentRadioAudio) {
      try {
        this.currentRadioAudio.pause();
        this.currentRadioAudio.currentTime = 0;
        this.currentRadioAudio.onended = null;
      } catch {
        // ignore
      }
      this.currentRadioAudio = null;
    }
  }

  // Play audio buffer/blob with optional walkie-talkie filter & squelch tail
  public async playRadioTransmission(audioDataUrl: string, onEnded?: () => void) {
    try {
      this.stopCurrentRadioTransmission();
      this.playSquelch(70, 0.2); // Initial squelch open
      
      const audio = new Audio(audioDataUrl);
      this.currentRadioAudio = audio;
      audio.volume = 0.95;
      
      audio.onended = () => {
        this.playSquelch(110, 0.3); // Ending squelch burst
        this.currentRadioAudio = null;
        if (onEnded) onEnded();
      };
      
      await audio.play();
    } catch {
      this.currentRadioAudio = null;
      if (onEnded) onEnded();
    }
  }
}

export const soundEffects = new SoundEffectsService();
