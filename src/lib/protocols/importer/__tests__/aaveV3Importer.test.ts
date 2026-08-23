/**
 * Unit tests for the rewritten Aave V3 importer.
 *
 * The deployed Aave V3 UiPoolDataProvider returns structs whose bool fields are
 * encoded as uint256 and whose ReserveData layout differs from the published
 * address-book ABI, so decoding with the package ABI throws
 * "Bytes value ... is not a valid boolean". This test mocks the RPC layer and
 * feeds on-chain-shaped return values to prove the importer decodes correctly
 * and computes collateral + variable debt + stable debt, plus both skip reasons.
 *
 * It is deterministic and RPC-free, so it exercises the debt branch that the
 * live on-chain harness cannot reliably hit (event-topic discovery is corrupted
 * by the sandbox RPC for borrower addresses).
 */
import { decodeFunctionData, encodeFunctionResult, getAddress, type Abi } from 'viem';

import { importAaveV3Position } from '@/lib/protocols/importer/aaveV3Importer';
import { readContract } from '@/lib/protocols/importer/rpcClient';
import { getProtocolById } from '@/lib/protocols/protocolRegistry';

jest.mock('@/lib/protocols/importer/rpcClient', () => ({
  readContract: jest.fn(),
}));

const readContractMock = readContract as unknown as jest.Mock;

const RAY = 10n ** 27n;

const WETH = getAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
const USDC = getAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
const WBTC = getAddress('0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599');
const LUSD = getAddress('0x1111111111111111111111111111111111111113');
const DAI = getAddress('0x6B175474E89094C44Da98b954EedeAC495271d0F');

const WBTC_STABLE_DEBT = '0x1111111111111111111111111111111111111111';

