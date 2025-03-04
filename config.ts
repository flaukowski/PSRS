import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';

export const PFORK_TOKEN_ADDRESS = '0x216490C8E6b33b4d8A2390dADcf9f433E30da60F';
export const TREASURY_ADDRESS = '0xeB57D2e1D869AA4b70961ce3aD99582E84F4F0d4';

export const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
});

// Re-export contract utilities
export * from './lib/contracts';