import { decodeFunctionResult, encodeFunctionData } from 'viem';
import { z } from 'zod';

import {
  preTradeSafetyCheck,
  type PreTradeSafetyResult,
} from '@/lib/api/services/preTradeSafetyService';
import { readContract } from '@/lib/protocols/importer/rpcClient';
import { fetchProtocolRiskParamsForId } from '@/lib/protocols/services/protocolRiskParamsService';

import {
  BaseLendingExactTransactionSchema,
  BaseLendingProtocolIdSchema,
  canonicalAaveRiskSymbol,
} from './baseLendingAction';
import {
  COMPOUND_V3_BASE_COMET,
  COMPOUND_V3_BASE_USDC,
  MOONWELL_BASE_COMPTROLLER,
  compoundV3BaseAssetForSymbol,
  getReviewedMorphoBlueMarkets,
  moonwellBaseMarketForSymbol,
  type ReviewedMorphoBlueMarket,
} from './baseLendingProtocols';
import {
  decodeErc4626VaultCall,
  type VaultCall,
  type VaultDecodeReasonCode,
} from './erc4626VaultDecoder';
import {
  createRpcBackedVaultReader,
  resolveVaultMarket,
  type VaultMappingReasonCode,
  type VaultResolution,
  type VaultRpcReader,
} from './vaultMarketMapping';

/**
 * A read-only, Base-only lending decision gate. It deliberately evaluates
 * caller-declared post-action USD values rather than constructing, signing, or
 * sending a transaction. A caller must bind a successful response to an exact
 * transaction separately (for example with PriorSeal).
 */
export const BaseLendingGuardInputSchema = z
  .object({
    protocolId: BaseLendingProtocolIdSchema,
    action: z.enum(['supply', 'borrow']),
    collateralSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    loanSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    /** Caller-declared collateral value after the intended action, in USD. */
    collateralValueUsd: z.number().finite().positive().max(1_000_000_000_000),
    /** Caller-declared debt value after the intended action, in USD. */
    debtValueUsd: z.number().finite().min(0).max(1_000_000_000_000),
    /** Required for Morpho because risk parameters are market-specific. */
    marketId: z
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.protocolId === 'morpho-blue-base' && !value.marketId) {
      context.addIssue({
        code: 'custom',
        path: ['marketId'],
        message:
          'marketId is required for Morpho Blue because every market has separate risk parameters',
      });
    }
  });

export type BaseLendingGuardInput = z.infer<typeof BaseLendingGuardInputSchema>;
export type BaseLendingGuardVerdict = 'ALLOW' | 'CAUTION' | 'BLOCK';

/** Input for a portable, signed decision that is bound to one unsigned call. */
export const BaseLendingGuardExactInputSchema = z
  .object({
    guard: BaseLendingGuardInputSchema,
    transaction: BaseLendingExactTransactionSchema,
  })
  .strict();
export type BaseLendingGuardExactInput = z.infer<typeof BaseLendingGuardExactInputSchema>;

interface RiskParameters {
  maxLtv: number;
  liquidationLtv: number;
  source: 'on-chain' | 'fallback' | 'morpho-market' | 'compound-comet' | 'moonwell-market';
  oracleAddress?: `0x${string}`;
}

interface MorphoMarket {
  loanSymbol: string;
  collateralSymbol: string;
  lltv: number;
  oracle: `0x${string}`;
}

