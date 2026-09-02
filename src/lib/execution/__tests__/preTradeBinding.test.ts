/**
 * Tests for the pre-trade binding resolver — the module that decides whether an
 * Execution Receipt is bound to a proven gate or only to the caller's word.
 *
 * These use REAL pre-trade attestations signed with a throwaway key, because
 * the whole point of the module is that a forged or tampered gate must not
 * produce a VERIFIED binding. Mocking the verifier here would test nothing.
 *
 * The property under test: everything the receipt is graded against (the quote,
 * the oracle basis, the gate's timestamp) must come out of payloads whose
 * signatures were checked first — never out of the request.
 */

import {
  signAttestationV3,
  type AttestationInputV2,
} from '@/lib/attestations/oracleSafetyAttestationV3';

import { resolvePreTradeBinding, type SelfReportedPreTrade } from '../preTradeBinding';

// Anvil account 0 — well-known throwaway key.
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const USDC = 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const WETH = 'eip155:1/erc20:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const DAI = 'eip155:1/erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F';

const CHECKED_AT_S = 1_700_000_000;

/** The unix-seconds signing time signAttestationV3 stamps on the envelope
 *  (Headless H4: preTradeSignedAt must carry the SIGNING time, not the
 *  self-declared checkedAt). */
const signedAtSeconds = (gate: { signedAt?: unknown }) => {
  const raw = gate?.signedAt;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const ms = Date.parse(raw);
    if (Number.isFinite(ms)) return Math.floor(ms / 1000);
  }
  return 0;
};

function preTradeInput(overrides: Partial<AttestationInputV2> = {}): AttestationInputV2 {
  return {
    verdict: 'PASS',
    sourceAssetId: USDC,
    destinationAssetId: WETH,
    subjectChainId: 1,
    action: 'swap',
    tradeAmountUsd: 50_000,
    consensusPrice: 1.0,
    maxDeviationPct: 0.2,
    manipulationRiskScore: 0.01,
    participantCount: 4,
    crossProviderAgreement: 0.99,
    maxStablecoinDepegPct: 0.01,
    maxDataAgeSeconds: 12,
    recommendedMaxPositionUsd: 100_000,
    contributingFactors: [],
    providerObservations: [],
    checkedAtMs: CHECKED_AT_S * 1000,
    ...overrides,
  };
}

/** Sign the pair of gates an agent would hold after agent_begin_trade. */
async function signPair(sourcePrice: number, destinationPrice: number) {
  const source = await signAttestationV3(preTradeInput({ consensusPrice: sourcePrice }));
  const destination = await signAttestationV3(
    preTradeInput({
      sourceAssetId: WETH,
      destinationAssetId: USDC,
      consensusPrice: destinationPrice,
    })
  );
  return { source, destination };
}

