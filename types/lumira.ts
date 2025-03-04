import { z } from 'zod';

// Base data types
export interface GpsData {
  coordinates: {
    lat: number;
    lng: number;
  };
  countryCode: string;
  accuracy?: number;
  speed?: number;
  source?: string;
  textLength?: number; // Added for translation metrics
  mapData?: any; // Added for map translation
}

export interface PlaybackData {
  songId: number;
  position: number;
  isPlaying: boolean;
  volume?: number;
  source?: string;
}

export interface DimensionalReflectionData {
  sourceId: string;
  energy: number;
  dimensionId: number;
  dimensionalEnergy: number;
  equilibrium: number;
}

export interface DimensionalEvolutionData {
  dimensionId: number;
  energy: number;
  equilibrium: number;
  pressure: number;
  reflectionCount: number;
}

export interface ExperienceData {
  type: 'audio' | 'visual' | 'interaction';
  sentiment: number;
  intensity: number;
  context: string;
  location?: string;
  songId?: number;
}

export interface CodePatternData {
  pattern: string;
  context: string;
  success: boolean;
  impact: number;
}

export interface TranslationMetricData {
  sourceLanguage: string;
  targetLanguage: string;
  success: boolean;
  text: string;
  textLength?: number;
  mapData?: any;
}

// Standardized data structure with metadata
export interface StandardizedData {
  type: 'gps' | 'playback' | 'reflection' | 'evolution' | 'experience' | 'code' | 'translation';
  timestamp: string;
  data: GpsData | PlaybackData | DimensionalReflectionData | DimensionalEvolutionData | 
        ExperienceData | CodePatternData | TranslationMetricData;
  metadata: {
    source: string;
    processed: boolean;
    quantumState?: number;
    dimensionalContext?: {
      currentDimensions: number;
      totalEnergy: number;
      systemEquilibrium: number;
    };
    [key: string]: any;
  };
}

// Metrics and aggregation types
export interface LumiraMetrics {
  count: number;
  aggregates: Record<string, number>;
  lastUpdated: Date;
}

export interface AggregatedMetric {
  bucket: string;
  data_type: string;
  aggregates: Record<string, number>;
  count: number;
}

// Translation specific types
export interface TranslationRequest {
  key: string;
  targetLocale: string;
  params?: Record<string, string | number>;
}

export interface TranslationResponse {
  translation: string;
  confidence: number;
  metrics?: Record<string, number>;
  error?: string;
}

export interface ProcessedMetrics {
  success: boolean;
  translation?: string;
  confidence?: number;
  aggregates?: Record<string, number>;
  aggregatedMetrics: LumiraMetrics;
  data?: any; // Added for map data enrichment
}

// Validation schemas
export const translationRequestSchema = z.object({
  key: z.string(),
  targetLocale: z.string(),
  params: z.record(z.union([z.string(), z.number()])).optional(),
});

export const translationResponseSchema = z.object({
  translation: z.string(),
  confidence: z.number(),
  metrics: z.record(z.number()).optional(),
  error: z.string().optional(),
});