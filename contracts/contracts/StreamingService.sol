// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

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
    using MessageHashUtils for bytes32;
    /* ------------------------------------------------------------------ */
    /* Errors                                                              */
    /* ------------------------------------------------------------------ */

    error InvalidAmount(uint256 sent, uint256 minimum);
    error TransferFailed();
    error VideoDoesNotExist(uint256 id);
    error AlreadyHasAccess(uint256 id);
    error AccessDenied(uint256 id, address viewer);
    error InvalidMetadata();
    error InsufficientCredits(uint256 balance, uint256 required);
    error AuthorizationExpired();
    error InvalidAuthorization();

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

    /// @dev Price in credits to register one upload.
    uint256 public constant UPLOAD_COST = 100;

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

    /// @dev Replay protection for sponsored actions.
    mapping(address => uint256) public nonces;

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
        _uploadVideo(msg.sender, _title, _description);
    }

    function sponsoredUploadVideo(
        address uploader,
        string memory title,
        string memory description,
        uint256 deadline,
        bytes memory signature
    ) public {
        uint256 nonce = nonces[uploader];
        bytes32 digest = uploadAuthorizationHash(uploader, title, description, nonce, deadline);
        _verifyAuthorization(uploader, digest, deadline, signature);
        nonces[uploader] = nonce + 1;
        _uploadVideo(uploader, title, description);
    }

    function _uploadVideo(address uploader, string memory _title, string memory _description) internal {
        if (
            bytes(_title).length == 0 || bytes(_title).length > 120 ||
            bytes(_description).length == 0 || bytes(_description).length > 2000
        ) {
            revert InvalidMetadata();
        }
        if (balances[uploader] < UPLOAD_COST) {
            revert InsufficientCredits(balances[uploader], UPLOAD_COST);
        }
        balances[uploader] -= UPLOAD_COST;
        videoCount++;
        uint256 id = videoCount;

        videos[id] = Video({id: id, title: _title, description: _description, uploader: uploader});

        AccessControl storage ac = videoAccess[id];
        ac.owner = uploader;
        ac.hasAccess[uploader] = true;
        ac.accessList.push(uploader);

        videosByAddress[uploader].push(id);

        emit VideoUploaded(id, _title, _description, uploader);
    }

    /**
     * @dev Unlocks a video for the caller by spending `VIDEO_COST` credits.
     */
    function buyVideo(uint256 videoNumber) public {
        _buyVideo(msg.sender, videoNumber);
    }

    function sponsoredBuyVideo(
        address buyer,
        uint256 videoNumber,
        uint256 deadline,
        bytes memory signature
    ) public {
        uint256 nonce = nonces[buyer];
        bytes32 digest = purchaseAuthorizationHash(buyer, videoNumber, nonce, deadline);
        _verifyAuthorization(buyer, digest, deadline, signature);
        nonces[buyer] = nonce + 1;
        _buyVideo(buyer, videoNumber);
    }

    function _buyVideo(address buyer, uint256 videoNumber) internal {
        if (videoNumber == 0 || videoNumber > videoCount) {
            revert VideoDoesNotExist(videoNumber);
        }
        if (videoAccess[videoNumber].hasAccess[buyer]) {
            revert AlreadyHasAccess(videoNumber);
        }
        if (balances[buyer] < VIDEO_COST) {
            revert InsufficientCredits(balances[buyer], VIDEO_COST);
        }

        // effects
        balances[buyer] -= VIDEO_COST;

        AccessControl storage ac = videoAccess[videoNumber];
        ac.hasAccess[buyer] = true;
        ac.accessList.push(buyer);

        videosByAddress[buyer].push(videoNumber);

        emit VideoPurchased(videoNumber, buyer);
    }

    function uploadAuthorizationHash(
        address uploader,
        string memory title,
        string memory description,
        uint256 nonce,
        uint256 deadline
    ) public view returns (bytes32) {
        return keccak256(abi.encode(
            "CRYPTOSTREAM_UPLOAD", address(this), block.chainid, uploader,
            keccak256(bytes(title)), keccak256(bytes(description)), nonce, deadline
        ));
    }

    function purchaseAuthorizationHash(
        address buyer,
        uint256 videoNumber,
        uint256 nonce,
        uint256 deadline
    ) public view returns (bytes32) {
        return keccak256(abi.encode(
            "CRYPTOSTREAM_PURCHASE", address(this), block.chainid, buyer,
            videoNumber, nonce, deadline
        ));
    }

    function _verifyAuthorization(
        address signer,
        bytes32 digest,
        uint256 deadline,
        bytes memory signature
    ) internal view {
        if (block.timestamp > deadline) revert AuthorizationExpired();
        if (ECDSA.recover(digest.toEthSignedMessageHash(), signature) != signer) {
            revert InvalidAuthorization();
        }
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
            revert AccessDenied(_id, msg.sender);
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
     * @dev Checks access without exposing the full viewer list.
     */
    function hasVideoAccess(uint256 videoNumber, address viewer) public view returns (bool) {
        if (videoNumber == 0 || videoNumber > videoCount) return false;
        return videoAccess[videoNumber].hasAccess[viewer];
    }

    /**
     * @dev Lists ids of videos an address owns or has purchased.
     */
    function getVideosByAddress(address _addr) public view returns (uint256[] memory) {
        return videosByAddress[_addr];
    }
}
