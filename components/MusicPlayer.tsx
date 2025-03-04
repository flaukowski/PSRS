import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Wifi, WifiOff, Radio } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useMusicSync } from "@/contexts/MusicSyncContext";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";

export function MusicPlayer() {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    isRadioMode,
    switchToRadio
  } = useMusicPlayer();

  const { syncEnabled, toggleSync } = useMusicSync();

  // Don't show the floating player if no track is loaded
  if (!currentTrack) return null;

  return (
    <Card className="fixed bottom-4 right-4 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border shadow-lg w-72 z-50">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{currentTrack?.title}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {isRadioMode ? "Live Radio" : currentTrack?.artist}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Radio Mode Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={switchToRadio}
                  className={isRadioMode ? "text-primary" : "text-muted-foreground"}
                >
                  <Radio className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isRadioMode ? "Currently in radio mode" : "Switch to radio"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* WebSocket Sync Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleSync}
                  className={syncEnabled ? "text-primary" : "text-muted-foreground"}
                >
                  {syncEnabled ? (
                    <Wifi className="h-4 w-4" />
                  ) : (
                    <WifiOff className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {syncEnabled ? "Disable sync" : "Enable sync"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Play/Pause Button */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isPlaying ? 'playing' : 'paused'}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={togglePlay}
                className="relative"
              >
                {isPlaying ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
}