// Mirror the importer's local ABIs so the encode/decode round-trip is byte-exact.
const COMBINED_ABI = [
  {
    type: 'function',
    name: 'getUserReservesData',
    stateMutability: 'view',
    inputs: [
      { name: 'provider', type: 'address' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'underlyingAsset', type: 'address' },
          { name: 'scaledATokenBalance', type: 'uint256' },
          { name: 'usageAsCollateralEnabledOnUser', type: 'uint256' },
          { name: 'scaledVariableDebt', type: 'uint256' },
        ],
      },
      { name: '', type: 'uint8' },
    ],
  },
  {
    type: 'function',
    name: 'getReserveData',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'configuration', type: 'uint256' },
          { name: 'liquidityIndex', type: 'uint128' },
          { name: 'variableBorrowIndex', type: 'uint128' },
          { name: 'currentLiquidityRate', type: 'uint128' },
          { name: 'currentVariableBorrowRate', type: 'uint128' },
          { name: 'currentStableBorrowRate', type: 'uint128' },
          { name: 'lastUpdateTimestamp', type: 'uint40' },
          { name: 'id', type: 'uint16' },
          { name: 'aTokenAddress', type: 'address' },
          { name: 'stableDebtTokenAddress', type: 'address' },
          { name: 'variableDebtTokenAddress', type: 'address' },
          { name: 'interestRateStrategyAddress', type: 'address' },
          { name: 'accruedToTreasury', type: 'uint128' },
          { name: 'unbacked', type: 'uint128' },
          { name: 'isolationModeTotalDebt', type: 'uint128' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

function reserveData(asset: string): Record<string, unknown> {
  const isWbtc = asset.toLowerCase() === WBTC.toLowerCase();
  return {
    configuration: 0n,
    liquidityIndex: RAY,
    variableBorrowIndex: RAY,
    currentLiquidityRate: 0n,
    currentVariableBorrowRate: 0n,
    currentStableBorrowRate: 0n,
    lastUpdateTimestamp: 0n,
    id: 0,
    aTokenAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    stableDebtTokenAddress: isWbtc
      ? WBTC_STABLE_DEBT
      : '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    variableDebtTokenAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
    interestRateStrategyAddress: '0xdddddddddddddddddddddddddddddddddddddddd',
    accruedToTreasury: 0n,
    unbacked: 0n,
    isolationModeTotalDebt: 0n,
  };
}

function symbolFor(asset: string): string {
  const a = asset.toLowerCase();
  if (a === WETH.toLowerCase()) return 'WETH';
  if (a === USDC.toLowerCase()) return 'USDC';
  if (a === WBTC.toLowerCase()) return 'WBTC';
  if (a === LUSD.toLowerCase()) return 'LUSD';
  if (a === DAI.toLowerCase()) return 'DAI';
  return 'UNKNOWN';
}

function decimalsFor(asset: string): number {
  const a = asset.toLowerCase();
  if (a === USDC.toLowerCase()) return 6;
  if (a === WBTC.toLowerCase()) return 8;
  return 18;
}

const USER_RESERVES = [
  // WETH: collateral-enabled with aToken balance -> ETH collateral (normalized)
  {
    underlyingAsset: WETH,
    scaledATokenBalance: 2n * 10n ** 18n,
    usageAsCollateralEnabledOnUser: 1n,
    scaledVariableDebt: 0n,
  },
  // USDC: variable debt only -> USDC borrow (variable)
  {
    underlyingAsset: USDC,
    scaledATokenBalance: 0n,
    usageAsCollateralEnabledOnUser: 0n,
    scaledVariableDebt: 5n * 10n ** 6n,
  },
  // WBTC: collateral-enabled (no aToken), but has stable debt token balance -> WBTC borrow (stable)
  {
    underlyingAsset: WBTC,
    scaledATokenBalance: 0n,
    usageAsCollateralEnabledOnUser: 1n,
    scaledVariableDebt: 0n,
  },
  // LUSD: collateral-enabled but unsupported symbol -> skipped 'unsupported'
  {
    underlyingAsset: LUSD,
    scaledATokenBalance: 1n * 10n ** 18n,
    usageAsCollateralEnabledOnUser: 1n,
    scaledVariableDebt: 0n,
  },
  // DAI: metadata read throws -> skipped 'reserve_metadata_unavailable'
  {
    underlyingAsset: DAI,
    scaledATokenBalance: 1n * 10n ** 18n,
    usageAsCollateralEnabledOnUser: 1n,
    scaledVariableDebt: 0n,
  },
];

describe('importAaveV3Position', () => {
  const protocol = getProtocolById('aave-v3-ethereum');

  beforeEach(() => {
    readContractMock.mockImplementation(
      async (_chainId: number, to: `0x${string}`, data: `0x${string}`) => {
        try {
          const { functionName, args } = decodeFunctionData({ abi: COMBINED_ABI as Abi, data });
          if (functionName === 'getUserReservesData') {
            return encodeFunctionResult({
              abi: COMBINED_ABI as Abi,
              functionName,
              result: [USER_RESERVES, 0],
            });
          }
          if (functionName === 'getReserveData') {
            const asset = (args[0] as string).toLowerCase();
            if (asset === DAI.toLowerCase())
              throw new Error('reserve metadata unavailable (simulated)');
            return encodeFunctionResult({
              abi: COMBINED_ABI as Abi,
              functionName,
              result: reserveData(asset),
            });
          }
          if (functionName === 'symbol') {
            return encodeFunctionResult({
              abi: COMBINED_ABI as Abi,
              functionName,
              result: symbolFor(to),
            });
          }
          if (functionName === 'decimals') {
            return encodeFunctionResult({
              abi: COMBINED_ABI as Abi,
              functionName,
              result: decimalsFor(to),
            });
          }
          if (functionName === 'balanceOf') {
            if (to.toLowerCase() === WBTC_STABLE_DEBT) {
              return encodeFunctionResult({
                abi: COMBINED_ABI as Abi,
                functionName,
                result: 1n * 10n ** 8n,
              });
            }
            return encodeFunctionResult({ abi: COMBINED_ABI as Abi, functionName, result: 0n });
          }
          throw new Error(`unexpected function ${functionName}`);
        } catch (e) {
          throw e;
        }
      }
    );
  });

  it('decodes positions and computes collateral + variable debt + stable debt', async () => {
    const user = '0x1111111111111111111111111111111111111112' as `0x${string}`;
    const pos = await importAaveV3Position(protocol, user);

    // Collateral: WETH (2e18) * liquidityIndex(RAY) / RAY = 2 ETH
    const ethCollateral = pos.collaterals.find((c) => c.symbol === 'ETH');
    expect(ethCollateral).toBeDefined();
    expect(ethCollateral?.amount).toBeCloseTo(2, 9);

    // Variable debt: USDC (5e6) * variableBorrowIndex(RAY) / RAY = 5 USDC
    const usdcBorrow = pos.borrows.find((b) => b.symbol === 'USDC');
    expect(usdcBorrow).toBeDefined();
    expect(usdcBorrow?.amount).toBeCloseTo(5, 6);

    // Stable debt: WBTC stable debt token balance (1e8) / 1e8 = 1 WBTC
    const wbtcBorrow = pos.borrows.find((b) => b.symbol === 'WBTC');
    expect(wbtcBorrow).toBeDefined();
    expect(wbtcBorrow?.amount).toBeCloseTo(1, 8);

    // Skips: LUSD unsupported + DAI metadata unavailable (recorded as 'Unknown' symbol)
    const lusdSkip = pos.skippedAssets.find((s) => s.symbol === 'LUSD');
    expect(lusdSkip?.reason).toBe('unsupported');
    const daiSkip = pos.skippedAssets.find((s) => s.reason === 'reserve_metadata_unavailable');
    expect(daiSkip).toBeDefined();
    expect(daiSkip?.reason).toBe('reserve_metadata_unavailable');

    // No bool-decode error path: rawPositions present for processed reserves
    expect(pos.rawPositions.length).toBeGreaterThan(0);
  });
});
