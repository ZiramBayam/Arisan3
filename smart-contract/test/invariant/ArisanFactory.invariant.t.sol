// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {ArisanFactory} from "../../src/ArisanFactory.sol";
import {ArisanConfig, ArisanState} from "../../src/interfaces/IArisanPool.sol";
import {MockUSDC} from "../mocks/MockUSDC.sol";
import {MockVRFCoordinator} from "../mocks/MockVRFCoordinator.sol";

contract ArisanManagerInvariantHandler is Test {
    uint256 internal constant IURAN = 100e6;
    uint256 internal constant PERIOD = 1 days;

    ArisanFactory internal factory;
    MockUSDC internal usdc;
    MockVRFCoordinator internal vrf;
    address[] internal members;
    address internal feeRecipient;
    uint256 internal arisanId;

    uint256 public totalDeposited;
    uint256 public totalClaimed;

    constructor(
        ArisanFactory _factory,
        MockUSDC _usdc,
        MockVRFCoordinator _vrf,
        address[] memory _members,
        address _feeRecipient,
        uint256 _arisanId,
        uint256 _totalDeposited
    ) {
        factory = _factory;
        usdc = _usdc;
        vrf = _vrf;
        feeRecipient = _feeRecipient;
        arisanId = _arisanId;
        totalDeposited = _totalDeposited;

        for (uint256 i = 0; i < _members.length; i++) {
            members.push(_members[i]);
        }
    }

    function depositIuran(uint256 memberSeed) external {
        if (factory.state(arisanId) != ArisanState.ACTIVE) return;

        uint256 period = factory.currentPeriod(arisanId);
        if (period == 0) return;

        address member = members[bound(memberSeed, 0, members.length - 1)];
        usdc.mint(member, IURAN);
        vm.prank(member);
        usdc.approve(address(factory), IURAN);

        vm.prank(member);
        try factory.depositIuran(arisanId, period) {
            totalDeposited += IURAN;
        } catch {}
    }

    function triggerPeriod(uint256 elapsedSeed) external {
        if (factory.state(arisanId) != ArisanState.ACTIVE) return;

        uint256 elapsed = bound(elapsedSeed, 0, PERIOD);
        if (factory.vrfPending(arisanId)) {
            vm.warp(factory.vrfRequestTimestamp(arisanId) + factory.VRF_REQUEST_TIMEOUT() + elapsed);
        } else {
            vm.warp(factory.periodStartTimestamp(arisanId) + PERIOD + elapsed);
        }

        try factory.triggerPeriod(arisanId) {} catch {}
    }

    function fulfill(uint256 randomWord) external {
        uint256 requestId = factory.pendingVrfRequestId(arisanId);
        if (requestId == 0) return;

        try vrf.fulfill(requestId, randomWord) {} catch {}
    }

    function claim(uint256 actorSeed) external {
        address actor = _actor(actorSeed);
        uint256 amount = factory.claimable(actor);
        if (amount == 0) return;

        vm.prank(actor);
        try factory.claim() {
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

contract ArisanFactoryInvariantTest is Test {
    uint256 internal constant IURAN = 100e6;
    uint256 internal constant PERIOD = 1 days;

    MockUSDC internal usdc;
    MockVRFCoordinator internal vrf;
    ArisanFactory internal factory;
    ArisanManagerInvariantHandler internal handler;

    address internal feeRecipient = address(0x2000);
    address internal organizer = address(0x3000);
    address[] internal members;
    uint256 internal arisanId;

    function setUp() public {
        usdc = new MockUSDC();
        vrf = new MockVRFCoordinator();
        factory = new ArisanFactory(feeRecipient, address(vrf), 1, bytes32(uint256(123)), address(usdc));

        members.push(address(0xA11CE));
        members.push(address(0xB0B));
        members.push(address(0xCA20));
        members.push(address(0xDAFE));

        vm.prank(organizer);
        arisanId = factory.createArisan(
            ArisanConfig({
                organizer: organizer,
                iuranAmount: IURAN,
                periodDuration: PERIOD,
                maxMembers: members.length,
                gracePeriodSeconds: 2 hours
            })
        );

        uint256 initialDeposited;
        for (uint256 i = 0; i < members.length; i++) {
            _fundApprove(members[i]);
            vm.prank(members[i]);
            factory.join(arisanId);
            initialDeposited += IURAN;
        }

        handler = new ArisanManagerInvariantHandler(
            factory, usdc, vrf, members, feeRecipient, arisanId, initialDeposited
        );
        targetContract(address(handler));
    }

    function invariant_Solvency() public view {
        assertLe(_sumOfAllClaimable(), usdc.balanceOf(address(factory)));
    }

    function invariant_WinnerUniquenessPerRound() public view {
        address[] memory winners = factory.getWinnerHistory(arisanId);
        for (uint256 i = 0; i < winners.length; i++) {
            for (uint256 j = i + 1; j < winners.length; j++) {
                assertTrue(winners[i] != winners[j]);
            }
        }
    }

    function invariant_ConservationOfFunds() public view {
        assertEq(handler.totalDeposited(), usdc.balanceOf(address(factory)) + handler.totalClaimed());
    }

    function invariant_StateConsistency() public view {
        if (factory.state(arisanId) == ArisanState.OPEN) {
            assertEq(factory.currentPeriod(arisanId), 0);
        }
        if (factory.vrfPending(arisanId)) {
            assertTrue(factory.pendingVrfRequestId(arisanId) != 0);
            assertTrue(factory.vrfRequestTimestamp(arisanId) != 0);
        }
    }

    function _fundApprove(address member) internal {
        usdc.mint(member, IURAN);
        vm.prank(member);
        usdc.approve(address(factory), IURAN);
    }

    function _sumOfAllClaimable() internal view returns (uint256 sum) {
        sum += factory.claimable(feeRecipient);
        for (uint256 i = 0; i < members.length; i++) {
            sum += factory.claimable(members[i]);
        }
    }
}
