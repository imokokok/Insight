/**
 * Read-only guard for reviewed direct lending deployments on Polygon,
 * Arbitrum and BNB Chain. It does not submit, relay, or authorize a
 * transaction. Protocol controls are read at decision time and failures close
 * the decision rather than falling back to registry estimates.
 */

import { IUiPoolDataProvider_ABI } from '@aave-dao/aave-address-book/abis';
import { decodeFunctionResult, encodeFunctionData } from 'viem';
import { z } from 'zod';

import {
  preTradeSafetyCheck,
  type PreTradeSafetyResult,
} from '@/lib/api/services/preTradeSafetyService';
import { readContract } from '@/lib/protocols/importer/rpcClient';

import {
  MultichainEvmLendingActionSchema,
  MultichainEvmLendingChainIdSchema,
  MultichainEvmLendingExactTransactionSchema,
  MultichainEvmLendingProtocolIdSchema,
  type MultichainEvmLendingAction,
  type MultichainEvmLendingExactTransaction,
  type MultichainEvmLendingProtocolId,
} from './multichainEvmLendingAction';
import {
  aaveV3EvmMarket,
  aaveV3EvmUnderlyingForSymbol,
  COMPOUND_V3_ARBITRUM_COMET,
  COMPOUND_V3_ARBITRUM_USDC,
  compoundV3ArbitrumAssetForSymbol,
  DOLOMITE_ARBITRUM_MARGIN,
  eulerV2EvmMarket,
  fluidVaultT1EvmMarket,
  isAaveV3EvmProtocolId,
  isCompoundV3EvmProtocolId,
  isDolomiteProtocolId,
  isEulerV2EvmProtocolId,
  isFluidVaultT1ProtocolId,
  isListaMoolahProtocolId,
  isMorphoBlueEvmProtocolId,
  lendingProtocolChainId,
  LISTA_MOOLAH_BNB,
  morphoBlueEvmMarket,
  venusCoreMarketForSymbol,
} from './multichainEvmLendingProtocols';
import {
  ARBITRUM_CHAIN_ID,
  BNB_CHAIN_ID,
  VENUS_CORE_POOL_COMPTROLLER,
  type MultichainEvmLendingChainId,
} from './multichainEvmLendingProtocols';

export const MultichainEvmLendingGuardInputSchema = z
  .object({
    chainId: MultichainEvmLendingChainIdSchema,
    protocolId: MultichainEvmLendingProtocolIdSchema,
    action: MultichainEvmLendingActionSchema,
    collateralSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    loanSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    collateralValueUsd: z.number().finite().positive().max(1_000_000_000_000),
    debtValueUsd: z.number().finite().min(0).max(1_000_000_000_000),
    marketId: z
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .optional(),
    marketAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .optional(),
    collateralVaultAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .optional(),
    collateralMarketId: z
      .string()
      .regex(/^(?:0|[1-9][0-9]*)$/)
      .optional(),
    loanMarketId: z
      .string()
      .regex(/^(?:0|[1-9][0-9]*)$/)
      .optional(),
    accountNumber: z
      .string()
      .regex(/^(?:0|[1-9][0-9]*)$/)
      .optional(),
  })
  .superRefine((value, context) => {
    const expectedChain = lendingProtocolChainId(value.protocolId);
    if (value.chainId !== expectedChain) {
      context.addIssue({
        code: 'custom',
        path: ['chainId'],
        message: 'chainId does not match the reviewed lending deployment',
      });
    }
    if (
      (isMorphoBlueEvmProtocolId(value.protocolId) || isListaMoolahProtocolId(value.protocolId)) &&
      !value.marketId
    ) {
      context.addIssue({
        code: 'custom',
        path: ['marketId'],
        message: 'marketId is required for isolated-market lending protocols',
      });
    }
    if (isEulerV2EvmProtocolId(value.protocolId) && !value.marketAddress) {
      context.addIssue({
        code: 'custom',
        path: ['marketAddress'],
        message: 'marketAddress is required to verify the selected Euler EVault live',
      });
    }
    if (isFluidVaultT1ProtocolId(value.protocolId) && !value.marketAddress) {
      context.addIssue({
        code: 'custom',
        path: ['marketAddress'],
        message: 'marketAddress is required to verify the selected Fluid T1 vault live',
      });
    }
    if (isFluidVaultT1ProtocolId(value.protocolId) && value.action !== 'supply') {
      context.addIssue({
        code: 'custom',
        path: ['action'],
        message: 'Fluid T1 integration currently accepts only collateral-only supply',
      });
    }
    if (
      isEulerV2EvmProtocolId(value.protocolId) &&
      value.action === 'borrow' &&
      !value.collateralVaultAddress
    ) {
      context.addIssue({
        code: 'custom',
        path: ['collateralVaultAddress'],
        message: 'collateralVaultAddress is required for an Euler EVC borrow batch',
      });
    }
    if (
      isDolomiteProtocolId(value.protocolId) &&
      (!value.collateralMarketId || !value.loanMarketId || value.accountNumber === undefined)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['collateralMarketId'],
        message: 'Dolomite requires collateralMarketId, loanMarketId, and accountNumber',
      });
    }
  });
export type MultichainEvmLendingGuardInput = z.infer<typeof MultichainEvmLendingGuardInputSchema>;
export const MultichainEvmLendingGuardExactInputSchema = z
  .object({
    guard: MultichainEvmLendingGuardInputSchema,
    transaction: MultichainEvmLendingExactTransactionSchema,
  })
  .strict();
