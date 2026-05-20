// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {ArisanFactory} from "../../src/ArisanFactory.sol";
import {
    AlreadyMember,
    AlreadyPaidThisPeriod,
    ArisanAlreadyCompleted,
    ArisanNotActive,
    ArisanNotOpen,
    InsufficientAllowance,
    InsufficientBalance,
    InvalidIuranAmount,
    InvalidMemberCount,
    InvalidPeriodDuration,
    InvalidRequestId,
    NotAMember,
    NothingCollected,
    NothingToClaim,
    PeriodNotEnded,
    VRFPending,
    WrongPeriod
} from "../../src/ArisanPool.sol";
import {ArisanPool, VRFConsumerBaseV2Plus} from "../../src/ArisanPool.sol";
import {ArisanConfig, ArisanState} from "../../src/interfaces/IArisanPool.sol";
import {MockUSDC} from "../mocks/MockUSDC.sol";
import {MockVRFCoordinator} from "../mocks/MockVRFCoordinator.sol";

contract ArisanPoolHarness is ArisanPool {
    function seedMembers(address[] calldata members) external {
        for (uint256 i = 0; i < members.length; i++) {
            data.members.push(members[i]);
            data.remainingCandidates.push(members[i]);
        }
    }

    function exposedPickWinner(uint256 randomWord) external returns (address) {
        return _pickWinner(randomWord);
    }
}

