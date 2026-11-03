import { privateKeyToAccount } from 'viem/accounts';

import {
  getAttesterAccount,
  getAttesterAddress,
  getSampleAttesterAddress,
} from '@/lib/attestations/attesterAccount';
import { trustedAttesterEntry } from '@/lib/attestations/keyRegistryConfig';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { nowInSeconds } from '@/lib/utils/time';

import { assessDecisionInput, type DecisionInputRouteQuote } from '../assessment';
import { signDecisionInputAssessment } from '../attestation';
import {
  assembleDecisionEvidencePack,
  evidencePackHash,
  fetchDecisionEvidenceRows,
  verifyDecisionEvidencePack,
  type ExecutionReceiptEvidenceRow,
  type PreTradeCheckEvidenceRow,
} from '../evidencePack';

import type { DecisionInputExecutionGateAudit } from '../audit';

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

jest.mock('@/lib/attestations/attesterAccount', () => ({
  getAttesterAccount: jest.fn(),
  getAttesterAddress: jest.fn(),
  getSampleAttesterAddress: jest.fn(),
}));

jest.mock('@/lib/attestations/keyRegistryConfig', () => ({
  buildKeyRegistryConfig: jest.fn(() => ({})),
  trustedAttesterEntry: jest.fn(),
}));

jest.mock('@/lib/utils/time', () => ({
  nowInSeconds: jest.fn(),
}));

const mockGetAttesterAccount = getAttesterAccount as jest.MockedFunction<typeof getAttesterAccount>;
const mockGetAttesterAddress = getAttesterAddress as jest.MockedFunction<typeof getAttesterAddress>;
const mockGetSampleAttesterAddress = getSampleAttesterAddress as jest.MockedFunction<
  typeof getSampleAttesterAddress
>;
const mockTrustedAttesterEntry = trustedAttesterEntry as jest.MockedFunction<
  typeof trustedAttesterEntry
>;
const mockNowInSeconds = nowInSeconds as jest.MockedFunction<typeof nowInSeconds>;
const mockClient = createServiceRoleClient as jest.MockedFunction<typeof createServiceRoleClient>;

const signer = privateKeyToAccount(`0x${'11'.repeat(32)}`);
const NOW_SECONDS = 1_800_000_000;
const NOW = new Date(NOW_SECONDS * 1000).toISOString();
const SOURCE_UID = `0x${'22'.repeat(32)}`;
const DESTINATION_UID = `0x${'33'.repeat(32)}`;
const RECEIPT_UID = `0x${'44'.repeat(32)}`;

const ROUTE_QUOTE: DecisionInputRouteQuote = {
  price: 2000.0000000000002,
  observedAt: NOW,
  callerReported: { price: 2000, observedAt: NOW },
  onchainEvidence: {
    provider: 'uniswap-v3-quoter-v2',
    chainId: 1,
    blockNumber: '23000000',
    blockHash: `0x${'aa'.repeat(32)}`,
    quoterAddress: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    path: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f4a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    routeSymbols: ['WETH', 'USDC'],
    routeTokens: [
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    ],
    feeTiers: [500],
    amountInRaw: '500000000000000000',
    amountOutRaw: '1000000000',
    rpcWitnessCount: 2,
    rpcWitnessHosts: ['rpc-one.example', 'rpc-two.example'],
    notionalPrice: {
      provider: 'chainlink-data-feed',
      assetSymbol: 'WETH',
      priceReferenceSymbol: 'ETH',
      pricingBasis: 'chainlink-usd',
      priceUsd: 2000,
      feedAddress: `0x${'cc'.repeat(20)}`,
      roundId: '123',
      updatedAt: NOW,
      heartbeatSeconds: 3600,
    },
  },
};

const GATE: DecisionInputExecutionGateAudit = {
  schemaVersion: 1,
  status: 'SUFFICIENT',
  evaluatedAt: NOW,
  sourceAssessmentStatus: 'SUFFICIENT',
  destinationAssessmentStatus: 'SUFFICIENT',
  routeQuote: {
    price: 2000.0000000000002,
    observedAt: NOW,
    ageSeconds: 1,
    oracleCrossRate: 2000,
    deviationBps: 0,
    callerReportedPrice: 2000,
    callerReportedAt: NOW,
    callerDeviationBps: 0,
    maxDeviationBps: 50,
    source: 'uniswap-v3-quoter-v2',
    blockNumber: '23000000',
    blockHash: `0x${'aa'.repeat(32)}`,
  },
};

function makeAssessment() {
  return assessDecisionInput({
    asset: 'ETH',
    chainId: 1,
    action: 'swap',
    tradeAmountUsd: 1000,
    request: {
      decisionPriceUsd: 2000,
      quotePriceUsd: 2000,
      quoteObservedAt: NOW,
      maxReferenceDeviationBps: 50,
      maxSlippageBps: 50,
      maxQuoteAgeSeconds: 30,
      operationRouteQuote: ROUTE_QUOTE,
    },
    chainlink: null,
    cex: null,
    dex: null,
    now: new Date(NOW_SECONDS * 1000),
  });
}

