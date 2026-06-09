// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {IVRFSubscriptionV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFSubscriptionV2Plus.sol";

import {HelperConfig} from "./HelperConfig.s.sol";

error ZeroFactoryAddress();

contract AddVRFConsumer is Script {
    /// @notice Adds FACTORY_ADDRESS as a consumer to the configured Chainlink VRF subscription.
    /// @dev Must be broadcast by the VRF subscription owner.
    function run() external returns (address factory) {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.activeNetworkConfig();

        factory = vm.envAddress("FACTORY_ADDRESS");
        if (factory == address(0)) revert ZeroFactoryAddress();

        vm.startBroadcast();
        IVRFSubscriptionV2Plus(config.vrfCoordinator).addConsumer(config.subscriptionId, factory);
        vm.stopBroadcast();
    }
}
