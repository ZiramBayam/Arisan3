// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

import {ArisanConfig, ArisanData, ArisanState, IArisanPool} from "./interfaces/IArisanPool.sol";

error ArisanNotOpen();
error ArisanNotActive();
error ArisanAlreadyCompleted();
error AlreadyMember();
error NotAMember();
error InsufficientAllowance();
error InsufficientBalance();
error PeriodNotEnded();
error AlreadyPaidThisPeriod();
error WrongPeriod(uint256 expected, uint256 provided);
error VRFPending();
error VRFNotPending();
error InvalidRequestId(uint256 expected, uint256 provided);
error NothingToClaim();
error InvalidMemberCount();
error InvalidIuranAmount();
error InvalidPeriodDuration();
error NothingCollected();
error ZeroAddress();

abstract contract VRFConsumerBaseV2Plus {
    error OnlyCoordinatorCanFulfill(address have, address want);

    IVRFCoordinatorV2Plus public s_vrfCoordinator;

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal virtual;

    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        if (msg.sender != address(s_vrfCoordinator)) {
            revert OnlyCoordinatorCanFulfill(msg.sender, address(s_vrfCoordinator));
        }
        fulfillRandomWords(requestId, randomWords);
    }
}

contract ArisanPool is VRFConsumerBaseV2Plus, ReentrancyGuard, Initializable, IArisanPool {
    using SafeERC20 for IERC20;

    event MemberJoined(address indexed member, uint256 slotIndex);
    event ArisanStarted(uint256 timestamp);
    event IuranDeposited(address indexed member, uint256 indexed period, uint256 amount);
    event RandomnessRequested(uint256 vrfRequestId);
    event WinnerSelected(uint256 indexed period, address indexed winner, uint256 netAmount, uint256 fee);
    event FundsClaimed(address indexed recipient, uint256 amount);
    event ArisanCompleted(uint256 timestamp);

    uint256 public constant FEE_BPS = 50;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint32 public constant CALLBACK_GAS_LIMIT = 100_000;
    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint32 public constant NUM_WORDS = 1;
    bool public constant ENABLE_NATIVE_PAYMENT = false;
    uint256 public constant MIN_MEMBERS = 3;
    uint256 public constant MAX_MEMBERS = 50;
    uint256 public constant MIN_PERIOD_DURATION = 1 days;
    uint256 public constant VRF_REQUEST_TIMEOUT = 1 days;

    IERC20 public usdc;
    ArisanConfig public config;
    ArisanData internal data;
    address public feeRecipient;
    uint256 public subscriptionId;
    bytes32 public keyHash;
    mapping(address => mapping(uint256 => bool)) public paidPeriods;
    mapping(address => uint256) public claimable;
    mapping(uint256 => uint256) public periodCollected;
    uint256 public pendingVrfRequestId;
    uint256 public vrfRequestTimestamp;

    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes a clone with its immutable-by-policy configuration.
    /// @dev Must be called exactly once by the factory immediately after clone deployment.
    function initialize(
        ArisanConfig calldata _config,
        address organizer,
        address _feeRecipient,
        address vrfCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash,
        address _usdc
    ) external initializer {
        if (
            organizer == address(0) || _feeRecipient == address(0) || vrfCoordinator == address(0)
                || _usdc == address(0)
        ) {
            revert ZeroAddress();
        }
        if (_config.maxMembers < MIN_MEMBERS || _config.maxMembers > MAX_MEMBERS) revert InvalidMemberCount();
        if (_config.iuranAmount == 0) revert InvalidIuranAmount();
        if (_config.periodDuration < MIN_PERIOD_DURATION) revert InvalidPeriodDuration();

        usdc = IERC20(_usdc);
        config = ArisanConfig({
            organizer: organizer,
            iuranAmount: _config.iuranAmount,
            periodDuration: _config.periodDuration,
            maxMembers: _config.maxMembers,
            gracePeriodSeconds: _config.gracePeriodSeconds
        });
        feeRecipient = _feeRecipient;
        s_vrfCoordinator = IVRFCoordinatorV2Plus(vrfCoordinator);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        data.state = ArisanState.OPEN;
    }

    /// @notice Anggota join arisan dan deposit iuran periode pertama.
    /// @dev Require USDC approval sebelum dipanggil.
    function join() external {
        if (data.state != ArisanState.OPEN) revert ArisanNotOpen();
        if (_isMember(msg.sender)) revert AlreadyMember();
        _checkAllowanceAndBalance(msg.sender);

        data.members.push(msg.sender);
        data.remainingCandidates.push(msg.sender);
        paidPeriods[msg.sender][0] = true;
        periodCollected[0] += config.iuranAmount;

        if (data.members.length == config.maxMembers) {
            data.state = ArisanState.ACTIVE;
            data.periodStartTimestamp = block.timestamp;
            emit ArisanStarted(block.timestamp);
        }

        usdc.safeTransferFrom(msg.sender, address(this), config.iuranAmount);
        emit MemberJoined(msg.sender, data.members.length - 1);
    }

    /// @notice Leaves an open pool and refunds the first-period iuran.
    /// @dev Only available before the pool becomes active.
    function leavePool() external nonReentrant {
        if (data.state != ArisanState.OPEN) revert ArisanNotOpen();
        if (!_isMember(msg.sender)) revert NotAMember();

        paidPeriods[msg.sender][0] = false;
        periodCollected[0] -= config.iuranAmount;
        _removeAddress(data.members, msg.sender);
        _removeAddress(data.remainingCandidates, msg.sender);

        usdc.safeTransfer(msg.sender, config.iuranAmount);
    }

    /// @notice Deposits the iuran for the active period.
    /// @dev Caller must be a member and must approve USDC first.
    function depositIuran(uint256 period) external {
        if (data.state != ArisanState.ACTIVE) revert ArisanNotActive();
        if (!_isMember(msg.sender)) revert NotAMember();
        if (period != data.currentPeriod) revert WrongPeriod(data.currentPeriod, period);
        if (paidPeriods[msg.sender][period]) revert AlreadyPaidThisPeriod();
        _checkAllowanceAndBalance(msg.sender);

        paidPeriods[msg.sender][period] = true;
        periodCollected[period] += config.iuranAmount;
        usdc.safeTransferFrom(msg.sender, address(this), config.iuranAmount);
        emit IuranDeposited(msg.sender, period, config.iuranAmount);
    }

    /// @notice Requests Chainlink VRF randomness after the current period ends.
    /// @dev Permissionless; sets the VRF lock before the external coordinator call.
    function triggerPeriod() external {
        if (data.state == ArisanState.COMPLETED) revert ArisanAlreadyCompleted();
        if (data.state != ArisanState.ACTIVE) revert ArisanNotActive();
        if (data.vrfPending && block.timestamp < vrfRequestTimestamp + VRF_REQUEST_TIMEOUT) revert VRFPending();
        if (block.timestamp < data.periodStartTimestamp + config.periodDuration) revert PeriodNotEnded();
        if (periodCollected[data.currentPeriod] == 0) revert NothingCollected();

        data.vrfPending = true;
        vrfRequestTimestamp = block.timestamp;
        pendingVrfRequestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: CALLBACK_GAS_LIMIT,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: ENABLE_NATIVE_PAYMENT})
                )
            })
        );
        emit RandomnessRequested(pendingVrfRequestId);
    }

    /// @notice Claims accumulated winner or fee recipient funds.
    /// @dev Uses pull payment and clears claimable before token transfer.
    function claim() external nonReentrant {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToClaim();

        claimable[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);
        emit FundsClaimed(msg.sender, amount);
    }

    /// @notice Returns the current state.
    function state() external view returns (ArisanState) {
        return data.state;
    }

    /// @notice Returns the active period index.
    function currentPeriod() external view returns (uint256) {
        return data.currentPeriod;
    }

    /// @notice Returns the timestamp when the current period started.
    function periodStartTimestamp() external view returns (uint256) {
        return data.periodStartTimestamp;
    }

    /// @notice Returns whether a VRF request is pending.
    function vrfPending() external view returns (bool) {
        return data.vrfPending;
    }

    /// @notice Returns all members.
    function getMembers() external view returns (address[] memory) {
        return data.members;
    }

    /// @notice Returns the current shuffle bag.
    function getRemainingCandidates() external view returns (address[] memory) {
        return data.remainingCandidates;
    }

    /// @notice Returns winner history.
    function getWinnerHistory() external view returns (address[] memory) {
        return data.winnerHistory;
    }

    /// @notice Returns whether an address is a member.
    function isMember(address account) external view returns (bool) {
        return _isMember(account);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        if (requestId != pendingVrfRequestId) revert InvalidRequestId(pendingVrfRequestId, requestId);
        if (!data.vrfPending) revert VRFNotPending();

        address winner = _pickWinner(randomWords[0]);
        data.winnerHistory.push(winner);

        uint256 totalPool = periodCollected[data.currentPeriod];
        uint256 fee = (totalPool * FEE_BPS) / BPS_DENOMINATOR;
        uint256 netAmount = totalPool - fee;

        claimable[winner] += netAmount;
        claimable[feeRecipient] += fee;

        data.currentPeriod++;
        data.periodStartTimestamp = block.timestamp;
        data.vrfPending = false;
        pendingVrfRequestId = 0;
        vrfRequestTimestamp = 0;

        bool completed = data.currentPeriod >= config.maxMembers;
        if (completed) {
            data.state = ArisanState.COMPLETED;
        }

        emit WinnerSelected(data.currentPeriod - 1, winner, netAmount, fee);
        if (completed) {
            emit ArisanCompleted(block.timestamp);
        }
    }

    function _pickWinner(uint256 randomWord) internal returns (address winner) {
        if (data.remainingCandidates.length == 0) {
            data.remainingCandidates = data.members;
        }

        uint256 index = randomWord % data.remainingCandidates.length;
        winner = data.remainingCandidates[index];

        uint256 last = data.remainingCandidates.length - 1;
        if (index != last) {
            data.remainingCandidates[index] = data.remainingCandidates[last];
        }
        data.remainingCandidates.pop();
    }

    function _isMember(address account) internal view returns (bool) {
        for (uint256 i = 0; i < data.members.length; i++) {
            if (data.members[i] == account) {
                return true;
            }
        }
        return false;
    }

    function _removeAddress(address[] storage accounts, address account) private {
        for (uint256 i = 0; i < accounts.length; i++) {
            if (accounts[i] == account) {
                uint256 last = accounts.length - 1;
                if (i != last) {
                    accounts[i] = accounts[last];
                }
                accounts.pop();
                return;
            }
        }
        revert NotAMember();
    }

    function _checkAllowanceAndBalance(address account) private view {
        if (usdc.allowance(account, address(this)) < config.iuranAmount) revert InsufficientAllowance();
        if (usdc.balanceOf(account) < config.iuranAmount) revert InsufficientBalance();
    }
}
