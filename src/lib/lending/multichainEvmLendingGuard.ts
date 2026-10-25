/**
 * Read-only guard for reviewed Aave V3 and Venus Core Pool deployments on
 * Polygon, Arbitrum and BNB Chain.  It does not submit, relay, or authorize a
 * transaction.  Protocol controls are read at decision time and failures
 * close the decision rather than falling back to registry estimates.
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
  isAaveV3EvmProtocolId,
  venusCoreMarketForSymbol,
} from './multichainEvmLendingProtocols';
import {
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
  })
  .superRefine((value, context) => {
    const expectedChain =
      value.protocolId === 'aave-v3-polygon'
        ? 137
        : value.protocolId === 'aave-v3-arbitrum'
          ? 42161
          : 56;
    if (value.chainId !== expectedChain) {
      context.addIssue({
        code: 'custom',
        path: ['chainId'],
        message: 'chainId does not match the reviewed lending deployment',
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
type RiskSource = 'aave-live' | 'venus-live' | 'unavailable';
interface RiskParameters {
  maxLtv: number;
  liquidationLtv: number;
  source: RiskSource;
  oracleAddress: `0x${string}` | null;
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
  return { maxLtv, liquidationLtv, source: 'aave-live', oracleAddress: collateral.priceOracle };
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
  return { maxLtv, liquidationLtv: maxLtv, source: 'venus-live', oracleAddress: null };
}

export interface MultichainEvmLendingGuardDependencies {
  checkOracle?: typeof preTradeSafetyCheck;
  resolveAaveRisk?: (input: MultichainEvmLendingGuardInput) => Promise<RiskParameters>;
  resolveVenusRisk?: (input: MultichainEvmLendingGuardInput) => Promise<RiskParameters>;
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
    risk = isAaveV3EvmProtocolId(input.protocolId)
      ? await (dependencies.resolveAaveRisk ?? resolveAaveRisk)(input)
      : await (dependencies.resolveVenusRisk ?? resolveVenusRisk)(input);
  } catch (error) {
    risk = { maxLtv: 0, liquidationLtv: 0, source: 'unavailable', oracleAddress: null };
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