async function makeSignedAssessment(linkedUid: string) {
  const assessment = makeAssessment();
  const attestation = await signDecisionInputAssessment(assessment, linkedUid);
  expect(attestation).not.toBeNull();
  return { ...assessment, attestation };
}

function makePreTradeRow(
  uid: string,
  assessment: Record<string, unknown> | null,
  overrides: Partial<PreTradeCheckEvidenceRow> = {}
): PreTradeCheckEvidenceRow {
  return {
    attestation_uid: uid,
    attester: signer.address,
    signed: assessment !== null,
    verdict: 'PASS',
    asset: 'ETH',
    chain_id: 1,
    action: 'swap',
    trade_amount_usd: 1000,
    created_at: NOW,
    decision_input_assessment: assessment,
    decision_input_gate: GATE,
    ...overrides,
  };
}

function makeReceiptRow(
  sourceUid: string,
  destinationUid: string | null,
  overrides: Partial<ExecutionReceiptEvidenceRow> = {}
): ExecutionReceiptEvidenceRow {
  return {
    uid: RECEIPT_UID,
    attested: true,
    attester: signer.address,
    execution_status: 'FAITHFUL',
    fill_status: 'FULL',
    tx_hash: `0x${'dd'.repeat(32)}`,
    block_number: 23000001,
    executed_at: NOW,
    source: 'mcp',
    environment: 'production',
    created_at: NOW,
    pre_trade_uid: sourceUid,
    destination_pre_trade_uid: destinationUid,
    receipt_payload: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAttesterAccount.mockResolvedValue(signer);
  mockGetAttesterAddress.mockResolvedValue(signer.address);
  mockGetSampleAttesterAddress.mockResolvedValue(null);
  mockTrustedAttesterEntry.mockReturnValue({ address: signer.address } as never);
  mockNowInSeconds.mockReturnValue(NOW_SECONDS);
});

describe('assembleDecisionEvidencePack', () => {
  it('assigns roles from the receipt anchors and produces a self-consistent manifest', async () => {
    const [sourceAssessment, destinationAssessment] = await Promise.all([
      makeSignedAssessment(SOURCE_UID),
      makeSignedAssessment(DESTINATION_UID),
    ]);
    const rows = [
      makePreTradeRow(DESTINATION_UID, destinationAssessment, {
        created_at: '2026-10-16T12:00:02Z',
      }),
      makePreTradeRow(SOURCE_UID, sourceAssessment, { created_at: '2026-10-16T12:00:01Z' }),
    ];
    const pack = assembleDecisionEvidencePack({
      preTradeRows: rows,
      receiptRow: makeReceiptRow(SOURCE_UID, DESTINATION_UID),
      generatedAt: NOW,
    });

    expect(pack.preTrade[0].role).toBe('source');
    expect(pack.preTrade[1].role).toBe('destination');
    expect(pack.manifest.anchors).toEqual({
      preTradeUids: [SOURCE_UID, DESTINATION_UID],
      executionReceiptUid: RECEIPT_UID,
    });
    expect(pack.inputGateConsistent).toBe(true);
    expect(pack.manifest.packHash).toBe(
      evidencePackHash({
        schemaVersion: pack.manifest.schemaVersion,
        packType: pack.manifest.packType,
        generatedAt: pack.manifest.generatedAt,
        anchors: pack.manifest.anchors,
        artifactHashes: pack.manifest.artifactHashes,
      })
    );
    expect(pack.boundaries.length).toBeGreaterThan(0);
  });

  it('flags inconsistent gate copies across the two rows', async () => {
    const assessment = await makeSignedAssessment(SOURCE_UID);
    const otherGate = { ...GATE, status: 'BLOCK' as const };
    const pack = assembleDecisionEvidencePack({
      preTradeRows: [
        makePreTradeRow(SOURCE_UID, assessment),
        makePreTradeRow(DESTINATION_UID, assessment, { decision_input_gate: otherGate }),
      ],
      receiptRow: makeReceiptRow(SOURCE_UID, DESTINATION_UID),
      generatedAt: NOW,
    });

    expect(pack.inputGateConsistent).toBe(false);
  });
});

