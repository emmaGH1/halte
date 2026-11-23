import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { network } from "hardhat";
import { encodeAbiParameters, encodePacked, keccak256, parseAbiParameters, toHex, type Hex } from "viem";

// Simulated network + a mock of QoreChain's PQC precompiles (see contracts/mocks/MockQorePQC.sol).
const PQC_VERIFY = "0x0000000000000000000000000000000000000a01";
const PQC_KEY_STATUS = "0x0000000000000000000000000000000000000a02";
const ZERO = "0x0000000000000000000000000000000000000000";

const { viem, networkHelpers } = await network.create();
const publicClient = await viem.getPublicClient();
const [owner, dealer, thief, relayer, dealer2] = await viem.getWalletClients();

// a full-length (2,592-byte) stand-in ML-DSA-87 public key per label
const keyOf = (label: string) => ("0x" + keccak256(toHex(`mldsa87-${label}`)).slice(2).repeat(81)) as Hex;
// mock signature: 4,627 bytes whose first 32 are keccak256(pubkey ‖ message)
const sign = (pubkey: Hex, digest: Hex) =>
  (keccak256(encodePacked(["bytes", "bytes"], [pubkey, digest])) + "00".repeat(4627 - 32)) as Hex;

describe("Halte", () => {
  let halte: any;
  let keys: any;
  const id = keccak256(toHex("watch-001"));
  const now = async () => (await publicClient.getBlock()).timestamp;
  const future = () => BigInt(Math.floor(Date.now() / 1000) + 3600);
  const state = async (pid: Hex = id) => {
    const [o, status, epoch, nonce, offerNonce] = await halte.read.passports([pid]);
    return { owner: (o as string).toLowerCase(), status: Number(status), epoch, nonce, offerNonce };
  };

  beforeEach(async () => {
    const mock = await viem.deployContract("MockQorePQC");
    const code = await publicClient.getCode({ address: mock.address });
    await networkHelpers.setCode(PQC_VERIFY, code!);
    await networkHelpers.setCode(PQC_KEY_STATUS, code!);
    keys = await viem.getContractAt("MockQorePQC", PQC_KEY_STATUS);
    await keys.write.setKey([owner.account.address, keyOf("owner")]);
    await keys.write.setKey([dealer.account.address, keyOf("dealer")]);
    await keys.write.setKey([dealer2.account.address, keyOf("dealer2")]);
    halte = await viem.deployContract("Halte");
  });

  async function freezeSig(pid: Hex, signerKey: Hex, expiry = future()) {
    const { nonce } = await state(pid);
    return { expiry, sig: sign(signerKey, await halte.read.freezeDigest([pid, nonce, expiry])) };
  }
  async function recoverSig(pid: Hex, signerKey: Hex, expiry = future()) {
    const { nonce } = await state(pid);
    return { expiry, sig: sign(signerKey, await halte.read.recoverDigest([pid, nonce, expiry])) };
  }
  async function offerSig(pid: Hex, to: Hex, signerKey: Hex, expiry = future()) {
    const { epoch, offerNonce } = await state(pid);
    return { expiry, sig: sign(signerKey, await halte.read.offerDigest([pid, to, epoch, offerNonce, expiry])) };
  }
  async function offer(to: Hex = dealer.account.address, signerKey = keyOf("owner"), opts: any = {}) {
    const o = await offerSig(id, to, signerKey);
    await halte.write.makeOffer([id, to, o.expiry, o.sig], opts);
    return await halte.read.offerCount();
  }

  describe("key admission", () => {
    it("mints only for an account with a registered, PoP-proven ML-DSA-87 key", async () => {
      await halte.write.mint([id]);
      assert.equal(await halte.read.statusOf([id]), 1);
      const other = keccak256(toHex("x"));
      await viem.assertions.revertWithCustomError(halte.write.mint([other], { account: thief.account }), halte, "NoPqcKey");
      await keys.write.setKeyFull([thief.account.address, keyOf("thief"), 1, false]); // no proof of possession
      await viem.assertions.revertWithCustomError(halte.write.mint([other], { account: thief.account }), halte, "NoPqcKey");
      await keys.write.setKeyFull([thief.account.address, keyOf("thief"), 2, true]); // another algorithm
      await viem.assertions.revertWithCustomError(halte.write.mint([other], { account: thief.account }), halte, "NoPqcKey");
      await keys.write.setKeyFull([thief.account.address, "0x1234", 1, true]); // not 2,592 bytes
      await viem.assertions.revertWithCustomError(halte.write.mint([other], { account: thief.account }), halte, "NoPqcKey");
      assert.equal(await halte.read.statusOf([other]), 0);
    });

    it("refuses a second mint of the same id", async () => {
      await halte.write.mint([id]);
      await viem.assertions.revertWithCustomError(halte.write.mint([id]), halte, "AlreadyExists");
    });

    it("fails closed when a PQC precompile is missing or malformed", async () => {
      await halte.write.mint([id]);
      const { expiry, sig } = await freezeSig(id, keyOf("owner"));
      const good = await publicClient.getCode({ address: PQC_VERIFY });
      await networkHelpers.setCode(PQC_VERIFY, "0x"); // returns no data
      await viem.assertions.revertWithCustomError(halte.write.freeze([id, expiry, sig]), halte, "PrecompileUnavailable");
      const bad = await viem.deployContract("MalformedPQC");
      const badCode = await publicClient.getCode({ address: bad.address });
      await networkHelpers.setCode(PQC_VERIFY, badCode!); // non-canonical bool (2)
      await viem.assertions.revertWithCustomError(halte.write.freeze([id, expiry, sig]), halte, "PrecompileUnavailable");
      await networkHelpers.setCode(PQC_VERIFY, good!);
      await networkHelpers.setCode(PQC_KEY_STATUS, badCode!); // truncated registry answer
      await viem.assertions.revertWithCustomError(halte.write.freeze([id, expiry, sig]), halte, "PrecompileUnavailable");
      await viem.assertions.revertWithCustomError(halte.write.mint([keccak256(toHex("y"))]), halte, "PrecompileUnavailable");
      assert.equal((await state()).status, 1);
    });
  });

  describe("transfer offers", () => {
    it("needs the holder's PQ signature: a stolen classical key can't hand the passport away", async () => {
      await halte.write.mint([id]);
      const o = await offerSig(id, thief.account.address, keyOf("owner"));
      // the holder's own account sending, but with no PQ signature (classical key only)
      await viem.assertions.revertWithCustomError(halte.write.makeOffer([id, thief.account.address, o.expiry, "0x"]), halte, "BadPqcSignature");
      // a thief who registered their own PQ key signs an offer to themselves
      await keys.write.setKey([thief.account.address, keyOf("thief")]);
      const t = await offerSig(id, thief.account.address, keyOf("thief"));
      await viem.assertions.revertWithCustomError(
        halte.write.makeOffer([id, thief.account.address, t.expiry, t.sig], { account: thief.account }), halte, "BadPqcSignature");
      assert.equal(await halte.read.offerCount(), 0n);
      assert.equal((await state()).owner, owner.account.address.toLowerCase());
    });

    it("binds the signed offer to its dealer, and refuses a replay", async () => {
      await halte.write.mint([id]);
      const o = await offerSig(id, dealer.account.address, keyOf("owner"));
      // a relayer can't redirect the signed offer to another dealer
      await viem.assertions.revertWithCustomError(
        halte.write.makeOffer([id, thief.account.address, o.expiry, o.sig], { account: relayer.account }), halte, "BadPqcSignature");
      // relayed by anyone, as signed
      await viem.assertions.emit(halte.write.makeOffer([id, dealer.account.address, o.expiry, o.sig], { account: relayer.account }), halte, "OfferMade");
      assert.equal((await state()).offerNonce, 1n);
      // the same signature can't open a second offer
      await viem.assertions.revertWithCustomError(halte.write.makeOffer([id, dealer.account.address, o.expiry, o.sig]), halte, "BadPqcSignature");
      // a freeze signature is useless as an offer signature (domain separation)
      const f = await freezeSig(id, keyOf("owner"));
      await viem.assertions.revertWithCustomError(halte.write.makeOffer([id, dealer.account.address, f.expiry, f.sig]), halte, "BadPqcSignature");
    });

    it("binds the offer digest to chain, contract, passport, dealer, epoch, nonce and expiry", async () => {
      const chainId = BigInt(await publicClient.getChainId());
      const expiry = 1234n;
      const expected = keccak256(encodeAbiParameters(
        parseAbiParameters("string, uint256, address, bytes32, address, uint64, uint64, uint64"),
        ["HALTE_OFFER_V1", chainId, halte.address, id, dealer.account.address, 0n, 0n, expiry]));
      assert.equal(await halte.read.offerDigest([id, dealer.account.address, 0n, 0n, expiry]), expected);
      const other = await viem.deployContract("Halte");
      assert.notEqual(await other.read.offerDigest([id, dealer.account.address, 0n, 0n, expiry]), expected);
    });

    it("refuses an empty or self-addressed dealer", async () => {
      await halte.write.mint([id]);
      const z = await offerSig(id, ZERO, keyOf("owner"));
      await viem.assertions.revertWithCustomError(halte.write.makeOffer([id, ZERO, z.expiry, z.sig]), halte, "InvalidDealer");
      const s = await offerSig(id, owner.account.address, keyOf("owner"));
      await viem.assertions.revertWithCustomError(halte.write.makeOffer([id, owner.account.address, s.expiry, s.sig]), halte, "InvalidDealer");
    });

    it("only the named dealer, with a PoP-proven key, can accept; acceptance transfers the passport", async () => {
      await halte.write.mint([id]);
      const n = await offer();
      await viem.assertions.revertWithCustomError(halte.write.acceptOffer([n], { account: thief.account }), halte, "NotDealer");
      await viem.assertions.emit(halte.write.acceptOffer([n], { account: dealer.account }), halte, "Transferred");
      const s = await state();
      assert.equal(s.owner, dealer.account.address.toLowerCase());
      assert.equal(s.epoch, 1n);
      await viem.assertions.revertWithCustomError(halte.write.acceptOffer([n], { account: dealer.account }), halte, "OfferClosed");
      const [pid] = await halte.read.offers([n]);
      assert.equal(pid, "0x" + "0".repeat(64)); // accepted offer's storage cleared
    });

    it("a dealer without a usable PQ key can't accept", async () => {
      await halte.write.mint([id]);
      await keys.write.setKeyFull([dealer.account.address, keyOf("dealer"), 1, false]);
      const n = await offer();
      await viem.assertions.revertWithCustomError(halte.write.acceptOffer([n], { account: dealer.account }), halte, "NoPqcKey");
    });

    it("a handoff kills every other offer the previous holder issued", async () => {
      await halte.write.mint([id]);
      const first = await offer(dealer.account.address);
      const sibling = await offer(dealer2.account.address);
      await halte.write.acceptOffer([first], { account: dealer.account });
      await viem.assertions.revertWithCustomError(halte.write.acceptOffer([sibling], { account: dealer2.account }), halte, "StaleOffer");
      assert.equal((await state()).owner, dealer.account.address.toLowerCase());
      // the new holder's own signed offer works
      const fresh = await offer(dealer2.account.address, keyOf("dealer"));
      await halte.write.acceptOffer([fresh], { account: dealer2.account });
      assert.equal((await state()).owner, dealer2.account.address.toLowerCase());
    });

    it("offers expire: valid at the expiry second, refused one second later", async () => {
      await halte.write.mint([id]);
      const t = (await now()) + 100n;
      const o = await offerSig(id, dealer.account.address, keyOf("owner"), t);
      await networkHelpers.time.setNextBlockTimestamp(t);
      await halte.write.makeOffer([id, dealer.account.address, t, o.sig]); // issued at expiry: ok
      await viem.assertions.revertWithCustomError(halte.write.acceptOffer([1n], { account: dealer.account }), halte, "Expired");
      const late = await offerSig(id, dealer.account.address, keyOf("owner"), (await now()) - 1n);
      await viem.assertions.revertWithCustomError(halte.write.makeOffer([id, dealer.account.address, late.expiry, late.sig]), halte, "Expired");

      const t2 = (await now()) + 50n;
      const o2 = await offerSig(id, dealer.account.address, keyOf("owner"), t2);
      await halte.write.makeOffer([id, dealer.account.address, t2, o2.sig]);
      await networkHelpers.time.setNextBlockTimestamp(t2);
      await halte.write.acceptOffer([2n], { account: dealer.account }); // accepted at expiry: ok
      assert.equal((await state()).owner, dealer.account.address.toLowerCase());
    });

    it("lets only the holder cancel an offer, and frees its storage", async () => {
      await halte.write.mint([id]);
      const n = await offer();
      await viem.assertions.revertWithCustomError(halte.write.cancelOffer([n], { account: thief.account }), halte, "NotOwner");
      await viem.assertions.emit(halte.write.cancelOffer([n]), halte, "OfferCancelled");
      const [pid, d, , , open] = await halte.read.offers([n]);
      assert.equal(open, false);
      assert.equal(pid, "0x" + "0".repeat(64));
      assert.equal(d, ZERO);
      await viem.assertions.revertWithCustomError(halte.write.acceptOffer([n], { account: dealer.account }), halte, "OfferClosed");
      await viem.assertions.revertWithCustomError(halte.write.cancelOffer([n]), halte, "OfferClosed");
    });
  });

  describe("freeze and recovery", () => {
    it("freezes on the holder's PQ signature, relayed by anyone, and blocks the same dealer and offer", async () => {
      await halte.write.mint([id]);
      const n = await offer();
      // positive control: before the report, this dealer could accept this offer
      await publicClient.simulateContract({ address: halte.address, abi: halte.abi, functionName: "acceptOffer", args: [n], account: dealer.account });
      const { expiry, sig } = await freezeSig(id, keyOf("owner"));
      await viem.assertions.emit(halte.write.freeze([id, expiry, sig], { account: relayer.account }), halte, "Frozen");
      assert.equal(await halte.read.statusOf([id]), 2);
      await viem.assertions.revertWithCustomError(halte.write.acceptOffer([n], { account: dealer.account }), halte, "PassportFrozen");
      const o = await offerSig(id, dealer.account.address, keyOf("owner"));
      await viem.assertions.revertWithCustomError(halte.write.makeOffer([id, dealer.account.address, o.expiry, o.sig]), halte, "PassportFrozen");
      assert.equal((await state()).owner, owner.account.address.toLowerCase());
    });

    it("refuses a freeze signed by any key other than the holder's registered one", async () => {
      await halte.write.mint([id]);
      const { expiry, sig } = await freezeSig(id, keyOf("thief"));
      await viem.assertions.revertWithCustomError(halte.write.freeze([id, expiry, sig]), halte, "BadPqcSignature");
      await viem.assertions.revertWithCustomError(halte.write.freeze([id, expiry, "0x"]), halte, "BadPqcSignature");
      assert.equal(await halte.read.statusOf([id]), 1);
    });

    it("refuses an expired authorisation", async () => {
      await halte.write.mint([id]);
      const { expiry, sig } = await freezeSig(id, keyOf("owner"), (await now()) - 1n);
      await viem.assertions.revertWithCustomError(halte.write.freeze([id, expiry, sig]), halte, "Expired");
    });

    it("recovers on the holder's PQ signature; offers from before the freeze stay dead", async () => {
      await halte.write.mint([id]);
      const n = await offer();
      const f = await freezeSig(id, keyOf("owner"));
      await halte.write.freeze([id, f.expiry, f.sig]);
      const bad = await recoverSig(id, keyOf("thief"));
      await viem.assertions.revertWithCustomError(halte.write.recover([id, bad.expiry, bad.sig]), halte, "BadPqcSignature");
      const r = await recoverSig(id, keyOf("owner"));
      await viem.assertions.emit(halte.write.recover([id, r.expiry, r.sig]), halte, "Recovered");
      assert.equal(await halte.read.statusOf([id]), 1);
      await viem.assertions.revertWithCustomError(halte.write.acceptOffer([n], { account: dealer.account }), halte, "StaleOffer");
    });

    it("cannot replay a freeze signature, or use a freeze signature to recover", async () => {
      await halte.write.mint([id]);
      const f = await freezeSig(id, keyOf("owner"));
      await halte.write.freeze([id, f.expiry, f.sig]);
      await viem.assertions.revertWithCustomError(halte.write.recover([id, f.expiry, f.sig]), halte, "BadPqcSignature");
      const r = await recoverSig(id, keyOf("owner"));
      await halte.write.recover([id, r.expiry, r.sig]);
      await viem.assertions.revertWithCustomError(halte.write.freeze([id, f.expiry, f.sig]), halte, "BadPqcSignature");
    });
  });

  describe("ordering", () => {
    it("an offer landing first leaves a pending freeze valid", async () => {
      await halte.write.mint([id]);
      const f = await freezeSig(id, keyOf("owner")); // signed, not yet included
      const n = await offer();
      await halte.write.freeze([id, f.expiry, f.sig]);
      await viem.assertions.revertWithCustomError(halte.write.acceptOffer([n], { account: dealer.account }), halte, "PassportFrozen");
    });

    it("a freeze landing first kills a pending offer, during the freeze and after recovery", async () => {
      await halte.write.mint([id]);
      const o = await offerSig(id, dealer.account.address, keyOf("owner")); // signed, not yet included
      const f = await freezeSig(id, keyOf("owner"));
      await halte.write.freeze([id, f.expiry, f.sig]);
      await viem.assertions.revertWithCustomError(halte.write.makeOffer([id, dealer.account.address, o.expiry, o.sig]), halte, "PassportFrozen");
      const r = await recoverSig(id, keyOf("owner"));
      await halte.write.recover([id, r.expiry, r.sig]);
      await viem.assertions.revertWithCustomError(halte.write.makeOffer([id, dealer.account.address, o.expiry, o.sig]), halte, "BadPqcSignature");
    });

    it("an acceptance landing first voids the previous holder's pending freeze", async () => {
      await halte.write.mint([id]);
      const n = await offer();
      const f = await freezeSig(id, keyOf("owner"));
      await halte.write.acceptOffer([n], { account: dealer.account });
      await viem.assertions.revertWithCustomError(halte.write.freeze([id, f.expiry, f.sig]), halte, "BadPqcSignature");
      const ok = await freezeSig(id, keyOf("dealer"));
      await halte.write.freeze([id, ok.expiry, ok.sig]);
      assert.equal(await halte.read.statusOf([id]), 2);
    });

    it("a key rotation voids unsubmitted signatures; an offer already issued lives until its epoch moves", async () => {
      await halte.write.mint([id]);
      const n = await offer();
      const f = await freezeSig(id, keyOf("owner"));
      await keys.write.setKey([owner.account.address, keyOf("owner-rotated")]);
      await viem.assertions.revertWithCustomError(halte.write.freeze([id, f.expiry, f.sig]), halte, "BadPqcSignature");
      const f2 = await freezeSig(id, keyOf("owner-rotated"));
      await halte.write.freeze([id, f2.expiry, f2.sig]);
      await viem.assertions.revertWithCustomError(halte.write.acceptOffer([n], { account: dealer.account }), halte, "PassportFrozen");
    });
  });
});
