/**
 * Read-only Monad lending decision gate.
 *
 * It evaluates caller-declared post-action USD values against live protocol
 * controls and independent oracle safety evidence.  It never constructs,
 * signs, submits, or authorizes a transaction.
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
  MonadLendingExactTransactionSchema,
  MonadLendingProtocolIdSchema,
  type MonadLendingProtocolId,
} from './monadLendingAction';
import {
  AAVE_V3_MONAD_POOL_ADDRESSES_PROVIDER,
  AAVE_V3_MONAD_UI_POOL_DATA_PROVIDER,
  MONAD_CHAIN_ID,
  MORPHO_BLUE_MONAD,
  monadAaveUnderlyingForSymbol,
} from './monadLendingProtocols';

export const MonadLendingGuardInputSchema = z
  .object({
    protocolId: MonadLendingProtocolIdSchema,
    action: z.enum(['supply', 'borrow']),
    collateralSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    loanSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    collateralValueUsd: z.number().finite().positive().max(1_000_000_000_000),
    debtValueUsd: z.number().finite().min(0).max(1_000_000_000_000),
    marketId: z
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.protocolId === 'morpho-blue-monad' && !value.marketId) {
      context.addIssue({
        code: 'custom',
        path: ['marketId'],
        message:
          'marketId is required for Morpho Blue because every market has separate risk parameters',
      });
    }
  });

export type MonadLendingGuardInput = z.infer<typeof MonadLendingGuardInputSchema>;
export type MonadLendingGuardVerdict = 'ALLOW' | 'CAUTION' | 'BLOCK';

export const MonadLendingGuardExactInputSchema = z
  .object({ guard: MonadLendingGuardInputSchema, transaction: MonadLendingExactTransactionSchema })
  .strict();
export type MonadLendingGuardExactInput = z.infer<typeof MonadLendingGuardExactInputSchema>;

type RiskSource = 'aave-live' | 'morpho-market' | 'unavailable';
interface RiskParameters {
  maxLtv: number;
  liquidationLtv: number;
  source: RiskSource;
  oracleAddress?: `0x${string}`;
}
interface MorphoMarket {
  loanSymbol: string;
  collateralSymbol: string;
  lltv: number;
  oracle: `0x${string}`;
}
interface OracleCheckSummary {
  verdict: PreTradeSafetyResult['verdict'];
  maxDeviationPct: number;
  staleDataRisk: boolean;
  participantCount: number;
  attestationUid: string | null;
  attester: string | null;
}

export interface MonadLendingGuardResult {
  schema: 'insight.monad-lending-guard.v1';
  verdict: MonadLendingGuardVerdict;
  protocolId: MonadLendingProtocolId;
  action: 'supply' | 'borrow';
  evaluatedAt: string;
  scope: {
    chainId: 143;
    transactionAuthority: 'none';
    valuation: 'caller_declared_post_action_usd';
  };
  market: {
    marketId: string | null;
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

const MORPHO_ABI = [
  {
    type: 'function',
    name: 'idToMarketParams',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
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

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}
/** Aave's USDT0 deployment shares the live USD oracle set for USDT. */
function oracleSymbol(value: string): string {
  return normalizeSymbol(value) === 'USDT0' ? 'USDT' : value;
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
  const response = await readContract(MONAD_CHAIN_ID, to, data);
  return decodeFunctionResult({ abi, functionName, data: response as `0x${string}` }) as T;
}

async function readErc20Symbol(token: `0x${string}`): Promise<string> {
  return readDecoded<string>(token, ERC20_SYMBOL_ABI, 'symbol');
}

async function resolveMorphoMarket(marketId: string): Promise<MorphoMarket> {
  const params = await readDecoded<{
    loanToken: `0x${string}`;
    collateralToken: `0x${string}`;
    oracle: `0x${string}`;
    irm: `0x${string}`;
    lltv: bigint;
  }>(MORPHO_BLUE_MONAD, MORPHO_ABI, 'idToMarketParams', [marketId as `0x${string}`]);
  const [loanSymbol, collateralSymbol] = await Promise.all([
    readErc20Symbol(params.loanToken),
    readErc20Symbol(params.collateralToken),
  ]);
  const lltv = Number(params.lltv) / 1e18;
  if (!(lltv > 0 && lltv < 1) || /^0x0{40}$/i.test(params.oracle)) {
    throw new Error('Morpho market returned invalid live parameters');
  }
  return { loanSymbol, collateralSymbol, lltv, oracle: address(params.oracle) };
}

interface AaveReserve {
  underlyingAsset: `0x${string}`;
  baseLTVasCollateral: bigint;
  reserveLiquidationThreshold: bigint;
  usageAsCollateralEnabled: boolean;
  borrowingEnabled: boolean;
  isActive: boolean;
  isFrozen: boolean;
  isPaused: boolean;
  priceOracle: `0x${string}`;
}

function aaveReserve(value: unknown): AaveReserve {
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
    isPaused: raw.isPaused === true,
    priceOracle: address(String(raw.priceOracle)),
  };
}

