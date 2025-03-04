export class PIDController {
  private kp: number;
  private ki: number;
  private kd: number;
  private previousError: number;
  private integral: number;
  private derivative: number;
  private lastTime: number;
  private tuningWindow: { error: number; time: number }[] = [];
  private readonly windowSize = 50;
  private lastTuneTime: number;
  private readonly tuneInterval = 10000;
  private readonly maxIntegral = 1.0;

  constructor(kp = 0.1, ki = 0.05, kd = 0.02) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
    this.previousError = 0;
    this.integral = 0;
    this.derivative = 0;
    this.lastTime = Date.now();
    this.lastTuneTime = this.lastTime;
  }

  compute(setpoint: number, currentValue: number): number {
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Clamp input values
    setpoint = Math.max(-2, Math.min(2, setpoint));
    currentValue = Math.max(-2, Math.min(2, currentValue));

    const error = setpoint - currentValue;

    // Anti-windup: only integrate if within bounds
    const newIntegral = this.integral + error * deltaTime;
    if (Math.abs(newIntegral) <= this.maxIntegral) {
      this.integral = newIntegral;
    }

    // Derivative with low-pass filter
    const alpha = 0.1;
    this.derivative = deltaTime === 0 ? 0 : 
      alpha * (error - this.previousError) / deltaTime + 
      (1 - alpha) * this.derivative;

    // Store error for performance tracking
    this.tuningWindow.push({ error, time: currentTime });
    if (this.tuningWindow.length > this.windowSize) {
      this.tuningWindow.shift();
    }

    // Calculate output with improved clamping
    const output = 
      this.kp * error + 
      this.ki * this.integral + 
      this.kd * this.derivative;

    // Clamp output to reasonable range
    const clampedOutput = Math.tanh(output);

    this.previousError = error;
    return clampedOutput;
  }

  getTerms() {
    return {
      integral: this.integral,
      derivative: this.derivative
    };
  }

  getGains() {
    return {
      kp: this.kp,
      ki: this.ki,
      kd: this.kd
    };
  }

  setGains({ kp, ki, kd }: { kp: number; ki: number; kd: number }) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
  }

  reset() {
    this.previousError = 0;
    this.integral = 0;
    this.derivative = 0;
    this.lastTime = Date.now();
    this.tuningWindow = [];
    this.lastTuneTime = this.lastTime;
  }
}