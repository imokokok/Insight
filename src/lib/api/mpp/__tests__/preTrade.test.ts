import { type NextRequest, NextResponse } from 'next/server';

import { HTTPFacilitatorClient, getFacilitatorResponseError } from '@x402/core/server';
import { Credential, Errors, Expires } from 'mppx';
import { Mppx, evm } from 'mppx/server';

import { type X402Config } from '@/lib/api/x402/config';
import { recordX402Settlement } from '@/lib/api/x402/guard';

import {
  handleMppPaidPreTradeRequest,
  hasConflictingPaymentCredentials,
  hasMppCredential,
  issueMppPreTradeQuote,
} from '../preTrade';

jest.mock('next/server', () => {
  class NextResponse {
    body: BodyInit | null;
    headers: Headers;
    status: number;
    statusText: string;

    constructor(body: BodyInit | null, init?: ResponseInit) {
      this.body = body;
      this.headers = new Headers(init?.headers);
      this.status = init?.status ?? 200;
      this.statusText = init?.statusText ?? '';
    }

    static json(data: unknown, init?: ResponseInit) {
      const headers = new Headers(init?.headers);
      headers.set('Content-Type', 'application/json');
      return new NextResponse(JSON.stringify(data), { ...init, headers });
    }

    async json() {
      return this.body ? JSON.parse(String(this.body)) : null;
    }

    async text() {
      return this.body ? String(this.body) : '';
    }
  }

  return { NextResponse };
});

jest.mock('@x402/core/server', () => ({
  HTTPFacilitatorClient: jest.fn(() => ({ type: 'mock-facilitator' })),
  getFacilitatorResponseError: jest.fn(() => null),
}));

jest.mock('mppx', () => {
  class PaymentError extends Error {}

  return {
    Credential: {
      extractPaymentScheme: jest.fn(),
      fromRequest: jest.fn(),
    },
    Errors: { PaymentError },
    Expires: { seconds: jest.fn() },
  };
});

jest.mock('mppx/server', () => ({
  Mppx: { create: jest.fn() },
  evm: { charge: jest.fn() },
}));

jest.mock('@/lib/api/x402/guard', () => ({
  atomicUnitsToUsdc: (atomic: string) => {
    const units = BigInt(atomic);
    const fraction = String(units % 1_000_000n)
      .padStart(6, '0')
      .replace(/0+$/, '');
    return fraction ? `${units / 1_000_000n}.${fraction}` : String(units / 1_000_000n);
  },
  recordX402Settlement: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({ warn: jest.fn(), info: jest.fn(), error: jest.fn() }),
}));

const mockCredentialExtract = Credential.extractPaymentScheme as jest.Mock;
const mockCredentialFromRequest = Credential.fromRequest as jest.Mock;
const mockExpiresSeconds = Expires.seconds as jest.Mock;
const mockMppCreate = Mppx.create as jest.Mock;
const mockEvmChargeFactory = evm.charge as jest.Mock;
const mockFacilitatorClient = HTTPFacilitatorClient as unknown as jest.Mock;
const mockFacilitatorError = getFacilitatorResponseError as jest.Mock;
const mockRecordAudit = recordX402Settlement as jest.Mock;

const mockRouteCharge = jest.fn();
const mockValidateCredential = jest.fn();
const mockBroadcastCredential = jest.fn();
const mockRespondReceipt = jest.fn();
const mockMethod = { type: 'evm/charge-method' };
const mockServer = {
  evm: { charge: jest.fn() },
  validateCredential: mockValidateCredential,
  broadcastCredential: mockBroadcastCredential,
  transport: { respondReceipt: mockRespondReceipt },
};

const CFG: X402Config = {
  enabled: true,
  network: 'eip155:84532',
  payTo: '0xAbC0000000000000000000000000000000000001',
  amountAtomic: '20000',
  priceUsd: 0.02,
  facilitatorUrl: 'https://x402.org/facilitator',
  facilitatorTimeoutMs: 15_000,
  maxTimeoutSeconds: 60,
  facilitatorCdpAuth: null,
};

