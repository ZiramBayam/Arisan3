// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {ArisanConfig, IArisanPool} from "./interfaces/IArisanPool.sol";

error ZeroAddress();

contract ArisanFactory {
    event ArisanCreated(
        address indexed pool, address indexed organizer, uint256 maxMembers, uint256 iuranAmount, uint256 periodDuration
    );

    address public immutable implementation;
    address public immutable feeRecipient;
    address public immutable vrfCoordinator;
    uint256 public immutable subscriptionId;
    bytes32 public immutable keyHash;
    address public immutable usdc;
    address[] private pools;

    constructor(
        address _implementation,
        address _feeRecipient,
        address _vrfCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash,
        address _usdc
    ) {
        if (
            _implementation == address(0) || _feeRecipient == address(0) || _vrfCoordinator == address(0)
                || _usdc == address(0)
        ) {
            revert ZeroAddress();
        }

        implementation = _implementation;
        feeRecipient = _feeRecipient;
        vrfCoordinator = _vrfCoordinator;
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        usdc = _usdc;
    }

    /// @notice Creates a new Arisan pool clone.
    /// @dev The caller is written as organizer regardless of config.organizer input.
    function createArisan(ArisanConfig calldata config) external returns (address pool) {
        pool = Clones.clone(implementation);
        IArisanPool(pool).initialize(config, msg.sender, feeRecipient, vrfCoordinator, subscriptionId, keyHash, usdc);
        pools.push(pool);
        emit ArisanCreated(pool, msg.sender, config.maxMembers, config.iuranAmount, config.periodDuration);
    }

    /// @notice Returns all pool clones created by this factory.
    function getPools() external view returns (address[] memory) {
        return pools;
    }

    /// @notice Returns the total number of created pools.
    function poolCount() external view returns (uint256) {
        return pools.length;
    }
}
