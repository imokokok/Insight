/** @jest-environment node */

import type { PreTradeSafetyResult } from '@/lib/api/services/preTradeSafetyService';
import { assessProductOutcome, missingRejectedEvidenceItems } from '@/lib/billing/exemptions';

import { prepareSolanaJupiterSwap } from '../solanaJupiterSwap';
import {
  assessSolanaJupiterSwapGuard,
  SOLANA_JUPITER_SWAP_GUARD_RULE_SET,
  type SolanaJupiterSwapGuardInput,
} from '../solanaJupiterSwapGuard';
import { SOLANA_USDC_MINT, SOLANA_WSOL_MINT } from '../solanaOrcaWhirlpool';

const REVIEWED_POOL = 'Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE';
const BONK_MINT = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const NOW = new Date('2026-11-08T00:00:00.000Z');

function baseInput(
  overrides: Partial<SolanaJupiterSwapGuardInput> = {}
): SolanaJupiterSwapGuardInput {
  return {
    inputMint: SOLANA_WSOL_MINT,
    outputMint: SOLANA_USDC_MINT,
    amountInRaw: '1500000000',
    amountOutRaw: '250000000',
    minimumOutRaw: '249000000',
    priceImpactPct: 0.1,
    slippageBps: 50,
    quoteContextSlot: 1_000,
    quotedAt: new Date(NOW.getTime() - 2_000).toISOString(),
    tradeAmountUsd: 150,
    routePlan: [
      {
        ammKey: REVIEWED_POOL,
        label: 'Orca Whirlpool',
        inputMint: SOLANA_WSOL_MINT,
        outputMint: SOLANA_USDC_MINT,
        inAmountRaw: '1500000000',
        outAmountRaw: '250000000',
        percent: 100,
      },
    ],
    ...overrides,
  };
}

function oracle(verdict: PreTradeSafetyResult['verdict']): PreTradeSafetyResult {
  return {
    verdict,
    consensusPrice: 1,
    maxDeviationPct: 0.1,
    manipulationRiskScore: 0.05,
    staleDataRisk: false,
    crossProviderAgreement: 0.99,
    recommendedMaxPositionUsd: 1_000_000,
    participantCount: 3,
    providerPrices: {},
    depegWarnings: [],
    warnings: [],
    contributingFactors: [],
    protocolSafety: null,
  } as unknown as PreTradeSafetyResult;
}

function passOracle() {
  return jest.fn(async () => oracle('PASS'));
}

