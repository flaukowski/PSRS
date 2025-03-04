declare module 'circomlibjs' {
  export function buildPoseidon(): Promise<{
    F: any;
    hash: (inputs: any[]) => Uint8Array;
    hash2: (inputs: any[]) => Uint8Array;
    multiHash: (inputs: any[][]) => Uint8Array;
  }>;
}
