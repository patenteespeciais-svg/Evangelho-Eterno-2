import React from 'react';

export interface AudioIntensityMeterProps {
  isActive: boolean; // True when mic is on (speaking) or when receiving (listening)
  audioLevel: number; // 0 to 100 (percentage intensity)
}

/**
 * AudioIntensityMeter
 *
 * Symmetrical VU Meter spanning edge-to-edge across the bottom menu bar:
 * - Reduced vertical height (~6-7px, half size).
 * - Extended ~6mm horizontal bar segments with ~1mm gap, reaching all the way to both sides.
 * - Center: 2 Blue LEDs lit constantly when active (mic open or listening).
 * - Symmetrical expansion outward as volume increases (Blue).
 * - Extreme lateral ends: 2 Red LEDs on each side for audio excess / peak volume.
 */
export const AudioIntensityMeter: React.FC<AudioIntensityMeterProps> = ({
  isActive,
  audioLevel,
}) => {
  // Determine activation tier:
  // tier 0: baseline center 2 LEDs (mic on / rx active)
  // tier 1: +2 each side (low/normal voice, >= 15%)
  // tier 2: +4 each side (medium voice, >= 40%)
  // tier 3: +6 each side (loud voice, >= 68%)
  // tier 4: 2 RED on each extreme flank (excess/peak sound, >= 85%)
  let tier = 0;
  if (isActive) {
    if (audioLevel >= 85) {
      tier = 4;
    } else if (audioLevel >= 68) {
      tier = 3;
    } else if (audioLevel >= 40) {
      tier = 2;
    } else if (audioLevel >= 15) {
      tier = 1;
    } else {
      tier = 0;
    }
  }

  // 16 LED segments spanning from far Left (0) to far Right (15)
  // Index 0, 1: Red Flank (Excess Left)
  // Index 2: Outer Left Blue
  // Index 3, 4: Mid Left Blue
  // Index 5, 6: Inner Left Blue
  // Index 7, 8: Center Blue (Base)
  // Index 9, 10: Inner Right Blue
  // Index 11, 12: Mid Right Blue
  // Index 13: Outer Right Blue
  // Index 14, 15: Red Flank (Excess Right)
  const leds = [
    { id: 'l-red-0', isRed: true, requiredTier: 4, label: 'Excess Left 1' },
    { id: 'l-red-1', isRed: true, requiredTier: 4, label: 'Excess Left 2' },
    { id: 'l-blue-2', isRed: false, requiredTier: 3, label: 'Outer Left' },
    { id: 'l-blue-3', isRed: false, requiredTier: 2, label: 'Mid Left 1' },
    { id: 'l-blue-4', isRed: false, requiredTier: 2, label: 'Mid Left 2' },
    { id: 'l-blue-5', isRed: false, requiredTier: 1, label: 'Inner Left 1' },
    { id: 'l-blue-6', isRed: false, requiredTier: 1, label: 'Inner Left 2' },
    { id: 'c-blue-7', isRed: false, requiredTier: 0, label: 'Center Left' },
    { id: 'c-blue-8', isRed: false, requiredTier: 0, label: 'Center Right' },
    { id: 'r-blue-9', isRed: false, requiredTier: 1, label: 'Inner Right 1' },
    { id: 'r-blue-10', isRed: false, requiredTier: 1, label: 'Inner Right 2' },
    { id: 'r-blue-11', isRed: false, requiredTier: 2, label: 'Mid Right 1' },
    { id: 'r-blue-12', isRed: false, requiredTier: 2, label: 'Mid Right 2' },
    { id: 'r-blue-13', isRed: false, requiredTier: 3, label: 'Outer Right' },
    { id: 'r-red-14', isRed: true, requiredTier: 4, label: 'Excess Right 1' },
    { id: 'r-red-15', isRed: true, requiredTier: 4, label: 'Excess Right 2' },
  ];

  return (
    <div
      id="audio-intensity-meter-bar"
      className={`w-full flex flex-col items-center justify-center pointer-events-none select-none transition-opacity duration-150 ${
        isActive ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* LED Strip Housing spanning the full width of the bottom menu bar */}
      <div
        className={`w-full flex items-center justify-between gap-[3px] sm:gap-[3.5px] px-2.5 py-1 rounded-t-lg transition-all duration-150 ${
          isActive
            ? 'bg-neutral-950/95 border-t border-x border-neutral-800/80 backdrop-blur-xl shadow-lg shadow-black/70'
            : 'bg-transparent border-transparent shadow-none'
        }`}
        style={{
          borderBottom: 'none',
          marginBottom: '-1px', // Seamlessly glued to the bottom navigation bar
        }}
      >
        {leds.map((led) => {
          const isLit = isActive && tier >= led.requiredTier;

          return (
            <div
              key={led.id}
              title={led.label}
              className={`flex-1 h-[6px] sm:h-[7px] rounded-[1.5px] transition-all duration-75 ${
                isLit
                  ? led.isRed
                    ? 'bg-red-600 border border-red-600 shadow-[0_0_10px_#ef4444,0_0_4px_#dc2626] opacity-100'
                    : 'bg-blue-600 border border-blue-600 shadow-[0_0_10px_#2563eb,0_0_4px_#1d4ed8] opacity-100'
                  : 'bg-transparent border-transparent shadow-none opacity-0'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
