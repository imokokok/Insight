/**
 * Round-trip crypto test for the oracle safety attestation.
 *
 * Proves sign → verify is valid, and that tampering (verdict, signature, UID) is
 * caught. This is crypto-sensitive code where passing typecheck is NOT enough —
 * the signature must actually recover to the attester address.
 */

// Well-known throwaway test key (anvil/hardhat account 0). Never holds value.
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const baseInput = {
  verdict: 'PASS',
  asset: 'ETH',
  chainId: 1,
  action: 'swap',
  tradeAmountUsd: 100000,
  consensusPrice: 3000.5,
  maxDeviationPct: 0.42,
  manipulationRiskScore: 0.13,
  participantCount: 7,
};

async function loadModule() {
  // Fresh module + account each time so env changes take effect.
  jest.resetModules();
  process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
  return await import('../oracleSafetyAttestation');
}

describe('oracleSafetyAttestation', () => {
  it('returns null when no attester key is configured (graceful disable)', async () => {
    jest.resetModules();
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    const mod = await import('../oracleSafetyAttestation');
    const att = await mod.signAttestation(baseInput);
    expect(att).toBeNull();
    expect(await mod.getAttesterAddress()).toBeNull();
  });

  it('signs an attestation that verifies as valid (round trip)', async () => {
    const mod = await loadModule();
    const att = await mod.signAttestation(baseInput);
    expect(att).not.toBeNull();
    expect(att!.attester).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(att!.signature).toMatch(/^0x/);
    expect(att!.uid).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(att!.data.verdict).toBe('PASS');
    // Floats scaled to integers (no precision loss in the EIP-712 payload).
    expect(att!.data.consensusPrice).toBe(300050000000); // 3000.5 * 1e8
    expect(att!.data.maxDeviationBps).toBe(42); // 0.42% * 100
    expect(att!.data.manipulationRiskBps).toBe(1300); // 0.13 * 10000

    const result = await mod.verifyAttestation(att!);
    expect(result.valid).toBe(true);
    expect(result.expired).toBe(false);
    expect(result.uid).toBe(att!.uid);
    expect(result.attester).toBe(att!.attester);
  });

  it('rejects a tampered verdict (signature no longer matches)', async () => {
    const mod = await loadModule();
    const att = await mod.signAttestation(baseInput);
    att!.data.verdict = 'BLOCK'; // attacker tries to forge a worse verdict
    const result = await mod.verifyAttestation(att!);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Signature does not recover|UID does not match/);
  });

  it('rejects a forged signature from a different address', async () => {
    const mod = await loadModule();
    const att = await mod.signAttestation(baseInput);
    // Swap in a bogus attester address that doesn't match the signature.
    att!.attester = '0x0000000000000000000000000000000000000001';
    const result = await mod.verifyAttestation(att!);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Signature does not recover/);
  });

  it('publishes a stable attester address', async () => {
    const mod = await loadModule();
    const addr = await mod.getAttesterAddress();
    expect(addr).toMatch(/^0x[a-fA-F0-9]{40}$/);
    // Same key → same address across calls.
    const addr2 = await mod.getAttesterAddress();
    expect(addr2).toBe(addr);
  });
});
