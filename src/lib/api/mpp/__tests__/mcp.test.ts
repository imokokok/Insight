import { Errors } from 'mppx';

import { createMppMcpCallHandler } from '../mcp';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const mockCreate = jest.fn();
const mockEvmCharge = jest.fn();
const mockGetCredential = jest.fn();
const mockRespondChallenge = jest.fn();
const mockRespondReceipt = jest.fn();
const mockValidateCredential = jest.fn();
const mockBroadcastCredential = jest.fn();
const mockChallengeCharge = jest.fn();
const mockAudit = jest.fn();
const mockFacilitatorError = jest.fn();
const mockExpires = jest.fn();

const mockMethod = { name: 'evm/charge' };
const mockTransport = {
  getCredential: (...args: unknown[]) => mockGetCredential(...args),
  respondChallenge: (...args: unknown[]) => mockRespondChallenge(...args),
  respondReceipt: (...args: unknown[]) => mockRespondReceipt(...args),
};
const mockServer = {
  challenge: { evm: { charge: (...args: unknown[]) => mockChallengeCharge(...args) } },
  transport: mockTransport,
  validateCredential: (...args: unknown[]) => mockValidateCredential(...args),
  broadcastCredential: (...args: unknown[]) => mockBroadcastCredential(...args),
};

jest.mock('@x402/core/server', () => ({
  HTTPFacilitatorClient: jest.fn(() => ({ facilitator: true })),
  getFacilitatorResponseError: (...args: unknown[]) => mockFacilitatorError(...args),
}));

jest.mock('mppx', () => {
  class MockPaymentError extends Error {}
  return {
    Errors: { PaymentError: MockPaymentError },
    Expires: { seconds: (...args: unknown[]) => mockExpires(...args) },
  };
});

jest.mock('mppx/server', () => ({
  Mppx: { create: (...args: unknown[]) => mockCreate(...args) },
  Transport: { mcpSdk: () => mockTransport },
  evm: { charge: (...args: unknown[]) => mockEvmCharge(...args) },
}));

jest.mock('@/lib/api/x402/guard', () => ({
  atomicUnitsToUsdc: (atomic: string) => {
    const value = BigInt(atomic);
    const whole = value / 1_000_000n;
    const fraction = String(value % 1_000_000n)
      .padStart(6, '0')
      .replace(/0+$/, '');
    return fraction ? `${whole}.${fraction}` : String(whole);
  },
  recordX402Settlement: (...args: unknown[]) => mockAudit(...args),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({ warn: jest.fn(), info: jest.fn(), error: jest.fn() }),
}));

const CFG = {
  enabled: true,
  network: 'eip155:84532' as const,
  payTo: '0xAbC0000000000000000000000000000000000001',
  amountAtomic: '20000',
  priceUsd: 0.02,
  facilitatorUrl: 'https://x402.org/facilitator',
  facilitatorTimeoutMs: 15_000,
  maxTimeoutSeconds: 60,
  facilitatorCdpAuth: null,
};

const SUCCESS: CallToolResult = {
  content: [{ type: 'text', text: 'PASS' }],
};
const FAILURE: CallToolResult = {
  content: [{ type: 'text', text: 'invalid pre-trade parameters' }],
  isError: true,
};
const PAYER = '0x123400000000000000000000000000000000abcd';
const CREDENTIAL = { payload: { from: PAYER }, challenge: { id: 'challenge-1' } };
let validation: { credential: typeof CREDENTIAL; challenge: { id: string } };
let currentSecret = 0;

function makeExtra() {
  return { _meta: { 'org.paymentauth/credential': CREDENTIAL } };
}

beforeEach(() => {
  mockCreate.mockReset().mockReturnValue(mockServer);
  mockEvmCharge.mockReset().mockReturnValue(mockMethod);
  mockGetCredential.mockReset().mockReturnValue(CREDENTIAL);
  mockRespondChallenge.mockReset().mockImplementation(({ challenge }: { challenge: unknown }) => {
    return Object.assign(new Error('payment challenge'), { challenge });
  });
  mockRespondReceipt
    .mockReset()
    .mockImplementation(({ response }: { response: CallToolResult }) => ({
      ...response,
      _meta: { 'org.paymentauth/receipt': { transaction: 'receipt' } },
    }));
  mockValidateCredential.mockReset();
  mockBroadcastCredential.mockReset().mockResolvedValue({ reference: `0x${'a'.repeat(64)}` });
  mockChallengeCharge.mockReset().mockResolvedValue({ id: 'challenge-1' });
  mockAudit.mockReset();
  mockFacilitatorError.mockReset().mockReturnValue(null);
  mockExpires.mockReset().mockImplementation((seconds: number) => `expires-${seconds}`);
  validation = { credential: CREDENTIAL, challenge: { id: 'challenge-1' } };
  mockValidateCredential.mockResolvedValue(validation);
});

function createHandler() {
  currentSecret += 1;
  return createMppMcpCallHandler(
    CFG,
    `mpp-mcp-test-secret-${String(currentSecret).padStart(4, '0')}`
  );
}

const CALL = {
  name: 'pre_trade_safety_check',
  args: { asset: 'ETH', action: 'swap', chainId: 1, tradeAmountUsd: 1000 },
  extra: makeExtra(),
};

