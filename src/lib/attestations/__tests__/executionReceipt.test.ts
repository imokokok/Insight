/**
 * Unit tests for the Execution Receipt (v2: 32 signed fields; v1: 30).
 *
 * These tests pin the two properties the receipt exists to provide, not just
 * the mechanics:
 *
 *   1. **Thresholds live inside the signed bytes.** `maxSlippageBps` is signed
 *      next to the `priceDeltaBps` it judges, and `requiredSourceGroupCount`
 *      next to `sourceGroupCount`. Rewriting either must invalidate the
 *      signature — otherwise a holder needs Insight's source code to interpret
 *      a document Insight signed (the VERITAS finding that produced v3).
 *   2. **The verdict is derived, never asserted.** `executionStatus` /
 *      `slippageSatisfied` / `independenceSatisfied` are computed from the
 *      evidence inside the same message, so a receipt cannot claim FAITHFUL
 *      while carrying numbers that say otherwise.
 *
 * Also mirrors the family's standing test contract: graceful disable, sign to
 * verify round trip, tamper rejection, forged-signer rejection, expiry.
 */

import { EXECUTION_DEFAULT_MAX_SLIPPAGE_BPS } from '../executionReceipt';

import type { ExecutionReceiptInput } from '../executionReceipt';

// Anvil account 0 — well-known throwaway key, used only for tests.
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ATTESTER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
// Pinned "now" so UIDs are deterministic AND verify's expiry check sees a
// non-expired window (validUntil = executedAt + 600s >= now).
const NOW_S = 1700000000;
const NOW_MS = NOW_S * 1000;

const ETH_NATIVE = 'eip155:1/slip44:60';
const USDC_ETH = 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const TX = '0x' + 'ab'.repeat(32);
const PRE_TRADE_UID = '0x' + '11'.repeat(32);
const REQUEST_HASH = '0x' + '22'.repeat(32);

/** A clean fill: 10bps of drift against a 50bps bound, oracle gates holding.
 *  `preTradeSignedAt` sits 3s before `executedAt`, matching the 3s oracle age,
 *  and the binding is VERIFIED — the only combination that may reach FAITHFUL. */
function baseInput(overrides: Partial<ExecutionReceiptInput> = {}): ExecutionReceiptInput {
  return {
    preTradeUid: PRE_TRADE_UID,
    requestHash: REQUEST_HASH,
    preTradeSignedAt: NOW_S - 3,
    bindingMode: 'VERIFIED',
    sourceAssetId: ETH_NATIVE,
    destinationAssetId: USDC_ETH,
    subjectChainId: 1,
    settlementChainId: 1,
    action: 'swap',
    quotedPrice: 3000.05,
    executedPrice: 3003.0, // +10 bps
    quotedAmountUsd: 50000,
    executedAmountUsd: 50000,
    actualFeeUsd: 12.5,
    fillStatus: 'FULL',
    txHash: TX,
    blockNumber: 21_000_000,
    executedAt: NOW_S,
    oracleDataAgeAtExecSeconds: 3,
    participantCount: 4,
    sourceGroupCount: 2,
    mevRiskScore: 0.05,
    reasonCodes: [],
    ...overrides,
  };
}

