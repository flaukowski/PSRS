import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { playlistManager } from "@/lib/playlist";
import { useAccount } from 'wagmi';
import { getFileBuffer } from '@/lib/storage';

interface Track {
  id: number;
  ipfsHash: string;
  title: string;
  artist: string;
}

interface MusicPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  isSynced: boolean; // Added isSynced property
  togglePlay: () => Promise<void>;
  playTrack: (track: Track) => Promise<void>;
  playlist: Track[];
  hasInteracted: boolean;
  recentTracks: Track[];
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [isSynced, setIsSynced] = useState(false); // Added isSynced state
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { address } = useAccount();

  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        console.log('Audio context initialized');
        setIsSynced(true); // Set sync state after successful initialization
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
        setIsSynced(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;

      const handleCanPlay = () => {
        console.log('Audio can play');
        setIsLoading(false);
        if (isPlaying) {
          audio.play().catch(error => {
            console.error('Error auto-playing after load:', error);
            setIsPlaying(false);
          });
        }
      };

      const handleError = (error: ErrorEvent) => {
        console.error('Audio error:', error);
        setIsPlaying(false);
        setIsLoading(false);
      };

      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('error', handleError);
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('ended', async () => {
        setIsPlaying(false);
        if (audioRef.current?.src) {
          URL.revokeObjectURL(audioRef.current.src);
          audioRef.current.src = '';
        }
      });

      return () => {
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('play', () => setIsPlaying(true));
        audio.removeEventListener('pause', () => setIsPlaying(false));
        audio.removeEventListener('ended', () => setIsPlaying(false));

        if (audio.src) {
          URL.revokeObjectURL(audio.src);
        }
        audio.pause();
      };
    }
  }, [isPlaying]);

  const playTrack = async (track: Track) => {
    console.log('Playing song:', track);

    if (!hasInteracted) {
      await initializeAudio();
    }

    if (!audioRef.current) {
      console.error('Audio element not ready');
      return;
    }

    try {
      setIsLoading(true);

      // Clean up previous track
      if (audioRef.current.src) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      setCurrentTrack(track);

      // Resume audio context if suspended
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Get audio data
      const audioData = await getFileBuffer({
        type: 'ipfs',
        hash: track.ipfsHash
      });

      // Create blob and URL
      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      // Load and play
      audioRef.current.src = url;
      await audioRef.current.load();
      await audioRef.current.play();

      setIsPlaying(true);

      // Update recent tracks
      setRecentTracks(prev => {
        const newTracks = prev.filter(t => t.id !== track.id);
        return [track, ...newTracks].slice(0, 10);
      });

    } catch (error) {
      console.error('Error playing track:', error);
      setIsPlaying(false);
      setIsLoading(false);
      throw error;
    }
  };

  const initializeAudio = async () => {
    if (!hasInteracted) {
      try {
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        setHasInteracted(true);
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    }
  };

  const togglePlay = async () => {
    if (!hasInteracted) {
      await initializeAudio();
    }

    if (!audioRef.current) {
      console.error('Audio element not ready');
      return;
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else if (currentTrack) {
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setIsPlaying(false);
    }
  };

  const { data: playlist = [] } = useQuery({
    queryKey: ["/api/playlists/current"],
    queryFn: async () => {
      try {
        const playlistData = await playlistManager.loadCurrentPortal();
        return playlistData.tracks;
      } catch (error) {
        console.error('Error loading playlist:', error);
        return [];
      }
    },
    staleTime: 30000
  });

  useEffect(() => {
    const handleInteraction = async () => {
      await initializeAudio();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    if (!hasInteracted) {
      window.addEventListener('click', handleInteraction);
      window.addEventListener('touchstart', handleInteraction);
    }

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [hasInteracted]);

  return (
    <MusicPlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      isLoading,
      isSynced, // Added isSynced to the context value
      togglePlay,
      playTrack,
      playlist,
      hasInteracted,
      recentTracks
    }}>
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return context;
}