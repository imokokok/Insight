import {
  beginPositionLifecycle,
  closePositionLifecycle,
  issueBundledReceipt,
  PositionLifecycleError,
  runBundledGuard,
} from '@/lib/api/services/positionLifecycleService';

import {
  positionLifecycleBeginTool,
  positionLifecycleCloseTool,
  positionLifecycleGuardTool,
  positionLifecycleReceiptTool,
} from '../positionLifecycleTools';

jest.mock('@/lib/api/services/positionLifecycleService', () => ({
  beginPositionLifecycle: jest.fn(),
  runBundledGuard: jest.fn(),
  issueBundledReceipt: jest.fn(),
  closePositionLifecycle: jest.fn(),
  PositionLifecycleError: class extends Error {
    constructor(readonly code: string) {
      super(`Position lifecycle failure: ${code}`);
      this.name = 'PositionLifecycleError';
    }
  },
}));

const mockBegin = beginPositionLifecycle as jest.MockedFunction<typeof beginPositionLifecycle>;
const mockGuard = runBundledGuard as jest.MockedFunction<typeof runBundledGuard>;
const mockReceipt = issueBundledReceipt as jest.MockedFunction<typeof issueBundledReceipt>;
const mockClose = closePositionLifecycle as jest.MockedFunction<typeof closePositionLifecycle>;

const TOKEN_ARGS = { lifecycleId: 'lc-1', lifecycleToken: 'plc_abc' };

describe('positionLifecycleBeginTool', () => {
  it('opens a lifecycle and shows the one-time token exactly once', async () => {
    mockBegin.mockResolvedValueOnce({
      lifecycle: {
        lifecycleId: 'lc-1',
        symbol: 'ETH',
        chain: 'base',
        status: 'active',
        paymentMethod: 'credits',
        openedAt: '2026-01-01T00:00:00Z',
        expiresAt: '2026-01-02T00:00:00Z',
        closedAt: null,
        guardBudget: 4,
        guardUsed: 0,
        receiptState: 'available',
        windowId: 'win-1',
      },
      windowId: 'win-1',
      lifecycleToken: 'plc_abc',
      usage: {
        watch: {
          note: 'The embedded monitored window authenticates with the SAME lifecycle token.',
          poll: { method: 'GET', url: '/w', authorization: 'Bearer <lifecycleToken>' },
          close: { method: 'POST', url: '/w', authorization: 'Bearer <lifecycleToken>' },
        },
        guard: {
          method: 'POST',
          url: '/g',
          authorization: 'Bearer <lifecycleToken>',
          body: { family: 'base_perp', params: '{}' },
          budget: 4,
        },
        receipt: {
          method: 'POST',
          url: '/r',
          authorization: 'Bearer <lifecycleToken>',
          budget: 1,
        },
        close: { method: 'POST', url: '/c', authorization: 'Bearer <lifecycleToken>' },
      },
    });

    const result = await positionLifecycleBeginTool.handler(
      { symbol: 'ETH', chain: 'base' },
      { apiKeyId: 'key-1' }
    );

    expect(mockBegin).toHaveBeenCalledWith({
      symbol: 'ETH',
      chain: 'base',
      paymentMethod: 'credits',
      apiKeyId: 'key-1',
    });
    expect(result).toContain('Position lifecycle opened: ETH on base');
    expect(result).toContain('`plc_abc`');
    expect(result.match(/plc_abc/g)).toHaveLength(1);
    expect(result).toContain('win-1');
    expect(result).toContain('SAME lifecycle token');
  });
});

describe('positionLifecycleGuardTool', () => {
  it('dispatches one bundled assessment and reports budget usage', async () => {
    mockGuard.mockResolvedValueOnce({
      family: 'base_perp',
      result: { verdict: 'ALLOW' },
      guard: { used: 2, budget: 4 },
      expiresAt: '2026-01-02T00:00:00Z',
    });

    const result = await positionLifecycleGuardTool.handler({
      ...TOKEN_ARGS,
      family: 'base_perp',
      params: { action: 'open', notionalUsd: 1000 },
    });

    expect(mockGuard).toHaveBeenCalledWith(
      'lc-1',
      'plc_abc',
      'base_perp',
      { action: 'open', notionalUsd: 1000 },
      undefined
    );
    expect(result).toContain('Bundled guard (base_perp): lc-1');
    expect(result).toContain('Guard budget: 2/4 used');
    expect(result).toContain('"verdict":"ALLOW"');
  });

  it('passes the transaction through for transaction-bearing families', async () => {
    mockGuard.mockResolvedValueOnce({
      family: 'solana_lending',
      result: { verdict: 'CAUTION' },
      guard: { used: 3, budget: 4 },
      expiresAt: '2026-01-02T00:00:00Z',
    });

    await positionLifecycleGuardTool.handler({
      ...TOKEN_ARGS,
      family: 'solana_lending',
      params: {},
      transaction: { version: 0 },
    });

    expect(mockGuard).toHaveBeenCalledWith('lc-1', 'plc_abc', 'solana_lending', {}, { version: 0 });
  });

  it('maps an exhausted guard budget to an actionable error', async () => {
    mockGuard.mockRejectedValueOnce(new PositionLifecycleError('GUARD_BUDGET_REACHED'));

    await expect(
      positionLifecycleGuardTool.handler({ ...TOKEN_ARGS, family: 'base_perp', params: {} })
    ).rejects.toThrow('exhausted its guard budget');
  });
});

