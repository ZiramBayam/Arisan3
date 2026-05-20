// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";

contract HelperConfig is Script {
    struct NetworkConfig {
        address usdc;
        address vrfCoordinator;
        bytes32 keyHash;
        uint256 subscriptionId;
        address feeRecipient;
    }

    /// @notice Returns deployment configuration for the current chain.
    function activeNetworkConfig() public view returns (NetworkConfig memory) {
        return NetworkConfig({
            usdc: vm.envAddress("USDC_ADDRESS"),
            vrfCoordinator: vm.envAddress("VRF_COORDINATOR"),
            keyHash: vm.envBytes32("VRF_KEY_HASH"),
            subscriptionId: vm.envUint("VRF_SUBSCRIPTION_ID"),
            feeRecipient: vm.envAddress("FEE_RECIPIENT")
        });
    }
}