export interface BaseLendingGuardResult {
  schema: 'insight.base-lending-guard.v1';
  verdict: BaseLendingGuardVerdict;
  protocolId: BaseLendingGuardInput['protocolId'];
  action: BaseLendingGuardInput['action'];
  evaluatedAt: string;
  scope: {
    chainId: 8453;
    transactionAuthority: 'none';
    valuation: 'caller_declared_post_action_usd';
  };
  market: {
    marketId: string | null;
    collateralSymbol: string;
    loanSymbol: string;
    maxLtv: number;
    liquidationLtv: number;
    parameterSource: RiskParameters['source'];
    oracleAddress: `0x${string}` | null;
  };
  projected: {
    collateralValueUsd: number;
    debtValueUsd: number;
    ltv: number;
    liquidationBufferPct: number;
    conservativeMaxDebtUsd: number;
  };
  oracleChecks: {
    collateral: OracleCheckSummary;
    loan: OracleCheckSummary;
  };
  reasons: string[];
  next: {
    execution: 'not_performed';
    priorSeal: 'Bind this decision to an exact, user-authorized transaction before execution.';
  };
  /**
   * P1-1a · Optional, populated ONLY by the ERC-4626 vault reduction path.
   * The direct core-call path never sets it, so existing verdicts and their
   * decision hashes are unchanged.
   */
  vault?: {
    schema: 'insight.base-lending-vault-reduction.v1';
    call: VaultCall;
    resolution: VaultResolution;
  };
}

