import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWebSocket } from './WebSocketContext';
import { useAccount } from 'wagmi';
import { playlistManager } from '@/lib/playlist';
import { buildPoseidon } from 'circomlibjs';
import { groth16 } from 'snarkjs';

interface DimensionalState {
  entropy: number;
  harmonicAlignment: number;
  dimensionalShift: number;
  quantumState: 'aligned' | 'shifting' | 'unstable';
}

interface DimensionalMusicContextType {
  currentDimension: string;
  dimensionalState: DimensionalState;
  syncWithDimension: (dimension: string) => Promise<void>;
  isDimensionallyAligned: boolean;
  dimensionalErrors: string[];
  currentPortalSignature: string | null;
}

const DimensionalMusicContext = createContext<DimensionalMusicContextType | undefined>(undefined);

export function DimensionalMusicProvider({ children }: { children: React.ReactNode }) {
  const [currentDimension, setCurrentDimension] = useState<string>('prime');
  const [currentPortalSignature, setCurrentPortalSignature] = useState<string | null>(null);
  const [dimensionalState, setDimensionalState] = useState<DimensionalState>({
    entropy: 0,
    harmonicAlignment: 1,
    dimensionalShift: 0,
    quantumState: 'aligned'
  });
  const [isDimensionallyAligned, setIsDimensionallyAligned] = useState(true);
  const [dimensionalErrors, setDimensionalErrors] = useState<string[]>([]);

  const { socket, isConnected } = useWebSocket();
  const { address } = useAccount();
  const dimensionalSyncRef = useRef<number>(0);
  const poseidonRef = useRef<any>(null);

  useEffect(() => {
    const initPoseidon = async () => {
      if (!poseidonRef.current) {
        poseidonRef.current = await buildPoseidon();
      }
    };
    initPoseidon();
  }, []);

  const generateZKProof = async (dimension: string) => {
    try {
      if (!poseidonRef.current) {
        throw new Error('Poseidon hash not initialized');
      }

      const encoder = new TextEncoder();
      const dimensionBytes = encoder.encode(dimension);
      const dimensionHex = Array.from(dimensionBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const dimensionId = BigInt('0x' + dimensionHex);
      const timestamp = BigInt(Date.now());
      const publicAddr = BigInt(address || '0');
      const nonce = BigInt(Math.floor(Math.random() * 1000000));

      const neoFSDetails = await playlistManager.getNeoFSDetails();

      const input = {
        portalTimestamp: timestamp.toString(),
        dimensionId: dimensionId.toString(),
        publicAddress: publicAddr.toString(),
        userPrivateKey: publicAddr.toString(), 
        harmonicAlignment: Math.floor(dimensionalState.harmonicAlignment * 1000000).toString(),
        entropyFactor: Math.floor(dimensionalState.entropy * 1000000).toString(),
        dimensionalNonce: nonce.toString(),
        neoFSObjectId: neoFSDetails.objectId,
        neoFSContainerId: neoFSDetails.containerId,
        neoFSBearerToken: neoFSDetails.bearerToken,
        neoFSStorageGroup: neoFSDetails.storageGroup,
        neoFSDataSize: neoFSDetails.dataSize.toString(),
        neoFSRepFactor: neoFSDetails.replicationFactor.toString()
      };

      console.log('Generating ZK proof with inputs:', {
        dimension,
        timestamp: timestamp.toString(),
        harmonicAlignment: dimensionalState.harmonicAlignment,
        neoFSObjectId: neoFSDetails.objectId
      });

      const { proof, publicSignals } = await groth16.fullProve(
        input,
        "/circuits/dimensional_portal.wasm",
        "/circuits/dimensional_portal.zkey"
      );

      return {
        proof,
        publicSignals,
        input
      };
    } catch (error: unknown) {
      console.error('Error generating ZK proof:', error);
      throw new Error(`Failed to generate dimensional proof: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const syncWithDimension = async (dimension: string) => {
    try {
      if (!socket || !isConnected) {
        throw new Error('Dimensional sync connection not available');
      }

      setDimensionalErrors([]);
      console.log('Starting dimensional sync for dimension:', dimension);

      const zkProof = await generateZKProof(dimension);
      console.log('Generated ZK proof:', { ...zkProof, proof: '...' });

      socket.send({
        type: 'dimensional_sync_request',
        dimension,
        address,
        timestamp: Date.now(),
        syncId: ++dimensionalSyncRef.current,
        proof: zkProof
      });

      setCurrentDimension(dimension);
    } catch (error: unknown) {
      console.error('Dimensional sync error:', error);
      setDimensionalErrors(prev => [...prev, error instanceof Error ? error.message : 'Unknown error']);
      setIsDimensionallyAligned(false);
    }
  };

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleDimensionalMessage = (data: any) => {
      try {
        switch (data.type) {
          case 'dimensional_sync':
            console.log('Received dimensional sync:', data);
            setDimensionalState({
              entropy: data.entropy ?? 0,
              harmonicAlignment: data.harmonicAlignment ?? 1,
              dimensionalShift: data.dimensionalShift ?? 0,
              quantumState: data.quantumState ?? 'aligned'
            });
            setIsDimensionallyAligned(data.isAligned ?? true);
            if (data.portalSignature) {
              setCurrentPortalSignature(data.portalSignature);
            }
            break;
          case 'dimensional_error':
            console.error('Dimensional error:', data.message);
            setDimensionalErrors(prev => [...prev, data.message]);
            setIsDimensionallyAligned(false);
            break;
          default:
            break;
        }
      } catch (error) {
        console.error('Error handling dimensional sync message:', error);
        setDimensionalErrors(prev => [...prev, 'Error processing sync message']);
      }
    };

    socket.onMessage(handleDimensionalMessage);

    return () => {
      socket.onMessage(() => {}); 
    };
  }, [socket, isConnected]);

  return (
    <DimensionalMusicContext.Provider
      value={{
        currentDimension,
        dimensionalState,
        syncWithDimension,
        isDimensionallyAligned,
        dimensionalErrors,
        currentPortalSignature
      }}
    >
      {children}
    </DimensionalMusicContext.Provider>
  );
}

export function useDimensionalMusic() {
  const context = useContext(DimensionalMusicContext);
  if (!context) {
    throw new Error('useDimensionalMusic must be used within a DimensionalMusicProvider');
  }
  return context;
}