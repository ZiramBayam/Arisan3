// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {ArisanFactory} from "../../src/ArisanFactory.sol";
import {ArisanPool} from "../../src/ArisanPool.sol";
import {ArisanConfig, ArisanState} from "../../src/interfaces/IArisanPool.sol";
import {MockUSDC} from "../mocks/MockUSDC.sol";
import {MockVRFCoordinator} from "../mocks/MockVRFCoordinator.sol";

contract ArisanInvariantHandler is Test {
    uint256 internal constant IURAN = 100e6;
    uint256 internal constant PERIOD = 1 days;

    ArisanPool internal pool;
    MockUSDC internal usdc;
    MockVRFCoordinator internal vrf;
    address[] internal members;
    address internal feeRecipient;

    uint256 public totalDeposited;
    uint256 public totalClaimed;

    constructor(
        ArisanPool _pool,
        MockUSDC _usdc,
        MockVRFCoordinator _vrf,
        address[] memory _members,
        address _feeRecipient,
        uint256 _totalDeposited
    ) {
        pool = _pool;
        usdc = _usdc;
        vrf = _vrf;
        feeRecipient = _feeRecipient;
        totalDeposited = _totalDeposited;

        for (uint256 i = 0; i < _members.length; i++) {
            members.push(_members[i]);
        }
    }

    function depositIuran(uint256 memberSeed) external {
        if (pool.state() != ArisanState.ACTIVE) return;

        uint256 period = pool.currentPeriod();
        if (period == 0) return;

        address member = members[bound(memberSeed, 0, members.length - 1)];
        usdc.mint(member, IURAN);
        vm.prank(member);
        usdc.approve(address(pool), IURAN);

        vm.prank(member);
        try pool.depositIuran(period) {
            totalDeposited += IURAN;
        } catch {}
    }

    function triggerPeriod(uint256 elapsedSeed) external {
        if (pool.state() != ArisanState.ACTIVE) return;

        uint256 elapsed = bound(elapsedSeed, 0, PERIOD);
        if (pool.vrfPending()) {
            vm.warp(pool.vrfRequestTimestamp() + pool.VRF_REQUEST_TIMEOUT() + elapsed);
        } else {
            vm.warp(pool.periodStartTimestamp() + PERIOD + elapsed);
        }

        try pool.triggerPeriod() {} catch {}
    }

    function fulfill(uint256 randomWord) external {
        uint256 requestId = pool.pendingVrfRequestId();
        if (requestId == 0) return;

        try vrf.fulfill(requestId, randomWord) {} catch {}
    }

    function claim(uint256 actorSeed) external {
        address actor = _actor(actorSeed);
        uint256 amount = pool.claimable(actor);
        if (amount == 0) return;

        vm.prank(actor);
        try pool.claim() {
            totalClaimed += amount;
        } catch {}
    }

    function _actor(uint256 actorSeed) private view returns (address) {
        uint256 index = bound(actorSeed, 0, members.length);
        if (index == members.length) {
            return feeRecipient;
        }
        return members[index];
    }
}

contract ArisanPoolInvariantTest is Test {
    uint256 internal constant IURAN = 100e6;
    uint256 internal constant PERIOD = 1 days;

    MockUSDC internal usdc;
    MockVRFCoordinator internal vrf;
    ArisanPool internal pool;
    ArisanInvariantHandler internal handler;

    address internal feeRecipient = address(0x2000);
    address internal organizer = address(0x3000);
    address[] internal members;

    function setUp() public {
        usdc = new MockUSDC();
        vrf = new MockVRFCoordinator();
        ArisanPool implementation = new ArisanPool();
        ArisanFactory factory = new ArisanFactory(
            address(implementation), feeRecipient, address(vrf), 1, bytes32(uint256(123)), address(usdc)
        );

        members.push(address(0xA11CE));
        members.push(address(0xB0B));
        members.push(address(0xCA20));
        members.push(address(0xDAFE));

        vm.prank(organizer);
        pool = ArisanPool(
            factory.createArisan(
                ArisanConfig({
                    organizer: organizer,
                    iuranAmount: IURAN,
                    periodDuration: PERIOD,
                    maxMembers: members.length,
                    gracePeriodSeconds: 2 hours
                })
            )
        );

        uint256 initialDeposited;
        for (uint256 i = 0; i < members.length; i++) {
            _fundApprove(members[i]);
            vm.prank(members[i]);
            pool.join();
            initialDeposited += IURAN;
        }

        handler = new ArisanInvariantHandler(pool, usdc, vrf, members, feeRecipient, initialDeposited);
        targetContract(address(handler));
    }

    function invariant_Solvency() public view {
        assertLe(_sumOfAllClaimable(), usdc.balanceOf(address(pool)));
    }

    function invariant_WinnerUniquenessPerRound() public view {
        address[] memory winners = pool.getWinnerHistory();
        for (uint256 i = 0; i < winners.length; i++) {
            for (uint256 j = i + 1; j < winners.length; j++) {
                assertTrue(winners[i] != winners[j]);
            }
        }
    }

    function invariant_ConservationOfFunds() public view {
        assertEq(handler.totalDeposited(), usdc.balanceOf(address(pool)) + handler.totalClaimed());
    }

    function invariant_StateConsistency() public view {
        if (pool.state() == ArisanState.OPEN) {
            assertEq(pool.currentPeriod(), 0);
        }
        if (pool.vrfPending()) {
            assertTrue(pool.pendingVrfRequestId() != 0);
            assertTrue(pool.vrfRequestTimestamp() != 0);
        }
    }

    function _fundApprove(address member) internal {
        usdc.mint(member, IURAN);
        vm.prank(member);
        usdc.approve(address(pool), IURAN);
    }

    function _sumOfAllClaimable() internal view returns (uint256 sum) {
        sum += pool.claimable(feeRecipient);
        for (uint256 i = 0; i < members.length; i++) {
            sum += pool.claimable(members[i]);
        }
    }
}
