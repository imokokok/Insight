import { decodeFunctionData, encodeFunctionResult, parseAbi } from 'viem';

import {
  AERODROME_SLIPSTREAM_SWAP_ROUTER_CODE_HASH,
  AERODROME_SLIPSTREAM_SWAP_ROUTER,
} from '../aerodromeSlipstream';
import { prepareAerodromeSlipstreamExactInput } from '../aerodromeSlipstreamSwap';
import { getReviewedAerodromeSlipstreamPreTradeEvidence } from '../preTradeAerodromeSlipstream';

jest.mock('viem', () => ({
  ...jest.requireActual('viem'),
  keccak256: jest.fn(),
}));
jest.mock('../preTradeAerodromeSlipstream', () => ({
  getReviewedAerodromeSlipstreamPreTradeEvidence: jest.fn(),
}));

const { keccak256 } = jest.requireMock('viem') as { keccak256: jest.Mock };
const mockedQuote = getReviewedAerodromeSlipstreamPreTradeEvidence as jest.MockedFunction<
  typeof getReviewedAerodromeSlipstreamPreTradeEvidence
>;

const ROUTER_STATE_ABI = parseAbi([
  'function factory() view returns (address)',
  'function WETH9() view returns (address)',
]);
const SWAP_ROUTER_ABI = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,int24 tickSpacing,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
]);

const quote = {
  profile: 'base-aerodrome-slipstream-weth-usdc-cl100',
  venue: 'aerodrome-slipstream',
  market: 'WETH/USDC',
  sourceFreshnessSeconds: 2,
  observedAt: '2026-10-25T00:00:00.000Z',
  block: { number: '123', hash: `0x${'11'.repeat(32)}`, timestamp: '2026-10-24T23:59:58.000Z' },
  contracts: {
    factory: '0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A',
    quoterV2: '0x254cF9E1E6e233aa1AC962CB9B05b2cfeAaE15b0',
    pool: '0xb2cc224c1c9feE385f8ad6a55b4d94E92359DC59',
    tickSpacing: 100,
    feePips: 150,
  },
  quote: {
    amountIn: 1.25,
    amountInRaw: '1250000000000000000',
    amountOut: 2500,
    amountOutRaw: '2500000000',
    effectiveToken1PerToken0: 2000,
    initializedTicksCrossed: 1,
    priceImpactBps: 6,
  },
  spotToken1PerToken0: 2000,
  twapToken1PerToken0: 1999,
  twapDeviationBpsFromSpot: 5,
} as const;

function rpcFixture() {
  return {
    getCode: jest.fn().mockResolvedValue('0x6000'),
    call: jest.fn(async (_to: `0x${string}`, data: `0x${string}`) => {
      if (data.slice(0, 10) === '0xc45a0155') {
        return encodeFunctionResult({
          abi: ROUTER_STATE_ABI,
          functionName: 'factory',
          result: quote.contracts.factory,
        });
      }
      if (data.slice(0, 10) === '0x4aa4a4fc') {
        return encodeFunctionResult({
          abi: ROUTER_STATE_ABI,
          functionName: 'WETH9',
          result: '0x4200000000000000000000000000000000000006',
        });
      }
      throw new Error(`Unexpected router selector: ${data.slice(0, 10)}`);
    }),
  };
}

describe('Aerodrome Slipstream user-signable swap preparation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    keccak256.mockReturnValue(AERODROME_SLIPSTREAM_SWAP_ROUTER_CODE_HASH);
    mockedQuote.mockResolvedValue(quote as never);
  });

  it('returns an exact-amount approval plus a bound WETH→USDC router call without signing', async () => {
    const rpc = rpcFixture();
    const result = await prepareAerodromeSlipstreamExactInput(
      {
        amountIn: '1.25',
        recipient: '0x1111111111111111111111111111111111111111',
        deadlineUnixSeconds: 1_700_000_600,
        maxSlippageBps: 50,
      },
      { rpc: rpc as never, nowUnixSeconds: 1_700_000_000 }
    );

    expect(result.transaction.to).toBe(AERODROME_SLIPSTREAM_SWAP_ROUTER);
    expect(result.transaction.value).toBe('0x0');
    expect(result.approval).toMatchObject({
      token: '0x4200000000000000000000000000000000000006',
      spender: AERODROME_SLIPSTREAM_SWAP_ROUTER,
      amountRaw: '1250000000000000000',
    });
    expect(result.exactInput).toMatchObject({
      quotedAmountOutRaw: '2500000000',
      amountOutMinimumRaw: '2487500000',
      tickSpacing: 100,
    });
    expect(
      decodeFunctionData({ abi: SWAP_ROUTER_ABI, data: result.transaction.data })
    ).toMatchObject({
      functionName: 'exactInputSingle',
      args: [
        expect.objectContaining({
          amountIn: 1250000000000000000n,
          amountOutMinimum: 2487500000n,
          tickSpacing: 100,
        }),
      ],
    });
    expect(mockedQuote).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: 8453, asset: 'WETH', destinationAsset: 'USDC' }),
      expect.objectContaining({ rpc })
    );
  });

  it('refuses a router whose runtime code no longer matches the reviewed deployment', async () => {
    const rpc = rpcFixture();
    keccak256.mockReturnValue(`0x${'22'.repeat(32)}`);

    await expect(
      prepareAerodromeSlipstreamExactInput(
        {
          amountIn: '1',
          recipient: '0x1111111111111111111111111111111111111111',
          deadlineUnixSeconds: 1_700_000_600,
          maxSlippageBps: 50,
        },
        { rpc: rpc as never, nowUnixSeconds: 1_700_000_000 }
      )
    ).rejects.toThrow('runtime code');
  });

  it('refuses a zero recipient or long-lived deadline before any quote is read', async () => {
    await expect(
      prepareAerodromeSlipstreamExactInput(
        {
          amountIn: '1',
          recipient: '0x0000000000000000000000000000000000000000',
          deadlineUnixSeconds: 1_700_000_600,
          maxSlippageBps: 50,
        },
        { nowUnixSeconds: 1_700_000_000 }
      )
    ).rejects.toThrow('non-zero');
    await expect(
      prepareAerodromeSlipstreamExactInput(
        {
          amountIn: '1',
          recipient: '0x1111111111111111111111111111111111111111',
          deadlineUnixSeconds: 1_700_001_801,
          maxSlippageBps: 50,
        },
        { nowUnixSeconds: 1_700_000_000 }
      )
    ).rejects.toThrow('deadline');
    expect(mockedQuote).not.toHaveBeenCalled();
  });
});
