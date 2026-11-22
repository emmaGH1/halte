// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

/// QoreChain PQC precompiles (Diana): 0x..0A01 pqcVerify, 0x..0A02 pqcKeyStatus.
interface IQorePQC {
    function pqcVerify(bytes calldata pubkey, bytes calldata signature, bytes calldata message) external view returns (bool valid);
    function pqcKeyStatus(address account) external view returns (bool registered, uint8 algorithmId, bytes memory pubkey);
}

/// @title Halte: stolen means unsellable.
/// A watch passport whose freeze and recovery need the owner's ML-DSA-87 signature,
/// checked on chain against the key the owner registered with QoreChain.
/// A freeze bumps the passport's epoch, which kills every outstanding transfer offer.
contract Halte {
    address internal constant PQC_VERIFY = 0x0000000000000000000000000000000000000a01;
    address internal constant PQC_KEY_STATUS = 0x0000000000000000000000000000000000000a02;
    uint8 internal constant ML_DSA_87 = 1;

    enum Status { None, Active, Frozen }

    struct Passport {
        address owner;
        Status status;
        uint64 epoch; // bumped on freeze and recover; offers from an older epoch are dead
        uint64 nonce; // bumped on every PQ-authorised action; stops replay
    }

    struct Offer {
        bytes32 passportId;
        address dealer;
        uint64 epoch;
        bool open;
    }

    mapping(bytes32 => Passport) public passports;
    mapping(uint256 => Offer) public offers;
    uint256 public offerCount;

    event Minted(bytes32 indexed id, address indexed owner);
    event OfferMade(uint256 indexed offerId, bytes32 indexed id, address indexed dealer, uint64 epoch);
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
    error BadPqcSignature();
    error PrecompileUnavailable();

    /// The owner must already hold a registered ML-DSA-87 key, or they could never freeze.
    function mint(bytes32 id) external {
        if (passports[id].status != Status.None) revert AlreadyExists();
        _requirePqcKey(msg.sender);
        passports[id] = Passport({owner: msg.sender, status: Status.Active, epoch: 0, nonce: 0});
        emit Minted(id, msg.sender);
    }

    function makeOffer(bytes32 id, address dealer) external returns (uint256 offerId) {
        Passport storage p = passports[id];
        if (p.status == Status.None) revert UnknownPassport();
        if (msg.sender != p.owner) revert NotOwner();
        if (p.status == Status.Frozen) revert PassportFrozen();
        offerId = ++offerCount;
        offers[offerId] = Offer({passportId: id, dealer: dealer, epoch: p.epoch, open: true});
        emit OfferMade(offerId, id, dealer, p.epoch);
    }

    function acceptOffer(uint256 offerId) external {
        Offer storage o = offers[offerId];
        if (!o.open) revert OfferClosed();
        if (msg.sender != o.dealer) revert NotDealer();
        Passport storage p = passports[o.passportId];
        if (p.status == Status.Frozen) revert PassportFrozen();
        if (o.epoch != p.epoch) revert StaleOffer();
        _requirePqcKey(msg.sender); // the new owner must be able to freeze too
        bytes32 id = o.passportId;
        delete offers[offerId]; // QCAI-1 L: closed offers free their storage
        address from = p.owner;
        p.owner = msg.sender;
        p.nonce++;
        emit Transferred(id, from, msg.sender, offerId);
    }

    /// The owner withdraws an open offer and frees its storage (QCAI-1 L: unbounded storage).
    function cancelOffer(uint256 offerId) external {
        Offer storage o = offers[offerId];
        if (!o.open) revert OfferClosed();
        bytes32 id = o.passportId;
        if (msg.sender != passports[id].owner) revert NotOwner();
        delete offers[offerId];
        emit OfferCancelled(offerId, id);
    }

    /// Access control (QCAI-1 H): there is deliberately no msg.sender check. Authority comes only from
    /// an ML-DSA-87 signature by the key the passport owner registered on QoreChain, verified on chain by
    /// pqcVerify over a digest bound to chain id, this contract, the passport, its nonce and an expiry.
    /// A msg.sender check would only add the owner's classical secp256k1 key, the key Q-Day breaks,
    /// and would stop a phone or a recovery service from relaying the owner's signed report.
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

    function freezeDigest(bytes32 id, uint64 nonce, uint64 expiry) public view returns (bytes32) {
        return keccak256(abi.encode("HALTE_FREEZE_V1", block.chainid, address(this), id, nonce, expiry));
    }

    function recoverDigest(bytes32 id, uint64 nonce, uint64 expiry) public view returns (bytes32) {
        return keccak256(abi.encode("HALTE_RECOVER_V1", block.chainid, address(this), id, nonce, expiry));
    }

    function _checkPq(Passport storage p, bytes32 digest, uint64 expiry, bytes calldata signature) internal view {
        if (block.timestamp > expiry) revert Expired();
        bytes memory pubkey = _requirePqcKey(p.owner);
        (bool ok, bytes memory ret) =
            PQC_VERIFY.staticcall(abi.encodeCall(IQorePQC.pqcVerify, (pubkey, signature, abi.encodePacked(digest))));
        // an inactive precompile can return empty data without reverting: treat that as failure
        if (!ok || ret.length != 32) revert PrecompileUnavailable();
        if (!abi.decode(ret, (bool))) revert BadPqcSignature();
    }

    function _requirePqcKey(address account) internal view returns (bytes memory pubkey) {
        (bool ok, bytes memory ret) = PQC_KEY_STATUS.staticcall(abi.encodeCall(IQorePQC.pqcKeyStatus, (account)));
        if (!ok || ret.length < 96) revert PrecompileUnavailable();
        bool registered;
        uint8 algorithmId;
        (registered, algorithmId, pubkey) = abi.decode(ret, (bool, uint8, bytes));
        if (!registered || algorithmId != ML_DSA_87 || pubkey.length == 0) revert NoPqcKey();
    }
}