describe('positionLifecycleReceiptTool', () => {
  it('issues the bundled receipt and reports the consumed credit', async () => {
    mockReceipt.mockResolvedValueOnce({
      receipt: {
        uid: `0x${'a'.repeat(64)}`,
        attester: '0xabc',
        attesterLabel: 'Insight',
        validForSeconds: 3600,
        verifyUrl: '/api/v1/execution/attestation/verify',
        signature: `0x${'b'.repeat(64)}`,
        data: {
          preTradeUid: `0x${'c'.repeat(64)}`,
          fillStatus: 'filled',
          priceExecutionStatus: 'FAITHFUL',
          priceDeltaBps: 4,
          maxSlippageBps: 50,
          slippageSatisfied: true,
          txHash: `0x${'d'.repeat(64)}`,
          settlementChainId: 8453,
          blockNumber: 1,
        },
      },
      receiptState: 'consumed',
      expiresAt: '2026-01-02T00:00:00Z',
    });

    const result = await positionLifecycleReceiptTool.handler({
      ...TOKEN_ARGS,
      receipt: {
        preTradeUid: `0x${'c'.repeat(64)}`,
        requestHash: `0x${'e'.repeat(64)}`,
        sourceAssetId: 'eip155:8453/erc20:0x1',
        destinationAssetId: 'eip155:8453/erc20:0x2',
        subjectChainId: 8453,
        settlementChainId: 8453,
        participantCount: 3,
        sourceGroupCount: 2,
        preTradeSignedAt: 1_767_225_600,
        quotedPrice: 3000,
        txHash: `0x${'d'.repeat(64)}`,
      },
    });

    expect(mockReceipt).toHaveBeenCalledWith(
      'lc-1',
      'plc_abc',
      expect.objectContaining({ preTradeUid: `0x${'c'.repeat(64)}` })
    );
    expect(result).toContain('Execution status: FAITHFUL');
    expect(result).toContain('Receipt credit: consumed');
    expect(result).toContain(`UID: 0x${'a'.repeat(64)}`);
  });

  it('maps an already-consumed receipt credit to an actionable error', async () => {
    mockReceipt.mockRejectedValueOnce(new PositionLifecycleError('RECEIPT_UNAVAILABLE'));

    await expect(
      positionLifecycleReceiptTool.handler({
        ...TOKEN_ARGS,
        receipt: {
          preTradeUid: `0x${'c'.repeat(64)}`,
          requestHash: `0x${'e'.repeat(64)}`,
          sourceAssetId: 'a',
          destinationAssetId: 'b',
          subjectChainId: 8453,
          settlementChainId: 8453,
          participantCount: 3,
          sourceGroupCount: 2,
          preTradeSignedAt: 0,
          quotedPrice: 1,
          txHash: `0x${'d'.repeat(64)}`,
        },
      })
    ).rejects.toThrow('already been issued');
  });
});

describe('positionLifecycleCloseTool', () => {
  it('returns the combined lifecycle and watch summary', async () => {
    mockClose.mockResolvedValueOnce({
      lifecycleId: 'lc-1',
      symbol: 'ETH',
      chain: 'base',
      status: 'closed',
      expired: false,
      openedAt: '2026-01-01T00:00:00Z',
      closedAt: '2026-01-01T18:00:00Z',
      expiresAt: '2026-01-02T00:00:00Z',
      guardUsed: 3,
      guardBudget: 4,
      receiptState: 'consumed',
      receiptUid: `0x${'a'.repeat(64)}`,
      watch: {
        windowId: 'win-1',
        symbol: 'ETH',
        chain: 'base',
        status: 'closed',
        expired: false,
        openedAt: '2026-01-01T00:00:00Z',
        closedAt: '2026-01-01T18:00:00Z',
        expiresAt: '2026-01-02T00:00:00Z',
        pollsIssued: 36,
        pollCap: 300,
        verdictCounts: { normal: 35, caution: 1, danger: 0 },
        recommendationCounts: { proceed: 35, proceed_with_caution: 1, halt: 0 },
        haltCount: 0,
        firstHaltAt: null,
        lastHaltAt: null,
      },
    });

    const result = await positionLifecycleCloseTool.handler(TOKEN_ARGS);

    expect(mockClose).toHaveBeenCalledWith('lc-1', 'plc_abc');
    expect(result).toContain('Position lifecycle closed: ETH on base');
    expect(result).toContain('Guards: 3/4 used');
    expect(result).toContain('receipt: consumed');
    expect(result).toContain('36/300 polls, 0 halts');
  });

  it('fails closed on a wrong token without revealing existence', async () => {
    mockClose.mockRejectedValueOnce(new PositionLifecycleError('INVALID_TOKEN'));

    await expect(positionLifecycleCloseTool.handler(TOKEN_ARGS)).rejects.toThrow(
      'Invalid or missing lifecycle token'
    );
  });
});
