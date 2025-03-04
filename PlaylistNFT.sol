// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PlaylistNFT
 * @dev Implementation of a music NFT collection using ERC1155.
 * Each token represents a unique song with associated metadata stored on IPFS.
 *
 * Deployment Steps:
 * 1. Deploy PFORK token contract first
 * 2. Deploy MusicTreasury contract with PFORK token address
 * 3. Deploy this contract with initial parameters
 * 4. Transfer ownership to MusicTreasury contract
 */

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract PlaylistNFT is ERC1155, Ownable, ReentrancyGuard {
    using Strings for uint256;

    uint256 public constant MINT_PRICE = 1 ether; // 1 GAS
    uint256 private _nextTokenId = 1;

    // Mapping from token ID to metadata URI
    mapping(uint256 => string) private _tokenURIs;

    // Mapping from token ID to song metadata
    mapping(uint256 => SongMetadata) public songMetadata;

    struct SongMetadata {
        string title;
        string artist;
        string ipfsHash;    // IPFS hash of the MP3 file
        address creator;    // Original uploader
        uint256 timestamp; // Upload timestamp
    }

    // Events
    event SongMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string title,
        string artist,
        string ipfsHash
    );
    event MetadataUpdated(uint256 indexed tokenId, string newUri);
    event MintPriceReceived(address indexed treasury, uint256 amount);

    /**
     * @dev Constructor
     * @param baseUri The base URI for token metadata
     */
    constructor(string memory baseUri) ERC1155(baseUri) Ownable(msg.sender) {}

    /**
     * @dev Mints a new song NFT
     * @param to Address to mint the token to
     * @param title Title of the song
     * @param artist Artist name
     * @param ipfsHash IPFS hash of the MP3 file
     * @param metadataUri URI of the token metadata
     * @return tokenId The ID of the newly minted token
     */
    function mintSong(
        address to,
        string memory title,
        string memory artist,
        string memory ipfsHash,
        string memory metadataUri
    ) public payable nonReentrant returns (uint256) {
        require(msg.value >= MINT_PRICE, "Insufficient GAS sent");
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(artist).length > 0, "Artist cannot be empty");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");

        uint256 tokenId = _nextTokenId++;

        // Store song metadata
        songMetadata[tokenId] = SongMetadata({
            title: title,
            artist: artist,
            ipfsHash: ipfsHash,
            creator: msg.sender,
            timestamp: block.timestamp
        });

        // Store metadata URI
        _tokenURIs[tokenId] = metadataUri;

        // Mint the token
        _mint(to, tokenId, 1, "");

        // Forward GAS to treasury
        (bool sent, ) = owner().call{value: msg.value}("");
        require(sent, "Failed to send GAS");

        emit SongMinted(tokenId, msg.sender, title, artist, ipfsHash);
        emit MetadataUpdated(tokenId, metadataUri);
        emit MintPriceReceived(owner(), msg.value);

        return tokenId;
    }

    /**
     * @dev Returns the metadata URI for a given token ID
     * @param tokenId Token ID to query
     * @return URI string
     */
    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }

    /**
     * @dev Returns the metadata for a given token ID
     * @param tokenId Token ID to query
     * @return SongMetadata struct
     */
    function getSongMetadata(uint256 tokenId) public view returns (SongMetadata memory) {
        require(_exists(tokenId), "Query for nonexistent token");
        return songMetadata[tokenId];
    }

    /**
     * @dev Checks if a token exists
     * @param tokenId Token ID to check
     * @return bool indicating if token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return bytes(_tokenURIs[tokenId]).length > 0;
    }

    /**
     * @dev Returns the current token ID counter
     */
    function getCurrentTokenId() public view returns (uint256) {
        return _nextTokenId;
    }

    // Allow contract to receive GAS
    receive() external payable {}
}