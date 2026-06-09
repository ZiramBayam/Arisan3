// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";

import {ArisanFactory} from "../src/ArisanFactory.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract Deploy is Script {
    /// @notice Deploys the arisan manager contract.
    function run() external returns (ArisanFactory factory) {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.activeNetworkConfig();

        vm.startBroadcast();
        factory = new ArisanFactory(
            config.feeRecipient,
            config.vrfCoordinator,
            config.subscriptionId,
            config.keyHash,
            config.usdc
        );
        vm.stopBroadcast();
    }
}
