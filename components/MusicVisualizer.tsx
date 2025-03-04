import { useEffect, useRef } from "react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { WaveformVisualizer } from "./WaveformVisualizer";

export function MusicVisualizer() {
  const { currentTrack } = useMusicPlayer();

  if (!currentTrack) return null;

  return (
    <div className="relative h-full overflow-hidden">
      {/* Background Logo */}
      <div
        className="absolute inset-0 z-10 opacity-15"
        style={{
          backgroundImage: 'url("/neo_token_logo_flaukowski.png")',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(4px)',
        }}
      />

      {/* Content */}
      <div className="relative z-20 flex items-center justify-center h-full">
        {/* Waveform Section */}
        <div className="w-full max-w-3xl px-6">
          <WaveformVisualizer />
        </div>
      </div>
    </div>
  );
}