export type MultichainEvmLendingGuardExactInput = z.infer<
  typeof MultichainEvmLendingGuardExactInputSchema
>;

export type MultichainEvmLendingGuardVerdict = 'ALLOW' | 'CAUTION' | 'BLOCK';
type RiskSource =
  | 'aave-live'
  | 'venus-live'
  | 'compound-comet'
  | 'morpho-market'
  | 'lista-moolah-market'
  | 'euler-evault'
  | 'dolomite-live'
  | 'fluid-vault-t1'
  | 'unavailable';
interface RiskParameters {
  maxLtv: number;
  liquidationLtv: number;
  source: RiskSource;
  oracleAddress: `0x${string}` | null;
  marketId: `0x${string}` | null;
  marketAddress: `0x${string}` | null;
  collateralVaultAddress: `0x${string}` | null;
  collateralMarketId: string | null;
  loanMarketId: string | null;
  accountNumber: string | null;
}
interface OracleCheckSummary {
  verdict: PreTradeSafetyResult['verdict'];
  maxDeviationPct: number;
  staleDataRisk: boolean;
  participantCount: number;
  attestationUid: string | null;
  attester: string | null;
}

export interface MultichainEvmLendingGuardResult {
  schema: 'insight.multichain-evm-lending-guard.v1';
  verdict: MultichainEvmLendingGuardVerdict;
  chainId: MultichainEvmLendingChainId;
  protocolId: MultichainEvmLendingProtocolId;
  action: MultichainEvmLendingAction;
  evaluatedAt: string;
  scope: {
    chainId: MultichainEvmLendingChainId;
    transactionAuthority: 'none';
    valuation: 'caller_declared_post_action_usd';
  };
  market: {
    marketId: string | null;
    marketAddress: string | null;
    collateralVaultAddress: string | null;
    collateralMarketId: string | null;
    loanMarketId: string | null;
    accountNumber: string | null;
    collateralSymbol: string;
    loanSymbol: string;
    maxLtv: number;
    liquidationLtv: number;
    parameterSource: RiskSource;
    oracleAddress: `0x${string}` | null;
  };
  projected: {
    collateralValueUsd: number;
    debtValueUsd: number;
    ltv: number;
    liquidationBufferPct: number;
    conservativeMaxDebtUsd: number;
  };
  oracleChecks: { collateral: OracleCheckSummary; loan: OracleCheckSummary };
  reasons: string[];
  next: { execution: 'not_performed'; priorSeal: string };
}

const COMPTROLLER_ABI = [
  {
    type: 'function',
    name: 'markets',
    stateMutability: 'view',
    inputs: [{ name: 'vToken', type: 'address' }],
    outputs: [
      { name: 'isListed', type: 'bool' },
      { name: 'collateralFactorMantissa', type: 'uint256' },
      { name: 'isVenus', type: 'bool' },
    ],
  },
] as const;

const COMPOUND_COMET_ABI = [
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

const MORPHO_STYLE_ABI = [
  {
    type: 'function',
    name: 'idToMarketParams',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      { name: 'loanToken', type: 'address' },
      { name: 'collateralToken', type: 'address' },
      { name: 'oracle', type: 'address' },
      { name: 'irm', type: 'address' },
      { name: 'lltv', type: 'uint256' },
    ],
  },
] as const;

