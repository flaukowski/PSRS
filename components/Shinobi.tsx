import { motion, useAnimation } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useDimensionalMusic } from "@/contexts/DimensionalMusicContext";
import { useAccount } from "wagmi";
import { PlayCircle, PauseCircle, Loader2 } from "lucide-react";

export function Shinobi() {
  const { 
    currentTrack, 
    isPlaying, 
    isLoading,
    togglePlay,
    playTrack,
    playlist,
    harmonicAlignment 
  } = useMusicPlayer();

  const {
    currentDimension,
    dimensionalState,
    isDimensionallyAligned
  } = useDimensionalMusic();

  const { address } = useAccount();
  const controls = useAnimation();
  const animationFrameRef = useRef(0);
  const [freqData, setFreqData] = useState<Uint8Array | null>(null);

  // Handle dimensional animations
  useEffect(() => {
    if (isDimensionallyAligned && isPlaying) {
      animateDimensionalShift();
    }
  }, [currentDimension, isDimensionallyAligned, isPlaying]);

  const getDimensionalEffects = () => {
    const { entropy, harmonicAlignment, dimensionalShift } = dimensionalState;
    return {
      scale: 1 + (entropy * 0.1),
      rotate: dimensionalShift * 45,
      opacity: harmonicAlignment
    };
  };

  const animateDimensionalShift = async () => {
    await controls.start({
      scale: [1, 1.2, 0.8, 1],
      rotate: [0, 180, 360, 0],
      transition: { duration: 2, ease: "easeInOut" }
    });
  };

  // Render the Shinobi audio controller
  return (
    <motion.div
      className="fixed bottom-8 right-8 z-50"
      animate={getDimensionalEffects()}
    >
      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
      >
        <motion.button
          className={`rounded-full p-4 ${
            currentDimension !== 'prime' ? 'dimensional-glow' : ''
          } ${
            isPlaying ? 'bg-primary' : 'bg-muted'
          } text-primary-foreground hover:bg-primary/90 disabled:opacity-50`}
          onClick={() => togglePlay()}
          disabled={!address || (!currentTrack && playlist.length === 0)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : isPlaying ? (
            <PauseCircle className="h-8 w-8" />
          ) : (
            <PlayCircle className="h-8 w-8" />
          )}
        </motion.button>

        {currentTrack && (
          <motion.div
            className="absolute left-full ml-4 bg-background/95 backdrop-blur-sm p-4 rounded-lg shadow-lg pointer-events-auto"
            style={{
              width: "max-content",
              maxWidth: "300px",
              top: "50%",
              transform: "translateY(-50%)",
              borderColor: `var(--${currentDimension}-border)`,
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="text-sm font-medium">{currentTrack.title}</p>
            <p className="text-xs text-muted-foreground">{currentTrack.artist}</p>
            {harmonicAlignment !== 1 && (
              <p className="text-xs text-primary mt-1">
                Harmonic Alignment: {(harmonicAlignment * 100).toFixed(0)}%
              </p>
            )}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}