const REQUEST_URL =
  'https://oracleinsight.xyz/api/v1/safety/pre-trade?asset=ETH&chainId=1&action=swap&tradeAmountUsd=1000';
const PAYER = '0x123400000000000000000000000000000000abcd';
const TEST_CREDENTIAL = { payload: { from: PAYER }, challenge: { id: 'challenge-1' } };
const TEST_VALIDATION = {
  credential: TEST_CREDENTIAL,
  challenge: { id: 'challenge-1' },
};

let requestSequence = 0;

class TestPaymentError extends Errors.PaymentError {
  readonly name: string;
  readonly type = 'https://paymentauth.org/problems/test-payment-error';
  readonly title = 'Test payment error';

  constructor(message = 'credential rejected', name = 'TestPaymentError') {
    super(message);
    this.name = name;
  }
}

class FacilitatorFailure extends Error {
  readonly name = 'FacilitatorFailure';
  readonly facilitatorFailure = true;
}

function makeRequest(headers: Record<string, string> = {}, url = REQUEST_URL): NextRequest {
  return { headers: new Headers(headers), url } as unknown as NextRequest;
}

function makeChallenge(status = 402): { status: number; challenge: Response } {
  return {
    status,
    challenge: new Response('payment required', {
      status,
      headers: { 'WWW-Authenticate': 'Payment id="challenge-1"' },
    }),
  };
}

function makeSecret(): string {
  requestSequence += 1;
  return `test-mpp-secret-${String(requestSequence).padStart(3, '0')}-0123456789abcdef`;
}

function makePaidRequest(): NextRequest {
  return makeRequest({ authorization: 'Payment credential=abc' });
}

function makeSuccessfulBusinessResponse(): NextResponse {
  return NextResponse.json({ verdict: 'PASS' }, { status: 200 });
}

beforeEach(() => {
  mockCredentialExtract.mockImplementation((authorization: string) =>
    authorization.trimStart().startsWith('Payment ') ? 'Payment' : null
  );
  mockCredentialFromRequest.mockReturnValue(TEST_CREDENTIAL);
  mockExpiresSeconds.mockImplementation((seconds: number) => `expires-${seconds}`);
  mockEvmChargeFactory.mockReturnValue(mockMethod);
  mockFacilitatorClient.mockImplementation(() => ({ type: 'mock-facilitator' }));
  mockFacilitatorError.mockReturnValue(null);
  mockRecordAudit.mockImplementation(() => undefined);
  mockMppCreate.mockReturnValue(mockServer);
  mockRouteCharge.mockResolvedValue(makeChallenge());
  mockServer.evm.charge.mockReturnValue(mockRouteCharge);
  mockValidateCredential.mockResolvedValue(TEST_VALIDATION);
  mockBroadcastCredential.mockResolvedValue({ reference: `0x${'a'.repeat(64)}` });
  mockRespondReceipt.mockImplementation(({ response }: { response: NextResponse }) => {
    response.headers.set('Payment-Receipt', 'mpp-receipt');
    return response;
  });
});

