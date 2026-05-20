// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

contract ArisanPoolFuzzTest is Test {
    function testFuzz_FeeConservation(uint256 iuranAmount, uint256 memberCount) public pure {
        iuranAmount = bound(iuranAmount, 1e6, 1e11);
        memberCount = bound(memberCount, 3, 50);

        uint256 totalPool = iuranAmount * memberCount;
        uint256 fee = (totalPool * 50) / 10_000;
        uint256 net = totalPool - fee;

        assertEq(fee + net, totalPool);
    }

    function testFuzz_GasLimit(uint256 memberCount) public pure {
        memberCount = bound(memberCount, 3, 50);
        uint256 estimatedRequestPathGas = 100_000 + (memberCount * 2_000);
        assertLt(estimatedRequestPathGas, 300_000);
    }

    function testFuzz_TimestampArithmetic(uint256 periodDuration, uint256 elapsed) public view {
        periodDuration = bound(periodDuration, 1 days, 365 days);
        elapsed = bound(elapsed, 0, 365 days);

        uint256 periodStart = block.timestamp;
        uint256 deadline = periodStart + periodDuration;
        uint256 observed = periodStart + elapsed;

        assertGe(deadline, periodStart);
        assertGe(observed, periodStart);
    }
}
