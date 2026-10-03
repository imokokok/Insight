import {
  buildTestMessage,
  computeScenarioHash,
  signTestAttestation,
  verifyTestAttestation,
  TEST_VALID_FOR_SECONDS,
} from '@/lib/testing/oracleScenario/attestation';
import { runScenario } from '@/lib/testing/oracleScenario/engine';
import { getFixtureById, getFixtures } from '@/lib/testing/oracleScenario/fixtures';

/** A well-known throwaway test key (Hardhat account #0). NEVER holds funds;
 *  used only so the signing path runs in tests. */
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

beforeAll(() => {
  process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
});

afterAll(() => {
  delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
});

describe('oracle test attestation', () => {
  const fixture = getFixtureById('euler-redstone-stale-data')!;
  const result = runScenario(fixture.scenario);

  it('signs a run and the receipt verifies round-trip', async () => {
    const attestation = await signTestAttestation(result, fixture.scenario);
    expect(attestation).not.toBeNull();
    expect(attestation!.data.verdict).toBe('caught');
    expect(attestation!.schemaVersion).toBe(1);

    const verification = await verifyTestAttestation(attestation!);
    expect(verification.valid).toBe(true);
    expect(verification.reason).toBe('verified');
    expect(verification.expired).toBe(false);
  });

  it('binds the receipt to the canonical scenario hash', async () => {
    const attestation = await signTestAttestation(result, fixture.scenario);
    const expectedHash = await computeScenarioHash(fixture.scenario);
    expect(attestation!.data.scenarioHash).toBe(expectedHash);
  });

  it('produces a stable scenario hash, and a different one for altered bytes', async () => {
    const altered = {
      ...fixture.scenario,
      steps: fixture.scenario.steps.map((s, i) =>
        i === 0 ? { ...s, settlementPrice: s.settlementPrice + 0.01 } : s
      ),
    };
    expect(await computeScenarioHash(altered)).not.toBe(
      await computeScenarioHash(fixture.scenario)
    );
  });

  it('detects tampering via uid mismatch', async () => {
    const attestation = await signTestAttestation(result, fixture.scenario);
    const tampered = {
      ...attestation!,
      data: { ...attestation!.data, verdict: 'missed' },
    };
    const verification = await verifyTestAttestation(tampered);
    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('uid_mismatch');
  });

  it('rejects a signature from a different key', async () => {
    const attestation = await signTestAttestation(result, fixture.scenario);
    const forged = { ...attestation!, signature: ('0x' + 'ff'.repeat(65)) as string };
    const verification = await verifyTestAttestation(forged);
    expect(verification.valid).toBe(false);
  });

  it('leaves validity-window semantics intact (validUntil = signing time + window)', async () => {
    const message = await buildTestMessage(result, fixture.scenario);
    const now = Math.floor(Date.now() / 1000);
    expect(message.validUntil).toBeGreaterThanOrEqual(now + TEST_VALID_FOR_SECONDS - 5);
    // ranAt remains the deterministic scenario anchor, independent of now.
    expect(message.ranAt).toBeLessThan(now);
  });

  it('covers every built-in fixture with a signing round-trip', async () => {
    for (const f of getFixtures()) {
      const r = runScenario(f.scenario);
      const attestation = await signTestAttestation(r, f.scenario);
      expect(attestation).not.toBeNull();
      const verification = await verifyTestAttestation(attestation!);
      expect(verification.valid).toBe(true);
    }
  });
});
