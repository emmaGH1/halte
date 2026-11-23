// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

/// TEST ONLY. Stands in for QoreChain's PQC precompiles (0x..0a01 / 0x..0a02) on Hardhat's simulated
/// network, which has no ML-DSA. A "signature" here is 4,627 bytes whose first 32 are
/// keccak256(pubkey ‖ message), so it still binds the key and the message; the rest is padding.
/// Real ML-DSA-87 verification is exercised on Diana by the live journey checks (see docs/AUDIT.md).
contract MockQorePQC {
    struct Key {
        bytes pubkey;
        uint8 algorithmId;
        bool possessionProven;
    }

    mapping(address => Key) internal keys;

    /// A well-formed ML-DSA-87 registration with proof of possession.
    function setKey(address account, bytes calldata pubkey) external {
        keys[account] = Key(pubkey, 1, true);
    }

    function setKeyFull(address account, bytes calldata pubkey, uint8 algorithmId, bool possessionProven) external {
        keys[account] = Key(pubkey, algorithmId, possessionProven);
    }

    function pqcKeyStatus(address account)
        external
        view
        returns (bool registered, uint8 algorithmId, bytes memory pubkey, bool possessionProven)
    {
        Key storage k = keys[account];
        pubkey = k.pubkey;
        registered = pubkey.length > 0;
        algorithmId = k.algorithmId;
        possessionProven = k.possessionProven;
    }

    function pqcVerify(bytes calldata pubkey, bytes calldata signature, bytes calldata message) external pure returns (bool) {
        if (signature.length != 4627) return false;
        return bytes32(signature[0:32]) == keccak256(abi.encodePacked(pubkey, message));
    }
}

/// TEST ONLY. A precompile that answers every call with one 32-byte word holding 2: too short for a
/// pqcKeyStatus response and not a canonical bool for pqcVerify. Halte must fail closed on both.
contract MalformedPQC {
    fallback(bytes calldata) external returns (bytes memory) {
        return abi.encode(uint256(2));
    }
}
