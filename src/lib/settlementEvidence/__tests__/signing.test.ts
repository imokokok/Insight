import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

import { buildEvidencePayload, computePayloadHash } from '../engine';
import { signSettlementEvidence, verifySettlementEvidence } from '../signing';

import type { SettlementCandle, SettlementMarketWatchRow } from '../types';

const WINDOW_START_MS = 1_766_162_100_000;
const WINDOW_END_MS = WINDOW_START_MS + 300_000;

function candleAtMinuteOffset(minutes: number, open: number, close: number): SettlementCandle {
  return {
    bucketTs: Math.floor(WINDOW_START_MS / 1000) + minutes * 60,
    open,
    high: Math.max(open, close),
    low: Math.min(open, close),
    close,
    volume: 1,
  };
}

function watchRow(overrides: Partial<SettlementMarketWatchRow> = {}): SettlementMarketWatchRow {
  return {
    marketSlug: 'btc-updown-5m-1766162100',
    gammaId: '12345',
    question: 'Bitcoin Up or Down - December 19, 11:35AM-11:40AM ET',
    asset: 'BTC',
    windowSeconds: 300,
    windowStartMs: WINDOW_START_MS,
    windowEndMs: WINDOW_END_MS,
    settlementVenue: 'chainlink-stream',
    resolutionSourceUrl: null,
    closed: true,
    declaredOutcome: 'Up',
    outcomePricesJson: '["1","0"]',
    firstSeenMs: 0,
    updatedAtMs: 0,
    ...overrides,
  };
}

function buildPayload(nowMs = 1_700_000_000_000) {
  return buildEvidencePayload({
    row: watchRow({ declaredOutcome: 'Up' }),
    candles: [0, 1, 2, 3, 4].map((m) => candleAtMinuteOffset(m, 100 + m, 101 + m)),
    candleSource: 'kraken',
    candleRightsScope: 'vendor-licensed',
    candleDeliveryPolicy: 'derived-analytics-only',
    oracleObservations: [],
    nowMs,
  });
}

describe('signSettlementEvidence / verifySettlementEvidence', () => {
  it('returns null without an attester key (attestation unavailable, grade unchanged)', async () => {
    const payload = buildPayload();
    const pack = { payload, payloadHash: 'x', attestation: null };
    expect(await signSettlementEvidence(payload, pack.payloadHash, null)).toBeNull();
    const verification = await verifySettlementEvidence(pack);
    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('attestation_unavailable');
  });

  it('signs and verifies a pack end-to-end', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const payload = buildPayload();
    const payloadHash = computePayloadHash(payload);
    const attestation = await signSettlementEvidence(payload, payloadHash, account);
    expect(attestation).not.toBeNull();
    expect(attestation?.eip712.domain.name).toBe('Insight Settlement Evidence');

    const verification = await verifySettlementEvidence({
      payload,
      payloadHash,
      attestation: attestation!,
    });
    expect(verification.valid).toBe(true);
    expect(verification.reason).toBe('verified');
    expect(verification.attester).toBe(account.address);
  });

  it('rejects a tampered payload via the hash binding', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const payload = buildPayload();
    const payloadHash = computePayloadHash(payload);
    const attestation = await signSettlementEvidence(payload, payloadHash, account);
    expect(attestation).not.toBeNull();
    const verification = await verifySettlementEvidence({
      payload: { ...payload, declaredOutcome: 'Down' }, // tampered
      payloadHash,
      attestation: attestation!,
    });
    expect(verification.valid).toBe(false);
    expect(verification.reason).toBe('payload_hash_mismatch: payload was modified after signing');
  });

  it('rejects a signature from a different key than the claimed attester', async () => {
    const signer = privateKeyToAccount(generatePrivateKey());
    const attacker = privateKeyToAccount(generatePrivateKey());
    const payload = buildPayload();
    const payloadHash = computePayloadHash(payload);
    // The attacker signs the same payload with their own key, then claims the
    // published signer's address. Verification against the CLAIMED attester
    // must fail.
    const attackerAttestation = await signSettlementEvidence(payload, payloadHash, attacker);
    expect(attackerAttestation).not.toBeNull();
    const verification = await verifySettlementEvidence({
      payload,
      payloadHash,
      attestation: { ...attackerAttestation!, attester: signer.address },
    });
    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('signature_invalid');
  });

  it('rejects an unexpected attester when the published address is supplied', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const other = privateKeyToAccount(generatePrivateKey());
    const payload = buildPayload();
    const payloadHash = computePayloadHash(payload);
    const attestation = await signSettlementEvidence(payload, payloadHash, account);
    const verification = await verifySettlementEvidence(
      { payload, payloadHash, attestation: attestation! },
      other.address
    );
    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('unexpected_attester');
  });
});
