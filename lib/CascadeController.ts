import { PIDController } from './PIDController';

export interface CascadeMetrics {
  entropyError: number;
  freeEnergyError: number;
  entropyOutput: number;
  freeEnergyOutput: number;
  entropyIntegral: number;
  freeEnergyIntegral: number;
  entropyDerivative: number;
  freeEnergyDerivative: number;
}

interface LoopPerformance {
  meanError: number;
  variance: number;
  steadyStateError: number;
  oscillationCount: number;
  lastValues: number[];
}

export class CascadeController {
  private innerLoop: PIDController;
  private outerLoop: PIDController;
  private lastEntropySetpoint: number = 0;
  private readonly maxSamples = 50;
  private innerLoopPerformance: LoopPerformance = {
    meanError: 0,
    variance: 0,
    steadyStateError: 0,
    oscillationCount: 0,
    lastValues: []
  };
  private outerLoopPerformance: LoopPerformance = {
    meanError: 0,
    variance: 0,
    steadyStateError: 0,
    oscillationCount: 0,
    lastValues: []
  };
  private lastMetrics: CascadeMetrics = {
    entropyError: 0,
    freeEnergyError: 0,
    entropyOutput: 0,
    freeEnergyOutput: 0,
    entropyIntegral: 0,
    freeEnergyIntegral: 0,
    entropyDerivative: 0,
    freeEnergyDerivative: 0
  };

  constructor(
    innerLoopParams = { kp: 0.1, ki: 0.05, kd: 0.02 },
    outerLoopParams = { kp: 0.05, ki: 0.02, kd: 0.01 }
  ) {
    this.innerLoop = new PIDController(
      innerLoopParams.kp,
      innerLoopParams.ki,
      innerLoopParams.kd
    );
    this.outerLoop = new PIDController(
      outerLoopParams.kp,
      outerLoopParams.ki,
      outerLoopParams.kd
    );
  }

  private updateLoopPerformance(
    performance: LoopPerformance,
    error: number,
    output: number
  ) {
    performance.lastValues.push(output);
    if (performance.lastValues.length > this.maxSamples) {
      performance.lastValues.shift();
    }

    // Calculate performance metrics
    const errors = performance.lastValues;
    performance.meanError = errors.reduce((a, b) => a + Math.abs(b), 0) / errors.length;

    const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
    performance.variance = errors.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / errors.length;

    // Calculate steady state error (using last 10 samples)
    const recentErrors = errors.slice(-10);
    performance.steadyStateError = recentErrors.reduce((a, b) => a + Math.abs(b), 0) / recentErrors.length;

    // Count oscillations (zero crossings)
    performance.oscillationCount = errors.slice(1).reduce((count, curr, i) => {
      return count + (Math.sign(curr) !== Math.sign(errors[i]) ? 1 : 0);
    }, 0);
  }

  private autoTuneInnerLoop(currentEntropy: number, targetEntropy: number) {
    const { meanError, variance, oscillationCount } = this.innerLoopPerformance;
    const currentGains = this.innerLoop.getGains();

    // Adjust gains based on performance metrics
    if (meanError > 0.2) {
      currentGains.kp *= 1.05; // Increase proportional gain slightly
    } else if (meanError < 0.05) {
      currentGains.kp *= 0.95; // Decrease proportional gain slightly
    }

    if (variance > 0.1) {
      currentGains.kd *= 1.05; // Increase derivative gain for stability
      currentGains.ki *= 0.95; // Reduce integral gain to prevent oscillation
    } else if (variance < 0.02) {
      currentGains.kd *= 0.95;
      currentGains.ki *= 1.05;
    }

    if (oscillationCount > 5) {
      currentGains.kp *= 0.9; // Significant reduction in proportional gain
      currentGains.kd *= 1.1; // Increase derivative gain to dampen oscillations
    }

    // Apply stricter limits for inner loop
    currentGains.kp = Math.max(0.01, Math.min(0.3, currentGains.kp));
    currentGains.ki = Math.max(0.005, Math.min(0.15, currentGains.ki));
    currentGains.kd = Math.max(0.005, Math.min(0.15, currentGains.kd));

    this.innerLoop.setGains(currentGains);
  }