const ERC20_SYMBOL_ABI = [
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

const EULER_V2_FACTORY_ABI = [
  {
    type: 'function',
    name: 'isProxy',
    stateMutability: 'view',
    inputs: [{ name: 'proxy', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;
const EULER_V2_EVAULT_VIEW_ABI = [
  {
    type: 'function',
    name: 'asset',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'EVC',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'oracle',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'LTVFull',
    stateMutability: 'view',
    inputs: [{ name: 'collateral', type: 'address' }],
    outputs: [
      { name: 'borrowLTV', type: 'uint16' },
      { name: 'liquidationLTV', type: 'uint16' },
      { name: 'initialLiquidationLTV', type: 'uint16' },
      { name: 'targetTimestamp', type: 'uint48' },
      { name: 'rampDuration', type: 'uint32' },
    ],
  },
] as const;
const DOLOMITE_MARGIN_VIEW_ABI = [
  {
    type: 'function',
    name: 'getMarketTokenAddress',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'getMarketIsClosing',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getMarketMarginPremium',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [{ name: '', type: 'tuple', components: [{ name: 'value', type: 'uint256' }] }],
  },
  {
    type: 'function',
    name: 'getMarketPriceOracle',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'getMarginRatio',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'tuple', components: [{ name: 'value', type: 'uint256' }] }],
  },
] as const;

const FLUID_VAULT_FACTORY_ABI = [
  {
    type: 'function',
    name: 'isVault',
    stateMutability: 'view',
    inputs: [{ name: 'vault', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;
const FLUID_VAULT_T1_VIEW_ABI = [
  {
    type: 'function',
    name: 'VAULT_FACTORY',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'constantsView',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'liquidity', type: 'address' },
          { name: 'factory', type: 'address' },
          { name: 'adminImplementation', type: 'address' },
          { name: 'secondaryImplementation', type: 'address' },
          { name: 'supplyToken', type: 'address' },
          { name: 'borrowToken', type: 'address' },
          { name: 'supplyDecimals', type: 'uint8' },
          { name: 'borrowDecimals', type: 'uint8' },
          { name: 'vaultId', type: 'uint256' },
          { name: 'liquiditySupplyExchangePriceSlot', type: 'bytes32' },
          { name: 'liquidityBorrowExchangePriceSlot', type: 'bytes32' },
          { name: 'liquidityUserSupplySlot', type: 'bytes32' },
          { name: 'liquidityUserBorrowSlot', type: 'bytes32' },
        ],
      },
    ],
  },
] as const;

function lowerAddress(value: string): `0x${string}` {
  return value.toLowerCase() as `0x${string}`;
}
function oracleSymbol(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'WETH') return 'ETH';
  if (normalized === 'WBNB') return 'BNB';
  if (normalized === 'WMATIC' || normalized === 'WPOL') return 'MATIC';
  if (normalized === 'WBTC' || normalized === 'BTCB') return 'BTC';
  return normalized;
}
function blocksOracle(verdict: PreTradeSafetyResult['verdict']): boolean {
  return verdict === 'DANGER' || verdict === 'BLOCK';
}
function summarize(result: PreTradeSafetyResult): OracleCheckSummary {
  return {
    verdict: result.verdict,
    maxDeviationPct: result.maxDeviationPct,
    staleDataRisk: result.staleDataRisk,
    participantCount: result.participantCount,
    attestationUid: result.attestation?.uid ?? null,
    attester: result.attestation?.attester ?? null,
  };
}
function aaveReserve(value: unknown) {
  const raw = value as Record<string, unknown>;
  return {
    underlyingAsset: lowerAddress(String(raw.underlyingAsset)),
    baseLTVasCollateral: BigInt(raw.baseLTVasCollateral as bigint | number | string),
    reserveLiquidationThreshold: BigInt(
      raw.reserveLiquidationThreshold as bigint | number | string
    ),
    usageAsCollateralEnabled: raw.usageAsCollateralEnabled === true,
    borrowingEnabled: raw.borrowingEnabled === true,
    isActive: raw.isActive === true,
    isFrozen: raw.isFrozen === true,
    isPaused: raw.isPaused === true,
    priceOracle: lowerAddress(String(raw.priceOracle)),
  };
}
function decimalValue(value: unknown): bigint {
  if (typeof value === 'bigint' || typeof value === 'number' || typeof value === 'string') {
    return BigInt(value);
  }
  if (Array.isArray(value) && value.length === 1) return decimalValue(value[0]);
  if (value && typeof value === 'object' && 'value' in value) {
    return decimalValue((value as { value: unknown }).value);
  }
  throw new Error('Expected a Dolomite decimal value');
}

async function resolveAaveRisk(input: MultichainEvmLendingGuardInput): Promise<RiskParameters> {
  if (!isAaveV3EvmProtocolId(input.protocolId))
    throw new Error('Expected reviewed Aave V3 protocol');
  const market = aaveV3EvmMarket(input.protocolId);
  const collateralAddress = aaveV3EvmUnderlyingForSymbol(input.protocolId, input.collateralSymbol);
  const loanAddress = aaveV3EvmUnderlyingForSymbol(input.protocolId, input.loanSymbol);
  if (!collateralAddress || !loanAddress) {
    throw new Error('Declared assets are outside the reviewed Aave direct-call asset set');
  }
  const callData = encodeFunctionData({
    abi: IUiPoolDataProvider_ABI,
    functionName: 'getReservesData',
    args: [market.poolAddressesProvider],
  });
  const raw = await readContract(input.chainId, market.uiPoolDataProvider, callData);
  const [reserves] = decodeFunctionResult({
    abi: IUiPoolDataProvider_ABI,
    functionName: 'getReservesData',
    data: raw as `0x${string}`,
  }) as [readonly unknown[], unknown];
  const entries = new Map(
    reserves.map((reserve) => {
      const parsed = aaveReserve(reserve);
      return [parsed.underlyingAsset, parsed] as const;
    })
  );
  const collateral = entries.get(collateralAddress);
  const loan = entries.get(loanAddress);
  if (!collateral || !loan) throw new Error('Aave live reserve list omitted a reviewed asset');
  if (
    !collateral.isActive ||
    collateral.isFrozen ||
    collateral.isPaused ||
    !collateral.usageAsCollateralEnabled
  ) {
    throw new Error('Aave collateral reserve is inactive, frozen, paused, or collateral-disabled');
  }
  if (!loan.isActive || loan.isFrozen || loan.isPaused || !loan.borrowingEnabled) {
    throw new Error('Aave loan reserve is inactive, frozen, paused, or borrow-disabled');
  }
  const maxLtv = Number(collateral.baseLTVasCollateral) / 10_000;
  const liquidationLtv = Number(collateral.reserveLiquidationThreshold) / 10_000;
  if (!(maxLtv > 0 && maxLtv < 1 && liquidationLtv >= maxLtv && liquidationLtv <= 1)) {
    throw new Error('Aave collateral reserve returned invalid live LTV controls');
  }
  if (/^0x0{40}$/i.test(collateral.priceOracle))
    throw new Error('Aave reserve returned a zero oracle');
  return {
    maxLtv,
    liquidationLtv,
    source: 'aave-live',
    oracleAddress: collateral.priceOracle,
    marketId: null,
    marketAddress: null,
    collateralVaultAddress: null,
    collateralMarketId: null,
    loanMarketId: null,
    accountNumber: null,
  };
}

async function resolveVenusRisk(input: MultichainEvmLendingGuardInput): Promise<RiskParameters> {
  if (input.chainId !== BNB_CHAIN_ID || input.protocolId !== 'venus-core-bnb') {
    throw new Error('Expected BNB Chain Venus Core Pool');
  }
  const collateralMarket = venusCoreMarketForSymbol(input.collateralSymbol);
  const loanMarket = venusCoreMarketForSymbol(input.loanSymbol);
  if (!collateralMarket || !loanMarket) {
    throw new Error('Declared assets are outside the reviewed Venus Core Pool market set');
  }
  const readMarket = async (market: `0x${string}`) => {
    const data = encodeFunctionData({
      abi: COMPTROLLER_ABI,
      functionName: 'markets',
      args: [market],
    });
    const result = await readContract(BNB_CHAIN_ID, VENUS_CORE_POOL_COMPTROLLER, data);
    return decodeFunctionResult({
      abi: COMPTROLLER_ABI,
      functionName: 'markets',
      data: result as `0x${string}`,
    }) as readonly [boolean, bigint, boolean];
  };
  const [[collateralListed, collateralFactor], [loanListed]] = await Promise.all([
    readMarket(collateralMarket),
    readMarket(loanMarket),
  ]);
  if (!collateralListed || !loanListed)
    throw new Error('Venus Core Pool market is no longer listed');
  const maxLtv = Number(collateralFactor) / 1e18;
  if (!(maxLtv > 0 && maxLtv < 1)) {
    throw new Error('Venus collateral market returned an invalid live collateral factor');
  }
  // Venus Core Pool uses the Comptroller's collateral factor for its direct
  // borrow capacity.  The guard labels this explicitly instead of inventing a
  // separate liquidation threshold the contract does not expose per market.
  return {
    maxLtv,
    liquidationLtv: maxLtv,
    source: 'venus-live',
    oracleAddress: null,
    marketId: null,
    marketAddress: null,
    collateralVaultAddress: null,
    collateralMarketId: null,
    loanMarketId: null,
    accountNumber: null,
  };
}

async function readDecoded<T>(
  chainId: MultichainEvmLendingChainId,
  to: `0x${string}`,
  abi: readonly unknown[],
  functionName: string,
  args: readonly unknown[] = []
): Promise<T> {
  const data = encodeFunctionData({ abi, functionName, args });
  const response = await readContract(chainId, to, data);
  return decodeFunctionResult({
    abi,
    functionName,
    data: response as `0x${string}`,
  }) as T;
}

/** Compound's direct `withdraw(baseToken)` is its borrow primitive. */
async function resolveCompoundV3Risk(
  input: MultichainEvmLendingGuardInput
): Promise<RiskParameters> {
  if (!isCompoundV3EvmProtocolId(input.protocolId) || input.chainId !== ARBITRUM_CHAIN_ID) {
    throw new Error('Expected the reviewed Compound V3 Arbitrum Comet');
  }
  const collateralAsset = compoundV3ArbitrumAssetForSymbol(input.collateralSymbol);
  const loanAsset = compoundV3ArbitrumAssetForSymbol(input.loanSymbol);
  if (!collateralAsset || loanAsset?.toLowerCase() !== COMPOUND_V3_ARBITRUM_USDC) {
    throw new Error('Compound V3 Arbitrum supports only reviewed collateral and native-USDC debt');
  }
  const [baseToken, baseTokenPriceFeed] = await Promise.all([
    readDecoded<`0x${string}`>(
      ARBITRUM_CHAIN_ID,
      COMPOUND_V3_ARBITRUM_COMET,
      COMPOUND_COMET_ABI,
      'baseToken'
    ),
    readDecoded<`0x${string}`>(
      ARBITRUM_CHAIN_ID,
      COMPOUND_V3_ARBITRUM_COMET,
      COMPOUND_COMET_ABI,
      'baseTokenPriceFeed'
    ),
  ]);
  if (lowerAddress(baseToken) !== COMPOUND_V3_ARBITRUM_USDC) {
    throw new Error('Compound V3 Arbitrum Comet base token no longer matches native USDC');
  }
  if (lowerAddress(collateralAsset) === COMPOUND_V3_ARBITRUM_USDC) {
    if (input.action !== 'supply' || input.debtValueUsd !== 0) {
      throw new Error('Compound base-asset supply is supported only for an unlevered position');
    }
    return {
      maxLtv: 1,
      liquidationLtv: 1,
      source: 'compound-comet',
      oracleAddress: lowerAddress(baseTokenPriceFeed),
      marketId: null,
      marketAddress: null,
      collateralVaultAddress: null,
      collateralMarketId: null,
      loanMarketId: null,
      accountNumber: null,
    };
  }
  const assetInfo = await readDecoded<{
    asset: `0x${string}`;
    priceFeed: `0x${string}`;
    borrowCollateralFactor: bigint;
    liquidateCollateralFactor: bigint;
  }>(ARBITRUM_CHAIN_ID, COMPOUND_V3_ARBITRUM_COMET, COMPOUND_COMET_ABI, 'getAssetInfoByAddress', [
    collateralAsset,
  ]);
  if (lowerAddress(assetInfo.asset) !== lowerAddress(collateralAsset)) {
    throw new Error('Compound Comet asset configuration did not match declared collateral');
  }
  const maxLtv = Number(assetInfo.borrowCollateralFactor) / 1e18;
  const liquidationLtv = Number(assetInfo.liquidateCollateralFactor) / 1e18;
  if (!(maxLtv > 0 && maxLtv < 1 && liquidationLtv >= maxLtv && liquidationLtv <= 1)) {
    throw new Error('Compound Comet returned invalid live collateral factors');
  }
  return {
    maxLtv,
    liquidationLtv,
    source: 'compound-comet',
    oracleAddress: lowerAddress(assetInfo.priceFeed),
    marketId: null,
    marketAddress: null,
    collateralVaultAddress: null,
    collateralMarketId: null,
    loanMarketId: null,
    accountNumber: null,
  };
}

async function resolveIsolatedMarketRisk(
  input: MultichainEvmLendingGuardInput
): Promise<RiskParameters> {
  const isMorpho = isMorphoBlueEvmProtocolId(input.protocolId);
  const isLista = isListaMoolahProtocolId(input.protocolId);
  if ((!isMorpho && !isLista) || !input.marketId) {
    throw new Error('Expected an isolated-market protocol with a marketId');
  }
  const chainId = lendingProtocolChainId(input.protocolId);
  const target = isMorpho
    ? morphoBlueEvmMarket(input.protocolId as 'morpho-blue-polygon' | 'morpho-blue-arbitrum').morpho
    : LISTA_MOOLAH_BNB;
  const params = await readDecoded<{
    loanToken: `0x${string}`;
    collateralToken: `0x${string}`;
    oracle: `0x${string}`;
    irm: `0x${string}`;
    lltv: bigint;
  }>(chainId, target, MORPHO_STYLE_ABI, 'idToMarketParams', [input.marketId]);
  if (
    /^0x0{40}$/i.test(params.loanToken) ||
    /^0x0{40}$/i.test(params.collateralToken) ||
    /^0x0{40}$/i.test(params.oracle)
  ) {
    throw new Error('Isolated market is absent or has invalid immutable parameters');
  }
  const [loanSymbol, collateralSymbol] = await Promise.all([
    readDecoded<string>(chainId, lowerAddress(params.loanToken), ERC20_SYMBOL_ABI, 'symbol'),
    readDecoded<string>(chainId, lowerAddress(params.collateralToken), ERC20_SYMBOL_ABI, 'symbol'),
  ]);
  if (
    oracleSymbol(loanSymbol) !== oracleSymbol(input.loanSymbol) ||
    oracleSymbol(collateralSymbol) !== oracleSymbol(input.collateralSymbol)
  ) {
    throw new Error('Declared assets do not match the immutable isolated market parameters');
  }
  const lltv = Number(params.lltv) / 1e18;
  if (!(lltv > 0 && lltv < 1)) throw new Error('Isolated market returned an invalid LLTV');
  return {
    maxLtv: lltv,
    liquidationLtv: lltv,
    source: isLista ? 'lista-moolah-market' : 'morpho-market',
    oracleAddress: lowerAddress(params.oracle),
    marketId: input.marketId.toLowerCase() as `0x${string}`,
    marketAddress: null,
    collateralVaultAddress: null,
    collateralMarketId: null,
    loanMarketId: null,
    accountNumber: null,
  };
}

/**
 * Euler EVaults are permissionless. A familiar ERC-4626 selector alone is
 * therefore never enough: validate the selected proxy against Euler's
 * canonical factory, its EVC wiring, and the live underlying token. Direct
 * borrowing is accepted only via the exact four-step EVC profile decoded by
 * the action layer (enable collateral, deposit, enable controller, borrow).
 */
async function resolveEulerV2Risk(input: MultichainEvmLendingGuardInput): Promise<RiskParameters> {
  if (!isEulerV2EvmProtocolId(input.protocolId) || !input.marketAddress) {
    throw new Error('Expected a reviewed Euler v2 EVault address');
  }
  const market = eulerV2EvmMarket(input.protocolId);
  const vault = lowerAddress(input.marketAddress);
  const verifyVault = async (candidate: `0x${string}`) => {
    const [isProxy, asset, evc] = await Promise.all([
      readDecoded<boolean>(input.chainId, market.eVaultFactory, EULER_V2_FACTORY_ABI, 'isProxy', [
        candidate,
      ]),
      readDecoded<`0x${string}`>(input.chainId, candidate, EULER_V2_EVAULT_VIEW_ABI, 'asset'),
      readDecoded<`0x${string}`>(input.chainId, candidate, EULER_V2_EVAULT_VIEW_ABI, 'EVC'),
    ]);
    if (!isProxy)
      throw new Error('Selected Euler EVault is not a proxy from the canonical factory');
    if (lowerAddress(evc) !== lowerAddress(market.evc)) {
      throw new Error('Selected Euler EVault is wired to an unexpected EVC deployment');
    }
    return lowerAddress(asset);
  };
  const asset = await verifyVault(vault);
  const symbol = await readDecoded<string>(input.chainId, asset, ERC20_SYMBOL_ABI, 'symbol');
  if (input.action === 'supply') {
    if (
      input.debtValueUsd !== 0 ||
      oracleSymbol(input.collateralSymbol) !== oracleSymbol(input.loanSymbol)
    ) {
      throw new Error(
        'Euler direct supply profile is restricted to an unlevered single-asset position'
      );
    }
    if (oracleSymbol(symbol) !== oracleSymbol(input.collateralSymbol)) {
      throw new Error('Selected Euler EVault asset does not match the declared supply asset');
    }
    return {
      maxLtv: 1,
      liquidationLtv: 1,
      source: 'euler-evault',
      oracleAddress: null,
      marketId: null,
      marketAddress: vault,
      collateralVaultAddress: null,
      collateralMarketId: null,
      loanMarketId: null,
      accountNumber: null,
    };
  }
  if (!input.collateralVaultAddress) {
    throw new Error('Euler EVC borrow requires an explicit collateral EVault');
  }
  const collateralVault = lowerAddress(input.collateralVaultAddress);
  const collateralAsset = await verifyVault(collateralVault);
  const collateralSymbol = await readDecoded<string>(
    input.chainId,
    collateralAsset,
    ERC20_SYMBOL_ABI,
    'symbol'
  );
  if (
    oracleSymbol(symbol) !== oracleSymbol(input.loanSymbol) ||
    oracleSymbol(collateralSymbol) !== oracleSymbol(input.collateralSymbol)
  ) {
    throw new Error('Euler borrow or collateral EVault asset does not match the declared market');
  }
  const [ltv, oracle] = await Promise.all([
    readDecoded<readonly [bigint, bigint, bigint, bigint, bigint]>(
      input.chainId,
      vault,
      EULER_V2_EVAULT_VIEW_ABI,
      'LTVFull',
      [collateralVault]
    ),
    readDecoded<`0x${string}`>(input.chainId, vault, EULER_V2_EVAULT_VIEW_ABI, 'oracle'),
  ]);
  const maxLtv = Number(ltv[0]) / 10_000;
  const liquidationLtv = Number(ltv[1]) / 10_000;
  if (!(maxLtv > 0 && maxLtv < 1 && liquidationLtv >= maxLtv && liquidationLtv <= 1)) {
    throw new Error('Euler borrow EVault returned invalid collateral LTV controls');
  }
  if (/^0x0{40}$/i.test(oracle)) throw new Error('Euler borrow EVault returned a zero oracle');
  return {
    maxLtv,
    liquidationLtv,
    source: 'euler-evault',
    oracleAddress: lowerAddress(oracle),
    marketId: null,
    marketAddress: vault,
    collateralVaultAddress: collateralVault,
    collateralMarketId: null,
    loanMarketId: null,
    accountNumber: null,
  };
}

/**
 * Dolomite's single engine stores live market premiums and a global margin
 * ratio. A healthy position needs adjusted collateral / adjusted debt to be
 * at least `1 + marginRatio`; premiums reduce collateral and increase debt.
 */
async function resolveDolomiteRisk(input: MultichainEvmLendingGuardInput): Promise<RiskParameters> {
  if (
    !isDolomiteProtocolId(input.protocolId) ||
    input.chainId !== ARBITRUM_CHAIN_ID ||
    !input.collateralMarketId ||
    !input.loanMarketId ||
    input.accountNumber === undefined
  ) {
    throw new Error('Expected a fully scoped Dolomite Arbitrum position');
  }
  const collateralMarketId = BigInt(input.collateralMarketId);
  const loanMarketId = BigInt(input.loanMarketId);
  const [
    collateralToken,
    loanToken,
    loanClosing,
    collateralPremiumRaw,
    loanPremiumRaw,
    marginRaw,
    collateralOracle,
  ] = await Promise.all([
    readDecoded<`0x${string}`>(
      ARBITRUM_CHAIN_ID,
      DOLOMITE_ARBITRUM_MARGIN,
      DOLOMITE_MARGIN_VIEW_ABI,
      'getMarketTokenAddress',
      [collateralMarketId]
    ),
    readDecoded<`0x${string}`>(
      ARBITRUM_CHAIN_ID,
      DOLOMITE_ARBITRUM_MARGIN,
      DOLOMITE_MARGIN_VIEW_ABI,
      'getMarketTokenAddress',
      [loanMarketId]
    ),
    readDecoded<boolean>(
      ARBITRUM_CHAIN_ID,
      DOLOMITE_ARBITRUM_MARGIN,
      DOLOMITE_MARGIN_VIEW_ABI,
      'getMarketIsClosing',
      [loanMarketId]
    ),
    readDecoded<unknown>(
      ARBITRUM_CHAIN_ID,
      DOLOMITE_ARBITRUM_MARGIN,
      DOLOMITE_MARGIN_VIEW_ABI,
      'getMarketMarginPremium',
      [collateralMarketId]
    ),
    readDecoded<unknown>(
      ARBITRUM_CHAIN_ID,
      DOLOMITE_ARBITRUM_MARGIN,
      DOLOMITE_MARGIN_VIEW_ABI,
      'getMarketMarginPremium',
      [loanMarketId]
    ),
    readDecoded<unknown>(
      ARBITRUM_CHAIN_ID,
      DOLOMITE_ARBITRUM_MARGIN,
      DOLOMITE_MARGIN_VIEW_ABI,
      'getMarginRatio'
    ),
    readDecoded<`0x${string}`>(
      ARBITRUM_CHAIN_ID,
      DOLOMITE_ARBITRUM_MARGIN,
      DOLOMITE_MARGIN_VIEW_ABI,
      'getMarketPriceOracle',
      [collateralMarketId]
    ),
  ]);
  const [collateralSymbol, loanSymbol] = await Promise.all([
    readDecoded<string>(
      ARBITRUM_CHAIN_ID,
      lowerAddress(collateralToken),
      ERC20_SYMBOL_ABI,
      'symbol'
    ),
    readDecoded<string>(ARBITRUM_CHAIN_ID, lowerAddress(loanToken), ERC20_SYMBOL_ABI, 'symbol'),
  ]);
  if (
    oracleSymbol(collateralSymbol) !== oracleSymbol(input.collateralSymbol) ||
    oracleSymbol(loanSymbol) !== oracleSymbol(input.loanSymbol)
  ) {
    throw new Error('Declared assets do not match the selected live Dolomite markets');
  }
  if (input.action === 'borrow' && loanClosing) {
    throw new Error('Dolomite loan market is in closing mode and cannot accept a new borrow');
  }
  if (/^0x0{40}$/i.test(collateralOracle)) {
    throw new Error('Dolomite collateral market has a zero price oracle');
  }
  const unit = 1_000_000_000_000_000_000n;
  const denominator =
    (unit + decimalValue(marginRaw)) *
    (unit + decimalValue(collateralPremiumRaw)) *
    (unit + decimalValue(loanPremiumRaw));
  if (denominator <= 0n) throw new Error('Dolomite returned invalid margin controls');
  const maxLtv = Number((unit * unit * unit * 1_000_000n) / denominator) / 1_000_000;
  if (!(maxLtv > 0 && maxLtv < 1)) {
    throw new Error('Dolomite returned an invalid effective LTV threshold');
  }
  return {
    maxLtv,
    liquidationLtv: maxLtv,
    source: 'dolomite-live',
    oracleAddress: lowerAddress(collateralOracle),
    marketId: null,
    marketAddress: null,
    collateralVaultAddress: null,
    collateralMarketId: input.collateralMarketId,
    loanMarketId: input.loanMarketId,
    accountNumber: input.accountNumber,
  };
}

/**
 * Fluid's public vault factory is the trust anchor. The admitted T1 action
 * adds collateral only and creates no debt, so it is safe to model as an
 * unlevered position only after authenticating the vault and supply token.
 */
async function resolveFluidVaultT1Risk(
  input: MultichainEvmLendingGuardInput
): Promise<RiskParameters> {
  if (!isFluidVaultT1ProtocolId(input.protocolId) || !input.marketAddress) {
    throw new Error('Expected a reviewed Fluid T1 vault address');
  }
  if (input.action !== 'supply' || input.debtValueUsd !== 0) {
    throw new Error('Fluid T1 profile only permits an unlevered collateral supply');
  }
  const market = fluidVaultT1EvmMarket(input.protocolId);
  const vault = lowerAddress(input.marketAddress);
  const [isVault, vaultFactory, constants] = await Promise.all([
    readDecoded<boolean>(input.chainId, market.vaultFactory, FLUID_VAULT_FACTORY_ABI, 'isVault', [
      vault,
    ]),
    readDecoded<`0x${string}`>(input.chainId, vault, FLUID_VAULT_T1_VIEW_ABI, 'VAULT_FACTORY'),
    readDecoded<{
      factory: `0x${string}`;
      supplyToken: `0x${string}`;
      borrowToken: `0x${string}`;
    }>(input.chainId, vault, FLUID_VAULT_T1_VIEW_ABI, 'constantsView'),
  ]);
  if (
    !isVault ||
    lowerAddress(vaultFactory) !== lowerAddress(market.vaultFactory) ||
    lowerAddress(constants.factory) !== lowerAddress(market.vaultFactory)
  ) {
    throw new Error('Selected Fluid vault is not a T1 vault registered by the canonical factory');
  }
  if (/^0x0{40}$/i.test(constants.supplyToken) || /^0x0{40}$/i.test(constants.borrowToken)) {
    throw new Error('Fluid T1 vault returned an invalid collateral or borrow token');
  }
  const [supplySymbol, borrowSymbol] = await Promise.all([
    readDecoded<string>(
      input.chainId,
      lowerAddress(constants.supplyToken),
      ERC20_SYMBOL_ABI,
      'symbol'
    ),
    readDecoded<string>(
      input.chainId,
      lowerAddress(constants.borrowToken),
      ERC20_SYMBOL_ABI,
      'symbol'
    ),
  ]);
  if (
    oracleSymbol(supplySymbol) !== oracleSymbol(input.collateralSymbol) ||
    oracleSymbol(borrowSymbol) !== oracleSymbol(input.loanSymbol)
  ) {
    throw new Error('Declared assets do not match the selected live Fluid T1 vault');
  }
  return {
    maxLtv: 1,
    liquidationLtv: 1,
    source: 'fluid-vault-t1',
    oracleAddress: null,
    marketId: null,
    marketAddress: vault,
    collateralVaultAddress: null,
    collateralMarketId: null,
    loanMarketId: null,
    accountNumber: null,
  };
}

export interface MultichainEvmLendingGuardDependencies {
  checkOracle?: typeof preTradeSafetyCheck;
  resolveAaveRisk?: (input: MultichainEvmLendingGuardInput) => Promise<RiskParameters>;
  resolveVenusRisk?: (input: MultichainEvmLendingGuardInput) => Promise<RiskParameters>;
  resolveCompoundV3Risk?: (input: MultichainEvmLendingGuardInput) => Promise<RiskParameters>;
  resolveIsolatedMarketRisk?: (input: MultichainEvmLendingGuardInput) => Promise<RiskParameters>;
  resolveEulerV2Risk?: (input: MultichainEvmLendingGuardInput) => Promise<RiskParameters>;
  resolveDolomiteRisk?: (input: MultichainEvmLendingGuardInput) => Promise<RiskParameters>;
  resolveFluidVaultT1Risk?: (input: MultichainEvmLendingGuardInput) => Promise<RiskParameters>;
  now?: () => Date;
}

/** Evaluate the declared post-action position without receiving execution authority. */
export async function assessMultichainEvmLendingGuard(
  rawInput: MultichainEvmLendingGuardInput,
  dependencies: MultichainEvmLendingGuardDependencies = {}
): Promise<MultichainEvmLendingGuardResult> {
  const input = MultichainEvmLendingGuardInputSchema.parse(rawInput);
  const reasons: string[] = [];
  let risk: RiskParameters;
  try {
    if (isAaveV3EvmProtocolId(input.protocolId)) {
      risk = await (dependencies.resolveAaveRisk ?? resolveAaveRisk)(input);
    } else if (isCompoundV3EvmProtocolId(input.protocolId)) {
      risk = await (dependencies.resolveCompoundV3Risk ?? resolveCompoundV3Risk)(input);
    } else if (
      isMorphoBlueEvmProtocolId(input.protocolId) ||
      isListaMoolahProtocolId(input.protocolId)
    ) {
      risk = await (dependencies.resolveIsolatedMarketRisk ?? resolveIsolatedMarketRisk)(input);
    } else if (isEulerV2EvmProtocolId(input.protocolId)) {
      risk = await (dependencies.resolveEulerV2Risk ?? resolveEulerV2Risk)(input);
    } else if (isDolomiteProtocolId(input.protocolId)) {
      risk = await (dependencies.resolveDolomiteRisk ?? resolveDolomiteRisk)(input);
    } else if (isFluidVaultT1ProtocolId(input.protocolId)) {
      risk = await (dependencies.resolveFluidVaultT1Risk ?? resolveFluidVaultT1Risk)(input);
    } else {
      risk = await (dependencies.resolveVenusRisk ?? resolveVenusRisk)(input);
    }
  } catch (error) {
    risk = {
      maxLtv: 0,
      liquidationLtv: 0,
      source: 'unavailable',
      oracleAddress: null,
      marketId: null,
      marketAddress: null,
      collateralVaultAddress: null,
      collateralMarketId: null,
      loanMarketId: null,
      accountNumber: null,
    };
    reasons.push(
      `Live protocol risk parameters are unavailable or inconsistent: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  const checkOracle = dependencies.checkOracle ?? preTradeSafetyCheck;
  const [collateralResult, loanResult] = await Promise.all([
    checkOracle({
      asset: oracleSymbol(input.collateralSymbol),
      chainId: input.chainId,
      action: input.action === 'borrow' ? 'borrow' : 'lend',
      tradeAmountUsd: input.collateralValueUsd,
      schemaVersion: 3,
    }),
    checkOracle({
      asset: oracleSymbol(input.loanSymbol),
      chainId: input.chainId,
      action: input.action === 'borrow' ? 'borrow' : 'lend',
      tradeAmountUsd: Math.max(input.debtValueUsd, 1),
      schemaVersion: 3,
    }),
  ]);
  const ltv = input.debtValueUsd / input.collateralValueUsd;
  const liquidationBufferPct =
    risk.liquidationLtv > 0 ? Math.max(0, (1 - ltv / risk.liquidationLtv) * 100) : 0;
  const conservativeMaxDebtUsd = input.collateralValueUsd * risk.maxLtv * 0.9;
  let verdict: MultichainEvmLendingGuardVerdict = 'ALLOW';
  if (risk.source === 'unavailable') {
    verdict = 'BLOCK';
    reasons.push('The guard fails closed without consistent live lending parameters.');
  }
  if (blocksOracle(collateralResult.verdict) || blocksOracle(loanResult.verdict)) {
    verdict = 'BLOCK';
    reasons.push('At least one collateral or loan oracle assessment is DANGER or BLOCK.');
  }
  if (risk.liquidationLtv > 0 && ltv >= risk.liquidationLtv) {
    verdict = 'BLOCK';
    reasons.push('Declared post-action LTV is at or above the protocol risk threshold.');
  } else if (risk.maxLtv > 0 && ltv >= risk.maxLtv * 0.9 && verdict !== 'BLOCK') {
    verdict = 'CAUTION';
    reasons.push('Declared post-action LTV consumes at least 90% of the live maximum LTV.');
  }
  if (
    (collateralResult.verdict === 'CAUTION' || loanResult.verdict === 'CAUTION') &&
    verdict !== 'BLOCK'
  ) {
    verdict = 'CAUTION';
    reasons.push('At least one oracle assessment requires review before execution.');
  }
  if (reasons.length === 0) {
    reasons.push(
      'Oracle checks passed and declared post-action LTV remains below the conservative guard band.'
    );
  }
  return {
    schema: 'insight.multichain-evm-lending-guard.v1',
    verdict,
    chainId: input.chainId,
    protocolId: input.protocolId,
    action: input.action,
    evaluatedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
    scope: {
      chainId: input.chainId,
      transactionAuthority: 'none',
      valuation: 'caller_declared_post_action_usd',
    },
    market: {
      marketId: risk.marketId,
      marketAddress: risk.marketAddress,
      collateralVaultAddress: risk.collateralVaultAddress,
      collateralMarketId: risk.collateralMarketId,
      loanMarketId: risk.loanMarketId,
      accountNumber: risk.accountNumber,
      collateralSymbol: input.collateralSymbol,
      loanSymbol: input.loanSymbol,
      maxLtv: risk.maxLtv,
      liquidationLtv: risk.liquidationLtv,
      parameterSource: risk.source,
      oracleAddress: risk.oracleAddress,
    },
    projected: {
      collateralValueUsd: input.collateralValueUsd,
      debtValueUsd: input.debtValueUsd,
      ltv,
      liquidationBufferPct,
      conservativeMaxDebtUsd,
    },
    oracleChecks: { collateral: summarize(collateralResult), loan: summarize(loanResult) },
    reasons,
    next: {
      execution: 'not_performed',
      priorSeal: 'Bind this decision to an exact, user-authorized transaction before execution.',
    },
  };
}

export type {
  MultichainEvmLendingAction,
  MultichainEvmLendingChainId,
  MultichainEvmLendingExactTransaction,
  MultichainEvmLendingProtocolId,
};