describe('executionReceipt', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
  });

  // ---- family contract ----

  it('returns null when no attester key is configured (graceful disable)', async () => {
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    const mod = await import('../executionReceipt');
    const receipt = await mod.signExecutionReceipt(baseInput());
    expect(receipt).toBeNull();
  });

  it('signs a receipt that verifies as valid (round trip)', async () => {
    const mod = await import('../executionReceipt');
    const receipt = await mod.signExecutionReceipt(baseInput());
    expect(receipt).not.toBeNull();
    expect(receipt!.attester).toBe(TEST_ATTESTER);
    expect(receipt!.schemaVersion).toBe(2);
    expect(receipt!.data.executionStatus).toBe('FAITHFUL');
    expect(receipt!.data.bindingMode).toBe('VERIFIED');

    const result = await mod.verifyExecutionReceipt(receipt!);
    expect(result.valid).toBe(true);
    expect(result.attester).toBe(TEST_ATTESTER);
    expect(result.expired).toBe(false);
    expect(result.executionStatus).toBe('FAITHFUL');
    expect(result.bindingMode).toBe('VERIFIED');
  });

  it('rejects a tampered execution status (signature no longer matches)', async () => {
    const mod = await import('../executionReceipt');
    const receipt = await mod.signExecutionReceipt(baseInput());
    const tampered = {
      ...receipt!,
      data: { ...receipt!.data, executionStatus: 'FAITHFUL' as const },
    };
    // Flip a DEVIATED receipt to FAITHFUL to confirm the verdict is protected.
    const deviated = await mod.signExecutionReceipt(baseInput({ executedPrice: 3030 }));
    expect(deviated!.data.executionStatus).toBe('DEVIATED');
    const forgedVerdict = {
      ...deviated!,
      data: { ...deviated!.data, executionStatus: 'FAITHFUL' as const },
    };
    const result = await mod.verifyExecutionReceipt(forgedVerdict);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/uid_mismatch|signature_invalid/);
    expect(tampered).toBeDefined();
  });

  it('rejects a forged signature from a different address', async () => {
    const mod = await import('../executionReceipt');
    const receipt = await mod.signExecutionReceipt(baseInput());
    const forged = {
      ...receipt!,
      attester: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // anvil account 1
    };
    const result = await mod.verifyExecutionReceipt(forged);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('signature_invalid: not signed by the claimed attester');
  });

  it('reports expired once the validity window closes', async () => {
    const mod = await import('../executionReceipt');
    const receipt = await mod.signExecutionReceipt(baseInput());

    (Date.now as unknown as jest.Mock).mockReturnValue((NOW_S + 601) * 1000);
    const result = await mod.verifyExecutionReceipt(receipt!);
    expect(result.expired).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('receipt_expired');
  });

  it('is deterministic: the same input yields the same UID', async () => {
    const mod = await import('../executionReceipt');
    const a = await mod.signExecutionReceipt(baseInput());
    const b = await mod.signExecutionReceipt(baseInput());
    expect(a!.uid).toBe(b!.uid);
  });

  // ---- property 1: thresholds are inside the signed bytes ----

  it('rejects a receipt whose slippage bound was altered', async () => {
    // The failure pre-trade v2 had: a bound that lives only in source code can
    // be reinterpreted by whoever holds the receipt. Here, rewriting it must
    // break the signature.
    const mod = await import('../executionReceipt');
    const receipt = await mod.signExecutionReceipt(baseInput({ executedPrice: 3030 }));
    expect(receipt!.data.priceDeltaBps).toBeGreaterThan(EXECUTION_DEFAULT_MAX_SLIPPAGE_BPS);

    const tampered = {
      ...receipt!,
      data: { ...receipt!.data, maxSlippageBps: 500 },
    };
    const result = await mod.verifyExecutionReceipt(tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/uid_mismatch|signature_invalid/);
  });

  it('rejects a receipt whose independence threshold was altered', async () => {
    const mod = await import('../executionReceipt');
    const receipt = await mod.signExecutionReceipt(baseInput());
    const tampered = {
      ...receipt!,
      data: { ...receipt!.data, requiredSourceGroupCount: 1 },
    };
    const result = await mod.verifyExecutionReceipt(tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/uid_mismatch|signature_invalid/);
  });

  // ---- property 2: the verdict is derived from the signed evidence ----

  it('marks a full fill inside the bound as FAITHFUL', async () => {
    const mod = await import('../executionReceipt');
    const msg = await mod.buildExecutionMessage(baseInput());
    expect(msg.priceDeltaBps).toBe(10);
    expect(msg.slippageSatisfied).toBe(true);
    expect(msg.independenceSatisfied).toBe(true);
    expect(msg.executionStatus).toBe('FAITHFUL');
  });

  it('marks a fill past the bound as DEVIATED', async () => {
    const mod = await import('../executionReceipt');
    const msg = await mod.buildExecutionMessage(baseInput({ executedPrice: 3030 }));
    expect(msg.priceDeltaBps).toBeGreaterThan(msg.maxSlippageBps);
    expect(msg.slippageSatisfied).toBe(false);
    expect(msg.executionStatus).toBe('DEVIATED');
  });

  it('treats a better-than-quoted fill as satisfying the bound (negative drift)', async () => {
    const mod = await import('../executionReceipt');
    const msg = await mod.buildExecutionMessage(baseInput({ executedPrice: 2990 }));
    expect(msg.priceDeltaBps).toBeLessThan(0);
    expect(msg.slippageSatisfied).toBe(true);
    expect(msg.executionStatus).toBe('FAITHFUL');
  });

  it('marks a reverted or failed transaction as NOT_EXECUTED', async () => {
    const mod = await import('../executionReceipt');
    const reverted = await mod.buildExecutionMessage(baseInput({ fillStatus: 'REVERTED' }));
    expect(reverted.executionStatus).toBe('NOT_EXECUTED');

    const failed = await mod.buildExecutionMessage(baseInput({ fillStatus: 'FAILED' }));
    expect(failed.executionStatus).toBe('NOT_EXECUTED');
  });

  it('marks a partial fill as DEVIATED even when inside the bound', async () => {
    // A partial fill did not execute the certified action in full, so it is not
    // faithful regardless of price.
    const mod = await import('../executionReceipt');
    const msg = await mod.buildExecutionMessage(baseInput({ fillStatus: 'PARTIAL' }));
    expect(msg.slippageSatisfied).toBe(true);
    expect(msg.executionStatus).toBe('DEVIATED');
  });

  it('marks a clean fill as DEVIATED when oracle independence lapsed at execution', async () => {
    // The receipt claims "executed on the price Insight certified". A degraded
    // oracle basis breaks that claim even if the fill itself was clean.
    const mod = await import('../executionReceipt');
    const msg = await mod.buildExecutionMessage(baseInput({ sourceGroupCount: 1 }));
    expect(msg.independenceSatisfied).toBe(false);
    expect(msg.slippageSatisfied).toBe(true);
    expect(msg.executionStatus).toBe('DEVIATED');
  });

  it('claims no drift and no verdict when there is no certified price to drift from', async () => {
    // Guards the honest-failure direction. An absent quote must not produce a
    // confident-looking delta, and — the part this test was written to catch —
    // it must not resolve to FAITHFUL by comparing zero against zero. The
    // verdict is UNDETERMINED because the comparison was never performed.
    const mod = await import('../executionReceipt');
    expect(mod.derivePriceDeltaBps(0, 3000)).toBe(0);
    const msg = await mod.buildExecutionMessage(baseInput({ quotedPrice: 0, executedPrice: 0 }));
    expect(msg.priceDeltaBps).toBe(0);
    expect(msg.executionStatus).toBe('UNDETERMINED');
  });

  it('marks a fill with no readable executed price as UNDETERMINED, not DEVIATED', async () => {
    // Unreadable fill data is missing evidence, not proven drift.
    const mod = await import('../executionReceipt');
    const msg = await mod.buildExecutionMessage(baseInput({ executedPrice: 0 }));
    expect(msg.executionStatus).toBe('UNDETERMINED');
  });

  // ---- v2: the binding must be real, and the gate must precede the fill ----

  it('refuses FAITHFUL when the pre-trade was signed after the fill', async () => {
    // The ordering hole: a gate produced once a favourable fill is already
    // known did not authorise it. Under v1 the negative age was clamped to 0
    // and read as the freshest possible gate.
    const mod = await import('../executionReceipt');
    const msg = await mod.buildExecutionMessage(baseInput({ preTradeSignedAt: NOW_S + 120 }));
    expect(msg.slippageSatisfied).toBe(true);
    expect(msg.executionStatus).toBe('UNDETERMINED');
  });

  it('refuses FAITHFUL when the pre-trade time is absent', async () => {
    const mod = await import('../executionReceipt');
    const msg = await mod.buildExecutionMessage(baseInput({ preTradeSignedAt: 0 }));
    expect(msg.executionStatus).toBe('UNDETERMINED');
  });

  it('refuses FAITHFUL when the binding is only self-reported', async () => {
    // A signature over caller-supplied values proves we signed those values,
    // not that a matching gate existed. Without a proven quote there is nothing
    // to be faithful to.
    const mod = await import('../executionReceipt');
    const msg = await mod.buildExecutionMessage(baseInput({ bindingMode: 'SELF_REPORTED' }));
    expect(msg.slippageSatisfied).toBe(true);
    expect(msg.independenceSatisfied).toBe(true);
    expect(msg.bindingMode).toBe('SELF_REPORTED');
    expect(msg.executionStatus).toBe('UNDETERMINED');
  });

  it('still records DEVIATED on a self-reported binding when the fill breached the bound', async () => {
    // Adverse findings are graded before the binding check. Withholding a
    // breach because the caller declined to show its gate would let an unproven
    // submission hide a bad fill.
    const mod = await import('../executionReceipt');
    const msg = await mod.buildExecutionMessage(
      baseInput({ bindingMode: 'SELF_REPORTED', executedPrice: 3030 })
    );
    expect(msg.executionStatus).toBe('DEVIATED');
  });

  it('routes verification by the signed schema version, keeping v1 receipts verifiable', async () => {
    const mod = await import('../executionReceipt');
    expect(mod.executionTypesForSchemaVersion(1).ExecutionReceipt).toHaveLength(30);
    expect(mod.executionTypesForSchemaVersion(2).ExecutionReceipt).toHaveLength(32);
    // v1 layout must not declare the v2-only fields.
    const v1Names = mod.executionTypesForSchemaVersion(1).ExecutionReceipt.map((f) => f.name);
    expect(v1Names).not.toContain('bindingMode');
    expect(v1Names).not.toContain('preTradeSignedAt');
  });

  // ---- pairing with the pre-trade receipt ----

  it('carries the pre-trade UID and the same requestHash it was authorised against', async () => {
    const mod = await import('../executionReceipt');
    const msg = await mod.buildExecutionMessage(baseInput());
    expect(msg.preTradeUid).toBe(PRE_TRADE_UID);
    expect(msg.requestHash).toBe(REQUEST_HASH);
  });

  it('keeps the quorum and independence floors equal to the pre-trade line', async () => {
    // The three receipt types must not drift on what "enough independent
    // providers" means, or a paired pre-trade/execution pair could disagree.
    const mod = await import('../executionReceipt');
    expect(mod.EXECUTION_REQUIRED_PARTICIPANT_COUNT).toBe(3);
    expect(mod.EXECUTION_REQUIRED_SOURCE_GROUP_COUNT).toBe(2);
  });
});
