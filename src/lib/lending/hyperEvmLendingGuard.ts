/**
 * Read-only HyperEVM lending decision gate for the reviewed HyperLend Core
 * deployment. It evaluates caller-declared post-action USD values against live
 * protocol controls and independent oracle safety evidence. It never
 * constructs, signs, submits, or authorizes a transaction.
 */

import { decodeFunctionResult, encodeFunctionData } from 'viem';
import { z } from 'zod';

import {
  preTradeSafetyCheck,
  type PreTradeSafetyResult,
} from '@/lib/api/services/preTradeSafetyService';
import { readContract } from '@/lib/protocols/importer/rpcClient';

import {
  HyperEvmLendingExactTransactionSchema,
  HyperEvmLendingProtocolIdSchema,
  type HyperEvmLendingProtocolId,
} from './hyperEvmLendingAction';
import {
  HYPEREVM_CHAIN_ID,
  HYPERLEND_CORE_POOL_ADDRESSES_PROVIDER,
  HYPERLEND_CORE_UI_POOL_DATA_PROVIDER,
  hyperLendOracleSymbol,
  hyperLendUnderlyingForSymbol,
} from './hyperEvmLendingProtocols';

export const HyperEvmLendingGuardInputSchema = z.object({
  protocolId: HyperEvmLendingProtocolIdSchema,
  action: z.enum(['supply', 'borrow']),
  collateralSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
  loanSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
  collateralValueUsd: z.number().finite().positive().max(1_000_000_000_000),
  debtValueUsd: z.number().finite().min(0).max(1_000_000_000_000),
});

export type HyperEvmLendingGuardInput = z.infer<typeof HyperEvmLendingGuardInputSchema>;
export type HyperEvmLendingGuardVerdict = 'ALLOW' | 'CAUTION' | 'BLOCK';

export const HyperEvmLendingGuardExactInputSchema = z
  .object({
    guard: HyperEvmLendingGuardInputSchema,
    transaction: HyperEvmLendingExactTransactionSchema,
  })
  .strict();
export type HyperEvmLendingGuardExactInput = z.infer<typeof HyperEvmLendingGuardExactInputSchema>;

type RiskSource = 'hyperlend-live' | 'unavailable';
interface RiskParameters {
  maxLtv: number;
  liquidationLtv: number;
  source: RiskSource;
  oracleAddress?: `0x${string}`;
}
interface OracleCheckSummary {
  verdict: PreTradeSafetyResult['verdict'];
  maxDeviationPct: number;
  staleDataRisk: boolean;
  participantCount: number;
  attestationUid: string | null;
  attester: string | null;
}