describe('Solana Jupiter swap guard', () => {
  it('passes a reviewed route with oracle consensus', async () => {
    const checkOracle = passOracle();
    const result = await assessSolanaJupiterSwapGuard(baseInput(), {
      checkOracle,
      now: () => NOW,
      timeoutMs: 1_000,
    });

    expect(checkOracle).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      schema: 'insight.solana-jupiter-swap-guard.v1',
      ruleSetVersion: SOLANA_JUPITER_SWAP_GUARD_RULE_SET,
      chainId: 0,
      verdict: 'PASS',
      status: 'decided',
      productOutcome: 'approved',
      chargeable: true,
      executable: true,
      oracleChecks: { source: { verdict: 'PASS' }, destination: { verdict: 'PASS' } },
    });
    expect(result.riskVerdictRef).toMatchObject({
      source: 'solana_jupiter_swap_guard',
      verdict: 'PASS',
      status: 'decided',
      productOutcome: 'approved',
    });
    expect(result.riskVerdictRef.quoteDigest).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('blocks price impact above the reviewed policy', async () => {
    const checkOracle = passOracle();
    const result = await assessSolanaJupiterSwapGuard(baseInput({ priceImpactPct: 2 }), {
      checkOracle,
      now: () => NOW,
      timeoutMs: 1_000,
    });

    expect(result).toMatchObject({
      verdict: 'BLOCK',
      status: 'decided',
      productOutcome: 'rejected',
      chargeable: true,
      executable: false,
    });
    expect(result.reasons.join(' ')).toMatch(/PRICE_IMPACT_ABOVE_POLICY/);
    expect(checkOracle).not.toHaveBeenCalled();
  });

  it('returns unavailable — not a chargeable rejection — for a route on an unreviewed pool of an integrated venue', async () => {
    const checkOracle = passOracle();
    const result = await assessSolanaJupiterSwapGuard(
      baseInput({
        routePlan: [
          {
            ammKey: BONK_MINT,
            label: 'Orca Whirlpool',
            inputMint: SOLANA_WSOL_MINT,
            outputMint: SOLANA_USDC_MINT,
            inAmountRaw: '1500000000',
            outAmountRaw: '250000000',
            percent: 100,
          },
        ],
      }),
      { checkOracle, now: () => NOW, timeoutMs: 1_000 }
    );

    expect(result).toMatchObject({
      verdict: 'BLOCK',
      status: 'unavailable',
      productOutcome: 'unavailable',
      chargeable: false,
      executable: false,
    });
    expect(result.metrics.unknownPools).toEqual([BONK_MINT]);
    expect(result.reasons.join(' ')).toMatch(/COVERAGE_INTEGRATED_NOT_REVIEWED_POOL/);
    expect(checkOracle).not.toHaveBeenCalled();
  });

  it('returns unavailable — not a chargeable rejection — for a route on a venue that is not integrated', async () => {
    const result = await assessSolanaJupiterSwapGuard(
      baseInput({
        routePlan: [
          {
            ammKey: BONK_MINT,
            label: 'Raydium',
            inputMint: SOLANA_WSOL_MINT,
            outputMint: SOLANA_USDC_MINT,
            inAmountRaw: '1500000000',
            outAmountRaw: '250000000',
            percent: 100,
          },
        ],
      }),
      { checkOracle: passOracle(), now: () => NOW, timeoutMs: 1_000 }
    );

    expect(result.status).toBe('unavailable');
    expect(result.productOutcome).toBe('unavailable');
    expect(result.chargeable).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/COVERAGE_EXISTS_NOT_INTEGRATED_POOL/);
  });

  it('returns unavailable — not a chargeable rejection — when oracle checks time out', async () => {
    const result = await assessSolanaJupiterSwapGuard(baseInput(), {
      checkOracle: jest.fn(() => new Promise<PreTradeSafetyResult>(() => {})),
      now: () => NOW,
      timeoutMs: 100,
    });

    expect(result).toMatchObject({
      verdict: 'BLOCK',
      status: 'unavailable',
      productOutcome: 'unavailable',
      chargeable: false,
      executable: false,
    });
    expect(result.reasons.join(' ')).toMatch(/ORACLE_EVIDENCE_UNAVAILABLE/);
    expect(result.oracleChecks?.source.verdict).toBe('UNAVAILABLE');
  });

  it('returns unavailable when a mint is not on the reviewed allowlist but trades on an integrated venue', async () => {
    const checkOracle = passOracle();
    const result = await assessSolanaJupiterSwapGuard(
      baseInput({
        outputMint: BONK_MINT,
        routePlan: [
          {
            ammKey: REVIEWED_POOL,
            label: 'Orca Whirlpool',
            inputMint: SOLANA_WSOL_MINT,
            outputMint: BONK_MINT,
            inAmountRaw: '1500000000',
            outAmountRaw: '250000000',
            percent: 100,
          },
        ],
      }),
      { checkOracle, now: () => NOW, timeoutMs: 1_000 }
    );

    expect(result).toMatchObject({
      verdict: 'BLOCK',
      status: 'unavailable',
      productOutcome: 'unavailable',
      chargeable: false,
    });
    expect(result.route?.destinationAsset).toBe('UNKNOWN');
    expect(result.reasons.join(' ')).toMatch(/COVERAGE_INTEGRATED_NOT_REVIEWED_OUTPUT_MINT/);
    expect(checkOracle).not.toHaveBeenCalled();
  });

  it('returns unavailable when a mint exists on Solana but no reviewed venue covers it', async () => {
    const result = await assessSolanaJupiterSwapGuard(
      baseInput({
        outputMint: BONK_MINT,
        routePlan: [
          {
            ammKey: BONK_MINT,
            label: 'Raydium',
            inputMint: SOLANA_WSOL_MINT,
            outputMint: BONK_MINT,
            inAmountRaw: '1500000000',
            outAmountRaw: '250000000',
            percent: 100,
          },
        ],
      }),
      { checkOracle: passOracle(), now: () => NOW, timeoutMs: 1_000 }
    );

    expect(result.status).toBe('unavailable');
    expect(result.productOutcome).toBe('unavailable');
    expect(result.chargeable).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/COVERAGE_EXISTS_NOT_INTEGRATED_OUTPUT_MINT/);
  });

  it('returns unavailable when a mint address does not exist in the ecosystem', async () => {
    const invalidMint = 'not-a-solana-mint';
    const result = await assessSolanaJupiterSwapGuard(
      baseInput({
        outputMint: invalidMint,
        routePlan: [
          {
            ammKey: REVIEWED_POOL,
            label: 'Orca Whirlpool',
            inputMint: SOLANA_WSOL_MINT,
            outputMint: invalidMint,
            inAmountRaw: '1500000000',
            outAmountRaw: '250000000',
            percent: 100,
          },
        ],
      }),
      { checkOracle: passOracle(), now: () => NOW, timeoutMs: 1_000 }
    );

    expect(result.status).toBe('unavailable');
    expect(result.productOutcome).toBe('unavailable');
    expect(result.chargeable).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/COVERAGE_ECOSYSTEM_UNKNOWN_OUTPUT_MINT/);
  });

  it('does not build a transaction when the guard blocks', async () => {
    const blocked = await assessSolanaJupiterSwapGuard(baseInput({ priceImpactPct: 2 }), {
      checkOracle: passOracle(),
      now: () => NOW,
      timeoutMs: 1_000,
    });
    expect(blocked.verdict).toBe('BLOCK');

    const fetcher = jest.fn();
    const build = await prepareSolanaJupiterSwap(
      {
        inputMint: SOLANA_WSOL_MINT,
        outputMint: SOLANA_USDC_MINT,
        amount: '1.5',
        slippageBps: 50,
        userPublicKey: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
        riskVerdict: blocked.riskVerdictRef,
      },
      { endpoints: ['https://solana.example'], fetcher: fetcher as never, nowMs: NOW.getTime() }
    );

    expect(build.verdict).toBe('BLOCK');
    expect(build.transaction).toBeNull();
    expect(build.quote).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('maps CAUTION into the rejected product state and never makes it executable', async () => {
    const result = await assessSolanaJupiterSwapGuard(baseInput({ priceImpactPct: 0.6 }), {
      checkOracle: passOracle(),
      now: () => NOW,
      timeoutMs: 1_000,
    });

    expect(result).toMatchObject({
      verdict: 'CAUTION',
      status: 'decided',
      productOutcome: 'rejected',
      chargeable: true,
      executable: false,
    });
    expect(result.riskVerdictRef.productOutcome).toBe('rejected');
    expect(result.reasons.join(' ')).toMatch(/PRICE_IMPACT_REQUIRES_REVIEW/);
    expect(missingRejectedEvidenceItems(result.evidence)).toEqual([]);
    expect(assessProductOutcome(JSON.stringify(result))).toMatchObject({
      outcome: 'rejected',
      downgradedFromRejected: false,
    });
    expect(result.policy).not.toHaveProperty('allowCautionExecution');
  });

  it('keeps a stale quote unavailable even when every evidence field could be filled', async () => {
    const result = await assessSolanaJupiterSwapGuard(
      baseInput({
        priceImpactPct: 0.6,
        quotedAt: new Date(NOW.getTime() - 86_400_000).toISOString(),
      }),
      { checkOracle: passOracle(), now: () => NOW, timeoutMs: 1_000 }
    );

    expect(result.productOutcome).toBe('unavailable');
    expect(result.chargeable).toBe(false);
    expect(result.evidence).toBeNull();

    const assessment = assessProductOutcome(
      JSON.stringify({
        productOutcome: result.productOutcome,
        evidence: {
          reason_code: 'TEST',
          input_digest: `0x${'11'.repeat(32)}`,
          triggered_threshold: { rule: 'test', threshold: 1, observed: 2 },
          data_sources: [{ source: 'test' }],
          risk_ruleset_version: 'test-v1',
        },
      })
    );
    expect(assessment.outcome).toBe('unavailable');
  });

  it('maps an oracle CAUTION leg into the rejected product state', async () => {
    const result = await assessSolanaJupiterSwapGuard(baseInput(), {
      checkOracle: jest.fn(async () => oracle('CAUTION')),
      now: () => NOW,
      timeoutMs: 1_000,
    });

    expect(result).toMatchObject({
      verdict: 'CAUTION',
      status: 'decided',
      productOutcome: 'rejected',
      chargeable: true,
      executable: false,
    });
    expect(result.reasons.join(' ')).toMatch(/ORACLE_CONSENSUS_REQUIRES_REVIEW/);
  });
});
