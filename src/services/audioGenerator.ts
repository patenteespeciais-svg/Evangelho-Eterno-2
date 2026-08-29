/**
 * Generates a playable radio transmission audio WAV blob for offline/fallback recordings.
 */
export function generateRadioAudioWav(durationSeconds: number): string {
  const sampleRate = 22050;
  const clampedDuration = Math.max(1, Math.min(600, durationSeconds));
  const numSamples = Math.floor(sampleRate * clampedDuration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Generate tactical radio voice carrier + harmonic modulation
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Voice modulation frequency (380Hz - 760Hz) with subtle white noise carrier
    const carrier = Math.sin(2 * Math.PI * 480 * t) * 0.25 + Math.sin(2 * Math.PI * 720 * t) * 0.12;
    const voiceMod = Math.sin(2 * Math.PI * 4 * t) * 0.1;
    const noise = (Math.random() * 2 - 1) * 0.05;
    
    // Smooth attack and release envelope
    const attack = Math.min(1, t * 15);
    const release = Math.min(1, (clampedDuration - t) * 15);
    const envelope = attack * release;
    
    const sample = Math.max(-1, Math.min(1, (carrier + voiceMod + noise) * envelope));
    view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  const blob = new Blob([view], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export function formatTimeSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
