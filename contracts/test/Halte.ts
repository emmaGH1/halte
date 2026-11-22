import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { network } from "hardhat";
import { encodePacked, keccak256, toHex, type Hex } from "viem";

// Simulated network + a mock of QoreChain's PQC precompiles (see contracts/mocks/MockQorePQC.sol).
const PQC_VERIFY = "0x0000000000000000000000000000000000000a01";
const PQC_KEY_STATUS = "0x0000000000000000000000000000000000000a02";

const { viem, networkHelpers } = await network.create();
const publicClient = await viem.getPublicClient();
const [owner, dealer, thief, relayer] = await viem.getWalletClients();

const keyOf = (label: string) => toHex(`mldsa87-pubkey-${label}`) as Hex;
// mock signature: what MockQorePQC.pqcVerify accepts for (pubkey, message)
const sign = (pubkey: Hex, digest: Hex) => keccak256(encodePacked(["bytes", "bytes"], [pubkey, digest]));

describe("Halte", () => {
  let halte: any;
  let keys: any;
  const id = keccak256(toHex("watch-001"));
  const future = () => BigInt(Math.floor(Date.now() / 1000) + 3600);

  beforeEach(async () => {
    const mock = await viem.deployContract("MockQorePQC");
    const code = await publicClient.getCode({ address: mock.address });
    await networkHelpers.setCode(PQC_VERIFY, code!);
    await networkHelpers.setCode(PQC_KEY_STATUS, code!);
    keys = await viem.getContractAt("MockQorePQC", PQC_KEY_STATUS);
    await keys.write.setKey([owner.account.address, keyOf("owner")]);
    await keys.write.setKey([dealer.account.address, keyOf("dealer")]);
    halte = await viem.deployContract("Halte");
  });

  async function freezeSig(passportId: Hex, signerKey: Hex, expiry = future()) {
    const [, , , nonce] = await halte.read.passports([passportId]);
    const digest = await halte.read.freezeDigest([passportId, nonce, expiry]);
    return { expiry, sig: sign(signerKey, digest), digest };
  }
  async function recoverSig(passportId: Hex, signerKey: Hex, expiry = future()) {
    const [, , , nonce] = await halte.read.passports([passportId]);
    const digest = await halte.read.recoverDigest([passportId, nonce, expiry]);
    return { expiry, sig: sign(signerKey, digest) };
  }

  it("mints only for an account with a registered ML-DSA-87 key", async () => {
    await halte.write.mint([id]);
    assert.equal(await halte.read.statusOf([id]), 1);
    await viem.assertions.revertWithCustomError(halte.write.mint([keccak256(toHex("x"))], { account: thief.account }), halte, "NoPqcKey");
  });

  it("refuses a second mint of the same id", async () => {
    await halte.write.mint([id]);
    await viem.assertions.revertWithCustomError(halte.write.mint([id]), halte, "AlreadyExists");
  });

  it("lets only the owner open an offer, and a live offer transfers ownership", async () => {
    await halte.write.mint([id]);
    await viem.assertions.revertWithCustomError(halte.write.makeOffer([id, dealer.account.address], { account: thief.account }), halte, "NotOwner");
    await halte.write.makeOffer([id, dealer.account.address]);
    await viem.assertions.revertWithCustomError(halte.write.acceptOffer([1n], { account: thief.account }), halte, "NotDealer");
    await halte.write.acceptOffer([1n], { account: dealer.account });
    const [newOwner] = await halte.read.passports([id]);
    assert.equal(newOwner.toLowerCase(), dealer.account.address.toLowerCase());
    await viem.assertions.revertWithCustomError(halte.write.acceptOffer([1n], { account: dealer.account }), halte, "OfferClosed");
  });

  it("freezes on the owner's PQ signature, relayed by anyone, and kills open offers", async () => {
    await halte.write.mint([id]);
    await halte.write.makeOffer([id, dealer.account.address]);
    const { expiry, sig } = await freezeSig(id, keyOf("owner"));
    await viem.assertions.emit(halte.write.freeze([id, expiry, sig], { account: relayer.account }), halte, "Frozen");
    assert.equal(await halte.read.statusOf([id]), 2);
    await viem.assertions.revertWithCustomError(halte.write.acceptOffer([1n], { account: dealer.account }), halte, "PassportFrozen");
    await viem.assertions.revertWithCustomError(halte.write.makeOffer([id, dealer.account.address]), halte, "PassportFrozen");
  });

  it("refuses a freeze signed by any key other than the owner's registered one", async () => {
    await halte.write.mint([id]);
    const { expiry, sig } = await freezeSig(id, keyOf("thief"));
    await viem.assertions.revertWithCustomError(halte.write.freeze([id, expiry, sig]), halte, "BadPqcSignature");
    // the owner's classical key alone (no PQ signature) gets nowhere either
    await viem.assertions.revertWithCustomError(halte.write.freeze([id, expiry, "0x"]), halte, "BadPqcSignature");
    assert.equal(await halte.read.statusOf([id]), 1);
  });

  it("refuses an expired authorisation", async () => {
    await halte.write.mint([id]);
    const past = BigInt((await publicClient.getBlock()).timestamp) - 1n;
    const { expiry, sig } = await freezeSig(id, keyOf("owner"), past);
    await viem.assertions.revertWithCustomError(halte.write.freeze([id, expiry, sig]), halte, "Expired");
  });

  it("recovers on the owner's PQ signature; offers from before the freeze stay dead", async () => {
    await halte.write.mint([id]);
    await halte.write.makeOffer([id, dealer.account.address]);
    const f = await freezeSig(id, keyOf("owner"));
    await halte.write.freeze([id, f.expiry, f.sig]);
    const bad = await recoverSig(id, keyOf("thief"));
    await viem.assertions.revertWithCustomError(halte.write.recover([id, bad.expiry, bad.sig]), halte, "BadPqcSignature");
    const r = await recoverSig(id, keyOf("owner"));
    await viem.assertions.emit(halte.write.recover([id, r.expiry, r.sig]), halte, "Recovered");
    assert.equal(await halte.read.statusOf([id]), 1);
    await viem.assertions.revertWithCustomError(halte.write.acceptOffer([1n], { account: dealer.account }), halte, "StaleOffer");
  });

  it("cannot replay a freeze signature, or use a freeze signature to recover", async () => {
    await halte.write.mint([id]);
    const f = await freezeSig(id, keyOf("owner"));
    await halte.write.freeze([id, f.expiry, f.sig]);
    // the freeze signature is bound to the "freeze" domain: useless for recover
    await viem.assertions.revertWithCustomError(halte.write.recover([id, f.expiry, f.sig]), halte, "BadPqcSignature");
    const r = await recoverSig(id, keyOf("owner"));
    await halte.write.recover([id, r.expiry, r.sig]);
    // nonce moved on: the old freeze signature no longer verifies
    await viem.assertions.revertWithCustomError(halte.write.freeze([id, f.expiry, f.sig]), halte, "BadPqcSignature");
  });

  it("after a sale, only the new owner's PQ key can freeze", async () => {
    await halte.write.mint([id]);
    await halte.write.makeOffer([id, dealer.account.address]);
    await halte.write.acceptOffer([1n], { account: dealer.account });
    const old = await freezeSig(id, keyOf("owner"));
    await viem.assertions.revertWithCustomError(halte.write.freeze([id, old.expiry, old.sig]), halte, "BadPqcSignature");
    const ok = await freezeSig(id, keyOf("dealer"));
    await halte.write.freeze([id, ok.expiry, ok.sig]);
    assert.equal(await halte.read.statusOf([id]), 2);
  });

  it("fails closed when the PQC precompile is missing (returns no data)", async () => {
    await halte.write.mint([id]);
    const { expiry, sig } = await freezeSig(id, keyOf("owner"));
    await networkHelpers.setCode(PQC_VERIFY, "0x");
    await viem.assertions.revertWithCustomError(halte.write.freeze([id, expiry, sig]), halte, "PrecompileUnavailable");
    assert.equal(await halte.read.statusOf([id]), 1);
  });
});
