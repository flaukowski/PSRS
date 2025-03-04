import { createPublicClient, http, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';

// Contract addresses
export const PFORK_TOKEN_ADDRESS = '0x216490C8E6b33b4d8A2390dADcf9f433E30da60F';
export const TREASURY_ADDRESS = '0x5fe2434F5C5d614d8dc5362AA96a4d9aFFdC5A82';
export const PLAYLIST_NFT_ADDRESS = '0x0177102d27753957EBD4221e1b0Cf4777c2A2Bf2';

// Create a public client
export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// ABI for PFORKToken
export const PFORK_TOKEN_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
]);

// ABI for MusicTreasury
export const TREASURY_ABI = parseAbi([
  'function claimUploadReward() external',
  'function claimPlaylistReward() external',
  'function claimNFTReward() external',
  'function hasClaimedUpload(address) view returns (bool)',
  'function hasClaimedPlaylist(address) view returns (bool)',
  'function hasClaimedNFT(address) view returns (bool)',
  'function transferTreasury(address) external',
  'function owner() view returns (address)',
]);

// ABI for PlaylistNFT
export const PLAYLIST_NFT_ABI = parseAbi([
  'function mintSong(address to, string title, string artist, string ipfsHash, string metadataUri) payable returns (uint256)',
  'function uri(uint256 tokenId) view returns (string)',
  'function getCurrentTokenId() view returns (uint256)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function isApprovedForAll(address account, address operator) view returns (bool)',
  'function setApprovalForAll(address operator, bool approved)',
  'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)',
  'function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)',
]);

// Contract interaction functions
export function getPFORKTokenContract() {
  return {
    address: PFORK_TOKEN_ADDRESS,
    abi: PFORK_TOKEN_ABI,
    publicClient,
  };
}

export function getTreasuryContract() {
  return {
    address: TREASURY_ADDRESS,
    abi: TREASURY_ABI,
    publicClient,
  };
}

export function getPlaylistNFTContract() {
  return {
    address: PLAYLIST_NFT_ADDRESS,
    abi: PLAYLIST_NFT_ABI,
    publicClient,
  };
}

// Types for song metadata
export interface SongMetadata {
  title: string;
  artist: string;
  ipfsHash: string;
  creator: string;
  timestamp: bigint;
}