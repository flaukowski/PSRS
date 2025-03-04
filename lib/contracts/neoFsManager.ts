import { ethers } from 'ethers';
import { Address } from 'viem';

export interface FileData {
  owner: Address;
  size: bigint;
  storagePaid: bigint;
  storageProof: string;
}

export interface NeoFsManagerContract {
  // File management
  registerFileUpload: (fileHash: string, size: bigint, storageProof: string) => Promise<ethers.ContractTransaction>;
  getFileDetails: (fileHash: string) => Promise<FileData>;

  // Oracle integration
  getCurrentStorageRate: () => Promise<bigint>;
  oracle: () => Promise<Address>;
  setOracle: (newOracle: Address) => Promise<ethers.ContractTransaction>;

  // Balance management
  getBalance: () => Promise<bigint>;
  withdrawBalance: (amount: bigint) => Promise<ethers.ContractTransaction>;

  // Events
  onFileRegistered: (callback: (owner: Address, fileHash: string, size: bigint, storagePaid: bigint, storageProof: string) => void) => void;
  onStoragePaid: (callback: (user: Address, amount: bigint) => void) => void;
  onStorageWithdrawn: (callback: (recipient: Address, amount: bigint) => void) => void;
  onBalanceWithdrawn: (callback: (user: Address, amount: bigint) => void) => void;
  onOracleUpdated: (callback: (newOracle: Address) => void) => void;
}

export interface NeoFsOracleContract {
  getStorageRate: () => Promise<bigint>;
  updateStorageRate: (newRate: bigint, updateId: string) => Promise<ethers.ContractTransaction>;
  setOperator: (operator: Address, isActive: boolean) => Promise<ethers.ContractTransaction>;
  operators: (address: Address) => Promise<boolean>;
}

// Contract constants
export const NEO_FS_MANAGER_ADDRESS = process.env.VITE_NEO_FS_MANAGER_ADDRESS as Address;
export const NEO_FS_ORACLE_ADDRESS = process.env.VITE_NEO_FS_ORACLE_ADDRESS as Address;

// Storage cost calculation helpers
export const OVERHEAD_FEE = BigInt(100000000000000000); // 0.1 GAS fixed overhead in wei

export const calculateRequiredStorage = async (
  contract: NeoFsManagerContract,
  sizeInBytes: number
): Promise<bigint> => {
  // Get current rate from oracle via manager contract
  const currentRate = await contract.getCurrentStorageRate();

  // Convert size to MB (rounding up)
  const sizeInMB = BigInt(Math.ceil(sizeInBytes / (1024 * 1024)));

  // Calculate storage cost: (size_mb * current_rate) + overhead
  return (sizeInMB * currentRate) + OVERHEAD_FEE;
};

// Wei conversion helpers for GAS
export const GAS_DECIMALS = 18;
export const convertToGasWei = (amount: number | string): bigint => {
  return ethers.parseUnits(amount.toString(), GAS_DECIMALS);
};

export const convertFromGasWei = (amount: bigint): number => {
  return Number(ethers.formatUnits(amount, GAS_DECIMALS));
};