describe('resolvePreTradeBinding', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
  });

  const selfReported: SelfReportedPreTrade = {
    preTradeUid: '0x' + '11'.repeat(32),
    requestHash: '0x' + '22'.repeat(32),
    sourceAssetId: USDC,
    destinationAssetId: WETH,
    subjectChainId: 1,
    participantCount: 4,
    sourceGroupCount: 2,
    preTradeSignedAt: CHECKED_AT_S,
    // Deliberately different from what the signed gates imply, so a VERIFIED
    // result can only happen if the values were really read from the payloads.
    quotedPrice: 999_999,
  };

  it('returns SELF_REPORTED and keeps the caller values when no originals are presented', async () => {
    const result = await resolvePreTradeBinding({ selfReported });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.binding.bindingMode).toBe('SELF_REPORTED');
    expect(result.binding.quotedPrice).toBe(999_999);
    expect(result.binding.preTradeUid).toBe(selfReported.preTradeUid);
  });

  it('returns SELF_REPORTED when only one of the two originals is presented', async () => {
    // A single certificate proves one price; the quote is a ratio of two, so it
    // would still be the caller's assertion. Half a proof is not a proof.
    const { source } = await signPair(1.0, 2500);
    const result = await resolvePreTradeBinding({ source, selfReported });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.binding.bindingMode).toBe('SELF_REPORTED');
  });

  it('returns VERIFIED and derives the quote from the signed consensus prices', async () => {
    const { source, destination } = await signPair(1.0, 2500);
    const result = await resolvePreTradeBinding({ source, destination, selfReported });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.binding.bindingMode).toBe('VERIFIED');
    // Destination-per-source = sourceUSD / destUSD = 1.0 / 2500 ≈ 0.0004 WETH
    // per USDC, and NOT the 999_999 the caller asserted. This matches the
    // on-chain executedPrice convention (destination amount / source amount).
    expect(result.binding.quotedPrice).toBeCloseTo(0.0004, 8);
    expect(result.binding.preTradeUid).toBe(source!.uid);
    expect(result.binding.requestHash).toBe(source!.data.requestHash);
    // H4: the receipt's preTradeSignedAt is the gate's SIGNING time (envelope
    // signedAt — here, when the test signed it), NOT the self-declared
    // data.checkedAt the signer chose for the observation window.
    expect(result.binding.preTradeSignedAt).toBe(signedAtSeconds(source!));
    expect(result.binding.preTradeSignedAt).not.toBe(CHECKED_AT_S);
    expect(result.binding.participantCount).toBe(4);
    expect(result.binding.subjectChainId).toBe(1);
  });

  it('rejects a tampered pre-trade payload instead of downgrading to SELF_REPORTED', async () => {
    // Someone claiming a gate and producing a broken one is asserting a
    // provenance they do not have. Signing a weaker receipt would reward that.
    const { source, destination } = await signPair(1.0, 2500);
    const tampered = {
      ...source!,
      data: { ...source!.data, consensusPrice: 1 }, // 2500x cheaper quote
    };
    const result = await resolvePreTradeBinding({
      source: tampered,
      destination,
      selfReported,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('PRE_TRADE_VERIFICATION_FAILED');
  });

  it('rejects a pre-trade signed by an unrecognised key', async () => {
    const { source, destination } = await signPair(1.0, 2500);
    const forged = {
      ...source!,
      attester: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // anvil account 1
    };
    const result = await resolvePreTradeBinding({ source: forged, destination, selfReported });
    expect(result.ok).toBe(false);
  });

  it('rejects two gates that describe different asset pairs', async () => {
    // Stops a caller pairing a genuine certificate for one asset with an
    // unrelated one to manufacture a favourable ratio.
    const { source } = await signPair(1.0, 2500);
    // The source gate certifies USDC -> WETH, so the paired gate must certify
    // WETH as its subject. This one certifies DAI instead: its price says
    // nothing about the leg we need, even though it is perfectly genuine.
    const unrelated = await signAttestationV3(
      preTradeInput({
        sourceAssetId: DAI,
        destinationAssetId: USDC,
        consensusPrice: 2500,
      })
    );
    const result = await resolvePreTradeBinding({
      source,
      destination: unrelated,
      selfReported,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/different asset pairs/);
  });

  it('still accepts a genuine gate that has aged past its 600s window, and flags it', async () => {
    // An expired gate no longer authorises a NEW trade, but it does prove the
    // authorisation existed. The receipt's own STALE_ORACLE_AT_EXEC code reports
    // the age consequence; refusing to bind here would erase the evidence.
    const stale = await signAttestationV3(
      preTradeInput({ checkedAtMs: (CHECKED_AT_S - 3600) * 1000 })
    );
    const fresh = await signAttestationV3(
      preTradeInput({ sourceAssetId: WETH, destinationAssetId: USDC, consensusPrice: 2500 })
    );
    const result = await resolvePreTradeBinding({
      source: stale,
      destination: fresh,
      selfReported,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.binding.bindingMode).toBe('VERIFIED');
    expect(result.binding.preTradeExpired).toBe(true);
    // Expiry is judged on the gate's data window, but the binding time is
    // still the envelope SIGNING time (the gate was signed just now, in this
    // test), never the stale checkedAt the test injected.
    expect(result.binding.preTradeSignedAt).toBe(signedAtSeconds(stale!));
    expect(result.binding.preTradeSignedAt).not.toBe(CHECKED_AT_S - 3600);
  });
});
