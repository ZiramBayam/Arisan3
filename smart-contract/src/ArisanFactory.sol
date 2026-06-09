// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

import {ArisanConfig, ArisanData, ArisanState} from "./interfaces/IArisanPool.sol";

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
error InvalidArisanId();

abstract contract ManagedVRFConsumerBaseV2Plus {
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

contract ArisanFactory is ManagedVRFConsumerBaseV2Plus, ReentrancyGuard {
    using SafeERC20 for IERC20;

    event ArisanCreated(uint256 indexed id, address organizer, uint256 memberCount, uint256 iuranAmount);
    event MemberJoined(uint256 indexed id, address member, uint256 slotIndex);
    event ArisanStarted(uint256 indexed id, uint256 timestamp);
    event IuranDeposited(uint256 indexed id, address member, uint256 period, uint256 amount);
    event RandomnessRequested(uint256 indexed id, uint256 vrfRequestId);
    event WinnerSelected(uint256 indexed id, uint256 period, address winner, uint256 netAmount, uint256 fee);
    event FundsClaimed(address indexed recipient, uint256 amount);
    event ArisanCompleted(uint256 indexed id, uint256 timestamp);

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

    IERC20 public immutable usdc;
    address public immutable feeRecipient;
    uint256 public immutable subscriptionId;
    bytes32 public immutable keyHash;

    uint256 public nextArisanId;

    mapping(uint256 => ArisanConfig) public config;
    mapping(address => uint256) public claimable;
    mapping(uint256 => uint256) public pendingVrfRequestId;
    mapping(uint256 => uint256) public vrfRequestTimestamp;
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public paidPeriods;
    mapping(uint256 => mapping(uint256 => uint256)) public periodCollected;

    mapping(uint256 => ArisanData) internal data;
    mapping(uint256 => bool) internal exists;
    mapping(uint256 => uint256) internal requestToArisanId;

    constructor(
        address _feeRecipient,
        address _vrfCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash,
        address _usdc
    ) {
        if (_feeRecipient == address(0) || _vrfCoordinator == address(0) || _usdc == address(0)) {
            revert ZeroAddress();
        }

        feeRecipient = _feeRecipient;
        s_vrfCoordinator = IVRFCoordinatorV2Plus(_vrfCoordinator);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        usdc = IERC20(_usdc);
    }

    function createArisan(ArisanConfig calldata params) external returns (uint256 arisanId) {
        if (params.maxMembers < MIN_MEMBERS || params.maxMembers > MAX_MEMBERS) revert InvalidMemberCount();
        if (params.iuranAmount == 0) revert InvalidIuranAmount();
        if (params.periodDuration < MIN_PERIOD_DURATION) revert InvalidPeriodDuration();

        arisanId = nextArisanId++;
        exists[arisanId] = true;
        config[arisanId] = ArisanConfig({
            organizer: msg.sender,
            iuranAmount: params.iuranAmount,
            periodDuration: params.periodDuration,
            maxMembers: params.maxMembers,
            gracePeriodSeconds: params.gracePeriodSeconds
        });
        data[arisanId].state = ArisanState.OPEN;

        emit ArisanCreated(arisanId, msg.sender, params.maxMembers, params.iuranAmount);
    }

    function join(uint256 arisanId) external nonReentrant {
        _requireArisan(arisanId);
        ArisanData storage arisan = data[arisanId];
        ArisanConfig storage arisanConfig = config[arisanId];

        if (arisan.state != ArisanState.OPEN) revert ArisanNotOpen();
        if (_isMember(arisanId, msg.sender)) revert AlreadyMember();
        _checkAllowanceAndBalance(msg.sender, arisanConfig.iuranAmount);

        arisan.members.push(msg.sender);
        arisan.remainingCandidates.push(msg.sender);
        paidPeriods[arisanId][msg.sender][0] = true;
        periodCollected[arisanId][0] += arisanConfig.iuranAmount;

        if (arisan.members.length == arisanConfig.maxMembers) {
            arisan.state = ArisanState.ACTIVE;
            arisan.periodStartTimestamp = block.timestamp;
            emit ArisanStarted(arisanId, block.timestamp);
        }

        usdc.safeTransferFrom(msg.sender, address(this), arisanConfig.iuranAmount);
        emit MemberJoined(arisanId, msg.sender, arisan.members.length - 1);
    }

    function leavePool(uint256 arisanId) external nonReentrant {
        _requireArisan(arisanId);
        ArisanData storage arisan = data[arisanId];
        ArisanConfig storage arisanConfig = config[arisanId];

        if (arisan.state != ArisanState.OPEN) revert ArisanNotOpen();
        if (!_isMember(arisanId, msg.sender)) revert NotAMember();

        paidPeriods[arisanId][msg.sender][0] = false;
        periodCollected[arisanId][0] -= arisanConfig.iuranAmount;
        _removeAddress(arisan.members, msg.sender);
        _removeAddress(arisan.remainingCandidates, msg.sender);

        usdc.safeTransfer(msg.sender, arisanConfig.iuranAmount);
    }

    function depositIuran(uint256 arisanId, uint256 period) external nonReentrant {
        _requireArisan(arisanId);
        ArisanData storage arisan = data[arisanId];
        ArisanConfig storage arisanConfig = config[arisanId];

        if (arisan.state != ArisanState.ACTIVE) revert ArisanNotActive();
        if (!_isMember(arisanId, msg.sender)) revert NotAMember();
        if (period != arisan.currentPeriod) revert WrongPeriod(arisan.currentPeriod, period);
        if (paidPeriods[arisanId][msg.sender][period]) revert AlreadyPaidThisPeriod();
        _checkAllowanceAndBalance(msg.sender, arisanConfig.iuranAmount);

        paidPeriods[arisanId][msg.sender][period] = true;
        periodCollected[arisanId][period] += arisanConfig.iuranAmount;
        usdc.safeTransferFrom(msg.sender, address(this), arisanConfig.iuranAmount);
        emit IuranDeposited(arisanId, msg.sender, period, arisanConfig.iuranAmount);
    }

    function triggerPeriod(uint256 arisanId) external {
        _requireArisan(arisanId);
        ArisanData storage arisan = data[arisanId];
        ArisanConfig storage arisanConfig = config[arisanId];

        if (arisan.state == ArisanState.COMPLETED) revert ArisanAlreadyCompleted();
        if (arisan.state != ArisanState.ACTIVE) revert ArisanNotActive();
        if (arisan.vrfPending && block.timestamp < vrfRequestTimestamp[arisanId] + VRF_REQUEST_TIMEOUT) {
            revert VRFPending();
        }
        if (block.timestamp < arisan.periodStartTimestamp + arisanConfig.periodDuration) revert PeriodNotEnded();
        if (periodCollected[arisanId][arisan.currentPeriod] == 0) revert NothingCollected();

        arisan.vrfPending = true;
        vrfRequestTimestamp[arisanId] = block.timestamp;
        uint256 requestId = s_vrfCoordinator.requestRandomWords(
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
        pendingVrfRequestId[arisanId] = requestId;
        requestToArisanId[requestId] = arisanId;
        emit RandomnessRequested(arisanId, requestId);
    }

    function claim() external nonReentrant {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToClaim();

        claimable[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);
        emit FundsClaimed(msg.sender, amount);
    }

    function state(uint256 arisanId) external view returns (ArisanState) {
        _requireArisan(arisanId);
        return data[arisanId].state;
    }

    function currentPeriod(uint256 arisanId) external view returns (uint256) {
        _requireArisan(arisanId);
        return data[arisanId].currentPeriod;
    }

    function periodStartTimestamp(uint256 arisanId) external view returns (uint256) {
        _requireArisan(arisanId);
        return data[arisanId].periodStartTimestamp;
    }

    function vrfPending(uint256 arisanId) external view returns (bool) {
        _requireArisan(arisanId);
        return data[arisanId].vrfPending;
    }

    function getMembers(uint256 arisanId) external view returns (address[] memory) {
        _requireArisan(arisanId);
        return data[arisanId].members;
    }

    function getRemainingCandidates(uint256 arisanId) external view returns (address[] memory) {
        _requireArisan(arisanId);
        return data[arisanId].remainingCandidates;
    }

    function getWinnerHistory(uint256 arisanId) external view returns (address[] memory) {
        _requireArisan(arisanId);
        return data[arisanId].winnerHistory;
    }

    function isMember(uint256 arisanId, address account) external view returns (bool) {
        _requireArisan(arisanId);
        return _isMember(arisanId, account);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        uint256 arisanId = requestToArisanId[requestId];
        if (!exists[arisanId]) revert InvalidArisanId();
        if (requestId != pendingVrfRequestId[arisanId]) revert InvalidRequestId(pendingVrfRequestId[arisanId], requestId);

        ArisanData storage arisan = data[arisanId];
        if (!arisan.vrfPending) revert VRFNotPending();

        address winner = _pickWinner(arisanId, randomWords[0]);
        arisan.winnerHistory.push(winner);

        uint256 totalPool = periodCollected[arisanId][arisan.currentPeriod];
        uint256 fee = (totalPool * FEE_BPS) / BPS_DENOMINATOR;
        uint256 netAmount = totalPool - fee;

        claimable[winner] += netAmount;
        claimable[feeRecipient] += fee;

        uint256 completedPeriod = arisan.currentPeriod;
        arisan.currentPeriod++;
        arisan.periodStartTimestamp = block.timestamp;
        arisan.vrfPending = false;
        pendingVrfRequestId[arisanId] = 0;
        vrfRequestTimestamp[arisanId] = 0;
        delete requestToArisanId[requestId];

        bool completed = arisan.currentPeriod >= config[arisanId].maxMembers;
        if (completed) {
            arisan.state = ArisanState.COMPLETED;
        }

        emit WinnerSelected(arisanId, completedPeriod, winner, netAmount, fee);
        if (completed) {
            emit ArisanCompleted(arisanId, block.timestamp);
        }
    }

    function _pickWinner(uint256 arisanId, uint256 randomWord) internal returns (address winner) {
        ArisanData storage arisan = data[arisanId];
        if (arisan.remainingCandidates.length == 0) {
            arisan.remainingCandidates = arisan.members;
        }

        uint256 index = randomWord % arisan.remainingCandidates.length;
        winner = arisan.remainingCandidates[index];

        uint256 last = arisan.remainingCandidates.length - 1;
        if (index != last) {
            arisan.remainingCandidates[index] = arisan.remainingCandidates[last];
        }
        arisan.remainingCandidates.pop();
    }

    function _isMember(uint256 arisanId, address account) internal view returns (bool) {
        address[] storage members = data[arisanId].members;
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == account) {
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

    function _checkAllowanceAndBalance(address account, uint256 amount) private view {
        if (usdc.allowance(account, address(this)) < amount) revert InsufficientAllowance();
        if (usdc.balanceOf(account) < amount) revert InsufficientBalance();
    }

    function _requireArisan(uint256 arisanId) private view {
        if (!exists[arisanId]) revert InvalidArisanId();
    }
}
