import type { PreTradeSafetyResult } from '@/lib/api/services/preTradeSafetyService';
import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import { resolveCaip19 } from '@/lib/attestations/caip19';
import { verifyDecisionInputAssessment } from '@/lib/decisionInputTrust/attestation';
import { recordDecisionInputExecutionGate } from '@/lib/decisionInputTrust/audit';
import { getOnchainRouteQuote } from '@/lib/decisionInputTrust/onchainRouteQuote';

import { getToolDefinitions } from '../tools';
import { agentBeginTradeTool } from '../tools/agentBeginTradeTools';
import { AgentBeginTradeInputSchema } from '../tools/schemas';

jest.mock('@/lib/api/services/preTradeSafetyService', () => ({
  preTradeSafetyCheck: jest.fn(),
}));
jest.mock('@/lib/attestations/caip19', () => ({
  resolveCaip19: jest.fn(),
}));
jest.mock('@/lib/decisionInputTrust/audit', () => ({
  recordDecisionInputExecutionGate: jest.fn(),
}));
jest.mock('@/lib/decisionInputTrust/attestation', () => ({
  verifyDecisionInputAssessment: jest.fn(),
}));
jest.mock('@/lib/decisionInputTrust/onchainRouteQuote', () => ({
  getOnchainRouteQuote: jest.fn(),
  OnchainRouteQuoteError: class OnchainRouteQuoteError extends Error {},
}));

const mockPreTrade = preTradeSafetyCheck as jest.MockedFunction<typeof preTradeSafetyCheck>;
const mockResolve = resolveCaip19 as jest.MockedFunction<typeof resolveCaip19>;
const mockRecordGate = recordDecisionInputExecutionGate as jest.MockedFunction<
  typeof recordDecisionInputExecutionGate
>;
const mockVerifyAssessment = verifyDecisionInputAssessment as jest.MockedFunction<
  typeof verifyDecisionInputAssessment
>;
const mockOnchainRouteQuote = getOnchainRouteQuote as jest.MockedFunction<
  typeof getOnchainRouteQuote
>;

const UID = '0x' + '11'.repeat(32);
const DEST_UID = '0x' + '33'.repeat(32);
const REQ_HASH = '0x' + '22'.repeat(32);
const SUFFICIENT_INPUT_ASSESSMENT = {
  schemaVersion: 1,
  status: 'SUFFICIENT',
  eligibleToProceed: true,
  quoteInputHash: `0x${'88'.repeat(32)}`,
  reasons: [],
  attestation: {
    type: 'DecisionInputAssessment',
    schemaVersion: 1,
    uid: `0x${'44'.repeat(32)}`,
    attester: `0x${'55'.repeat(20)}`,
    attesterLabel: 'Insight Decision Input Assessment attester',
    signedAt: new Date().toISOString(),
    validForSeconds: 300,
    signature: `0x${'66'.repeat(65)}`,
    verifyUrl: 'https://example.test/api/v1/safety/decision-input/verify',
    data: {
      assessmentHash: `0x${'77'.repeat(32)}`,
      linkedPreTradeUid: UID,
      issuedAt: 1_800_000_000,
      validUntil: 1_800_000_300,
      schemaVersion: 1,
    },
    eip712: {},
  },
} as unknown as PreTradeSafetyResult['decisionInputAssessment'];

function fakeCheck(
  asset: string,
  consensusPrice: number,
  verdict: PreTradeSafetyResult['verdict'] = 'PASS',
  withAttestation = true
): PreTradeSafetyResult {
  const uid = asset === 'USDC' ? DEST_UID : UID;
  return {
    verdict,
    consensusPrice,
    participantCount: 3,
    decisionInputAssessment: {
      ...SUFFICIENT_INPUT_ASSESSMENT,
      attestation: {
        ...SUFFICIENT_INPUT_ASSESSMENT.attestation,
        data: { ...SUFFICIENT_INPUT_ASSESSMENT.attestation.data, linkedPreTradeUid: uid },
      },
    } as unknown as PreTradeSafetyResult['decisionInputAssessment'],
    attestation: withAttestation
      ? ({
          uid,
          verifyUrl: 'https://example.test/verify',
          data: { requestHash: REQ_HASH, checkedAt: 1_700_000_000 },
        } as unknown as PreTradeSafetyResult['attestation'])
      : null,
  } as unknown as PreTradeSafetyResult;
}

