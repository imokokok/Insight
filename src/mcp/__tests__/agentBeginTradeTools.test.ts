import type { PreTradeSafetyResult } from '@/lib/api/services/preTradeSafetyService';
import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import { resolveCaip19 } from '@/lib/attestations/caip19';

import { getToolDefinitions } from '../tools';
import { agentBeginTradeTool } from '../tools/agentBeginTradeTools';

jest.mock('@/lib/api/services/preTradeSafetyService', () => ({
  preTradeSafetyCheck: jest.fn(),
}));
jest.mock('@/lib/attestations/caip19', () => ({
  resolveCaip19: jest.fn(),
}));

const mockPreTrade = preTradeSafetyCheck as jest.MockedFunction<typeof preTradeSafetyCheck>;
const mockResolve = resolveCaip19 as jest.MockedFunction<typeof resolveCaip19>;

const UID = '0x' + '11'.repeat(32);
const REQ_HASH = '0x' + '22'.repeat(32);

function fakeCheck(
  asset: string,
  consensusPrice: number,
  verdict: PreTradeSafetyResult['verdict'] = 'PASS',
  withAttestation = true
): PreTradeSafetyResult {
  return {
    verdict,
    consensusPrice,
    participantCount: 3,
    attestation: withAttestation
      ? ({
          uid: UID,
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
    mockResolve.mockImplementation(
      (sym) => ({ id: `eip155:1/erc20:0x${String(sym).toUpperCase()}` }) as never
    );
  });

  it('issues a machine-readable certification handle on PASS', async () => {
    // source ETH = 2000, destination USDC = 1  → quotedPrice = 0.0005 dest/source
    mockPreTrade.mockImplementation(async (input) =>
      fakeCheck(input.asset, input.asset === 'USDC' ? 1 : 2000)
    );

    const out = await agentBeginTradeTool.handler(BASE_ARGS);

    expect(out).toContain('Execution certification handle');
    const handle = extractHandle(out);
    expect(handle.preTradeUid).toBe(UID);
    expect(handle.requestHash).toBe(REQ_HASH);
    expect(handle.quotedPrice).toBeCloseTo(1 / 2000, 12);
    expect(handle.maxSlippageBps).toBe(50);
    expect(handle.participantCount).toBe(3);
    expect(handle.sourceAssetId).toBe('eip155:1/erc20:0xETH');
    expect(handle.destinationAssetId).toBe('eip155:1/erc20:0xUSDC');
    expect(handle.action).toBe('SWAP');
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

  it('defaults sourceGroupCount to participantCount', async () => {
    mockPreTrade.mockImplementation(async (input) =>
      fakeCheck(input.asset, input.asset === 'USDC' ? 1 : 2000)
    );

    const handle = extractHandle(await agentBeginTradeTool.handler(BASE_ARGS));
    expect(handle.sourceGroupCount).toBe(3);
  });
});

describe('agent_begin_trade registration', () => {
  it('is registered in the MCP tool registry with a JSON schema (dev assertion passes)', () => {
    const defs = getToolDefinitions();
    const tool = defs.find((t) => t.name === 'agent_begin_trade');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema).toBeDefined();
    expect(JSON.stringify(tool!.inputSchema)).toContain('maxSlippageBps');
  });
});
