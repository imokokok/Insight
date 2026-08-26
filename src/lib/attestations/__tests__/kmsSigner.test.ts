/**
 * kmsSigner tests — the offline-testable core of the KMS migration
 * (key-rotation-procedure.md §5 gap 3): given a digest and a raw KMS-style
 * (r, s) signature (no recovery id), recover the correct signer address via
 * the yParity loop, and prove a wrong (r, s) can NEVER be coerced into
 * matching a different address.
 */

import { type Hex } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

import { recoverAddressFromRs, signDigestWithKms } from '../kmsSigner';

const DIGEST = '0x1901000000000000000000000000000000000000000000000000000000000001' as Hex;

describe('recoverAddressFromRs (KMS yParity recovery)', () => {
  it('recovers the true signer from a raw (r, s) via the yParity loop', async () => {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    const fullSig = await account.sign({ hash: DIGEST });
    // 65-byte signature = r(32) || s(32) || yParity(1)
    const r = `0x${fullSig.slice(2, 66)}` as Hex;
    const s = `0x${fullSig.slice(66, 130)}` as Hex;

    const recovered = await recoverAddressFromRs(DIGEST, r, s, account.address);
    expect(recovered).not.toBeNull();
    expect(recovered?.toLowerCase()).toBe(account.address.toLowerCase());
  });

  it('NEGATIVE: a (r, s) signed by a different key does NOT match another address', async () => {
    const honestKey = generatePrivateKey();
    const honest = privateKeyToAccount(honestKey);
    const fullSig = await honest.sign({ hash: DIGEST });
    const r = `0x${fullSig.slice(2, 66)}` as Hex;
    const s = `0x${fullSig.slice(66, 130)}` as Hex;

    const attacker = privateKeyToAccount(generatePrivateKey());
    const recovered = await recoverAddressFromRs(DIGEST, r, s, attacker.address);
    expect(recovered).toBeNull();
  });

  it('NEGATIVE: a garbage (r, s) does not match any candidate', async () => {
    const candidate = privateKeyToAccount(generatePrivateKey()).address;
    const r = '0xdeadbeef'.padEnd(66, '0').replace('0x', '0x') as Hex;
    const s = '0xcafebabe'.padEnd(66, '0') as Hex;
    const recovered = await recoverAddressFromRs(DIGEST, r, s, candidate);
    expect(recovered).toBeNull();
  });
});

describe('signDigestWithKms (cloud seam)', () => {
  it('throws a clear not-provisioned error (SDK + creds live in operator cloud)', async () => {
    await expect(
      signDigestWithKms({ provider: 'aws', keyId: 'test', region: 'us-east-1' }, DIGEST)
    ).rejects.toThrow(/not available/);
  });
});