export interface HyperEvmLendingGuardResult {
  schema: 'insight.hyperevm-lending-guard.v1';
  verdict: HyperEvmLendingGuardVerdict;
  protocolId: HyperEvmLendingProtocolId;
  action: 'supply' | 'borrow';
  evaluatedAt: string;
  scope: {
    chainId: typeof HYPEREVM_CHAIN_ID;
    transactionAuthority: 'none';
    valuation: 'caller_declared_post_action_usd';
  };
  market: {
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

function address(value: string): `0x${string}` {
  return value.toLowerCase() as `0x${string}`;
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
function blocksOracle(verdict: PreTradeSafetyResult['verdict']): boolean {
  return verdict === 'DANGER' || verdict === 'BLOCK';
}

async function readDecoded<T>(
  to: `0x${string}`,
  abi: readonly unknown[],
  functionName: string,
  args: readonly unknown[] = []
): Promise<T> {
  const data = encodeFunctionData({ abi, functionName, args });
  const response = await readContract(HYPEREVM_CHAIN_ID, to, data);
  return decodeFunctionResult({ abi, functionName, data: response as `0x${string}` }) as T;
}

/**
 * HyperLend's deployed UiPoolDataProvider returns an AggregatedReserveData
 * struct whose head matches HyperLend's published SDK ABI
 * (hyperlendx/hyperlend-sdk-ts core/abi/UiPoolDataProviderV3ABI.json) but
 * whose tail diverged from that snapshot when the contract was upgraded. The
 * fields below therefore stop at `priceOracle`: every head field was verified
 * against live chain-999 data on 2026-11-10 (hToken / variableDebtToken /
 * interestRateStrategy / priceOracle addresses and LTV bps all matched the
 * official deployment references). ABI decoding ignores trailing bytes, so
 * the diverged tail is simply never read. The struct has no isPaused field in
 * its verified head; paused/frozen states are covered by the isActive and
 * isFrozen checks, which fail closed.
 */
export const HYPERLEND_UI_POOL_DATA_PROVIDER_HEAD_ABI = [
  {
    type: 'function',
    name: 'getReservesData',
    stateMutability: 'view',
    inputs: [{ name: 'poolAddressesProvider', type: 'address' }],
    outputs: [
      {
        name: 'reserves',
        type: 'tuple[]',
        components: [
          { name: 'underlyingAsset', type: 'address' },
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'decimals', type: 'uint256' },
          { name: 'baseLTVasCollateral', type: 'uint256' },
          { name: 'reserveLiquidationThreshold', type: 'uint256' },
          { name: 'reserveLiquidationBonus', type: 'uint256' },
          { name: 'reserveFactor', type: 'uint256' },
          { name: 'usageAsCollateralEnabled', type: 'bool' },
          { name: 'borrowingEnabled', type: 'bool' },
          { name: 'isActive', type: 'bool' },
          { name: 'isFrozen', type: 'bool' },
          { name: 'liquidityIndex', type: 'uint128' },
          { name: 'variableBorrowIndex', type: 'uint128' },
          { name: 'liquidityRate', type: 'uint128' },
          { name: 'variableBorrowRate', type: 'uint128' },
          { name: 'lastUpdateTimestamp', type: 'uint40' },
          { name: 'aTokenAddress', type: 'address' },
          { name: 'variableDebtTokenAddress', type: 'address' },
          { name: 'interestRateStrategyAddress', type: 'address' },
          { name: 'availableLiquidity', type: 'uint256' },
          { name: 'totalScaledVariableDebt', type: 'uint256' },
          { name: 'priceInMarketReferenceCurrency', type: 'uint256' },
          { name: 'priceOracle', type: 'address' },
        ],
      },
      {
        name: 'baseCurrency',
        type: 'tuple',
        components: [
          { name: 'marketReferenceCurrencyUnit', type: 'uint256' },
          { name: 'marketReferenceCurrencyPriceInUsd', type: 'int256' },
          { name: 'networkBaseTokenPriceInUsd', type: 'int256' },
          { name: 'networkBaseTokenPriceDecimals', type: 'uint8' },
        ],
      },
    ],
  },
] as const;

interface HyperLendReserve {
  underlyingAsset: `0x${string}`;
  baseLTVasCollateral: bigint;
  reserveLiquidationThreshold: bigint;
  usageAsCollateralEnabled: boolean;
  borrowingEnabled: boolean;
  isActive: boolean;
  isFrozen: boolean;
  priceOracle: `0x${string}`;
}

function hyperLendReserve(value: unknown): HyperLendReserve {
  const raw = value as Record<string, unknown>;
  return {
    underlyingAsset: address(String(raw.underlyingAsset)),
    baseLTVasCollateral: BigInt(raw.baseLTVasCollateral as bigint | number | string),
    reserveLiquidationThreshold: BigInt(
      raw.reserveLiquidationThreshold as bigint | number | string
    ),
    usageAsCollateralEnabled: raw.usageAsCollateralEnabled === true,
    borrowingEnabled: raw.borrowingEnabled === true,
    isActive: raw.isActive === true,
    isFrozen: raw.isFrozen === true,
    priceOracle: address(String(raw.priceOracle)),
  };
}

async function resolveHyperLendRisk(input: HyperEvmLendingGuardInput): Promise<RiskParameters> {
  const collateralAddress = hyperLendUnderlyingForSymbol(input.collateralSymbol);
  const loanAddress = hyperLendUnderlyingForSymbol(input.loanSymbol);
  if (!collateralAddress || !loanAddress) {
    throw new Error(
      'Declared assets are outside the reviewed HyperLend Core direct-call asset set'
    );
  }
  const decoded = (await readDecoded<[readonly unknown[], unknown]>(
    HYPERLEND_CORE_UI_POOL_DATA_PROVIDER,
    HYPERLEND_UI_POOL_DATA_PROVIDER_HEAD_ABI,
    'getReservesData',
    [HYPERLEND_CORE_POOL_ADDRESSES_PROVIDER]
  )) as [readonly unknown[], unknown];
  const reserves = decoded[0];
  const byAddress = new Map(
    reserves.map((reserve) => {
      const parsed = hyperLendReserve(reserve);
      return [parsed.underlyingAsset, parsed] as const;
    })
  );
  const collateral = byAddress.get(collateralAddress);
  const loan = byAddress.get(loanAddress);
  if (!collateral || !loan)
    throw new Error('HyperLend live reserve list did not contain a reviewed declared asset');
  if (!collateral.isActive || collateral.isFrozen || !collateral.usageAsCollateralEnabled) {
    throw new Error('HyperLend collateral reserve is inactive, frozen, or not collateral-enabled');
  }
  if (!loan.isActive || loan.isFrozen || !loan.borrowingEnabled) {
    throw new Error('HyperLend loan reserve is inactive, frozen, or not borrow-enabled');
  }
  const maxLtv = Number(collateral.baseLTVasCollateral) / 10_000;
  const liquidationLtv = Number(collateral.reserveLiquidationThreshold) / 10_000;
  if (!(maxLtv > 0 && maxLtv < 1 && liquidationLtv >= maxLtv && liquidationLtv <= 1)) {
    throw new Error('HyperLend collateral reserve returned invalid live LTV parameters');
  }
  if (/^0x0{40}$/i.test(collateral.priceOracle))
    throw new Error('HyperLend reserve returned a zero oracle');
  return {
    maxLtv,
    liquidationLtv,
    source: 'hyperlend-live',
    oracleAddress: collateral.priceOracle,
  };
}

export interface HyperEvmLendingGuardDependencies {
  checkOracle?: typeof preTradeSafetyCheck;
  resolveHyperLendRisk?: (input: HyperEvmLendingGuardInput) => Promise<RiskParameters>;
  now?: () => Date;
}

/** Assess the HyperEVM position proposal without any transaction authority. */
export async function assessHyperEvmLendingGuard(
  rawInput: HyperEvmLendingGuardInput,
  dependencies: HyperEvmLendingGuardDependencies = {}
): Promise<HyperEvmLendingGuardResult> {
  const input = HyperEvmLendingGuardInputSchema.parse(rawInput);
  const checkOracle = dependencies.checkOracle ?? preTradeSafetyCheck;
  const reasons: string[] = [];
  let risk: RiskParameters;
  try {
    risk = await (dependencies.resolveHyperLendRisk ?? resolveHyperLendRisk)(input);
  } catch (error) {
    risk = { maxLtv: 0, liquidationLtv: 0, source: 'unavailable' };
    reasons.push(
      `Live protocol risk parameters are unavailable or inconsistent: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const [collateralResult, loanResult] = await Promise.all([
    checkOracle({
      asset: hyperLendOracleSymbol(input.collateralSymbol),
      chainId: HYPEREVM_CHAIN_ID,
      action: input.action === 'borrow' ? 'borrow' : 'lend',
      tradeAmountUsd: input.collateralValueUsd,
      // The lending adapter reads protocol controls directly below. Do not ask
      // the generic oracle layer for a registry-based protocol context here:
      // a static fallback would be less authoritative than the live read.
      schemaVersion: 3,
    }),
    checkOracle({
      asset: hyperLendOracleSymbol(input.loanSymbol),
      chainId: HYPEREVM_CHAIN_ID,
      action: input.action === 'borrow' ? 'borrow' : 'lend',
      tradeAmountUsd: Math.max(input.debtValueUsd, 1),
      schemaVersion: 3,
    }),
  ]);
  const ltv = input.debtValueUsd / input.collateralValueUsd;
  const liquidationBufferPct =
    risk.liquidationLtv > 0 ? Math.max(0, (1 - ltv / risk.liquidationLtv) * 100) : 0;
  const conservativeMaxDebtUsd = input.collateralValueUsd * risk.maxLtv * 0.9;
  let verdict: HyperEvmLendingGuardVerdict = 'ALLOW';
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
    reasons.push('Declared post-action LTV is at or above the protocol liquidation threshold.');
  } else if (risk.maxLtv > 0 && ltv >= risk.maxLtv * 0.9 && verdict !== 'BLOCK') {
    verdict = 'CAUTION';
    reasons.push('Declared post-action LTV consumes at least 90% of the protocol maximum LTV.');
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
    schema: 'insight.hyperevm-lending-guard.v1',
    verdict,
    protocolId: input.protocolId,
    action: input.action,
    evaluatedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
    scope: {
      chainId: HYPEREVM_CHAIN_ID,
      transactionAuthority: 'none',
      valuation: 'caller_declared_post_action_usd',
    },
    market: {
      collateralSymbol: input.collateralSymbol,
      loanSymbol: input.loanSymbol,
      maxLtv: risk.maxLtv,
      liquidationLtv: risk.liquidationLtv,
      parameterSource: risk.source,
      oracleAddress: risk.oracleAddress ?? null,
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