describe('MPP pre-trade payment guard', () => {
  describe('credential dispatch', () => {
    it('recognizes MPP Payment authorization and ignores other schemes', () => {
      expect(hasMppCredential(makeRequest({ authorization: 'Payment credential=abc' }))).toBe(true);
      expect(hasMppCredential(makeRequest({ authorization: 'Bearer token' }))).toBe(false);
      expect(hasMppCredential(makeRequest())).toBe(false);
    });

    it('rejects MPP credentials combined with x402 signatures or API keys', () => {
      expect(
        hasConflictingPaymentCredentials(
          makeRequest({ authorization: 'Payment credential=abc', 'payment-signature': 'x402' })
        )
      ).toBe(true);
      expect(
        hasConflictingPaymentCredentials(
          makeRequest({ authorization: 'Payment credential=abc', 'x-api-key': 'ins_test' })
        )
      ).toBe(true);
      expect(hasConflictingPaymentCredentials(makeRequest({ authorization: 'Bearer token' }))).toBe(
        false
      );
    });
  });

  describe('quote issuance', () => {
    it('advertises MPP beside x402 and audits one shared request id', async () => {
      const request = makeRequest();
      const x402Quote = NextResponse.json(
        { error: 'payment required' },
        { status: 402, headers: { 'PAYMENT-REQUIRED': 'x402-quote', 'X-Request-Id': 'req_quote' } }
      );

      const response = await issueMppPreTradeQuote(
        request,
        CFG,
        makeSecret(),
        async () => x402Quote
      );

      expect(response.status).toBe(402);
      expect(response.headers.get('PAYMENT-REQUIRED')).toBe('x402-quote');
      expect(response.headers.get('WWW-Authenticate')).toContain('Payment id="challenge-1"');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(mockRouteCharge).toHaveBeenCalledWith(request);
      expect(mockExpiresSeconds).toHaveBeenCalledWith(60);
      expect(mockServer.evm.charge).toHaveBeenCalledWith({
        amount: '0.02',
        description: 'Insight Pre-Trade Safety Check',
        expires: 'expires-60',
        scope: REQUEST_URL,
      });
      expect(mockRecordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req_quote',
          protocol: 'mpp',
          status: 'quote_issued',
          amountUsdc: '0.02',
          network: CFG.network,
          surface: 'rest',
          resource: 'pre-trade-safety-check',
        })
      );
    });

    it('configures Base Sepolia USDC and the shared x402 facilitator', async () => {
      const secretKey = makeSecret();
      await issueMppPreTradeQuote(makeRequest(), CFG, secretKey, async () =>
        NextResponse.json({}, { status: 402, headers: { 'X-Request-Id': 'req_config' } })
      );

      expect(mockFacilitatorClient).toHaveBeenCalledWith({
        url: CFG.facilitatorUrl,
        timeoutMs: CFG.facilitatorTimeoutMs,
      });
      expect(mockEvmChargeFactory).toHaveBeenCalledWith(
        expect.objectContaining({
          authorization: { name: 'USDC', version: '2' },
          chainId: 84532,
          currency: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          decimals: 6,
          recipient: CFG.payTo,
          x402: expect.objectContaining({
            facilitator: { type: 'mock-facilitator' },
            maxTimeoutSeconds: CFG.maxTimeoutSeconds,
          }),
        })
      );
      expect(mockMppCreate).toHaveBeenCalledWith({
        methods: [mockMethod],
        realm: 'www.oracleinsight.xyz',
        secretKey,
      });
    });

    it('fails closed if the MPP SDK does not return a 402 challenge', async () => {
      mockRouteCharge.mockResolvedValue(makeChallenge(200));

      await expect(
        issueMppPreTradeQuote(makeRequest(), CFG, makeSecret(), async () =>
          NextResponse.json({}, { status: 402 })
        )
      ).rejects.toThrow('Expected MPP to issue a payment challenge');
    });
  });

  describe('paid request lifecycle', () => {
    it('validates, executes the check, settles, and returns a receipt', async () => {
      const request = makePaidRequest();
      const runBusiness = jest.fn(async () => makeSuccessfulBusinessResponse());

      const response = await handleMppPaidPreTradeRequest(request, CFG, makeSecret(), runBusiness);

      expect(response.status).toBe(200);
      expect(response.headers.get('Payment-Receipt')).toBe('mpp-receipt');
      expect(response.headers.get('X-Request-Id')).toMatch(/^req_[a-f0-9]{32}$/);
      expect(response.headers.get('Access-Control-Expose-Headers')).toContain('Payment-Receipt');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(mockValidateCredential).toHaveBeenCalledWith(TEST_CREDENTIAL, {
        request: { amount: '0.02' },
        scope: REQUEST_URL,
      });
      expect(mockBroadcastCredential).toHaveBeenCalledWith(TEST_CREDENTIAL, {
        request: { amount: '0.02' },
        scope: REQUEST_URL,
      });
      expect(mockRespondReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          challengeId: 'challenge-1',
          credential: TEST_CREDENTIAL,
          input: request,
          receipt: { reference: `0x${'a'.repeat(64)}` },
        })
      );
      expect(mockValidateCredential.mock.invocationCallOrder[0]).toBeLessThan(
        runBusiness.mock.invocationCallOrder[0]
      );
      expect(runBusiness.mock.invocationCallOrder[0]).toBeLessThan(
        mockBroadcastCredential.mock.invocationCallOrder[0]
      );
      expect(mockRecordAudit.mock.calls.map(([event]) => event.status)).toEqual([
        'payment_verified',
        'business_succeeded',
        'settled',
      ]);
      expect(mockRecordAudit).toHaveBeenLastCalledWith(
        expect.objectContaining({
          protocol: 'mpp',
          status: 'settled',
          txHash: `0x${'a'.repeat(64)}`,
          payer: PAYER,
          amountUsdc: '0.02',
          asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          verdict: 'pre_trade_safety_check',
        })
      );
    });

    it.each([
      [
        'x402 payment signature',
        { authorization: 'Payment credential=abc', 'payment-signature': 'x402' },
      ],
      ['API key', { authorization: 'Payment credential=abc', 'x-api-key': 'ins_test' }],
    ])('rejects conflicting credentials before validating (%s)', async (_label, headers) => {
      const response = await handleMppPaidPreTradeRequest(
        makeRequest(headers),
        CFG,
        makeSecret(),
        jest.fn()
      );

      expect(response.status).toBe(400);
      expect(mockMppCreate).not.toHaveBeenCalled();
      expect(mockValidateCredential).not.toHaveBeenCalled();
      expect(mockBroadcastCredential).not.toHaveBeenCalled();
    });

    it('returns a fresh challenge for malformed credentials without running or settling', async () => {
      mockCredentialFromRequest.mockImplementation(() => {
        throw new Error('malformed credential');
      });
      const runBusiness = jest.fn();

      const response = await handleMppPaidPreTradeRequest(
        makePaidRequest(),
        CFG,
        makeSecret(),
        runBusiness
      );

      expect(response.status).toBe(402);
      expect(response.headers.get('WWW-Authenticate')).toContain('Payment id="challenge-1"');
      expect(response.headers.get('X-Request-Id')).toMatch(/^req_[a-f0-9]{32}$/);
      expect(runBusiness).not.toHaveBeenCalled();
      expect(mockValidateCredential).not.toHaveBeenCalled();
      expect(mockBroadcastCredential).not.toHaveBeenCalled();
      expect(mockRecordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'payment_rejected',
          errorReason: 'malformed_mpp_credential',
        })
      );
    });

    it('returns a fresh challenge when a payment credential is invalid or expired', async () => {
      mockValidateCredential.mockRejectedValue(
        new TestPaymentError('expired challenge', 'PaymentExpiredError')
      );
      const runBusiness = jest.fn();

      const response = await handleMppPaidPreTradeRequest(
        makePaidRequest(),
        CFG,
        makeSecret(),
        runBusiness
      );

      expect(response.status).toBe(402);
      expect(response.headers.get('WWW-Authenticate')).toContain('Payment id="challenge-1"');
      expect(runBusiness).not.toHaveBeenCalled();
      expect(mockBroadcastCredential).not.toHaveBeenCalled();
      expect(mockRecordAudit).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'payment_rejected', errorReason: 'PaymentExpiredError' })
      );
    });

    it('rejects a replayed challenge without executing or settling the request', async () => {
      mockValidateCredential.mockRejectedValue(
        new TestPaymentError('challenge already used', 'InvalidChallengeError')
      );
      const runBusiness = jest.fn();

      const response = await handleMppPaidPreTradeRequest(
        makePaidRequest(),
        CFG,
        makeSecret(),
        runBusiness
      );

      expect(response.status).toBe(402);
      expect(runBusiness).not.toHaveBeenCalled();
      expect(mockBroadcastCredential).not.toHaveBeenCalled();
      expect(mockRecordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'payment_rejected',
          errorReason: 'InvalidChallengeError',
        })
      );
    });

    it('passes the complete request URL as scope so credentials cannot move across queries', async () => {
      const changedUrl = REQUEST_URL.replace('tradeAmountUsd=1000', 'tradeAmountUsd=1001');
      mockValidateCredential.mockRejectedValue(new TestPaymentError('scope mismatch'));
      const runBusiness = jest.fn();

      const response = await handleMppPaidPreTradeRequest(
        makeRequest({ authorization: 'Payment credential=abc' }, changedUrl),
        CFG,
        makeSecret(),
        runBusiness
      );

      expect(response.status).toBe(402);
      expect(mockValidateCredential).toHaveBeenCalledWith(TEST_CREDENTIAL, {
        request: { amount: '0.02' },
        scope: changedUrl,
      });
      expect(runBusiness).not.toHaveBeenCalled();
      expect(mockBroadcastCredential).not.toHaveBeenCalled();
    });

    it('returns 502 and Retry-After when the facilitator cannot verify payment', async () => {
      const facilitatorFailure = new FacilitatorFailure('facilitator unavailable');
      mockValidateCredential.mockRejectedValue(facilitatorFailure);
      mockFacilitatorError.mockReturnValue(facilitatorFailure);
      const runBusiness = jest.fn();

      const response = await handleMppPaidPreTradeRequest(
        makePaidRequest(),
        CFG,
        makeSecret(),
        runBusiness
      );

      expect(response.status).toBe(502);
      expect(response.headers.get('Retry-After')).toBe('5');
      expect(await response.json()).toEqual({
        error: 'MPP payment verification is temporarily unavailable',
      });
      expect(runBusiness).not.toHaveBeenCalled();
      expect(mockBroadcastCredential).not.toHaveBeenCalled();
      expect(mockRecordAudit).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'verify_failed', errorReason: 'FacilitatorFailure' })
      );
    });

    it('does not settle or return a receipt when the business check fails', async () => {
      const runBusiness = jest.fn(async () =>
        NextResponse.json({ error: 'invalid query' }, { status: 400 })
      );

      const response = await handleMppPaidPreTradeRequest(
        makePaidRequest(),
        CFG,
        makeSecret(),
        runBusiness
      );

      expect(response.status).toBe(400);
      expect(response.headers.get('Payment-Receipt')).toBeNull();
      expect(response.headers.get('Payment-Settlement-Status')).toBeNull();
      expect(mockBroadcastCredential).not.toHaveBeenCalled();
      expect(mockRecordAudit.mock.calls.map(([event]) => event.status)).toEqual([
        'payment_verified',
        'business_failed',
      ]);
    });

    it('records and rethrows unexpected business errors without settling', async () => {
      const failure = new Error('business dependency failed');
      const runBusiness = jest.fn().mockRejectedValue(failure);

      await expect(
        handleMppPaidPreTradeRequest(makePaidRequest(), CFG, makeSecret(), runBusiness)
      ).rejects.toBe(failure);

      expect(mockBroadcastCredential).not.toHaveBeenCalled();
      expect(mockRecordAudit).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'business_failed', errorReason: 'handler_error:Error' })
      );
    });

    it('releases the business response with a failure marker if settlement fails', async () => {
      mockBroadcastCredential.mockRejectedValue(new Error('settlement failed'));
      const runBusiness = jest.fn(async () => makeSuccessfulBusinessResponse());

      const response = await handleMppPaidPreTradeRequest(
        makePaidRequest(),
        CFG,
        makeSecret(),
        runBusiness
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Payment-Receipt')).toBeNull();
      expect(response.headers.get('Payment-Settlement-Status')).toBe('failed');
      expect(mockRecordAudit).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'settlement_failed', errorReason: 'Error' })
      );
    });

    it('rethrows unexpected validation errors instead of treating them as rejected credentials', async () => {
      const failure = new Error('programming error');
      mockValidateCredential.mockRejectedValue(failure);

      await expect(
        handleMppPaidPreTradeRequest(makePaidRequest(), CFG, makeSecret(), jest.fn())
      ).rejects.toBe(failure);

      expect(mockRouteCharge).not.toHaveBeenCalled();
      expect(mockRecordAudit).not.toHaveBeenCalled();
    });
  });
});