  private autoTuneOuterLoop(currentFreeEnergy: number, targetFreeEnergy: number) {
    const { meanError, variance, oscillationCount } = this.outerLoopPerformance;
    const currentGains = this.outerLoop.getGains();

    // More conservative tuning for outer loop
    if (meanError > 0.3) {
      currentGains.kp *= 1.03;
    } else if (meanError < 0.1) {
      currentGains.kp *= 0.97;
    }

    if (variance > 0.15) {
      currentGains.kd *= 1.03;
      currentGains.ki *= 0.97;
    } else if (variance < 0.05) {
      currentGains.kd *= 0.97;
      currentGains.ki *= 1.03;
    }

    if (oscillationCount > 3) {
      currentGains.kp *= 0.95;
      currentGains.kd *= 1.05;
    }

    // Even stricter limits for outer loop
    currentGains.kp = Math.max(0.01, Math.min(0.2, currentGains.kp));
    currentGains.ki = Math.max(0.005, Math.min(0.1, currentGains.ki));
    currentGains.kd = Math.max(0.005, Math.min(0.1, currentGains.kd));

    this.outerLoop.setGains(currentGains);
  }

  compute(
    targetFreeEnergy: number,
    currentFreeEnergy: number,
    currentEntropy: number
  ): { playbackRate: number; metrics: CascadeMetrics } {
    // Clamp input values to reasonable ranges
    targetFreeEnergy = Math.max(-2, Math.min(2, targetFreeEnergy));
    currentFreeEnergy = Math.max(-2, Math.min(2, currentFreeEnergy));
    currentEntropy = Math.max(0, Math.min(1, currentEntropy));

    // Outer loop computes target entropy based on free energy error
    const entropySetpoint = this.outerLoop.compute(targetFreeEnergy, currentFreeEnergy);
    const clampedEntropySetpoint = Math.max(0, Math.min(1, entropySetpoint));

    // Inner loop controls network entropy to match the setpoint
    const playbackRateAdjustment = this.innerLoop.compute(clampedEntropySetpoint, currentEntropy);

    // Update performance metrics for both loops
    this.updateLoopPerformance(
      this.innerLoopPerformance,
      clampedEntropySetpoint - currentEntropy,
      playbackRateAdjustment
    );
    this.updateLoopPerformance(
      this.outerLoopPerformance,
      targetFreeEnergy - currentFreeEnergy,
      clampedEntropySetpoint
    );

    // Auto-tune both loops
    this.autoTuneInnerLoop(currentEntropy, clampedEntropySetpoint);
    this.autoTuneOuterLoop(currentFreeEnergy, targetFreeEnergy);

    // Get individual terms from both controllers
    const innerTerms = this.innerLoop.getTerms();
    const outerTerms = this.outerLoop.getTerms();

    // Update metrics
    this.lastMetrics = {
      entropyError: clampedEntropySetpoint - currentEntropy,
      freeEnergyError: targetFreeEnergy - currentFreeEnergy,
      entropyOutput: playbackRateAdjustment,
      freeEnergyOutput: clampedEntropySetpoint,
      entropyIntegral: innerTerms.integral,
      freeEnergyIntegral: outerTerms.integral,
      entropyDerivative: innerTerms.derivative,
      freeEnergyDerivative: outerTerms.derivative
    };

    // Convert controller output to playback rate (0.5 to 2.0 range)
    // Using smoother clamping with tanh
    const clampedAdjustment = Math.tanh(playbackRateAdjustment * 0.5); // Reduced scaling factor
    const playbackRate = Math.max(0.5, Math.min(2.0, 1 + clampedAdjustment));

    return {
      playbackRate,
      metrics: this.lastMetrics
    };
  }

  reset() {
    this.innerLoop.reset();
    this.outerLoop.reset();
    this.lastEntropySetpoint = 0;
    this.innerLoopPerformance = {
      meanError: 0,
      variance: 0,
      steadyStateError: 0,
      oscillationCount: 0,
      lastValues: []
    };
    this.outerLoopPerformance = {
      meanError: 0,
      variance: 0,
      steadyStateError: 0,
      oscillationCount: 0,
      lastValues: []
    };
    this.lastMetrics = {
      entropyError: 0,
      freeEnergyError: 0,
      entropyOutput: 0,
      freeEnergyOutput: 0,
      entropyIntegral: 0,
      freeEnergyIntegral: 0,
      entropyDerivative: 0,
      freeEnergyDerivative: 0
    };
  }

  getMetrics(): CascadeMetrics {
    return this.lastMetrics;
  }
}