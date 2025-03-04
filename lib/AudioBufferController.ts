import { useRef, useEffect } from 'react';

export interface AudioQualityMetrics {
  bufferHealth: number;  // 0-1 representing buffer fullness
  playbackStability: number;  // 0-1 representing stability
  dropoutCount: number;  // Number of audio dropouts
  jitterMs: number;  // Playback timing jitter in ms
}

export class AudioBufferController {
  private readonly bufferSize: number = 2048; // Audio buffer size
  private readonly maxBufferCount: number = 3; // Number of buffers to maintain
  private audioBuffers: AudioBuffer[] = [];
  private currentBuffer: number = 0;
  private targetPlaybackRate: number = 1.0;
  private currentPlaybackRate: number = 1.0;
  private readonly smoothingFactor: number = 0.1;
  private metrics: AudioQualityMetrics = {
    bufferHealth: 1,
    playbackStability: 1,
    dropoutCount: 0,
    jitterMs: 0
  };

  constructor(private audioContext: AudioContext) {}

  // Smoothly adjust playback rate to target
  adjustPlaybackRate(targetRate: number) {
    this.targetPlaybackRate = Math.max(0.5, Math.min(2.0, targetRate));
    this.updatePlaybackRate();
  }

  private updatePlaybackRate() {
    // Interpolate between current and target rates for smooth transition
    const delta = this.targetPlaybackRate - this.currentPlaybackRate;
    if (Math.abs(delta) < 0.001) return;

    this.currentPlaybackRate += delta * this.smoothingFactor;
    
    // Update audio node playback rate here
    // This will be connected to the actual audio element in the React component
  }

  // Add audio data to buffer
  async addToBuffer(audioData: ArrayBuffer) {
    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      if (this.audioBuffers.length >= this.maxBufferCount) {
        this.audioBuffers.shift();
      }
      this.audioBuffers.push(audioBuffer);
      this.updateMetrics();
    } catch (error) {
      console.error('Error adding to audio buffer:', error);
      this.metrics.dropoutCount++;
    }
  }

  // Update quality metrics
  private updateMetrics() {
    this.metrics = {
      bufferHealth: this.audioBuffers.length / this.maxBufferCount,
      playbackStability: 1 - Math.abs(this.targetPlaybackRate - this.currentPlaybackRate),
      dropoutCount: this.metrics.dropoutCount,
      jitterMs: this.calculateJitter()
    };
  }

  // Calculate timing jitter
  private calculateJitter(): number {
    if (this.audioBuffers.length < 2) return 0;
    
    const expectedDuration = this.bufferSize / this.audioContext.sampleRate;
    const actualDurations = this.audioBuffers.map(buffer => buffer.duration);
    const jitterValues = actualDurations.map(duration => 
      Math.abs(duration - expectedDuration) * 1000
    );
    
    return jitterValues.reduce((a, b) => a + b, 0) / jitterValues.length;
  }

  // Get current metrics
  getMetrics(): AudioQualityMetrics {
    return { ...this.metrics };
  }

  // Reset controller state
  reset() {
    this.audioBuffers = [];
    this.currentBuffer = 0;
    this.targetPlaybackRate = 1.0;
    this.currentPlaybackRate = 1.0;
    this.metrics = {
      bufferHealth: 1,
      playbackStability: 1,
      dropoutCount: 0,
      jitterMs: 0
    };
  }
}

// React hook for using AudioBufferController
export function useAudioBuffer(audioRef: React.RefObject<HTMLAudioElement>) {
  const controllerRef = useRef<AudioBufferController | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    if (!controllerRef.current && audioContextRef.current) {
      controllerRef.current = new AudioBufferController(audioContextRef.current);
    }

    return () => {
      audioContextRef.current?.close();
      audioContextRef.current = null;
      controllerRef.current = null;
    };
  }, []);

  return controllerRef.current;
}
