// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

/// QoreChain PQC precompiles (Diana): 0x..0A01 pqcVerify, 0x..0A02 pqcKeyStatus.
interface IQorePQC {
    function pqcVerify(bytes calldata pubkey, bytes calldata signature, bytes calldata message) external view returns (bool valid);
    function pqcKeyStatus(address account)
        external
        view
        returns (bool registered, uint8 algorithmId, bytes memory pubkey, bool possessionProven);
}

/// @title Halte: a missing-watch report blocks every transfer of the watch's passport.
/// Every action that changes who may hold the passport needs the holder's ML-DSA-87 signature,
/// checked on chain by pqcVerify against the PoP-backed key the holder registered with QoreChain:
/// issuing a transfer offer, reporting the watch missing (freeze) and lifting the report (recover).
/// The passport's epoch moves on every freeze, recovery and transfer, so every older offer dies.
contract Halte {
    address internal constant PQC_VERIFY = 0x0000000000000000000000000000000000000a01;
    address internal constant PQC_KEY_STATUS = 0x0000000000000000000000000000000000000a02;
    uint8 internal constant ML_DSA_87 = 1;
    uint256 internal constant ML_DSA_87_PUBKEY_BYTES = 2592;
    uint256 internal constant ML_DSA_87_SIG_BYTES = 4627;

    enum Status { None, Active, Frozen }

    struct Passport {
        address owner;
        Status status;
        uint64 epoch; // bumped on freeze, recover and transfer; offers from an older epoch are dead
        uint64 nonce; // lifecycle counter: bumped on freeze, recover and transfer; stops freeze/recover replay
        uint64 offerNonce; // bumped on every PQ-signed offer; kept apart so an offer can't void a pending freeze
    }

    struct Offer {
        bytes32 passportId;
        address dealer;
        uint64 epoch;
        uint64 expiry;
        bool open;
    }

    mapping(bytes32 => Passport) public passports;
    mapping(uint256 => Offer) public offers;
    uint256 public offerCount;

    event Minted(bytes32 indexed id, address indexed owner);
    event OfferMade(uint256 indexed offerId, bytes32 indexed id, address indexed dealer, uint64 epoch, uint64 expiry);
    event Transferred(bytes32 indexed id, address indexed from, address indexed to, uint256 offerId);
    event Frozen(bytes32 indexed id, address indexed owner, uint64 epoch, uint64 nonce);
    event Recovered(bytes32 indexed id, address indexed owner, uint64 epoch, uint64 nonce);
    event OfferCancelled(uint256 indexed offerId, bytes32 indexed id);

    error NotOwner();
    error NotDealer();
    error AlreadyExists();
    error UnknownPassport();
    error NoPqcKey();
    error PassportFrozen();
    error NotFrozen();
    error AlreadyFrozen();
    error OfferClosed();
    error StaleOffer();
    error Expired();
    error InvalidDealer();
    error BadPqcSignature();
    error PrecompileUnavailable();

    /// The holder must already hold a registered, PoP-proven ML-DSA-87 key, or they could never freeze.
    function mint(bytes32 id) external {
        if (passports[id].status != Status.None) revert AlreadyExists();
        _requirePqcKey(msg.sender);
        passports[id] = Passport({owner: msg.sender, status: Status.Active, epoch: 0, nonce: 0, offerNonce: 0});
        emit Minted(id, msg.sender);
    }

    /// Opens a transfer offer to one named dealer. Needs the holder's ML-DSA-87 signature over
    /// offerDigest(id, dealer, epoch, offerNonce, expiry): a stolen classical key can't hand the passport away.
    /// Anyone may relay it; the dealer is signed, so a relayed copy can't redirect the offer.
    function makeOffer(bytes32 id, address dealer, uint64 expiry, bytes calldata signature)
        external
        returns (uint256 offerId)
    {
        Passport storage p = passports[id];
        if (p.status == Status.None) revert UnknownPassport();
        if (p.status == Status.Frozen) revert PassportFrozen();
        if (dealer == address(0) || dealer == p.owner) revert InvalidDealer();
        _checkPq(p, offerDigest(id, dealer, p.epoch, p.offerNonce, expiry), expiry, signature);
        p.offerNonce++;
        offerId = ++offerCount;
        offers[offerId] = Offer({passportId: id, dealer: dealer, epoch: p.epoch, expiry: expiry, open: true});
        emit OfferMade(offerId, id, dealer, p.epoch, expiry);
    }

    function acceptOffer(uint256 offerId) external {
        Offer storage o = offers[offerId];
        if (!o.open) revert OfferClosed();
        if (msg.sender != o.dealer) revert NotDealer();
        Passport storage p = passports[o.passportId];
        if (p.status == Status.Frozen) revert PassportFrozen();
        if (o.epoch != p.epoch) revert StaleOffer();
        if (block.timestamp > o.expiry) revert Expired();
        _requirePqcKey(msg.sender); // the new holder must be able to freeze too
        bytes32 id = o.passportId;
        delete offers[offerId]; // QCAI-1 L: closed offers free their storage
        address from = p.owner;
        p.owner = msg.sender;
        p.epoch++; // every other offer the previous holder issued dies with the handoff
        p.nonce++;
        emit Transferred(id, from, msg.sender, offerId);
    }

    /// The holder withdraws an open offer and frees its storage (QCAI-1 L). Classical on purpose:
    /// withdrawing only ever reduces what the passport can do.
    function cancelOffer(uint256 offerId) external {
        Offer storage o = offers[offerId];
        if (!o.open) revert OfferClosed();
        bytes32 id = o.passportId;
        if (msg.sender != passports[id].owner) revert NotOwner();
        delete offers[offerId];
        emit OfferCancelled(offerId, id);
    }

    /// Access control (QCAI-1 H): there is deliberately no msg.sender check. Authority comes only from
    /// an ML-DSA-87 signature by the key the holder registered on QoreChain, verified on chain by
    /// pqcVerify over a digest bound to chain id, this contract, the passport, its nonce and an expiry.
    /// A msg.sender check would only add the holder's classical secp256k1 key, the key Q-Day breaks,
    /// and would stop a phone or a recovery service from relaying the holder's signed report.
    function freeze(bytes32 id, uint64 expiry, bytes calldata signature) external {
        Passport storage p = passports[id];
        if (p.status == Status.None) revert UnknownPassport();
        if (p.status == Status.Frozen) revert AlreadyFrozen();
        _checkPq(p, freezeDigest(id, p.nonce, expiry), expiry, signature);
        p.status = Status.Frozen;
        p.epoch++;
        p.nonce++;
        emit Frozen(id, p.owner, p.epoch, p.nonce);
    }

    function recover(bytes32 id, uint64 expiry, bytes calldata signature) external {
        Passport storage p = passports[id];
        if (p.status != Status.Frozen) revert NotFrozen();
        _checkPq(p, recoverDigest(id, p.nonce, expiry), expiry, signature);
        p.status = Status.Active;
        p.epoch++;
        p.nonce++;
        emit Recovered(id, p.owner, p.epoch, p.nonce);
    }

    function statusOf(bytes32 id) external view returns (uint8) {
        return uint8(passports[id].status);
    }

    function offerDigest(bytes32 id, address dealer, uint64 epoch, uint64 offerNonce, uint64 expiry)
        public
        view
        returns (bytes32)
    {
        return keccak256(abi.encode("HALTE_OFFER_V1", block.chainid, address(this), id, dealer, epoch, offerNonce, expiry));
    }

    function freezeDigest(bytes32 id, uint64 nonce, uint64 expiry) public view returns (bytes32) {
        return keccak256(abi.encode("HALTE_FREEZE_V1", block.chainid, address(this), id, nonce, expiry));
    }

    function recoverDigest(bytes32 id, uint64 nonce, uint64 expiry) public view returns (bytes32) {
        return keccak256(abi.encode("HALTE_RECOVER_V1", block.chainid, address(this), id, nonce, expiry));
    }

    function _checkPq(Passport storage p, bytes32 digest, uint64 expiry, bytes calldata signature) internal view {
        if (block.timestamp > expiry) revert Expired();
        if (signature.length != ML_DSA_87_SIG_BYTES) revert BadPqcSignature();
        bytes memory pubkey = _requirePqcKey(p.owner);
        (bool ok, bytes memory ret) =
            PQC_VERIFY.staticcall(abi.encodeCall(IQorePQC.pqcVerify, (pubkey, signature, abi.encodePacked(digest))));
        // an inactive precompile can return empty data without reverting: treat that as failure
        if (!ok || ret.length != 32) revert PrecompileUnavailable();
        uint256 word = abi.decode(ret, (uint256));
        if (word > 1) revert PrecompileUnavailable(); // not a canonical bool
        if (word == 0) revert BadPqcSignature();
    }

    /// Returns the account's ML-DSA-87 public key, or reverts. The registry response is bounds-checked
    /// before decoding so a malformed answer fails closed as PrecompileUnavailable, never as a panic.
    function _requirePqcKey(address account) internal view returns (bytes memory pubkey) {
        (bool ok, bytes memory ret) = PQC_KEY_STATUS.staticcall(abi.encodeCall(IQorePQC.pqcKeyStatus, (account)));
        // head: registered, algorithmId, offset(pubkey), possessionProven, then the length word
        if (!ok || ret.length < 160) revert PrecompileUnavailable();
        uint256 registered;
        uint256 algorithmId;
        uint256 offset;
        uint256 proven;
        uint256 len;
        assembly {
            registered := mload(add(ret, 32))
            algorithmId := mload(add(ret, 64))
            offset := mload(add(ret, 96))
            proven := mload(add(ret, 128))
        }
        if (registered > 1 || algorithmId > type(uint8).max || proven > 1 || offset != 128) revert PrecompileUnavailable();
        assembly {
            len := mload(add(ret, 160))
        }
        if (len > ret.length || ret.length < 160 + ((len + 31) / 32) * 32) revert PrecompileUnavailable();
        if (registered == 0 || algorithmId != ML_DSA_87 || proven == 0 || len != ML_DSA_87_PUBKEY_BYTES) revert NoPqcKey();
        (,, pubkey,) = abi.decode(ret, (bool, uint8, bytes, bool));
    }
}
