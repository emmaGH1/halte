// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

/// TEST ONLY. Stands in for QoreChain's PQC precompiles (0x..0a01 / 0x..0a02) on Hardhat's simulated
/// network, which has no ML-DSA. A "signature" here is keccak256(pubkey ‖ message).
/// The real precompile behaviour is exercised on Diana by scripts/spike-onchain.ts and the live journey checks.
contract MockQorePQC {
    mapping(address => bytes) internal keys;

    function setKey(address account, bytes calldata pubkey) external {
        keys[account] = pubkey;
    }

    function pqcKeyStatus(address account) external view returns (bool registered, uint8 algorithmId, bytes memory pubkey) {
        pubkey = keys[account];
        registered = pubkey.length > 0;
        algorithmId = registered ? 1 : 0;
    }

    function pqcVerify(bytes calldata pubkey, bytes calldata signature, bytes calldata message) external pure returns (bool) {
        return keccak256(signature) == keccak256(abi.encodePacked(keccak256(abi.encodePacked(pubkey, message))));
    }
}
