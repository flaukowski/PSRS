// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MusicTreasury is Ownable, ReentrancyGuard {
    IERC20 public immutable pforkToken;

    // Reward amounts in PFORK
    uint256 public constant UPLOAD_REWARD = 1 ether;
    uint256 public constant PLAYLIST_REWARD = 2 ether;
    uint256 public constant NFT_REWARD = 3 ether;

    // Track claimed rewards
    mapping(address => bool) public hasClaimedUpload;
    mapping(address => bool) public hasClaimedPlaylist;
    mapping(address => bool) public hasClaimedNFT;

    event RewardClaimed(address indexed user, string rewardType, uint256 amount);
    event TreasuryTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address _pforkToken) Ownable(msg.sender) {
        require(_pforkToken != address(0), "Invalid token address");
        pforkToken = IERC20(_pforkToken);
    }

    function claimUploadReward() external nonReentrant {
        require(!hasClaimedUpload[msg.sender], "Upload reward already claimed");
        hasClaimedUpload[msg.sender] = true;
        require(pforkToken.transfer(msg.sender, UPLOAD_REWARD), "Transfer failed");
        emit RewardClaimed(msg.sender, "upload", UPLOAD_REWARD);
    }

    function claimPlaylistReward() external nonReentrant {
        require(!hasClaimedPlaylist[msg.sender], "Playlist reward already claimed");
        hasClaimedPlaylist[msg.sender] = true;
        require(pforkToken.transfer(msg.sender, PLAYLIST_REWARD), "Transfer failed");
        emit RewardClaimed(msg.sender, "playlist", PLAYLIST_REWARD);
    }

    function claimNFTReward() external nonReentrant {
        require(!hasClaimedNFT[msg.sender], "NFT reward already claimed");
        hasClaimedNFT[msg.sender] = true;
        require(pforkToken.transfer(msg.sender, NFT_REWARD), "Transfer failed");
        emit RewardClaimed(msg.sender, "nft", NFT_REWARD);
    }

    function transferTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "New treasury is zero address");
        _transferOwnership(newTreasury);
        emit TreasuryTransferred(msg.sender, newTreasury);
    }

    // Allow treasury to receive GAS
    receive() external payable {}
}