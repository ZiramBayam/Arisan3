// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {
    AlreadyMember,
    AlreadyPaidThisPeriod,
    ArisanAlreadyCompleted,
    ArisanFactory,
    ArisanNotActive,
    ArisanNotOpen,
    InsufficientAllowance,
    InsufficientBalance,
    InvalidArisanId,
    InvalidIuranAmount,
    InvalidMemberCount,
    InvalidPeriodDuration,
    InvalidRequestId,
    ManagedVRFConsumerBaseV2Plus,
    NotAMember,
    NothingCollected,
    NothingToClaim,
    PeriodNotEnded,
    VRFPending,
    WrongPeriod
} from "../../src/ArisanFactory.sol";
import {ArisanConfig, ArisanState} from "../../src/interfaces/IArisanPool.sol";
import {MockUSDC} from "../mocks/MockUSDC.sol";
import {MockVRFCoordinator} from "../mocks/MockVRFCoordinator.sol";

contract ArisanFactoryTest is Test {
    uint256 internal constant IURAN = 100e6;
    uint256 internal constant PERIOD = 1 days;
    bytes32 internal constant KEY_HASH = bytes32(uint256(123));
    uint256 internal constant SUB_ID = 1;

    MockUSDC internal usdc;
    MockVRFCoordinator internal vrf;
    ArisanFactory internal factory;

    uint256 internal arisanId;

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
        factory = new ArisanFactory(feeRecipient, address(vrf), SUB_ID, KEY_HASH, address(usdc));

        members.push(alice);
        members.push(bob);
        members.push(carol);
        members.push(dave);

        vm.prank(organizer);
        arisanId = factory.createArisan(_config(4));
    }

    function testCreateArisan_ReturnsIncrementingIds() public {
        assertEq(arisanId, 0);

        vm.prank(organizer);
        uint256 nextId = factory.createArisan(_config(3));

        assertEq(nextId, 1);
        assertEq(factory.nextArisanId(), 2);
        assertEq(uint256(factory.state(nextId)), uint256(ArisanState.OPEN));
    }

    function testCreateArisan_StoresOrganizerFromCaller() public {
        (address storedOrganizer, uint256 iuranAmount, uint256 periodDuration, uint256 maxMembers, uint256 gracePeriod) =
            factory.config(arisanId);

        assertEq(storedOrganizer, organizer);
        assertEq(iuranAmount, IURAN);
        assertEq(periodDuration, PERIOD);
        assertEq(maxMembers, 4);
        assertEq(gracePeriod, 2 hours);
    }

    function testConstructor_RevertIfZeroAddress() public {
        vm.expectRevert(ZeroAddressSelector());
        new ArisanFactory(address(0), address(vrf), SUB_ID, KEY_HASH, address(usdc));
    }

    function testCreateArisan_RevertIfInvalidMemberCount() public {
        vm.expectRevert(InvalidMemberCount.selector);
        factory.createArisan(_config(2));
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

    function testJoin_Success() public {
        _fundApprove(alice);

        vm.prank(alice);
        factory.join(arisanId);

        address[] memory joined = factory.getMembers(arisanId);
        assertEq(joined.length, 1);
        assertEq(joined[0], alice);
        assertTrue(factory.isMember(arisanId, alice));
        assertFalse(factory.isMember(arisanId, bob));
        assertTrue(factory.paidPeriods(arisanId, alice, 0));
        assertEq(factory.periodCollected(arisanId, 0), IURAN);
        assertEq(usdc.balanceOf(address(factory)), IURAN);
    }

    function testJoin_AutoStartsWhenFull() public {
        _activateArisan(arisanId);

        assertEq(uint256(factory.state(arisanId)), uint256(ArisanState.ACTIVE));
        assertEq(factory.periodStartTimestamp(arisanId), block.timestamp);
    }

    function testLeave_Success() public {
        _join(arisanId, alice);

        vm.prank(alice);
        factory.leavePool(arisanId);

        assertFalse(factory.isMember(arisanId, alice));
        assertFalse(factory.paidPeriods(arisanId, alice, 0));
        assertEq(factory.periodCollected(arisanId, 0), 0);
        assertEq(factory.getMembers(arisanId).length, 0);
        assertEq(factory.getRemainingCandidates(arisanId).length, 0);
        assertEq(usdc.balanceOf(alice), IURAN);
        assertEq(usdc.balanceOf(address(factory)), 0);
    }

    function testDepositIuran_Success() public {
        _activateArisan(arisanId);
        _selectWinner(arisanId, 0);
        _fundApprove(alice);

        vm.prank(alice);
        factory.depositIuran(arisanId, 1);

        assertTrue(factory.paidPeriods(arisanId, alice, 1));
        assertEq(factory.periodCollected(arisanId, 1), IURAN);
        assertEq(usdc.balanceOf(address(factory)), (4 * IURAN) + IURAN);
    }

    function testTriggerPeriod_Success() public {
        _activateArisan(arisanId);

        vm.warp(block.timestamp + PERIOD);
        factory.triggerPeriod(arisanId);

        assertTrue(factory.vrfPending(arisanId));
        assertEq(factory.pendingVrfRequestId(arisanId), 1);
        assertEq(factory.vrfRequestTimestamp(arisanId), block.timestamp);
    }

    function testFulfillRandomWords_Success() public {
        _activateArisan(arisanId);

        uint256 requestId = _requestRandomness(arisanId);
        vrf.fulfill(requestId, 0);

        assertFalse(factory.vrfPending(arisanId));
        assertEq(factory.pendingVrfRequestId(arisanId), 0);
        assertEq(factory.vrfRequestTimestamp(arisanId), 0);
        assertEq(factory.currentPeriod(arisanId), 1);
        assertEq(factory.getWinnerHistory(arisanId)[0], alice);
        assertEq(factory.claimable(alice), 398e6);
        assertEq(factory.claimable(feeRecipient), 2e6);
    }

    function testClaim_Success() public {
        _activateArisan(arisanId);
        _selectWinner(arisanId, 0);

        vm.prank(alice);
        factory.claim();

        assertEq(usdc.balanceOf(alice), 398e6);
        assertEq(factory.claimable(alice), 0);
    }

    function testFullLifecycle_4Members_4Periods() public {
        _activateArisan(arisanId);

        for (uint256 period = 0; period < 4; period++) {
            if (period > 0) {
                _depositAll(arisanId, period);
            }
            _selectWinner(arisanId, period);
        }

        assertEq(uint256(factory.state(arisanId)), uint256(ArisanState.COMPLETED));
        assertEq(factory.currentPeriod(arisanId), 4);
        assertEq(factory.getWinnerHistory(arisanId).length, 4);
    }

    function testShuffleBag_AllMembersWinOnce() public {
        _activateArisan(arisanId);

        for (uint256 period = 0; period < 4; period++) {
            if (period > 0) {
                _depositAll(arisanId, period);
            }
            _selectWinner(arisanId, 0);
        }

        address[] memory winners = factory.getWinnerHistory(arisanId);
        for (uint256 i = 0; i < winners.length; i++) {
            for (uint256 j = i + 1; j < winners.length; j++) {
                assertTrue(winners[i] != winners[j]);
            }
        }
    }

    function testMultipleArisans_VRFRequestsStaySeparated() public {
        _activateArisan(arisanId);

        vm.prank(organizer);
        uint256 otherId = factory.createArisan(_config(3));
        _join(otherId, alice);
        _join(otherId, bob);
        _join(otherId, carol);

        uint256 requestOne = _requestRandomness(arisanId);
        uint256 requestTwo = _requestRandomness(otherId);

        vrf.fulfill(requestTwo, 1);
        assertEq(factory.currentPeriod(otherId), 1);
        assertEq(factory.currentPeriod(arisanId), 0);

        vrf.fulfill(requestOne, 0);
        assertEq(factory.currentPeriod(arisanId), 1);
        assertEq(factory.getWinnerHistory(arisanId)[0], alice);
        assertEq(factory.getWinnerHistory(otherId)[0], bob);
    }

    function testJoin_RevertIfActive() public {
        _activateArisan(arisanId);
        _fundApprove(eve);

        vm.expectRevert(ArisanNotOpen.selector);
        vm.prank(eve);
        factory.join(arisanId);
    }

    function testJoin_RevertIfAlreadyMember() public {
        _join(arisanId, alice);

        _fundApprove(alice);
        vm.expectRevert(AlreadyMember.selector);
        vm.prank(alice);
        factory.join(arisanId);
    }

    function testJoin_RevertIfInsufficientAllowance() public {
        usdc.mint(alice, IURAN);

        vm.expectRevert(InsufficientAllowance.selector);
        vm.prank(alice);
        factory.join(arisanId);
    }

    function testJoin_RevertIfInsufficientBalance() public {
        vm.prank(alice);
        usdc.approve(address(factory), IURAN);

        vm.expectRevert(InsufficientBalance.selector);
        vm.prank(alice);
        factory.join(arisanId);
    }

    function testDepositIuran_RevertIfNotMember() public {
        _activateArisan(arisanId);
        _selectWinner(arisanId, 0);
        _fundApprove(eve);

        vm.expectRevert(NotAMember.selector);
        vm.prank(eve);
        factory.depositIuran(arisanId, 1);
    }

    function testDepositIuran_RevertIfAlreadyPaid() public {
        _activateArisan(arisanId);

        vm.expectRevert(AlreadyPaidThisPeriod.selector);
        vm.prank(alice);
        factory.depositIuran(arisanId, 0);
    }

    function testDepositIuran_RevertIfWrongPeriod() public {
        _activateArisan(arisanId);
        _fundApprove(alice);

        vm.expectRevert(abi.encodeWithSelector(WrongPeriod.selector, 0, 1));
        vm.prank(alice);
        factory.depositIuran(arisanId, 1);
    }

    function testTriggerPeriod_RevertIfBeforeDeadline() public {
        _activateArisan(arisanId);

        vm.expectRevert(PeriodNotEnded.selector);
        factory.triggerPeriod(arisanId);
    }

    function testTriggerPeriod_RetryAfterVRFTimeout() public {
        _activateArisan(arisanId);
        uint256 staleRequestId = _requestRandomness(arisanId);

        vm.warp(block.timestamp + factory.VRF_REQUEST_TIMEOUT());
        factory.triggerPeriod(arisanId);

        uint256 replacementRequestId = factory.pendingVrfRequestId(arisanId);
        assertEq(replacementRequestId, staleRequestId + 1);
        assertTrue(factory.vrfPending(arisanId));
        assertEq(factory.vrfRequestTimestamp(arisanId), block.timestamp);

        vm.expectRevert(abi.encodeWithSelector(InvalidRequestId.selector, replacementRequestId, staleRequestId));
        vrf.fulfill(staleRequestId, 0);

        vrf.fulfill(replacementRequestId, 0);
        assertFalse(factory.vrfPending(arisanId));
        assertEq(factory.currentPeriod(arisanId), 1);
    }

    function testTriggerPeriod_RevertIfVRFPending() public {
        _activateArisan(arisanId);
        _requestRandomness(arisanId);

        vm.expectRevert(VRFPending.selector);
        factory.triggerPeriod(arisanId);
    }

    function testTriggerPeriod_RevertIfNothingCollected() public {
        _activateArisan(arisanId);
        _selectWinner(arisanId, 0);

        vm.warp(block.timestamp + PERIOD);
        vm.expectRevert(NothingCollected.selector);
        factory.triggerPeriod(arisanId);
    }

    function testTriggerPeriod_RevertIfCompleted() public {
        _activateArisan(arisanId);
        for (uint256 period = 0; period < 4; period++) {
            if (period > 0) {
                _depositAll(arisanId, period);
            }
            _selectWinner(arisanId, period);
        }

        vm.warp(block.timestamp + PERIOD);
        vm.expectRevert(ArisanAlreadyCompleted.selector);
        factory.triggerPeriod(arisanId);
    }

    function testFulfillRandomWords_RevertIfCalledDirectly() public {
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 1;

        vm.expectRevert(
            abi.encodeWithSelector(
                ManagedVRFConsumerBaseV2Plus.OnlyCoordinatorCanFulfill.selector, address(this), address(vrf)
            )
        );
        factory.rawFulfillRandomWords(1, randomWords);
    }

    function testFulfillRandomWords_RevertIfWrongRequestId() public {
        _activateArisan(arisanId);
        _requestRandomness(arisanId);

        vm.expectRevert(abi.encodeWithSelector(InvalidRequestId.selector, 1, 999));
        vrf.fulfillConsumer(address(factory), 999, 0);
    }

    function testClaim_RevertIfNothingToClaim() public {
        vm.expectRevert(NothingToClaim.selector);
        vm.prank(alice);
        factory.claim();
    }

    function _config(uint256 maxMembers) internal view returns (ArisanConfig memory) {
        return ArisanConfig({
            organizer: address(0),
            iuranAmount: IURAN,
            periodDuration: PERIOD,
            maxMembers: maxMembers,
            gracePeriodSeconds: 2 hours
        });
    }

    function _activateArisan(uint256 id) internal {
        for (uint256 i = 0; i < configMaxMembers(id); i++) {
            _join(id, members[i]);
        }
        assertEq(uint256(factory.state(id)), uint256(ArisanState.ACTIVE));
    }

    function _join(uint256 id, address member) internal {
        _fundApprove(member);
        vm.prank(member);
        factory.join(id);
    }

    function _fundApprove(address member) internal {
        usdc.mint(member, IURAN);
        vm.prank(member);
        usdc.approve(address(factory), IURAN);
    }

    function _depositAll(uint256 id, uint256 period) internal {
        for (uint256 i = 0; i < configMaxMembers(id); i++) {
            _fundApprove(members[i]);
            vm.prank(members[i]);
            factory.depositIuran(id, period);
        }
    }

    function _requestRandomness(uint256 id) internal returns (uint256 requestId) {
        vm.warp(block.timestamp + PERIOD);
        factory.triggerPeriod(id);
        requestId = factory.pendingVrfRequestId(id);
    }

    function _selectWinner(uint256 id, uint256 randomWord) internal {
        uint256 requestId = _requestRandomness(id);
        vrf.fulfill(requestId, randomWord);
    }

    function configMaxMembers(uint256 id) internal view returns (uint256 maxMembers) {
        (,,, maxMembers,) = factory.config(id);
    }

    function ZeroAddressSelector() internal pure returns (bytes4) {
        return bytes4(keccak256("ZeroAddress()"));
    }
}
