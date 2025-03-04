// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface INeoFsOracle {
    function getStorageRate() external view returns (uint256);
}

/**
 * @title NeoFsManager
 * @dev Manages GAS payments and file registrations for NEO FS integration
 */
contract NeoFsManager is Ownable, ReentrancyGuard {
    uint256 public constant OVERHEAD_FEE = 100000000000000000; // 0.1 GAS fixed overhead
    address public treasuryAddress;
    INeoFsOracle public oracle;

    struct FileData {
        address owner;
        uint256 size;
        uint256 storagePaid;
        bytes32 storageProof; // Proof of storage from NEO FS
    }

    mapping(bytes32 => FileData) public files;
    mapping(address => uint256) public balances;
    mapping(bytes32 => bool) public processedStorageProofs;

    event FileRegistered(
        address indexed owner,
        bytes32 indexed fileHash,
        uint256 size,
        uint256 storagePaid,
        bytes32 storageProof
    );
    event StoragePaid(address indexed user, uint256 amount);
    event StorageWithdrawn(address indexed recipient, uint256 amount);
    event BalanceWithdrawn(address indexed user, uint256 amount);
    event TreasuryUpdated(address indexed newTreasury);
    event OracleUpdated(address indexed newOracle);

    constructor(address _treasuryAddress, address _oracle) Ownable(msg.sender) {
        require(_treasuryAddress != address(0), "Invalid treasury address");
        require(_oracle != address(0), "Invalid oracle address");
        treasuryAddress = _treasuryAddress;
        oracle = INeoFsOracle(_oracle);
    }

    /**
     * @dev Pay for storage upfront using GAS
     */
    external payable {
        balances[msg.sender] += msg.value;
        emit StoragePaid(msg.sender, msg.value);
    }

    /**
     * @dev Register a file upload with storage proof
     */
    external function registerFileUpload(
        bytes32 fileHash,
        uint256 size,
        bytes32 storageProof
    ) nonReentrant {
        require(size > 0, "File size must be greater than 0");
        require(!processedStorageProofs[storageProof], "Storage proof already used");
        require(files[fileHash].owner == address(0), "File already registered");

        uint256 currentRate = oracle.getStorageRate();
        require(currentRate > 0, "Storage rate not available");

        // Calculate storage cost (MB + overhead)
        uint256 mbSize = (size + 1024 * 1024 - 1) / (1024 * 1024); // Round up to nearest MB
        uint256 storageCost = (mbSize * currentRate) + OVERHEAD_FEE;

        require(balances[msg.sender] >= storageCost, "Insufficient GAS balance");

        // Deduct from user's balance
        balances[msg.sender] -= storageCost;

        // Send overhead fee to treasury
        (bool success, ) = payable(treasuryAddress).call{value: OVERHEAD_FEE}("");
        require(success, "Treasury transfer failed");

        // Mark storage proof as used
        processedStorageProofs[storageProof] = true;

        // Register file
        files[fileHash] = FileData({
            owner: msg.sender,
            size: size,
            storagePaid: storageCost,
            storageProof: storageProof
        });

        emit FileRegistered(msg.sender, fileHash, size, storageCost, storageProof);
    }

    /**
     * @dev Update treasury address
     */
    external function setTreasuryAddress(address newTreasury) onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        treasuryAddress = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /**
     * @dev Update oracle address
     */
    external function setOracle(address newOracle) onlyOwner {
        require(newOracle != address(0), "Invalid oracle address");
        oracle = INeoFsOracle(newOracle);
        emit OracleUpdated(newOracle);
    }

    /**
     * @dev Get file storage details
     */
    external view function getFileDetails(bytes32 fileHash) returns (
        address owner,
        uint256 size,
        uint256 storagePaid,
        bytes32 storageProof
    ) {
        FileData memory file = files[fileHash];
        require(file.owner != address(0), "File not found");
        return (file.owner, file.size, file.storagePaid, file.storageProof);
    }

    /**
     * @dev Get current storage rate from oracle
     */
    external view function getCurrentStorageRate() returns (uint256) {
        return oracle.getStorageRate();
    }

    /**
     * @dev Get user's storage balance
     */
    external view function getBalance() returns (uint256) {
        return balances[msg.sender];
    }

    /**
     * @dev Withdraw storage balance
     */
    external function withdrawBalance(uint256 amount) nonReentrant {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        emit BalanceWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Withdraw contract balance (owner only)
     */
    external function withdrawStorage(uint256 amount) onlyOwner nonReentrant {
        require(address(this).balance >= amount, "Insufficient contract balance");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Transfer failed");
        emit StorageWithdrawn(owner(), amount);
    }
}