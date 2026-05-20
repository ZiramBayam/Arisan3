// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";

import {ArisanFactory} from "../src/ArisanFactory.sol";
import {ArisanPool} from "../src/ArisanPool.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract Deploy is Script {
    /// @notice Deploys the implementation and factory contracts.
    function run() external returns (ArisanPool implementation, ArisanFactory factory) {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.activeNetworkConfig();

        vm.startBroadcast();
        implementation = new ArisanPool();
        factory = new ArisanFactory(
            address(implementation),
            config.feeRecipient,
            config.vrfCoordinator,
            config.subscriptionId,
            config.keyHash,
            config.usdc
        );
        vm.stopBroadcast();
    }
}
