import { motion, useAnimation } from "framer-motion";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, Music, Eye, Zap } from "lucide-react";
import { useIntl } from "react-intl";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";

interface Experience {
  type: 'audio' | 'visual' | 'interaction';
  sentiment: number;
  intensity: number;
  context: string;
}

export function ExperiencePulse() {
  const [isActive, setIsActive] = useState(false);
  const controls = useAnimation();
  const intl = useIntl();
  const { currentTrack } = useMusicPlayer();

  // Fetch current experience insights
  const { data: insights } = useQuery({
    queryKey: ['experience-insights'],
    queryFn: async () => {
      const response = await fetch('/api/lumira/experience-insights');
      if (!response.ok) throw new Error('Failed to fetch experience insights');
      return response.json();
    },
    enabled: isActive,
    refetchInterval: 5000 // Refresh every 5 seconds when active
  });

  const recordExperience = async (type: Experience['type'], value: number) => {
    try {
      const sentiment = value > 0.5 ? (value - 0.5) * 2 : (value - 0.5) * 2;
      const intensity = value;

      await fetch('/api/lumira/experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          sentiment,
          intensity,
          context: window.location.pathname,
          songId: currentTrack?.id
        })
      });

      // Animate feedback received
      await controls.start({
        scale: [1, 1.2, 1],
        transition: { duration: 0.3 }
      });
    } catch (error) {
      console.error('Error recording experience:', error);
    }
  };

  return (
    <motion.div 
      className="fixed bottom-4 left-4 z-50"
      animate={controls}
    >
      <motion.button
        className="bg-background/95 backdrop-blur-sm text-primary p-3 rounded-full shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsActive(!isActive)}
      >
        <Heart className={`h-6 w-6 ${isActive ? 'text-red-500' : ''}`} />
      </motion.button>

      {isActive && (
        <motion.div
          className="absolute bottom-full left-0 mb-4 bg-background/95 backdrop-blur-sm p-4 rounded-lg shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          style={{ width: '200px' }}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs">
                  <Music className="h-4 w-4" />
                  {intl.formatMessage({ id: 'experience.sound' })}
                </span>
                <div className="flex-1 mx-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    className="w-full"
                    onChange={(e) => recordExperience('audio', parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs">
                  <Eye className="h-4 w-4" />
                  {intl.formatMessage({ id: 'experience.visual' })}
                </span>
                <div className="flex-1 mx-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    className="w-full"
                    onChange={(e) => recordExperience('visual', parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs">
                  <Zap className="h-4 w-4" />
                  {intl.formatMessage({ id: 'experience.flow' })}
                </span>
                <div className="flex-1 mx-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    className="w-full"
                    onChange={(e) => recordExperience('interaction', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {insights && (
              <div className="border-t border-border pt-2 mt-2">
                <p className="text-xs font-medium mb-1">
                  {intl.formatMessage({ id: 'experience.community' })}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">🎵</span>
                    <div className="flex-1 mx-2 h-1 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${(insights.currentMood.audio + 1) * 50}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">👁️</span>
                    <div className="flex-1 mx-2 h-1 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${(insights.currentMood.visual + 1) * 50}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">⚡</span>
                    <div className="flex-1 mx-2 h-1 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${(insights.currentMood.interaction + 1) * 50}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}