const MORPHO = '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb' as const;
const MORPHO_ABI = [
  {
    type: 'function',
    name: 'idToMarketParams',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      {
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

interface OracleCheckSummary {
  verdict: PreTradeSafetyResult['verdict'];
  maxDeviationPct: number;
  staleDataRisk: boolean;
  participantCount: number;
  /** A reference to the separately verifiable Oracle Safety attestation, if configured. */
  attestationUid: string | null;
  attester: string | null;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
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

function isBlockingOracleVerdict(verdict: PreTradeSafetyResult['verdict']): boolean {
  return verdict === 'DANGER' || verdict === 'BLOCK';
}

async function readErc20Symbol(token: `0x${string}`): Promise<string> {
  const data = encodeFunctionData({ abi: ERC20_SYMBOL_ABI, functionName: 'symbol' });
  const response = await readContract(8453, token, data);
  return decodeFunctionResult({
    abi: ERC20_SYMBOL_ABI,
    functionName: 'symbol',
    data: response as `0x${string}`,
  });
}

async function resolveMorphoMarket(marketId: string): Promise<MorphoMarket> {
  const data = encodeFunctionData({
    abi: MORPHO_ABI,
    functionName: 'idToMarketParams',
    args: [marketId as `0x${string}`],
  });
  const response = await readContract(8453, MORPHO, data);
  const params = decodeFunctionResult({
    abi: MORPHO_ABI,
    functionName: 'idToMarketParams',
    data: response as `0x${string}`,
  }) as unknown as {
    loanToken: `0x${string}`;
    collateralToken: `0x${string}`;
    oracle: `0x${string}`;
    irm: `0x${string}`;
    lltv: bigint;
  };
  const { loanToken, collateralToken, oracle, lltv } = params;
  const [loanSymbol, collateralSymbol] = await Promise.all([
    readErc20Symbol(loanToken),
    readErc20Symbol(collateralToken),
  ]);
  const lltvNumber = Number(lltv) / 1e18;
  if (!(lltvNumber > 0 && lltvNumber < 1)) {
    throw new Error('Morpho market returned an invalid LLTV');
  }
  return { loanSymbol, collateralSymbol, lltv: lltvNumber, oracle };
}

async function resolveAaveRisk(input: BaseLendingGuardInput): Promise<RiskParameters> {
  const response = await fetchProtocolRiskParamsForId(input.protocolId);
  const collateral = response.params.find(
    (asset) => normalizeSymbol(asset.symbol) === canonicalAaveRiskSymbol(input.collateralSymbol)
  );
  const loan = response.params.find(
    (asset) => normalizeSymbol(asset.symbol) === canonicalAaveRiskSymbol(input.loanSymbol)
  );
  if (!collateral || !loan || !(collateral.maxLtv > 0 && collateral.liquidationThreshold > 0)) {
    throw new Error(
      'Declared assets are not supported by the current Aave Base risk-parameter set'
    );
  }
  return {
    maxLtv: collateral.maxLtv,
    liquidationLtv: 1 / collateral.liquidationThreshold,
    source: response.source === 'on-chain' ? 'on-chain' : 'fallback',
  };
}

async function readDecoded<T>(
  to: `0x${string}`,
  abi: readonly unknown[],
  functionName: string,
  args: readonly unknown[] = []
): Promise<T> {
  const data = encodeFunctionData({
    abi,
    functionName,
    args,
  });
  const response = await readContract(8453, to, data);
  return decodeFunctionResult({
    abi,
    functionName,
    data: response as `0x${string}`,
  }) as T;
}

/**
 * Compound III has one borrowable base asset. Its current collateral and
 * liquidation factors live on the Comet, so use those rather than registry
 * defaults. `withdraw(baseToken)` is the protocol's direct borrow operation.
 */
async function resolveCompoundV3Risk(input: BaseLendingGuardInput): Promise<RiskParameters> {
  const collateralAsset = compoundV3BaseAssetForSymbol(input.collateralSymbol);
  const expectedLoan = compoundV3BaseAssetForSymbol(input.loanSymbol);
  if (!collateralAsset) {
    throw new Error('Declared collateral is not a reviewed Compound V3 Base collateral asset');
  }
  if (expectedLoan?.toLowerCase() !== COMPOUND_V3_BASE_USDC) {
    throw new Error('Compound V3 Base supports borrowing only the USDC Comet base asset');
  }
  const [baseToken, baseTokenPriceFeed] = await Promise.all([
    readDecoded<`0x${string}`>(COMPOUND_V3_BASE_COMET, COMPOUND_COMET_ABI, 'baseToken'),
    readDecoded<`0x${string}`>(COMPOUND_V3_BASE_COMET, COMPOUND_COMET_ABI, 'baseTokenPriceFeed'),
  ]);
  if (baseToken.toLowerCase() !== COMPOUND_V3_BASE_USDC) {
    throw new Error('Compound V3 Base Comet base token did not match the reviewed USDC deployment');
  }

  // Supplying the USDC base asset is not a collateral-backed borrow. Accept
  // only the unlevered case here; a caller with outstanding base debt needs a
  // position-aware adapter before an ALLOW can be issued.
  if (collateralAsset.toLowerCase() === COMPOUND_V3_BASE_USDC) {
    if (input.action !== 'supply' || input.debtValueUsd !== 0) {
      throw new Error(
        'Compound V3 Base-asset supply is assessed only for an unlevered supply position'
      );
    }
    return {
      maxLtv: 1,
      liquidationLtv: 1,
      source: 'compound-comet',
      oracleAddress: baseTokenPriceFeed.toLowerCase() as `0x${string}`,
    };
  }

  const assetInfo = await readDecoded<{
    asset: `0x${string}`;
    priceFeed: `0x${string}`;
    borrowCollateralFactor: bigint;
    liquidateCollateralFactor: bigint;
  }>(COMPOUND_V3_BASE_COMET, COMPOUND_COMET_ABI, 'getAssetInfoByAddress', [collateralAsset]);
  if (assetInfo.asset.toLowerCase() !== collateralAsset.toLowerCase()) {
    throw new Error('Compound V3 Comet asset configuration did not match the declared collateral');
  }
  const maxLtv = Number(assetInfo.borrowCollateralFactor) / 1e18;
  const liquidationLtv = Number(assetInfo.liquidateCollateralFactor) / 1e18;
  if (!(maxLtv > 0 && maxLtv < 1 && liquidationLtv > 0 && liquidationLtv <= 1)) {
    throw new Error('Compound V3 Comet returned invalid live collateral factors');
  }
  return {
    maxLtv,
    liquidationLtv,
    source: 'compound-comet',
    oracleAddress: assetInfo.priceFeed.toLowerCase() as `0x${string}`,
  };
}

/**
 * Moonwell market factors are per mToken. Refuse an unlisted or zero-factor
 * market, so a governance freeze cannot be represented as a normal ALLOW.
 */
async function resolveMoonwellRisk(input: BaseLendingGuardInput): Promise<RiskParameters> {
  const collateralMarket = moonwellBaseMarketForSymbol(input.collateralSymbol);
  const loanMarket = moonwellBaseMarketForSymbol(input.loanSymbol);
  if (!collateralMarket || !loanMarket) {
    throw new Error('Declared assets are not in the reviewed Moonwell Base market set');
  }
  const [market, oracle] = await Promise.all([
    readDecoded<readonly [boolean, bigint, boolean]>(
      MOONWELL_BASE_COMPTROLLER,
      MOONWELL_COMPTROLLER_ABI,
      'markets',
      [collateralMarket]
    ),
    readDecoded<`0x${string}`>(MOONWELL_BASE_COMPTROLLER, MOONWELL_COMPTROLLER_ABI, 'oracle'),
  ]);
  const [isListed, collateralFactorMantissa] = market;
  const factor = Number(collateralFactorMantissa) / 1e18;
  if (!isListed || !(factor > 0 && factor < 1)) {
    throw new Error(
      'Moonwell collateral market is unlisted, frozen, or returned an invalid factor'
    );
  }
  return {
    // Moonwell's Comptroller enforces the per-market collateral factor for
    // both borrow capacity and shortfall; there is no separate LLTV field.
    maxLtv: factor,
    liquidationLtv: factor,
    source: 'moonwell-market',
    oracleAddress: oracle.toLowerCase() as `0x${string}`,
  };
}

export interface BaseLendingGuardDependencies {
  checkOracle?: typeof preTradeSafetyCheck;
  resolveMorphoMarket?: (marketId: string) => Promise<MorphoMarket>;
  resolveAaveRisk?: (input: BaseLendingGuardInput) => Promise<RiskParameters>;
  resolveCompoundV3Risk?: (input: BaseLendingGuardInput) => Promise<RiskParameters>;
  resolveMoonwellRisk?: (input: BaseLendingGuardInput) => Promise<RiskParameters>;
  now?: () => Date;
}

export async function assessBaseLendingGuard(
  rawInput: BaseLendingGuardInput,
  dependencies: BaseLendingGuardDependencies = {}
): Promise<BaseLendingGuardResult> {
  const input = BaseLendingGuardInputSchema.parse(rawInput);
  const checkOracle = dependencies.checkOracle ?? preTradeSafetyCheck;
  const evaluatedAt = (dependencies.now ?? (() => new Date()))().toISOString();

  let risk: RiskParameters;
  let oracleAddress: `0x${string}` | null = null;
  const reasons: string[] = [];
  if (input.protocolId === 'morpho-blue-base') {
    const market = await (dependencies.resolveMorphoMarket ?? resolveMorphoMarket)(input.marketId!);
    if (
      normalizeSymbol(market.collateralSymbol) !== normalizeSymbol(input.collateralSymbol) ||
      normalizeSymbol(market.loanSymbol) !== normalizeSymbol(input.loanSymbol)
    ) {
      throw new Error('Declared assets do not match the immutable Morpho market parameters');
    }
    risk = {
      maxLtv: market.lltv,
      liquidationLtv: market.lltv,
      source: 'morpho-market',
      oracleAddress: market.oracle,
    };
    oracleAddress = market.oracle;
  } else if (input.protocolId === 'aave-v3-base') {
    risk = await (dependencies.resolveAaveRisk ?? resolveAaveRisk)(input);
  } else if (input.protocolId === 'compound-v3-base') {
    risk = await (dependencies.resolveCompoundV3Risk ?? resolveCompoundV3Risk)(input);
    oracleAddress = risk.oracleAddress ?? null;
  } else {
    risk = await (dependencies.resolveMoonwellRisk ?? resolveMoonwellRisk)(input);
    oracleAddress = risk.oracleAddress ?? null;
  }

  const [collateralResult, loanResult] = await Promise.all([
    checkOracle({
      asset: input.collateralSymbol,
      chainId: 8453,
      action: input.action === 'borrow' ? 'borrow' : 'lend',
      tradeAmountUsd: input.collateralValueUsd,
      protocolId: input.protocolId,
      schemaVersion: 3,
    }),
    checkOracle({
      asset: input.loanSymbol,
      chainId: 8453,
      action: input.action === 'borrow' ? 'borrow' : 'lend',
      tradeAmountUsd: Math.max(input.debtValueUsd, 1),
      protocolId: input.protocolId,
      schemaVersion: 3,
    }),
  ]);

  const ltv = input.debtValueUsd / input.collateralValueUsd;
  const liquidationBufferPct = Math.max(0, (1 - ltv / risk.liquidationLtv) * 100);
  // 90% of the supplied protocol maximum leaves a mechanical buffer. This is
  // advisory; it is not a claim that the value is safe under every market move.
  const conservativeMaxDebtUsd = input.collateralValueUsd * risk.maxLtv * 0.9;
  let verdict: BaseLendingGuardVerdict = 'ALLOW';

  if (
    isBlockingOracleVerdict(collateralResult.verdict) ||
    isBlockingOracleVerdict(loanResult.verdict)
  ) {
    verdict = 'BLOCK';
    reasons.push('At least one collateral or loan oracle assessment is DANGER or BLOCK.');
  }
  if (risk.source === 'fallback') {
    // Aave risk parameters are governance-controlled and can change. Static
    // registry defaults are useful context, but never sufficient authority for
    // a pre-signing ALLOW decision when the live contract read is unavailable.
    verdict = 'BLOCK';
    reasons.push(
      'Live protocol risk parameters were unavailable; the guard fails closed instead of relying on static defaults.'
    );
  }
  if (ltv >= risk.liquidationLtv) {
    verdict = 'BLOCK';
    reasons.push('Declared post-action LTV is at or above the protocol liquidation threshold.');
  } else if (ltv >= risk.maxLtv * 0.9) {
    if (verdict !== 'BLOCK') verdict = 'CAUTION';
    reasons.push('Declared post-action LTV consumes at least 90% of the protocol maximum LTV.');
  }
  if (collateralResult.verdict === 'CAUTION' || loanResult.verdict === 'CAUTION') {
    if (verdict !== 'BLOCK') verdict = 'CAUTION';
    reasons.push('At least one oracle assessment requires review before execution.');
  }
  if (reasons.length === 0) {
    reasons.push(
      'Oracle checks passed and declared post-action LTV remains below the conservative guard band.'
    );
  }

  return {
    schema: 'insight.base-lending-guard.v1',
    verdict,
    protocolId: input.protocolId,
    action: input.action,
    evaluatedAt,
    scope: {
      chainId: 8453,
      transactionAuthority: 'none',
      valuation: 'caller_declared_post_action_usd',
    },
    market: {
      marketId: input.marketId ?? null,
      collateralSymbol: input.collateralSymbol,
      loanSymbol: input.loanSymbol,
      maxLtv: risk.maxLtv,
      liquidationLtv: risk.liquidationLtv,
      parameterSource: risk.source,
      oracleAddress,
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

// ---------------------------------------------------------------------------
// P1-1a · ERC-4626 vault reduction path (additive; direct core calls unchanged)
// ---------------------------------------------------------------------------

/** Caller-declared values for one exact ERC-4626 vault call. */
export const BaseLendingVaultGuardInputSchema = z
  .object({
    transaction: BaseLendingExactTransactionSchema,
    collateralSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    loanSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    collateralValueUsd: z.number().finite().positive().max(1_000_000_000_000),
    debtValueUsd: z.number().finite().min(0).max(1_000_000_000_000),
  })
  .strict();

export type BaseLendingVaultGuardInput = z.infer<typeof BaseLendingVaultGuardInputSchema>;

export type VaultGuardReasonCode = 'INVALID_INPUT' | VaultDecodeReasonCode | VaultMappingReasonCode;

/** Explicit, fail-closed rejection carrying a stable reasonCode. */
export class VaultGuardRejectionError extends Error {
  readonly reasonCode: VaultGuardReasonCode;
  readonly resolution?: VaultResolution;

  constructor(reasonCode: VaultGuardReasonCode, message: string, resolution?: VaultResolution) {
    super(message);
    this.name = 'VaultGuardRejectionError';
    this.reasonCode = reasonCode;
    this.resolution = resolution;
  }
}

export interface BaseLendingVaultGuardDependencies extends BaseLendingGuardDependencies {
  /** Injected chain reader; defaults to the repository eth_call adapter. */
  reader?: VaultRpcReader;
  /** Reviewed-market anchors; defaults to the source-controlled registry. */
  reviewedMarkets?: readonly ReviewedMorphoBlueMarket[];
  /** Per-read timeout for the on-chain mapping (default 3000ms). */
  timeoutMs?: number;
}

function rejectionMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Assess ONE ERC-4626 vault call by reducing it to a reviewed Morpho Blue
 * market and then reusing the existing guard evaluation chain unchanged.
 *
 * Path: strict/canonical decode -> fail-closed on-chain vault->market mapping
 * -> `assessBaseLendingGuard({ protocolId: 'morpho-blue-base', marketId:
 * reviewedMarketId, action: 'supply', ... })`. The morpho branch of
 * `assessBaseLendingGuard` re-reads `idToMarketParams(reviewedMarketId)` — the
 * SAME immutable MarketParams identity that `decodeMorphoExactCall` derives
 * from direct-call calldata in `baseLendingAction.ts`. We deliberately do not
 * call that private decoder (it is bound to direct-core calldata and lives in
 * a file outside this task's ownership); we reuse its evaluation chain.
 *
 * ERC-4626 deposit/mint/redeem/withdraw are all supply-side movements of the
 * vault's underlying loan asset, so they map to the guard's `supply` action.
 * Caller-declared symbols are still checked by the existing guard against the
 * live market parameters.
 *
 * The original direct core-call path (`decodeBaseLendingExactCall` +
 * `assessBaseLendingGuard`) is untouched. Unknown / unresolvable vaults are
 * refused with a `VaultGuardRejectionError`, exactly as they were refused
 * before (their target is not the Morpho singleton).
 */
export async function assessBaseLendingVaultGuard(
  rawInput: BaseLendingVaultGuardInput,
  dependencies: BaseLendingVaultGuardDependencies = {}
): Promise<BaseLendingGuardResult> {
  let input: BaseLendingVaultGuardInput;
  try {
    input = BaseLendingVaultGuardInputSchema.parse(rawInput);
  } catch (error) {
    throw new VaultGuardRejectionError(
      'INVALID_INPUT',
      `invalid vault guard input: ${rejectionMessage(error)}`
    );
  }

  const decoded = decodeErc4626VaultCall(input.transaction);
  if (!decoded.ok) {
    throw new VaultGuardRejectionError(decoded.reasonCode, decoded.reason);
  }

  const reader = dependencies.reader ?? createRpcBackedVaultReader();
  const reviewedMarkets = dependencies.reviewedMarkets ?? getReviewedMorphoBlueMarkets();
  const mapping = await resolveVaultMarket(decoded.call.vault, {
    reader,
    reviewedMarkets,
    timeoutMs: dependencies.timeoutMs,
  });
  if (!mapping.ok) {
    throw new VaultGuardRejectionError(mapping.reasonCode, mapping.reason, mapping.resolution);
  }
  const reviewedMarketId = mapping.resolution.reviewedMarketId;
  if (!reviewedMarketId) {
    throw new VaultGuardRejectionError(
      'NO_REVIEWED_MARKET',
      'vault resolution did not yield a reviewed marketId',
      mapping.resolution
    );
  }

  const guardInput: BaseLendingGuardInput = {
    protocolId: 'morpho-blue-base',
    action: 'supply',
    collateralSymbol: input.collateralSymbol,
    loanSymbol: input.loanSymbol,
    collateralValueUsd: input.collateralValueUsd,
    debtValueUsd: input.debtValueUsd,
    marketId: reviewedMarketId,
  };

  const result = await assessBaseLendingGuard(guardInput, dependencies);
  return {
    ...result,
    vault: {
      schema: 'insight.base-lending-vault-reduction.v1',
      call: decoded.call,
      resolution: mapping.resolution,
    },
  };
}
