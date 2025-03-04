import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { createPublicClient, defineChain } from 'viem';

// Helper function to detect Opera Wallet - defined before usage
const isOperaWallet = () => {
  try {
    return typeof window !== 'undefined' && (
      window.ethereum?.isOpera || 
      /OPR|Opera/.test(navigator.userAgent)
    );
  } catch {
    return false;
  }
};

// Helper function to detect mobile browser
const isMobileDevice = () => {
  try {
    return typeof window !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  } catch {
    return false;
  }
};

// Helper to check if MetaMask is available
const isMetaMaskAvailable = () => {
  try {
    return typeof window !== 'undefined' && (
      window.ethereum?.isMetaMask ||
      // Check if we're on mobile and MetaMask is not installed
      (isMobileDevice() && !window.ethereum)
    );
  } catch {
    return false;
  }
};

// Define NEO X network
export const neoXChain = defineChain({
  id: 47763, // NEO X Chain ID
  network: 'neo-x',
  name: 'NEO X',
  nativeCurrency: {
    name: 'GAS',
    symbol: 'GAS',
    decimals: 18,
  },
  rpcUrls: {
    default: { 
      http: [
        'https://mainnet-1.rpc.banelabs.org',
        'https://mainnet-2.rpc.banelabs.org' // Fallback RPC
      ]
    },
    public: { 
      http: [
        'https://mainnet-1.rpc.banelabs.org',
        'https://mainnet-2.rpc.banelabs.org'
      ]
    },
  },
  blockExplorers: {
    default: {
      name: 'NEO X Explorer',
      url: 'https://explorer.neo-x.network',
    },
  },
  testnet: false,
});

// Create a public client
const publicClient = createPublicClient({
  chain: neoXChain,
  transport: http(),
  batch: {
    multicall: true,
  },
});

// Create wagmi config with NEO X chain
export const config = createConfig({
  chains: [neoXChain],
  transports: {
    [neoXChain.id]: http(),
  },
  connectors: [
    injected({
      target: () => {
        if (isOperaWallet()) return 'opera';
        if (isMetaMaskAvailable()) return 'metaMask';
        return 'injected';
      }
    })
  ],
});

// Export utility functions
export { isOperaWallet, isMobileDevice, isMetaMaskAvailable };

// Helper functions
export const isConnected = () => {
  return Boolean(config.state.connections.size);
};

export const getAccount = () => {
  if (!isConnected()) return null;
  const connections = Array.from(config.state.connections);
  if (!connections.length) return null;
  const [, connection] = connections[0];
  return connection?.accounts[0];
};

export const getBalance = async (address: `0x${string}`) => {
  if (!isConnected()) return BigInt(0);
  return publicClient.getBalance({ address });
};

export const addNeoXNetwork = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No web3 wallet detected');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: `0x${neoXChain.id.toString(16)}`,
        chainName: neoXChain.name,
        nativeCurrency: neoXChain.nativeCurrency,
        rpcUrls: neoXChain.rpcUrls.public.http,
        blockExplorerUrls: [neoXChain.blockExplorers.default.url],
      }],
    });
    return true;
  } catch (error: any) {
    console.error('Error adding NEO X network:', error);
    if (error.code === 4001) {
      throw new Error(isOperaWallet() 
        ? 'Please approve the network addition in Opera Wallet'
        : 'Please approve the network addition in your wallet');
    }
    throw error;
  }
};

export const switchToNeoXNetwork = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No web3 wallet detected');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${neoXChain.id.toString(16)}` }],
    });
    return true;
  } catch (error: any) {
    if (error.code === 4902) {
      return addNeoXNetwork();
    }
    if (error.code === 4001) {
      throw new Error(isOperaWallet()
        ? 'Please approve the network switch in Opera Wallet'
        : 'Please approve the network switch in your wallet');
    }
    throw error;
  }
};

export const autoConfigureNeoXNetwork = async () => {
  try {
    const isCorrectNetwork = await isNeoXNetwork();
    if (!isCorrectNetwork) {
      await switchToNeoXNetwork();
    }
    return true;
  } catch (error) {
    console.error('Error auto-configuring NEO X network:', error);
    throw error;
  }
};

export const isNeoXNetwork = async () => {
  if (typeof window === 'undefined' || !window.ethereum) return false;

  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return chainId === `0x${neoXChain.id.toString(16)}`;
  } catch (error) {
    console.error('Error checking network:', error);
    return false;
  }
};