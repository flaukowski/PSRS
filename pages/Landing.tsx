import { useAccount } from 'wagmi';
import { WalletConnect } from "@/components/WalletConnect";
import { useLocation } from 'wouter';
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { useEffect, useState } from 'react';
import { useQuery } from "@tanstack/react-query";

export default function Landing() {
  const { address } = useAccount();
  const [, setLocation] = useLocation();
  const { currentTrack, isPlaying, togglePlay, playTrack } = useMusicPlayer();
  const [isLoading, setIsLoading] = useState(true);

  // Fetch recent songs directly here for better error handling
  const { data: recentSongs, error: songsError } = useQuery({
    queryKey: ["/api/songs/recent"],
    queryFn: async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Internal-Token': 'landing-page'
        };

        if (address) {
          headers['X-Wallet-Address'] = address;
        }

        const response = await fetch("/api/songs/recent", { headers });

        if (!response.ok) {
          throw new Error(`Failed to fetch recent songs: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Recent songs loaded:', data.length, 'songs');
        return data;
      } catch (error) {
        console.error('Error fetching recent songs:', error);
        throw error; // Re-throw to let React Query handle it
      }
    },
    retry: 3,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (address) {
      setLocation("/home");
    }
  }, [address, setLocation]);

  // Initialize music once songs are loaded
  useEffect(() => {
    async function initializeMusic() {
      if (!recentSongs?.length || currentTrack) return;

      try {
        console.log('Initializing music with first song:', recentSongs[0]);
        await playTrack(recentSongs[0]);
      } catch (error) {
        console.error('Error initializing music:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!address) {
      initializeMusic();
    }
  }, [recentSongs, address, currentTrack, playTrack]);

  // Don't redirect away from landing if already here
  if (address && window.location.pathname === '/') return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("/neo_token_logo_flaukowski.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(8px)',
          transform: 'scale(1.1)',
          opacity: '0.15'
        }}
      />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Centered Logo with Link and Music Controls */}
        <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
          <button 
            onClick={togglePlay}
            className="group relative transition-transform hover:scale-105 focus:outline-none rounded-lg"
            disabled={isLoading || !currentTrack}
          >
            <img 
              src="/neo_token_logo_flaukowski.png" 
              alt="Music Portal Logo"
              className={`w-64 h-64 object-contain ${isPlaying ? 'animate-pulse' : ''}`}
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-background/80 backdrop-blur-sm p-4 rounded-full">
                {isPlaying ? (
                  <VolumeX className="h-12 w-12 text-primary" />
                ) : (
                  <Volume2 className="h-12 w-12 text-primary" />
                )}
              </div>
            </div>
          </button>

          {/* Now Playing Display */}
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading music...</span>
            </div>
          ) : currentTrack ? (
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold">{currentTrack.title}</h2>
              <p className="text-sm text-muted-foreground">{currentTrack.artist}</p>
            </div>
          ) : songsError ? (
            <div className="text-destructive text-sm">
              Failed to load music. Please try again later.
            </div>
          ) : null}

          {/* Connect Wallet Button */}
          <div className="mt-8">
            <WalletConnect />
          </div>
        </div>
      </div>
    </div>
  );
}