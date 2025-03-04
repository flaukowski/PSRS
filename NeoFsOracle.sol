// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NeoFsOracle
 * @dev Oracle contract for NEO FS storage rates without time dependencies
 */
contract NeoFsOracle is Ownable {
    uint256 public currentStorageRate;
    uint256 public constant MAX_RATE_CHANGE_PERCENTAGE = 20; // 20% max change

    event StorageRateUpdate(uint256 newRate, bytes32 indexed updateId);
    event OracleOperatorUpdate(address indexed operator);

    mapping(address => bool) public operators;
    mapping(bytes32 => bool) public processedUpdates;

    modifier onlyOperator() {
        require(operators[msg.sender], "Not authorized as operator");
        _;
    }

    constructor() Ownable(msg.sender) {
        operators[msg.sender] = true;
        emit OracleOperatorUpdate(msg.sender);
    }

    /**
     * @dev Update the storage rate with latest data from NEO FS
     * @param newRate New storage rate per MB per day in GAS wei
     * @param updateId Unique identifier for this update to prevent duplicates
     */
    external function updateStorageRate(uint256 newRate, bytes32 updateId) onlyOperator {
        require(!processedUpdates[updateId], "Update already processed");
        require(newRate > 0, "Invalid rate");

        // Check for maximum rate change
        if (currentStorageRate > 0) {
            uint256 maxIncrease = (currentStorageRate * (100 + MAX_RATE_CHANGE_PERCENTAGE)) / 100;
            uint256 maxDecrease = (currentStorageRate * (100 - MAX_RATE_CHANGE_PERCENTAGE)) / 100;
            require(
                newRate <= maxIncrease && newRate >= maxDecrease,
                "Rate change exceeds limit"
            );
        }

        processedUpdates[updateId] = true;
        currentStorageRate = newRate;
        emit StorageRateUpdate(newRate, updateId);
    }

    /**
     * @dev Add or remove oracle operators
     * @param operator Address of the operator
     * @param isActive Whether to add or remove the operator
     */
    external function setOperator(address operator, bool isActive) onlyOwner {
        require(operator != address(0), "Invalid operator address");
        operators[operator] = isActive;
        emit OracleOperatorUpdate(operator);
    }

    /**
     * @dev Get the latest storage rate
     */
    external view function getStorageRate() returns (uint256) {
        require(currentStorageRate > 0, "Rate not initialized");
        return currentStorageRate;
    }
}