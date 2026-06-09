// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";

import {ArisanFactory} from "../src/ArisanFactory.sol";
import {ArisanConfig} from "../src/interfaces/IArisanPool.sol";

error ZeroFactoryAddress();

contract CreateArisan is Script {
    /// @notice Creates a new arisan through an already deployed ArisanFactory.
    function run() external returns (uint256 arisanId) {
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        if (factoryAddress == address(0)) revert ZeroFactoryAddress();

        ArisanConfig memory config = ArisanConfig({
            organizer: address(0),
            iuranAmount: vm.envUint("ARISAN_IURAN_AMOUNT"),
            periodDuration: vm.envUint("ARISAN_PERIOD_DURATION"),
            maxMembers: vm.envUint("ARISAN_MAX_MEMBERS"),
            gracePeriodSeconds: vm.envOr("ARISAN_GRACE_PERIOD_SECONDS", uint256(0))
        });

        vm.startBroadcast();
        arisanId = ArisanFactory(factoryAddress).createArisan(config);
        vm.stopBroadcast();

        console2.log("ARISAN_ID", arisanId);
    }
}