contract ArisanPoolTest is Test {
    uint256 internal constant IURAN = 100e6;
    uint256 internal constant PERIOD = 1 days;
    bytes32 internal constant KEY_HASH = bytes32(uint256(123));
    uint256 internal constant SUB_ID = 1;

    MockUSDC internal usdc;
    MockVRFCoordinator internal vrf;
    ArisanFactory internal factory;
    ArisanPool internal implementation;
    ArisanPool internal pool;

    address internal organizer = address(0x1000);
    address internal feeRecipient = address(0x2000);
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal carol = address(0xCA20);
    address internal dave = address(0xDAFE);
    address internal eve = address(0xE0E);

    address[] internal members;

    function setUp() public {
        usdc = new MockUSDC();
        vrf = new MockVRFCoordinator();
        implementation = new ArisanPool();
        factory =
            new ArisanFactory(address(implementation), feeRecipient, address(vrf), SUB_ID, KEY_HASH, address(usdc));

        members.push(alice);
        members.push(bob);
        members.push(carol);
        members.push(dave);

        vm.prank(organizer);
        address poolAddress = factory.createArisan(_config(4));
        pool = ArisanPool(poolAddress);
    }

    function testJoin_Success() public {
        _fundApprove(alice);

        vm.prank(alice);
        pool.join();

        address[] memory joined = pool.getMembers();
        assertEq(joined.length, 1);
        assertEq(joined[0], alice);
        assertTrue(pool.isMember(alice));
        assertFalse(pool.isMember(bob));
        assertTrue(pool.paidPeriods(alice, 0));
        assertEq(pool.periodCollected(0), IURAN);
        assertEq(usdc.balanceOf(address(pool)), IURAN);
    }

    function testFactory_CreateArisan_RegistersPool() public {
        vm.prank(organizer);
        address poolAddress = factory.createArisan(_config(3));

        address[] memory pools = factory.getPools();
        assertEq(factory.poolCount(), 2);
        assertEq(pools[1], poolAddress);
    }

    function testFactory_Constructor_RevertIfZeroAddress() public {
        vm.expectRevert(bytes4(keccak256("ZeroAddress()")));
        new ArisanFactory(address(0), feeRecipient, address(vrf), SUB_ID, KEY_HASH, address(usdc));
    }

    function testCreateArisan_RevertIfInvalidMemberCount() public {
        ArisanConfig memory invalidConfig = _config(2);

        vm.expectRevert(InvalidMemberCount.selector);
        factory.createArisan(invalidConfig);
    }

    function testCreateArisan_RevertIfInvalidIuranAmount() public {
        ArisanConfig memory invalidConfig = _config(3);
        invalidConfig.iuranAmount = 0;

        vm.expectRevert(InvalidIuranAmount.selector);
        factory.createArisan(invalidConfig);
    }

    function testCreateArisan_RevertIfInvalidPeriodDuration() public {
        ArisanConfig memory invalidConfig = _config(3);
        invalidConfig.periodDuration = 1 days - 1;

        vm.expectRevert(InvalidPeriodDuration.selector);
        factory.createArisan(invalidConfig);
    }

    function testDepositIuran_Success() public {
        _activatePool();
        _selectWinner(0);
        _fundApprove(alice);

        vm.prank(alice);
        pool.depositIuran(1);

        assertTrue(pool.paidPeriods(alice, 1));
        assertEq(pool.periodCollected(1), IURAN);
        assertEq(usdc.balanceOf(address(pool)), (4 * IURAN) + IURAN);
    }

    function testLeave_Success() public {
        _fundApprove(alice);
        vm.prank(alice);
        pool.join();

        vm.prank(alice);
        pool.leavePool();

        assertFalse(pool.isMember(alice));
        assertFalse(pool.paidPeriods(alice, 0));
        assertEq(pool.periodCollected(0), 0);
        assertEq(pool.getMembers().length, 0);
        assertEq(pool.getRemainingCandidates().length, 0);
        assertEq(usdc.balanceOf(alice), IURAN);
        assertEq(usdc.balanceOf(address(pool)), 0);
    }

    function testLeave_RemovesOnlyCaller() public {
        _join(address(pool), alice);
        _join(address(pool), bob);
        _join(address(pool), carol);

        vm.prank(bob);
        pool.leavePool();

        assertFalse(pool.isMember(bob));
        assertTrue(pool.isMember(alice));
        assertTrue(pool.isMember(carol));
        assertEq(pool.periodCollected(0), 2 * IURAN);
        assertEq(pool.getMembers().length, 2);
        assertEq(pool.getRemainingCandidates().length, 2);
    }

    function testTriggerPeriod_Success() public {
        _activatePool();

        vm.warp(block.timestamp + PERIOD);
        pool.triggerPeriod();

        assertTrue(pool.vrfPending());
        assertEq(pool.pendingVrfRequestId(), 1);
        assertEq(pool.vrfRequestTimestamp(), block.timestamp);
    }

    function testFulfillRandomWords_Success() public {
        _activatePool();

        uint256 requestId = _requestRandomness();
        vrf.fulfill(requestId, 0);

        assertFalse(pool.vrfPending());
        assertEq(pool.pendingVrfRequestId(), 0);
        assertEq(pool.vrfRequestTimestamp(), 0);
        assertEq(pool.currentPeriod(), 1);
        assertEq(pool.getWinnerHistory()[0], alice);
        assertEq(pool.claimable(alice), 398e6);
        assertEq(pool.claimable(feeRecipient), 2e6);
    }

    function testClaim_Success() public {
        _activatePool();
        _selectWinner(0);

        vm.prank(alice);
        pool.claim();

        assertEq(usdc.balanceOf(alice), 398e6);
        assertEq(pool.claimable(alice), 0);
    }

    function testFullLifecycle_4Members_4Periods() public {
        _activatePool();

        for (uint256 period = 0; period < 4; period++) {
            if (period > 0) {
                _depositAll(period);
            }
            _selectWinner(period);
        }

        assertEq(uint256(pool.state()), uint256(ArisanState.COMPLETED));
        assertEq(pool.currentPeriod(), 4);
        assertEq(pool.getWinnerHistory().length, 4);
    }

    function testShuffleBag_AllMembersWinOnce() public {
        _activatePool();

        for (uint256 period = 0; period < 4; period++) {
            if (period > 0) {
                _depositAll(period);
            }
            _selectWinner(0);
        }

        address[] memory winners = pool.getWinnerHistory();
        for (uint256 i = 0; i < winners.length; i++) {
            for (uint256 j = i + 1; j < winners.length; j++) {
                assertTrue(winners[i] != winners[j]);
            }
        }
    }

    function testShuffleBag_Reset() public {
        ArisanPoolHarness harness = new ArisanPoolHarness();
        address[] memory seeded = new address[](2);
        seeded[0] = alice;
        seeded[1] = bob;
        harness.seedMembers(seeded);

        harness.exposedPickWinner(0);
        harness.exposedPickWinner(0);
        assertEq(harness.getRemainingCandidates().length, 0);

        address winnerAfterReset = harness.exposedPickWinner(0);
        assertTrue(winnerAfterReset == alice || winnerAfterReset == bob);
        assertEq(harness.getRemainingCandidates().length, 1);
    }

    function testFee_CorrectAmount() public {
        _activatePool();
        _selectWinner(0);

        uint256 totalPool = IURAN * 4;
        uint256 fee = (totalPool * 50) / 10_000;
        assertEq(pool.claimable(feeRecipient), fee);
        assertEq(pool.claimable(alice), totalPool - fee);
    }

    function testFulfillRandomWords_UsesCollectedAmountForPartialPeriod() public {
        _activatePool();
        _selectWinner(0);

        _fundApprove(alice);
        vm.prank(alice);
        pool.depositIuran(1);

        uint256 requestId = _requestRandomness();
        vrf.fulfill(requestId, 0);

        address periodOneWinner = pool.getWinnerHistory()[1];
        uint256 fee = (IURAN * 50) / 10_000;

        assertEq(pool.periodCollected(1), IURAN);
        assertEq(pool.claimable(periodOneWinner), IURAN - fee);
        assertEq(pool.claimable(feeRecipient), 2e6 + fee);
        assertLe(pool.claimable(periodOneWinner) + pool.claimable(feeRecipient), usdc.balanceOf(address(pool)));
    }

    function testJoin_RevertIfActive() public {
        _activatePool();
        _fundApprove(eve);

        vm.expectRevert(ArisanNotOpen.selector);
        vm.prank(eve);
        pool.join();
    }

    function testJoin_RevertIfAlreadyMember() public {
        _fundApprove(alice);
        vm.prank(alice);
        pool.join();

        _fundApprove(alice);
        vm.expectRevert(AlreadyMember.selector);
        vm.prank(alice);
        pool.join();
    }

    function testJoin_RevertIfInsufficientAllowance() public {
        usdc.mint(alice, IURAN);

        vm.expectRevert(InsufficientAllowance.selector);
        vm.prank(alice);
        pool.join();
    }

    function testJoin_RevertIfInsufficientBalance() public {
        vm.prank(alice);
        usdc.approve(address(pool), IURAN);

        vm.expectRevert(InsufficientBalance.selector);
        vm.prank(alice);
        pool.join();
    }

    function testLeave_RevertIfNotMember() public {
        vm.expectRevert(NotAMember.selector);
        vm.prank(alice);
        pool.leavePool();
    }

    function testLeave_RevertIfActive() public {
        _activatePool();

        vm.expectRevert(ArisanNotOpen.selector);
        vm.prank(alice);
        pool.leavePool();
    }

    function testDepositIuran_RevertIfNotMember() public {
        _activatePool();
        _selectWinner(0);
        _fundApprove(eve);

        vm.expectRevert(NotAMember.selector);
        vm.prank(eve);
        pool.depositIuran(1);
    }

    function testDepositIuran_RevertIfAlreadyPaid() public {
        _activatePool();

        vm.expectRevert(AlreadyPaidThisPeriod.selector);
        vm.prank(alice);
        pool.depositIuran(0);
    }

    function testDepositIuran_RevertIfWrongPeriod() public {
        _activatePool();
        _fundApprove(alice);

        vm.expectRevert(abi.encodeWithSelector(WrongPeriod.selector, 0, 1));
        vm.prank(alice);
        pool.depositIuran(1);
    }

    function testTriggerPeriod_RevertIfBeforeDeadline() public {
        _activatePool();

        vm.expectRevert(PeriodNotEnded.selector);
        pool.triggerPeriod();
    }

    function testTriggerPeriod_RevertIfVRFPending() public {
        _activatePool();
        _requestRandomness();

        vm.expectRevert(VRFPending.selector);
        pool.triggerPeriod();
    }

    function testTriggerPeriod_RevertIfRetryBeforeVRFTimeout() public {
        _activatePool();
        _requestRandomness();

        vm.warp(block.timestamp + pool.VRF_REQUEST_TIMEOUT() - 1);

        vm.expectRevert(VRFPending.selector);
        pool.triggerPeriod();
    }

    function testTriggerPeriod_RetryAfterVRFTimeout() public {
        _activatePool();
        uint256 staleRequestId = _requestRandomness();

        vm.warp(block.timestamp + pool.VRF_REQUEST_TIMEOUT());
        pool.triggerPeriod();

        uint256 replacementRequestId = pool.pendingVrfRequestId();
        assertEq(replacementRequestId, staleRequestId + 1);
        assertTrue(pool.vrfPending());
        assertEq(pool.vrfRequestTimestamp(), block.timestamp);

        vm.expectRevert(abi.encodeWithSelector(InvalidRequestId.selector, replacementRequestId, staleRequestId));
        vrf.fulfill(staleRequestId, 0);

        vrf.fulfill(replacementRequestId, 0);
        assertFalse(pool.vrfPending());
        assertEq(pool.pendingVrfRequestId(), 0);
        assertEq(pool.vrfRequestTimestamp(), 0);
        assertEq(pool.currentPeriod(), 1);
    }

    function testTriggerPeriod_RevertIfNothingCollected() public {
        _activatePool();
        _selectWinner(0);

        vm.warp(block.timestamp + PERIOD);
        vm.expectRevert(NothingCollected.selector);
        pool.triggerPeriod();
    }

    function testTriggerPeriod_RevertIfCompleted() public {
        _activatePool();
        for (uint256 period = 0; period < 4; period++) {
            if (period > 0) {
                _depositAll(period);
            }
            _selectWinner(period);
        }

        vm.warp(block.timestamp + PERIOD);
        vm.expectRevert(ArisanAlreadyCompleted.selector);
        pool.triggerPeriod();
    }

    function testFulfillRandomWords_RevertIfCalledDirectly() public {
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 1;

        vm.expectRevert(
            abi.encodeWithSelector(
                VRFConsumerBaseV2Plus.OnlyCoordinatorCanFulfill.selector, address(this), address(vrf)
            )
        );
        pool.rawFulfillRandomWords(1, randomWords);
    }

    function testFulfillRandomWords_RevertIfWrongRequestId() public {
        _activatePool();
        _requestRandomness();

        vm.expectRevert(abi.encodeWithSelector(InvalidRequestId.selector, 1, 999));
        vrf.fulfillConsumer(address(pool), 999, 0);
    }

    function testFulfillRandomWords_RevertIfVRFNotPending() public {
        _activatePool();

        vm.expectRevert(bytes4(keccak256("VRFNotPending()")));
        vrf.fulfillConsumer(address(pool), 0, 0);
    }

    function testClaim_RevertIfNothingToClaim() public {
        vm.expectRevert(NothingToClaim.selector);
        vm.prank(alice);
        pool.claim();
    }

    function _config(uint256 maxMembers) internal view returns (ArisanConfig memory) {
        return ArisanConfig({
            organizer: organizer,
            iuranAmount: IURAN,
            periodDuration: PERIOD,
            maxMembers: maxMembers,
            gracePeriodSeconds: 2 hours
        });
    }

    function _activatePool() internal {
        for (uint256 i = 0; i < members.length; i++) {
            _join(address(pool), members[i]);
        }
        assertEq(uint256(pool.state()), uint256(ArisanState.ACTIVE));
    }

    function _join(address poolAddress, address member) internal {
        _fundApprove(member, poolAddress);
        vm.prank(member);
        ArisanPool(poolAddress).join();
    }

    function _fundApprove(address member) internal {
        _fundApprove(member, address(pool));
    }

    function _fundApprove(address member, address poolAddress) internal {
        usdc.mint(member, IURAN);
        vm.prank(member);
        usdc.approve(poolAddress, IURAN);
    }

    function _depositAll(uint256 period) internal {
        for (uint256 i = 0; i < members.length; i++) {
            _fundApprove(members[i]);
            vm.prank(members[i]);
            pool.depositIuran(period);
        }
    }

    function _requestRandomness() internal returns (uint256 requestId) {
        vm.warp(block.timestamp + PERIOD);
        pool.triggerPeriod();
        requestId = pool.pendingVrfRequestId();
    }

    function _selectWinner(uint256 randomWord) internal {
        uint256 requestId = _requestRandomness();
        vrf.fulfill(requestId, randomWord);
    }
}
