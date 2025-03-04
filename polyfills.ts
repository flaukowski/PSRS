import { Buffer } from 'buffer';

// Polyfill Buffer for browser environment
window.Buffer = Buffer;
window.global = window;

// Ensure util module is available
if (typeof window.process === 'undefined') {
  window.process = { env: {} } as any;
}