async function resolveAaveRisk(input: MonadLendingGuardInput): Promise<RiskParameters> {
  const collateralAddress = monadAaveUnderlyingForSymbol(input.collateralSymbol);
  const loanAddress = monadAaveUnderlyingForSymbol(input.loanSymbol);
  if (!collateralAddress || !loanAddress) {
    throw new Error('Declared assets are outside the reviewed Aave V3 Monad direct-call asset set');
  }
  const callData = encodeFunctionData({
    abi: IUiPoolDataProvider_ABI,
    functionName: 'getReservesData',
    args: [AAVE_V3_MONAD_POOL_ADDRESSES_PROVIDER],
  });
  const raw = await readContract(MONAD_CHAIN_ID, AAVE_V3_MONAD_UI_POOL_DATA_PROVIDER, callData);
  const [reserves] = decodeFunctionResult({
    abi: IUiPoolDataProvider_ABI,
    functionName: 'getReservesData',
    data: raw as `0x${string}`,
  }) as [readonly unknown[], unknown];
  const byAddress = new Map(
    reserves.map((reserve) => {
      const parsed = aaveReserve(reserve);
      return [parsed.underlyingAsset, parsed] as const;
    })
  );
  const collateral = byAddress.get(collateralAddress);
  const loan = byAddress.get(loanAddress);
  if (!collateral || !loan)
    throw new Error('Aave live reserve list did not contain a reviewed declared asset');
  if (
    !collateral.isActive ||
    collateral.isFrozen ||
    collateral.isPaused ||
    !collateral.usageAsCollateralEnabled
  ) {
    throw new Error(
      'Aave collateral reserve is inactive, frozen, paused, or not collateral-enabled'
    );
  }
  if (!loan.isActive || loan.isFrozen || loan.isPaused || !loan.borrowingEnabled) {
    throw new Error('Aave loan reserve is inactive, frozen, paused, or not borrow-enabled');
  }
  const maxLtv = Number(collateral.baseLTVasCollateral) / 10_000;
  const liquidationLtv = Number(collateral.reserveLiquidationThreshold) / 10_000;
  if (!(maxLtv > 0 && maxLtv < 1 && liquidationLtv >= maxLtv && liquidationLtv <= 1)) {
    throw new Error('Aave collateral reserve returned invalid live LTV parameters');
  }
  if (/^0x0{40}$/i.test(collateral.priceOracle))
    throw new Error('Aave reserve returned a zero oracle');
  return { maxLtv, liquidationLtv, source: 'aave-live', oracleAddress: collateral.priceOracle };
}

export interface MonadLendingGuardDependencies {
  checkOracle?: typeof preTradeSafetyCheck;
  resolveAaveRisk?: (input: MonadLendingGuardInput) => Promise<RiskParameters>;
  resolveMorphoMarket?: (marketId: string) => Promise<MorphoMarket>;
  now?: () => Date;
}

/** Assess the Monad position proposal without any transaction authority. */
export async function assessMonadLendingGuard(
  rawInput: MonadLendingGuardInput,
  dependencies: MonadLendingGuardDependencies = {}
): Promise<MonadLendingGuardResult> {
  const input = MonadLendingGuardInputSchema.parse(rawInput);
  const checkOracle = dependencies.checkOracle ?? preTradeSafetyCheck;
  const reasons: string[] = [];
  let risk: RiskParameters;
  const marketId: string | null = input.marketId ?? null;
  try {
    if (input.protocolId === 'aave-v3-monad') {
      risk = await (dependencies.resolveAaveRisk ?? resolveAaveRisk)(input);
    } else {
      const market = await (dependencies.resolveMorphoMarket ?? resolveMorphoMarket)(
        input.marketId!
      );
      if (
        normalizeSymbol(market.collateralSymbol) !== normalizeSymbol(input.collateralSymbol) ||
        normalizeSymbol(market.loanSymbol) !== normalizeSymbol(input.loanSymbol)
      ) {
        throw new Error('Declared assets do not match immutable Morpho market parameters');
      }
      risk = {
        maxLtv: market.lltv,
        liquidationLtv: market.lltv,
        source: 'morpho-market',
        oracleAddress: market.oracle,
      };
    }
  } catch (error) {
    risk = { maxLtv: 0, liquidationLtv: 0, source: 'unavailable' };
    reasons.push(
      `Live protocol risk parameters are unavailable or inconsistent: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const [collateralResult, loanResult] = await Promise.all([
    checkOracle({
      asset: oracleSymbol(input.collateralSymbol),
      chainId: MONAD_CHAIN_ID,
      action: input.action === 'borrow' ? 'borrow' : 'lend',
      tradeAmountUsd: input.collateralValueUsd,
      // The lending adapter reads protocol controls directly below. Do not ask
      // the generic oracle layer for a registry-based protocol context here:
      // a static fallback would be less authoritative than the live read.
      schemaVersion: 3,
    }),
    checkOracle({
      asset: oracleSymbol(input.loanSymbol),
      chainId: MONAD_CHAIN_ID,
      action: input.action === 'borrow' ? 'borrow' : 'lend',
      tradeAmountUsd: Math.max(input.debtValueUsd, 1),
      schemaVersion: 3,
    }),
  ]);
  const ltv = input.debtValueUsd / input.collateralValueUsd;
  const liquidationBufferPct =
    risk.liquidationLtv > 0 ? Math.max(0, (1 - ltv / risk.liquidationLtv) * 100) : 0;
  const conservativeMaxDebtUsd = input.collateralValueUsd * risk.maxLtv * 0.9;
  let verdict: MonadLendingGuardVerdict = 'ALLOW';
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
    schema: 'insight.monad-lending-guard.v1',
    verdict,
    protocolId: input.protocolId,
    action: input.action,
    evaluatedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
    scope: {
      chainId: MONAD_CHAIN_ID,
      transactionAuthority: 'none',
      valuation: 'caller_declared_post_action_usd',
    },
    market: {
      marketId,
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
