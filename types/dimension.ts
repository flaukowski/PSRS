import { EventEmitter } from 'events';

export interface DimensionalState {
  dimension: number;
  energy: number;
  equilibrium: number;
  reflections: Map<string, number>;
}

export interface ParadoxState {
  sourceEnergy: number;
  targetEquilibrium: number;
  dimensionalShift: number;
}

export interface DimensionCreatedEvent {
  dimensionId: number;
  energy: number;
  source: number;
}

export interface DimensionalReflection {
  [key: number]: number;
}

export interface StorageResult {
  containerId: string;
  objectId: string;
  dimensions: DimensionalReflection;
}