describe('MPP MCP pre-trade lifecycle', () => {
  it('rejects tools outside the MPP pilot without challenging or executing them', async () => {
    const handler = createHandler();
    const runBusiness = jest.fn().mockResolvedValue(SUCCESS);

    await expect(handler({ ...CALL, name: 'get_symbols', runBusiness })).rejects.toMatchObject({
      code: -32602,
    });
    expect(mockChallengeCharge).not.toHaveBeenCalled();
    expect(mockValidateCredential).not.toHaveBeenCalled();
    expect(runBusiness).not.toHaveBeenCalled();
  });

  it('issues a standard payment challenge without executing or settling', async () => {
    mockGetCredential.mockReturnValue(null);
    const handler = createHandler();

    await expect(
      handler({ ...CALL, runBusiness: jest.fn().mockResolvedValue(SUCCESS) })
    ).rejects.toMatchObject({ message: 'payment challenge' });

    expect(mockChallengeCharge).toHaveBeenCalledWith({
      amount: '0.02',
      description: 'Insight Pre-Trade Safety Check',
      expires: 'expires-60',
      scope: expect.stringMatching(/^mcp:pre_trade_safety_check:[a-f0-9]{64}$/),
    });
    expect(mockRespondChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ challenge: { id: 'challenge-1' }, input: CALL.extra })
    );
    expect(mockValidateCredential).not.toHaveBeenCalled();
    expect(mockBroadcastCredential).not.toHaveBeenCalled();
  });

  it('validates, executes, settles, and attaches the MPP receipt in order', async () => {
    const handler = createHandler();
    const runBusiness = jest.fn().mockResolvedValue(SUCCESS);

    const result = await handler({ ...CALL, runBusiness });

    expect(result._meta?.['org.paymentauth/receipt']).toEqual({ transaction: 'receipt' });
    expect(mockValidateCredential).toHaveBeenCalledWith(CREDENTIAL, {
      request: { amount: '0.02' },
      scope: expect.stringMatching(/^mcp:pre_trade_safety_check:[a-f0-9]{64}$/),
    });
    expect(mockBroadcastCredential).toHaveBeenCalledWith(CREDENTIAL, {
      request: { amount: '0.02' },
      scope: expect.stringMatching(/^mcp:pre_trade_safety_check:[a-f0-9]{64}$/),
    });
    expect(mockValidateCredential.mock.invocationCallOrder[0]).toBeLessThan(
      runBusiness.mock.invocationCallOrder[0]
    );
    expect(runBusiness.mock.invocationCallOrder[0]).toBeLessThan(
      mockBroadcastCredential.mock.invocationCallOrder[0]
    );
    expect(mockRespondReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        challengeId: 'challenge-1',
        credential: CREDENTIAL,
        input: CALL.extra,
        receipt: { reference: `0x${'a'.repeat(64)}` },
        response: SUCCESS,
      })
    );
    expect(mockAudit.mock.calls.map(([event]) => event.status)).toEqual([
      'payment_verified',
      'business_succeeded',
      'settled',
    ]);
    expect(mockAudit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        protocol: 'mpp',
        surface: 'mcp',
        resource: 'mcp:pre_trade_safety_check',
        txHash: `0x${'a'.repeat(64)}`,
        payer: PAYER,
        amountUsdc: '0.02',
        verdict: 'pre_trade_safety_check',
      })
    );
  });

  it('does not settle a failed tool result', async () => {
    const handler = createHandler();
    const runBusiness = jest.fn().mockResolvedValue(FAILURE);

    const result = await handler({ ...CALL, runBusiness });

    expect(result).toBe(FAILURE);
    expect(mockBroadcastCredential).not.toHaveBeenCalled();
    expect(mockRespondReceipt).not.toHaveBeenCalled();
    expect(mockAudit.mock.calls.map(([event]) => event.status)).toEqual([
      'payment_verified',
      'business_failed',
    ]);
  });

  it('binds the challenge to canonical tool arguments', async () => {
    const handler = createHandler();
    const runBusiness = jest.fn().mockResolvedValue(SUCCESS);
    await handler({ ...CALL, runBusiness });
    const firstScope = mockValidateCredential.mock.calls[0][1].scope;

    await handler({
      ...CALL,
      args: { ...CALL.args, tradeAmountUsd: 1001 },
      runBusiness,
    });
    const secondScope = mockValidateCredential.mock.calls[1][1].scope;

    expect(firstScope).not.toBe(secondScope);
  });

  it('does not settle when the facilitator rejects validation', async () => {
    mockValidateCredential.mockRejectedValue(new Errors.PaymentError('expired'));
    const handler = createHandler();
    const runBusiness = jest.fn().mockResolvedValue(SUCCESS);

    await expect(handler({ ...CALL, runBusiness })).rejects.toMatchObject({
      message: 'payment challenge',
    });
    expect(mockRespondChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Errors.PaymentError) })
    );
    expect(runBusiness).not.toHaveBeenCalled();
    expect(mockBroadcastCredential).not.toHaveBeenCalled();
  });

  it('returns the business result without a receipt if settlement fails', async () => {
    mockBroadcastCredential.mockRejectedValue(new Error('settlement unavailable'));
    const handler = createHandler();
    const runBusiness = jest.fn().mockResolvedValue(SUCCESS);

    const result = await handler({ ...CALL, runBusiness });

    expect(result).toBe(SUCCESS);
    expect(mockRespondReceipt).not.toHaveBeenCalled();
    expect(mockAudit.mock.calls.map(([event]) => event.status)).toEqual([
      'payment_verified',
      'business_succeeded',
      'settlement_failed',
    ]);
  });
});