const BASE_ARGS = {
  asset: 'ETH',
  destinationAsset: 'USDC',
  chainId: 1,
  action: 'swap' as const,
  tradeAmountUsd: 1000,
  maxSlippageBps: 50,
  decisionInput: {
    source: {
      decisionPriceUsd: 2000,
      quotePriceUsd: 2000,
      quoteObservedAt: new Date().toISOString(),
      maxReferenceDeviationBps: 50,
      maxSlippageBps: 50,
      maxQuoteAgeSeconds: 30,
    },
    destination: {
      decisionPriceUsd: 1,
      quotePriceUsd: 1,
      quoteObservedAt: new Date().toISOString(),
      maxReferenceDeviationBps: 50,
      maxSlippageBps: 50,
      maxQuoteAgeSeconds: 30,
    },
    routeQuotePrice: 2000,
    routeQuoteObservedAt: new Date().toISOString(),
  },
};

function extractHandle(text: string): Record<string, unknown> {
  const m = text.match(/```json\n([\s\S]*?)\n```/);
  if (!m) throw new Error('no JSON handle block found in:\n' + text);
  return JSON.parse(m[1]) as Record<string, unknown>;
}

describe('agent_begin_trade', () => {
  beforeEach(() => {
    mockPreTrade.mockReset();
    mockResolve.mockReset();
    mockRecordGate.mockReset().mockResolvedValue(undefined);
    mockVerifyAssessment.mockReset().mockImplementation(async (value) => {
      const assessment = value as PreTradeSafetyResult['decisionInputAssessment'];
      const hasProof = Boolean(assessment?.attestation);
      return {
        valid: hasProof,
        attester: hasProof ? assessment!.attestation!.attester : null,
        uid: hasProof ? assessment!.attestation!.uid : null,
        assessmentHash: hasProof ? assessment!.attestation!.data.assessmentHash : null,
        linkedPreTradeUid: hasProof ? assessment!.attestation!.data.linkedPreTradeUid : null,
        issuedAt: hasProof ? assessment!.attestation!.data.issuedAt : null,
        expired: false,
        reason: hasProof ? 'verified' : 'missing_attestation',
      };
    });
    mockOnchainRouteQuote.mockReset().mockResolvedValue({
      price: 2000,
      observedAt: new Date().toISOString(),
      evidence: {
        provider: 'uniswap-v3-quoter-v2',
        chainId: 1,
        blockNumber: '23000000',
        blockHash: `0x${'aa'.repeat(32)}`,
        quoterAddress: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        path: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f4a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        routeSymbols: ['WETH', 'USDC'],
        routeTokens: [
          '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        ],
        feeTiers: [500],
        amountInRaw: '500000000000000000',
        amountOutRaw: '1000000000',
        rpcWitnessCount: 2,
        rpcWitnessHosts: ['ethereum.publicnode.com', 'rpc.ankr.com'],
        notionalPrice: {
          provider: 'chainlink-data-feed',
          assetSymbol: 'WETH',
          priceReferenceSymbol: 'ETH',
          pricingBasis: 'chainlink-usd',
          priceUsd: 2000,
          feedAddress: '0x' + 'cc'.repeat(20),
          roundId: '1',
          updatedAt: new Date().toISOString(),
          heartbeatSeconds: 3600,
        },
      },
    } as unknown as Awaited<ReturnType<typeof getOnchainRouteQuote>>);
    mockResolve.mockImplementation(
      (sym) => ({ id: `eip155:1/erc20:0x${String(sym).toUpperCase()}` }) as never
    );
  });

  it('issues a machine-readable certification handle on PASS', async () => {
    // source ETH = $2000, destination USDC = $1 → quotedPrice = 2000 USDC/ETH
    mockPreTrade.mockImplementation(async (input) =>
      fakeCheck(input.asset, input.asset === 'USDC' ? 1 : 2000)
    );

    const out = await agentBeginTradeTool.handler(BASE_ARGS);

    expect(out).toContain('Execution certification handle');
    const handle = extractHandle(out);
    expect(handle.preTradeUid).toBe(UID);
    expect(handle.requestHash).toBe(REQ_HASH);
    expect(handle.quotedPrice).toBeCloseTo(2000, 12);
    expect(handle.maxSlippageBps).toBe(50);
    expect(handle.participantCount).toBe(3);
    expect(handle.sourceAssetId).toBe('eip155:1/erc20:0xETH');
    expect(handle.destinationAssetId).toBe('eip155:1/erc20:0xUSDC');
    expect(handle.action).toBe('SWAP');
    expect(handle.destinationPreTradeUid).toBe(DEST_UID);
    expect(handle.decisionInput).toEqual(
      expect.objectContaining({
        source: expect.objectContaining({
          status: 'SUFFICIENT',
          attestation: expect.objectContaining({
            data: expect.objectContaining({ linkedPreTradeUid: UID }),
          }),
        }),
        destination: expect.objectContaining({
          status: 'SUFFICIENT',
          attestation: expect.objectContaining({
            data: expect.objectContaining({ linkedPreTradeUid: DEST_UID }),
          }),
        }),
        routeQuote: expect.objectContaining({
          price: 2000,
          oracleCrossRate: 2000,
          deviationBps: 0,
        }),
      })
    );
    expect(mockRecordGate).toHaveBeenCalledWith(
      UID,
      DEST_UID,
      expect.objectContaining({ status: 'SUFFICIENT' })
    );
  });

  it('refuses when the oracle verdict is DANGER', async () => {
    mockPreTrade.mockResolvedValue(fakeCheck('ETH', 2000, 'DANGER'));

    const out = await agentBeginTradeTool.handler(BASE_ARGS);

    expect(out).toContain('REFUSED');
    expect(out).toContain('DANGER');
    expect(out).not.toContain('```json');
  });

  it('refuses when no pre-trade attestation was signed', async () => {
    mockPreTrade.mockResolvedValue(fakeCheck('ETH', 2000, 'PASS', false));

    const out = await agentBeginTradeTool.handler(BASE_ARGS);

    expect(out).toContain('REFUSED');
    expect(out).toContain('no pre-trade attestation');
  });

  it('refuses when the destination oracle verdict blocks execution', async () => {
    mockPreTrade.mockImplementation(async (input) =>
      fakeCheck(
        input.asset,
        input.asset === 'USDC' ? 1 : 2000,
        input.asset === 'USDC' ? 'BLOCK' : 'PASS'
      )
    );

    const out = await agentBeginTradeTool.handler(BASE_ARGS);

    expect(out).toContain('REFUSED');
    expect(out).toContain('destination oracle risk');
    expect(out).not.toContain('```json');
  });

  it('refuses a non-positive destination consensus price', async () => {
    mockPreTrade.mockImplementation(async (input) =>
      fakeCheck(input.asset, input.asset === 'USDC' ? 0 : 2000)
    );

    const out = await agentBeginTradeTool.handler(BASE_ARGS);

    expect(out).toContain('destination asset "USDC" has no usable consensus price');
    expect(out).not.toContain('```json');
  });

  it('defaults sourceGroupCount to participantCount', async () => {
    mockPreTrade.mockImplementation(async (input) =>
      fakeCheck(input.asset, input.asset === 'USDC' ? 1 : 2000)
    );

    const handle = extractHandle(await agentBeginTradeTool.handler(BASE_ARGS));
    expect(handle.sourceGroupCount).toBe(3);
  });

  it('refuses when either asset input assessment is insufficient', async () => {
    mockPreTrade.mockImplementation(async (input) => ({
      ...fakeCheck(input.asset, input.asset === 'USDC' ? 1 : 2000),
      decisionInputAssessment:
        input.asset === 'ETH'
          ? ({
              ...SUFFICIENT_INPUT_ASSESSMENT,
              status: 'INSUFFICIENT_EVIDENCE',
              eligibleToProceed: false,
              reasons: [{ code: 'CHAINLINK_STALE' }],
            } as unknown as PreTradeSafetyResult['decisionInputAssessment'])
          : SUFFICIENT_INPUT_ASSESSMENT,
    }));

    const out = await agentBeginTradeTool.handler(BASE_ARGS);

    expect(out).toContain('operation-input evidence is insufficient');
    expect(out).toContain('INSUFFICIENT_EVIDENCE');
    expect(out).not.toContain('```json');
  });

  it('refuses a caller route quote outside the on-chain deviation limit', async () => {
    mockPreTrade.mockImplementation(async (input) =>
      fakeCheck(input.asset, input.asset === 'USDC' ? 1 : 2000)
    );

    const out = await agentBeginTradeTool.handler({
      ...BASE_ARGS,
      decisionInput: { ...BASE_ARGS.decisionInput, routeQuotePrice: 2020 },
    });

    expect(out).toContain('caller route quote diverges from the on-chain quote');
    expect(out).toContain('100.0 bps');
    expect(out).not.toContain('```json');
  });

  it('refuses a stale route quote', async () => {
    mockPreTrade.mockImplementation(async (input) =>
      fakeCheck(input.asset, input.asset === 'USDC' ? 1 : 2000)
    );

    const out = await agentBeginTradeTool.handler({
      ...BASE_ARGS,
      decisionInput: {
        ...BASE_ARGS.decisionInput,
        routeQuoteObservedAt: new Date(Date.now() - 60_000).toISOString(),
      },
    });

    expect(out).toContain('route quote is stale');
    expect(out).not.toContain('```json');
  });

  it('fails closed if the combined input-gate audit cannot be stored', async () => {
    mockPreTrade.mockImplementation(async (input) =>
      fakeCheck(input.asset, input.asset === 'USDC' ? 1 : 2000)
    );
    mockRecordGate.mockRejectedValue(new Error('audit store unavailable'));

    const out = await agentBeginTradeTool.handler(BASE_ARGS);

    expect(out).toContain('operation-input audit could not be persisted');
    expect(out).not.toContain('```json');
  });

  it('requires both asset assessments and a route quote at the schema boundary', () => {
    const { decisionInput: _decisionInput, ...withoutDecisionInput } = BASE_ARGS;

    expect(AgentBeginTradeInputSchema.safeParse(withoutDecisionInput).success).toBe(false);
    expect(AgentBeginTradeInputSchema.safeParse(BASE_ARGS).success).toBe(true);
    expect(
      AgentBeginTradeInputSchema.safeParse({
        ...BASE_ARGS,
        decisionInput: {
          ...BASE_ARGS.decisionInput,
          routeQuoteObservedAt: '2026-10-13T06:30:00',
        },
      }).success
    ).toBe(false);
  });
});

describe('agent_begin_trade registration', () => {
  it('is registered in the MCP tool registry with a JSON schema (dev assertion passes)', () => {
    const defs = getToolDefinitions();
    const tool = defs.find((t) => t.name === 'agent_begin_trade');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema).toBeDefined();
    expect(JSON.stringify(tool!.inputSchema)).toContain('maxSlippageBps');
    expect(JSON.stringify(tool!.inputSchema)).toContain('decisionInput');
  });
});
