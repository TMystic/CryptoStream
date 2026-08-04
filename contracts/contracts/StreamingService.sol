// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StreamingService
 * @dev Decentralised video streaming platform.
 *
 * The contract is the single source of truth for:
 *  - the credit economy (users top up with test ETH and spend credits)
 *  - access control (per-video permission lists stored on-chain)
 *
 * Video files themselves live off-chain (Firebase Storage); the contract
 * registers metadata and enforces who is allowed to stream them.
 */
contract StreamingService is Ownable {
    /* ------------------------------------------------------------------ */
    /* Errors                                                              */
    /* ------------------------------------------------------------------ */

    error InvalidAmount(uint256 sent, uint256 minimum);
    error TransferFailed();
    error VideoDoesNotExist(uint256 id);
    error AlreadyHasAccess(uint256 id);
    error InsufficientCredits(uint256 balance, uint256 required);

    /* ------------------------------------------------------------------ */
    /* Types                                                               */
    /* ------------------------------------------------------------------ */

    struct Video {
        uint256 id;
        string title;
        string description;
        address uploader;
    }

    struct AccessControl {
        address owner;
        address[] accessList;
        mapping(address => bool) hasAccess;
    }

    /* ------------------------------------------------------------------ */
    /* State                                                               */
    /* ------------------------------------------------------------------ */

    /// @dev Cost of the smallest credit top-up unit.
    uint256 public constant CREDIT_PRICE = 0.001 ether;

    /// @dev Credits minted for each full CREDIT_PRICE unit sent.
    uint256 public constant CREDITS_PER_UNIT = 1000;

    /// @dev Price in credits to unlock one video.
    uint256 public constant VIDEO_COST = 100;

    /// @dev Address that receives all ETH from credit top-ups.
    address public immutable recipient;

    /// @dev Monotonically increasing video counter.
    uint256 public videoCount;

    /// @dev Registered video metadata, indexed by id.
    mapping(uint256 => Video) public videos;

    /// @dev Per-video access control state.
    mapping(uint256 => AccessControl) public videoAccess;

    /// @dev Credit balances of viewers/creators.
    mapping(address => uint256) public balances;

    /// @dev Ids of videos owned or purchased by an address.
    mapping(address => uint256[]) public videosByAddress;

    /* ------------------------------------------------------------------ */
    /* Events                                                              */
    /* ------------------------------------------------------------------ */

    event VideoUploaded(uint256 indexed id, string title, string description, address indexed uploader);
    event VideoPurchased(uint256 indexed videoId, address indexed buyer);
    event CreditsPurchased(address indexed buyer, uint256 ethAmount, uint256 credits);

    /* ------------------------------------------------------------------ */
    /* Constructor                                                         */
    /* ------------------------------------------------------------------ */

    constructor(address payable _recipient) Ownable(msg.sender) {
        recipient = _recipient;
    }

    /* ------------------------------------------------------------------ */
    /* Credit economy                                                      */
    /* ------------------------------------------------------------------ */

    /**
     * @dev Converts sent test ETH into credits. Funds are forwarded to
     * `recipient`; the sender receives `CREDITS_PER_UNIT` per full unit.
     * Checks-effects-interactions: state is updated before the external call.
     */
    function buyCredits() public payable {
        if (msg.value < CREDIT_PRICE) {
            revert InvalidAmount(msg.value, CREDIT_PRICE);
        }

        uint256 units = msg.value / CREDIT_PRICE;
        uint256 credits = units * CREDITS_PER_UNIT;

        // effects
        balances[msg.sender] += credits;

        // interactions
        (bool ok, ) = recipient.call{value: msg.value}("");
        if (!ok) {
            revert TransferFailed();
        }

        emit CreditsPurchased(msg.sender, msg.value, credits);
    }

    /* ------------------------------------------------------------------ */
    /* Video management                                                    */
    /* ------------------------------------------------------------------ */

    /**
     * @dev Registers a new video and grants the uploader permanent access.
     */
    function uploadVideo(string memory _title, string memory _description) public {
        videoCount++;
        uint256 id = videoCount;

        videos[id] = Video({id: id, title: _title, description: _description, uploader: msg.sender});

        AccessControl storage ac = videoAccess[id];
        ac.owner = msg.sender;
        ac.hasAccess[msg.sender] = true;
        ac.accessList.push(msg.sender);

        videosByAddress[msg.sender].push(id);

        emit VideoUploaded(id, _title, _description, msg.sender);
    }

    /**
     * @dev Unlocks a video for the caller by spending `VIDEO_COST` credits.
     */
    function buyVideo(uint256 videoNumber) public {
        if (videoNumber == 0 || videoNumber > videoCount) {
            revert VideoDoesNotExist(videoNumber);
        }
        if (videoAccess[videoNumber].hasAccess[msg.sender]) {
            revert AlreadyHasAccess(videoNumber);
        }
        if (balances[msg.sender] < VIDEO_COST) {
            revert InsufficientCredits(balances[msg.sender], VIDEO_COST);
        }

        // effects
        balances[msg.sender] -= VIDEO_COST;

        AccessControl storage ac = videoAccess[videoNumber];
        ac.hasAccess[msg.sender] = true;
        ac.accessList.push(msg.sender);

        videosByAddress[msg.sender].push(videoNumber);

        emit VideoPurchased(videoNumber, msg.sender);
    }

    /* ------------------------------------------------------------------ */
    /* Read functions                                                      */
    /* ------------------------------------------------------------------ */

    /**
     * @dev Returns video metadata. Reverts unless the caller has access.
     */
    function getVideo(uint256 _id) public view returns (Video memory) {
        if (_id == 0 || _id > videoCount) {
            revert VideoDoesNotExist(_id);
        }
        if (!videoAccess[_id].hasAccess[msg.sender]) {
            revert AlreadyHasAccess(_id);
        }
        return videos[_id];
    }

    /**
     * @dev Lists all addresses with access to a video.
     */
    function getAccessList(uint256 videoNumber) public view returns (address[] memory) {
        if (videoNumber == 0 || videoNumber > videoCount) {
            revert VideoDoesNotExist(videoNumber);
        }
        return videoAccess[videoNumber].accessList;
    }

    /**
     * @dev Lists ids of videos an address owns or has purchased.
     */
    function getVideosByAddress(address _addr) public view returns (uint256[] memory) {
        return videosByAddress[_addr];
    }
}