describe('verifyDecisionEvidencePack', () => {
  it('verifies an assembled pack with signed assessments and provenance rows', async () => {
    const [sourceAssessment, destinationAssessment] = await Promise.all([
      makeSignedAssessment(SOURCE_UID),
      makeSignedAssessment(DESTINATION_UID),
    ]);
    const pack = assembleDecisionEvidencePack({
      preTradeRows: [
        makePreTradeRow(SOURCE_UID, sourceAssessment),
        makePreTradeRow(DESTINATION_UID, destinationAssessment),
      ],
      receiptRow: makeReceiptRow(SOURCE_UID, DESTINATION_UID),
      generatedAt: NOW,
    });

    const result = await verifyDecisionEvidencePack(pack);
    expect(result.manifestValid).toBe(true);
    expect(result.integrityValid).toBe(true);
    expect(result.reason).toBe('verified');
    expect(result.completeness.signedAssessments).toBe(2);
    for (const check of result.assessments) {
      expect(check.signatureValid).toBe(true);
      expect(check.linkedPreTradeUidMatchesRow).toBe(true);
    }
  });

  it('rejects a pack whose artifacts no longer match the manifest', async () => {
    const assessment = await makeSignedAssessment(SOURCE_UID);
    const pack = assembleDecisionEvidencePack({
      preTradeRows: [makePreTradeRow(SOURCE_UID, assessment)],
      receiptRow: makeReceiptRow(SOURCE_UID, null),
      generatedAt: NOW,
    });

    pack.preTrade[0].signed = false; // flip a byte without recomputing anything

    const result = await verifyDecisionEvidencePack(pack);
    expect(result.manifestValid).toBe(false);
    expect(result.integrityValid).toBe(false);
    expect(result.reason).toBe('pre_trade_entry_hash_mismatch:0');
  });

  it('fails closed when an assessment is linked to a different pre-trade UID than its row', async () => {
    const assessment = await makeSignedAssessment(DESTINATION_UID); // linked elsewhere
    const pack = assembleDecisionEvidencePack({
      preTradeRows: [makePreTradeRow(SOURCE_UID, assessment)],
      receiptRow: makeReceiptRow(SOURCE_UID, null),
      generatedAt: NOW,
    });

    const result = await verifyDecisionEvidencePack(pack);
    expect(result.manifestValid).toBe(true);
    expect(result.assessments[0].linkedPreTradeUidMatchesRow).toBe(false);
    expect(result.linkage.assessmentsMatchAnchors).toBe(false);
    expect(result.integrityValid).toBe(false);
  });

  it('fails closed when the carried gate copies disagree', async () => {
    const assessment = await makeSignedAssessment(SOURCE_UID);
    const otherGate = { ...GATE, status: 'BLOCK' as const };
    const pack = assembleDecisionEvidencePack({
      preTradeRows: [
        makePreTradeRow(SOURCE_UID, assessment),
        makePreTradeRow(DESTINATION_UID, assessment, { decision_input_gate: otherGate }),
      ],
      receiptRow: makeReceiptRow(SOURCE_UID, DESTINATION_UID),
      generatedAt: NOW,
    });
    // Keep the manifest honest about the inconsistent gate: reassemble hashes
    // by rebuilding the pack through the same assembly path is unnecessary —
    // assembly already hashed each gate copy; the consistency flag itself
    // disagrees, which must block integrity on its own.
    const result = await verifyDecisionEvidencePack(pack);
    expect(result.linkage.gateConsistent).toBe(false);
    expect(result.integrityValid).toBe(false);
  });
});

describe('fetchDecisionEvidenceRows', () => {
  it('resolves a receipt UID to its paired pre-trade rows', async () => {
    const assessment = await makeSignedAssessment(SOURCE_UID);
    const receiptRow = makeReceiptRow(SOURCE_UID, DESTINATION_UID);
    const preTradeRows = [
      makePreTradeRow(SOURCE_UID, assessment),
      makePreTradeRow(DESTINATION_UID, assessment),
    ];
    const receiptSelect = jest.fn().mockReturnThis();
    const receiptEq = jest.fn().mockReturnThis();
    const receiptLimit = jest.fn().mockResolvedValue({ data: [receiptRow], error: null });
    const preTradeIn = jest.fn().mockResolvedValue({ data: preTradeRows, error: null });
    const from = jest.fn((table: string) => {
      if (table === 'execution_receipts') {
        return { select: receiptSelect, eq: receiptEq, limit: receiptLimit };
      }
      return { select: jest.fn().mockReturnThis(), in: preTradeIn };
    });
    mockClient.mockReturnValue({ from } as never);

    const rows = await fetchDecisionEvidenceRows(RECEIPT_UID);
    expect(rows).not.toBeNull();
    expect(rows!.receiptRow).toEqual(receiptRow);
    expect(rows!.preTradeRows).toHaveLength(2);
    expect(from).toHaveBeenCalledWith('execution_receipts');
    expect(from).toHaveBeenCalledWith('pre_trade_checks');
  });

  it('returns null for a malformed UID without touching the database', async () => {
    const from = jest.fn();
    mockClient.mockReturnValue({ from } as never);

    expect(await fetchDecisionEvidenceRows('not-a-uid')).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it('returns null when nothing is anchored to the UID', async () => {
    const receiptSelect = jest.fn().mockReturnThis();
    const receiptEq = jest.fn().mockReturnThis();
    const receiptLimit = jest.fn().mockResolvedValue({ data: [], error: null });
    const preTradeSelect = jest.fn().mockReturnThis();
    const preTradeEq = jest.fn().mockReturnThis();
    const preTradeLimit = jest.fn().mockResolvedValue({ data: [], error: null });
    const from = jest.fn((table: string) => {
      if (table === 'execution_receipts') {
        return { select: receiptSelect, eq: receiptEq, limit: receiptLimit };
      }
      return { select: preTradeSelect, eq: preTradeEq, limit: preTradeLimit };
    });
    mockClient.mockReturnValue({ from } as never);

    expect(await fetchDecisionEvidenceRows(SOURCE_UID)).toBeNull();
  });
});
