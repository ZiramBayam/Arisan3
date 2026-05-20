// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

enum ArisanState {
    OPEN,
    ACTIVE,
    COMPLETED
}

struct ArisanConfig {
    address organizer;
    uint256 iuranAmount;
    uint256 periodDuration;
    uint256 maxMembers;
    uint256 gracePeriodSeconds;
}

struct ArisanData {
    ArisanState state;
    uint256 currentPeriod;
    uint256 periodStartTimestamp;
    address[] members;
    address[] remainingCandidates;
    address[] winnerHistory;
    bool vrfPending;
}

interface IArisanPool {
    function initialize(
        ArisanConfig calldata config,
        address organizer,
        address feeRecipient,
        address vrfCoordinator,
        uint256 subscriptionId,
        bytes32 keyHash,
        address usdc
    ) external;
}
