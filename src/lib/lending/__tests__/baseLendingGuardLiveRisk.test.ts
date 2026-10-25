import { decodeFunctionData, encodeFunctionResult } from 'viem';

import { readContract } from '@/lib/protocols/importer/rpcClient';

import { assessBaseLendingGuard } from '../baseLendingGuard';

jest.mock('@/lib/protocols/importer/rpcClient', () => ({ readContract: jest.fn() }));

const mockedReadContract = readContract as jest.MockedFunction<typeof readContract>;

const COMET = '0xb125e6687d4313864e53df431d5425969c15eb2f' as const;
const USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as const;
const WETH = '0x4200000000000000000000000000000000000006' as const;
const COMET_BASE_PRICE_FEED = '0x7e860098f58bbfc8648a4311b374b1d669a2bc6b' as const;
const COMET_WETH_PRICE_FEED = '0x71041dddad3595f9ced3dccfbe3d1f4b0a16bb70' as const;
const MOONWELL_COMPTROLLER = '0xfbb21d0380bee3312b33c4353c8936a0f13ef26c' as const;
const MOONWELL_USDC = '0xedc817a28e8b93b03976fbd4a3ddbc9f7d176c22' as const;

const COMET_ABI = [
  {
    type: 'function',
    name: 'baseToken',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'baseTokenPriceFeed',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'getAssetInfoByAddress',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'offset', type: 'uint8' },
          { name: 'asset', type: 'address' },
          { name: 'priceFeed', type: 'address' },
          { name: 'scale', type: 'uint64' },
          { name: 'borrowCollateralFactor', type: 'uint64' },
          { name: 'liquidateCollateralFactor', type: 'uint64' },
          { name: 'liquidationFactor', type: 'uint64' },
          { name: 'supplyCap', type: 'uint128' },
        ],
      },
    ],
  },
] as const;

const MOONWELL_COMPTROLLER_ABI = [
  {
    type: 'function',
    name: 'markets',
    stateMutability: 'view',
    inputs: [{ name: 'mToken', type: 'address' }],
    outputs: [
      { name: 'isListed', type: 'bool' },
      { name: 'collateralFactorMantissa', type: 'uint256' },
      { name: 'isComped', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'oracle',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

const oracle = {
  verdict: 'PASS' as const,
  maxDeviationPct: 0.2,
  staleDataRisk: false,
  participantCount: 4,
};

describe('Base Lending Guard live risk adapters', () => {
  beforeEach(() => jest.clearAllMocks());

  it('decodes Compound Base Comet factors and price-feed identity from live-call shapes', async () => {
    mockedReadContract.mockImplementation(async (_chainId, target, data) => {
      expect(target.toLowerCase()).toBe(COMET);
      const decoded = decodeFunctionData({ abi: COMET_ABI, data: data as `0x${string}` });
      if (decoded.functionName === 'baseToken') {
        return encodeFunctionResult({ abi: COMET_ABI, functionName: 'baseToken', result: USDC });
      }
      if (decoded.functionName === 'baseTokenPriceFeed') {
        return encodeFunctionResult({
          abi: COMET_ABI,
          functionName: 'baseTokenPriceFeed',
          result: COMET_BASE_PRICE_FEED,
        });
      }
      expect(decoded.args).toEqual([WETH]);
      return encodeFunctionResult({
        abi: COMET_ABI,
        functionName: 'getAssetInfoByAddress',
        result: {
          offset: 0,
          asset: WETH,
          priceFeed: COMET_WETH_PRICE_FEED,
          scale: 10n ** 18n,
          borrowCollateralFactor: 800_000_000_000_000_000n,
          liquidateCollateralFactor: 900_000_000_000_000_000n,
          liquidationFactor: 950_000_000_000_000_000n,
          supplyCap: 11_000n * 10n ** 18n,
        },
      });
    });

    const result = await assessBaseLendingGuard(
      {
        protocolId: 'compound-v3-base',
        action: 'borrow',
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
        collateralValueUsd: 10_000,
        debtValueUsd: 4_000,
      },
      { checkOracle: jest.fn().mockResolvedValue(oracle) as never }
    );

    expect(result).toMatchObject({
      verdict: 'ALLOW',
      market: {
        parameterSource: 'compound-comet',
        maxLtv: 0.8,
        liquidationLtv: 0.9,
        oracleAddress: COMET_WETH_PRICE_FEED,
      },
    });
    expect(mockedReadContract).toHaveBeenCalledTimes(3);
  });

  it('uses Moonwell Comptroller listing, collateral factor, and oracle identity', async () => {
    const moonwellOracle = '0xec942be8a8114bfd0396a5052c36027f2ca6a9d0' as const;
    mockedReadContract.mockImplementation(async (_chainId, target, data) => {
      expect(target.toLowerCase()).toBe(MOONWELL_COMPTROLLER);
      const decoded = decodeFunctionData({
        abi: MOONWELL_COMPTROLLER_ABI,
        data: data as `0x${string}`,
      });
      if (decoded.functionName === 'oracle') {
        return encodeFunctionResult({
          abi: MOONWELL_COMPTROLLER_ABI,
          functionName: 'oracle',
          result: moonwellOracle,
        });
      }
      expect(String(decoded.args[0]).toLowerCase()).toBe(MOONWELL_USDC);
      return encodeFunctionResult({
        abi: MOONWELL_COMPTROLLER_ABI,
        functionName: 'markets',
        result: [true, 880_000_000_000_000_000n, false],
      });
    });

    const result = await assessBaseLendingGuard(
      {
        protocolId: 'moonwell-base',
        action: 'borrow',
        collateralSymbol: 'USDC',
        loanSymbol: 'WETH',
        collateralValueUsd: 10_000,
        debtValueUsd: 4_000,
      },
      { checkOracle: jest.fn().mockResolvedValue(oracle) as never }
    );

    expect(result).toMatchObject({
      verdict: 'ALLOW',
      market: {
        parameterSource: 'moonwell-market',
        maxLtv: 0.88,
        liquidationLtv: 0.88,
        oracleAddress: moonwellOracle,
      },
    });
    expect(mockedReadContract).toHaveBeenCalledTimes(2);
  });
});
