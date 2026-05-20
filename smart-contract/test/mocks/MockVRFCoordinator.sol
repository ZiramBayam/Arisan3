// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

interface IVRFConsumer {
    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external;
}

contract MockVRFCoordinator {
    uint256 public nextRequestId = 1;
    mapping(uint256 => address) public consumers;

    function requestRandomWords(VRFV2PlusClient.RandomWordsRequest calldata) external returns (uint256 requestId) {
        requestId = nextRequestId++;
        consumers[requestId] = msg.sender;
    }

    function fulfill(uint256 requestId, uint256 randomWord) external {
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = randomWord;
        IVRFConsumer(consumers[requestId]).rawFulfillRandomWords(requestId, randomWords);
    }

    function fulfillConsumer(address consumer, uint256 requestId, uint256 randomWord) external {
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = randomWord;
        IVRFConsumer(consumer).rawFulfillRandomWords(requestId, randomWords);
    }

    function fulfillWithWords(uint256 requestId, uint256[] calldata randomWords) external {
        IVRFConsumer(consumers[requestId]).rawFulfillRandomWords(requestId, randomWords);
    }
}
