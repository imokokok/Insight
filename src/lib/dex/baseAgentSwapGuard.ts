/**
 * Base Agent Swap Guard is a deliberately narrow pre-signing workflow for
 * agent-driven Base swaps.  It composes a reviewed direct-router preparation
 * with two oracle checks and returns unsigned calls only after every configured
 * gate passes.  It is not a router, wallet, relayer, or authorization system.
 */

import {
  decodeFunctionData,
  encodeFunctionData,
  isAddress,
  keccak256,
  parseAbi,
  toBytes,
  type Hex,
} from 'viem';
import { z } from 'zod';

import {
  preTradeSafetyCheck,
  type PreTradeSafetyResult,
} from '@/lib/api/services/preTradeSafetyService';
import { canonicalJsonString } from '@/lib/utils/canonicalJson';

import {
  AERODROME_SLIPSTREAM_FACTORY,
  AERODROME_SLIPSTREAM_QUOTER_V2,
  AERODROME_SLIPSTREAM_SWAP_ROUTER,
  AERODROME_SLIPSTREAM_SWAP_ROUTER_CODE_HASH,
  AERODROME_SLIPSTREAM_WETH_USDC,
  AERODROME_SLIPSTREAM_USDC_USDT,
  BASE_USDC,
  BASE_USDT,
  BASE_WETH,
  type ReviewedAerodromeSlipstreamProfileId,
} from './aerodromeSlipstream';
import {
  prepareAerodromeSlipstreamExactInput,
  type PreparedAerodromeSlipstreamExactInput,
} from './aerodromeSlipstreamSwap';
import {
  PANCAKE_SWAP_V3_BNB_CHAIN_ID,
  type PANCAKE_SWAP_V3_BASE_CHAIN_ID,
  PANCAKE_SWAP_V3_BNB_USDC,
  PANCAKE_SWAP_V3_BNB_USDT,
  PANCAKE_SWAP_V3_BNB_USDT_USDC,
  PANCAKE_SWAP_V3_BASE_USDC,
  PANCAKE_SWAP_V3_BASE_USDC_USDT,
  PANCAKE_SWAP_V3_BASE_USDT,
  pancakeSwapV3DeploymentForChain,
  type ReviewedPancakeSwapV3ProfileId,
} from './pancakeSwapV3';
import {
  preparePancakeSwapV3ExactInput,
  type PreparedPancakeSwapV3ExactInput,
} from './pancakeSwapV3Swap';

export const BASE_AGENT_SWAP_GUARD_SCHEMA = 'insight.base-agent-swap-guard.v1' as const;

export const BASE_AGENT_SWAP_GUARD_PROFILE_IDS = [
  'base-aerodrome-slipstream-weth-usdc-cl100',
  'base-aerodrome-slipstream-usdc-usdt-cl1',
  'base-pancakeswap-v3-usdc-usdt-100',
  'bnb-pancakeswap-v3-usdt-usdc-100',
] as const;

export type BaseAgentSwapGuardProfileId = (typeof BASE_AGENT_SWAP_GUARD_PROFILE_IDS)[number];
export type BaseAgentSwapGuardVerdict = 'ALLOW' | 'CAUTION' | 'BLOCK';
export type BaseAgentSwapGuardDirection = 'token0-to-token1' | 'token1-to-token0';
/** Every chain with at least one reviewed guard profile. */
export type BaseAgentSwapGuardChainId =
  | typeof PANCAKE_SWAP_V3_BASE_CHAIN_ID
  | typeof PANCAKE_SWAP_V3_BNB_CHAIN_ID;

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const POSITIVE_DECIMAL = /^(?:0\.(?:0*[1-9][0-9]*)|[1-9][0-9]*(?:\.[0-9]+)?)$/;
const ERC20_APPROVE_ABI = parseAbi([
  'function approve(address spender,uint256 amount) returns (bool)',
]);
const AERODROME_EXACT_INPUT_SINGLE_ABI = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,int24 tickSpacing,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
]);
const PANCAKE_EXACT_INPUT_SINGLE_ABI = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
]);

/**
 * Every threshold is supplied by the integrating agent/wallet rather than
 * hidden in the implementation.  The intentionally bounded upper limits keep
 * this initial direct-swap lane from becoming an arbitrary high-slippage path.
 */
export const BaseAgentSwapGuardInputSchema = z
  .object({
    profileId: z.enum(BASE_AGENT_SWAP_GUARD_PROFILE_IDS),
    /**
     * Quote direction inside the reviewed pool. Defaults to the pool's
     * token0→token1 direction; the reverse is admitted because both reviewed
     * pairs are two-way single-pool lanes.
     */
    direction: z.enum(['token0-to-token1', 'token1-to-token0']).default('token0-to-token1'),
    amountIn: z.string().regex(POSITIVE_DECIMAL).max(128),
    recipient: z.string().regex(ADDRESS),
    deadlineUnixSeconds: z.number().int().positive(),
    /** The USD price the agent used for the asset it is selling. */
    sourceDecisionPriceUsd: z.number().finite().positive().max(1_000_000_000),
    /** The USD price the agent used for the asset it expects to receive. */
    destinationDecisionPriceUsd: z.number().finite().positive().max(1_000_000_000),
    policy: z
      .object({
        maxSlippageBps: z.number().int().min(0).max(1_000),
        maxPriceImpactBps: z.number().finite().min(0).max(1_000),
        maxTwapDeviationBps: z.number().finite().min(0).max(1_000),
        maxReferenceDeviationBps: z.number().int().min(0).max(1_000),
        maxQuoteAgeSeconds: z.number().int().min(1).max(120),
      })
      .strict(),
  })
  .strict();

export type BaseAgentSwapGuardInput = z.infer<typeof BaseAgentSwapGuardInputSchema>;

type PreparedBaseDirectSwap =
  | PreparedAerodromeSlipstreamExactInput
  | PreparedPancakeSwapV3ExactInput;

interface OracleCheckSummary {
  asset: string;
  verdict: PreTradeSafetyResult['verdict'];
  consensusPriceUsd: number;
  /** Agent-provided price, included only where this guard checks that asset. */
  decisionPriceUsd: number | null;
  /** Absolute difference between the declared price and this check's consensus. */
  decisionPriceDeviationBps: number | null;
  maxDeviationPct: number;
  staleDataRisk: boolean;
  participantCount: number;
  attestationUid: string | null;
  decisionInputStatus: 'SUFFICIENT' | 'INSUFFICIENT_EVIDENCE' | 'BLOCK' | null;
}

interface GuardBinding {
  chainId: BaseAgentSwapGuardChainId;
  recipient: string;
  approval: {
    token: string;
    spender: string;
    amountRaw: string;
    calldataHash: Hex;
  };
  swap: {
    to: string;
    value: '0x0';
    calldataHash: Hex;
  };
}

export interface BaseAgentSwapGuardResult {
  schema: typeof BASE_AGENT_SWAP_GUARD_SCHEMA;
  verdict: BaseAgentSwapGuardVerdict;
  reasonCodes: string[];
  evaluatedAt: string;
  validUntil: number | null;
  scope: {
    chainId: BaseAgentSwapGuardChainId;
    profileId: BaseAgentSwapGuardProfileId;
    transactionAuthority: 'none';
    supportedCallShape: 'reviewed_single_hop_direct_router';
    accountAbstraction: 'not_assessed';
  };
  policy: BaseAgentSwapGuardInput['policy'];
  market: {
    venue: string;
    market: string;
    sourceAsset: string;
    destinationAsset: string;
    observedAt: string;
    quoteAgeSeconds: number | null;
    sourceFreshnessSeconds: number;
    block: { number: string; hash: Hex; timestamp: string };
    pool: string;
    quoter: string;
    router: { address: string; codeHash: string };
    exactInput: {
      amountInRaw: string;
      quotedAmountOutRaw: string;
      amountOutMinimumRaw: string;
      effectiveDestinationPerSource: number;
      /** Derived from the exact quote and the independently checked destination consensus. */
      routeQuotePriceUsd: number | null;
      /** Null until the destination oracle check has completed. */
      destinationConsensusPriceUsd: number | null;
      priceImpactBps: number;
      twapDeviationBpsFromSpot: number;
    };
  } | null;
  binding: GuardBinding | null;
  oracleChecks: {
    source: OracleCheckSummary | null;
    destination: OracleCheckSummary | null;
  } | null;
  /** Original signed oracle envelopes, when the deployment attester is enabled. */
  preTradeAttestations: {
    source: PreTradeSafetyResult['attestation'] | null;
    destination: PreTradeSafetyResult['attestation'] | null;
  } | null;
  /**
   * Present only on ALLOW. These are exact unsigned calls, not an instruction
   * to submit them automatically. A wallet/executor must independently bind
   * its user authorization to this decision and preserve the bytes verbatim.
   */
  transactionsToSign: {
    approval: { to: string; value: '0x0'; data: Hex };
    swap: { to: string; value: '0x0'; data: Hex };
  } | null;
  next: {
    humanConfirmationRequired: true;
    action:
      | 'bind_and_request_user_confirmation'
      | 'show_caution_and_create_a_new_assessment'
      | 'do_not_sign';
    priorSeal:
      | 'Bind decisionHash and the identical approval/swap calls before authorization.'
      | 'Do not authorize a CAUTION result automatically.'
      | 'No authorization may be created from a BLOCK result.';
  };
  /** keccak256 over every field above except this hash. It is unsigned on its own. */
  decisionHash: Hex;
  caveats: string[];
}

export interface BaseAgentSwapGuardDependencies {
  prepareAerodrome?: typeof prepareAerodromeSlipstreamExactInput;
  preparePancake?: typeof preparePancakeSwapV3ExactInput;
  preTrade?: typeof preTradeSafetyCheck;
  nowUnixSeconds?: () => number;
}

function profileAssets(
  profileId: BaseAgentSwapGuardProfileId,
  direction: BaseAgentSwapGuardDirection
): {
  source: { symbol: 'WETH' | 'USDC' | 'USDT'; address: string };
  destination: { symbol: 'WETH' | 'USDC' | 'USDT'; address: string };
} {
  const spec = GUARD_PROFILE_SPECS[profileId];
  const source = direction === 'token0-to-token1' ? spec.token0 : spec.token1;
  const destination = direction === 'token0-to-token1' ? spec.token1 : spec.token0;
  return { source, destination };
}

/**
 * The immutable reviewed identities each guard profile must bind to. The
 * pre-parers re-verify deployment code at the quote block; repeating the
 * profile-level constants here prevents a preparer regression from turning
 * matching metadata into an authorization for a different pool or direction.
 */
const GUARD_PROFILE_SPECS: Record<
  BaseAgentSwapGuardProfileId,
  {
    chainId: BaseAgentSwapGuardChainId;
    kind: 'aerodrome-slipstream-exact-input-v1' | 'pancakeswap-v3-exact-input-v1';
    market: string;
    token0: { symbol: 'WETH' | 'USDC' | 'USDT'; address: string };
    token1: { symbol: 'WETH' | 'USDC' | 'USDT'; address: string };
    pool: string;
    tickSpacing?: number;
    feeTier?: number;
  }
> = {
  'base-aerodrome-slipstream-weth-usdc-cl100': {
    chainId: 8453,
    kind: 'aerodrome-slipstream-exact-input-v1',
    market: 'WETH/USDC',
    token0: { symbol: 'WETH', address: BASE_WETH },
    token1: { symbol: 'USDC', address: BASE_USDC },
    pool: AERODROME_SLIPSTREAM_WETH_USDC.pool,
    tickSpacing: AERODROME_SLIPSTREAM_WETH_USDC.tickSpacing,
  },
  'base-aerodrome-slipstream-usdc-usdt-cl1': {
    chainId: 8453,
    kind: 'aerodrome-slipstream-exact-input-v1',
    market: 'USDC/USDT',
    token0: { symbol: 'USDC', address: BASE_USDC },
    token1: { symbol: 'USDT', address: BASE_USDT },
    pool: AERODROME_SLIPSTREAM_USDC_USDT.pool,
    tickSpacing: AERODROME_SLIPSTREAM_USDC_USDT.tickSpacing,
  },
  'base-pancakeswap-v3-usdc-usdt-100': {
    chainId: 8453,
    kind: 'pancakeswap-v3-exact-input-v1',
    market: 'USDC/USDT',
    token0: { symbol: 'USDC', address: PANCAKE_SWAP_V3_BASE_USDC },
    token1: { symbol: 'USDT', address: PANCAKE_SWAP_V3_BASE_USDT },
    pool: PANCAKE_SWAP_V3_BASE_USDC_USDT.pool,
    feeTier: PANCAKE_SWAP_V3_BASE_USDC_USDT.feeTier,
  },
  'bnb-pancakeswap-v3-usdt-usdc-100': {
    chainId: PANCAKE_SWAP_V3_BNB_CHAIN_ID,
    kind: 'pancakeswap-v3-exact-input-v1',
    market: 'USDT/USDC',
    // On the reviewed BNB pool USDT sorts before USDC, so token0 is USDT.
    token0: { symbol: 'USDT', address: PANCAKE_SWAP_V3_BNB_USDT },
    token1: { symbol: 'USDC', address: PANCAKE_SWAP_V3_BNB_USDC },
    pool: PANCAKE_SWAP_V3_BNB_USDT_USDC.pool,
    feeTier: PANCAKE_SWAP_V3_BNB_USDT_USDC.feeTier,
  },
} as const;

/**
 * Resolve the destination token address of a guard decision. The guarded input
 * token is the approval token (the binding is verified), and the destination is
 * the reviewed pool's other asset. Null when the decision carries no binding or
 * the approval token is outside the reviewed profile — a settlement closure must
 * never guess the pair it reconciles.
 */
export function baseAgentSwapGuardDestinationToken(guard: BaseAgentSwapGuardResult): string | null {
  const tokenIn = guard.binding?.approval.token;
  if (!tokenIn) return null;
  const spec = GUARD_PROFILE_SPECS[guard.scope.profileId];
  if (tokenIn.toLowerCase() === spec.token0.address.toLowerCase()) return spec.token1.address;
  if (tokenIn.toLowerCase() === spec.token1.address.toLowerCase()) return spec.token0.address;
  return null;
}

function timestampSeconds(value: string): number | null {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed / 1_000);
}

function priceDeviationBps(declaredPriceUsd: number, consensusPriceUsd: number): number | null {
  if (!finitePositive(declaredPriceUsd) || !finitePositive(consensusPriceUsd)) return null;
  const value = (Math.abs(declaredPriceUsd - consensusPriceUsd) / consensusPriceUsd) * 10_000;
  // Keep the decision payload readable and avoid exposing IEEE-754 dust as a
  // distinct integrity commitment for economically identical inputs.
  return Number.isFinite(value) ? Math.round(value * 1_000_000) / 1_000_000 : null;
}

function oracleSummary(
  asset: string,
  result: PreTradeSafetyResult,
  decisionPriceUsd: number | null = null
): OracleCheckSummary {
  return {
    asset,
    verdict: result.verdict,
    consensusPriceUsd: result.consensusPrice,
    decisionPriceUsd,
    decisionPriceDeviationBps:
      decisionPriceUsd === null ? null : priceDeviationBps(decisionPriceUsd, result.consensusPrice),
    maxDeviationPct: result.maxDeviationPct,
    staleDataRisk: result.staleDataRisk,
    participantCount: result.participantCount,
    attestationUid: result.attestation?.uid ?? null,
    decisionInputStatus: result.decisionInputAssessment?.status ?? null,
  };
}

function twapDeviationBps(prepared: PreparedBaseDirectSwap): number {
  return 'twapDeviationBpsFromSpot' in prepared.quote
    ? prepared.quote.twapDeviationBpsFromSpot
    : prepared.quote.twap.deviationBpsFromSpot;
}

function marketAndBinding(
  prepared: PreparedBaseDirectSwap,
  assets: ReturnType<typeof profileAssets>,
  quoteAgeSeconds: number | null
): Pick<BaseAgentSwapGuardResult, 'market' | 'binding'> {
  const quote = prepared.quote;
  return {
    market: {
      venue: quote.venue,
      market: quote.market,
      sourceAsset: assets.source.symbol,
      destinationAsset: assets.destination.symbol,
      observedAt: quote.observedAt,
      quoteAgeSeconds,
      sourceFreshnessSeconds: quote.sourceFreshnessSeconds,
      block: quote.block,
      pool: quote.contracts.pool,
      quoter: quote.contracts.quoterV2,
      router: {
        address: prepared.router.address,
        codeHash: prepared.router.codeHash,
      },
      exactInput: {
        amountInRaw: prepared.exactInput.amountInRaw,
        quotedAmountOutRaw: prepared.exactInput.quotedAmountOutRaw,
        amountOutMinimumRaw: prepared.exactInput.amountOutMinimumRaw,
        effectiveDestinationPerSource: effectiveDestinationPerSource(prepared),
        routeQuotePriceUsd: null,
        destinationConsensusPriceUsd: null,
        priceImpactBps: quote.quote.priceImpactBps,
        twapDeviationBpsFromSpot: twapDeviationBps(prepared),
      },
    },
    binding: {
      chainId: prepared.chainId,
      recipient: prepared.exactInput.recipient,
      approval: {
        token: prepared.approval.token,
        spender: prepared.approval.spender,
        amountRaw: prepared.approval.amountRaw,
        calldataHash: keccak256(prepared.approval.data),
      },
      swap: {
        to: prepared.transaction.to,
        value: '0x0',
        calldataHash: keccak256(prepared.transaction.data),
      },
    },
  };
}

function baseResult(
  input: BaseAgentSwapGuardInput,
  evaluatedAt: string,
  verdict: BaseAgentSwapGuardVerdict,
  reasonCodes: string[],
  extras: Pick<
    BaseAgentSwapGuardResult,
    | 'validUntil'
    | 'market'
    | 'binding'
    | 'oracleChecks'
    | 'preTradeAttestations'
    | 'transactionsToSign'
    | 'next'
  >
): Omit<BaseAgentSwapGuardResult, 'decisionHash'> {
  return {
    schema: BASE_AGENT_SWAP_GUARD_SCHEMA,
    verdict,
    reasonCodes,
    evaluatedAt,
    validUntil: extras.validUntil,
    scope: {
      chainId: GUARD_PROFILE_SPECS[input.profileId].chainId,
      profileId: input.profileId,
      transactionAuthority: 'none',
      supportedCallShape: 'reviewed_single_hop_direct_router',
      accountAbstraction: 'not_assessed',
    },
    policy: input.policy,
    market: extras.market,
    binding: extras.binding,
    oracleChecks: extras.oracleChecks,
    preTradeAttestations: extras.preTradeAttestations,
    transactionsToSign: extras.transactionsToSign,
    next: extras.next,
    caveats: [
      'Insight does not hold a key, approve, sign, relay, submit, or observe a transaction through this guard.',
      'This version admits only reviewed, single-hop direct router calls. Aggregator calldata, arbitrary multicalls, smart-account UserOperations, permit flows, native-value swaps, and alternate routes are not assessed.',
      'A decisionHash is an unsigned integrity commitment. Bind it and the identical calls to an independent user authorization before execution.',
      'A pinned quote and oracle check do not guarantee a later fill, protect against MEV, or establish token-contract security.',
    ],
  };
}

/** Compute the portable integrity hash for a guard result without its hash field. */
export function baseAgentSwapGuardDecisionHash(
  value: Omit<BaseAgentSwapGuardResult, 'decisionHash'>
): Hex {
  return keccak256(toBytes(canonicalJsonString(value)));
}

function complete(value: Omit<BaseAgentSwapGuardResult, 'decisionHash'>): BaseAgentSwapGuardResult {
  return { ...value, decisionHash: baseAgentSwapGuardDecisionHash(value) };
}

function noCallsNext(verdict: Exclude<BaseAgentSwapGuardVerdict, 'ALLOW'>) {
  return verdict === 'CAUTION'
    ? {
        humanConfirmationRequired: true as const,
        action: 'show_caution_and_create_a_new_assessment' as const,
        priorSeal: 'Do not authorize a CAUTION result automatically.' as const,
      }
    : {
        humanConfirmationRequired: true as const,
        action: 'do_not_sign' as const,
        priorSeal: 'No authorization may be created from a BLOCK result.' as const,
      };
}

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function finiteNonnegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isExpired(validUntil: number | null, nowUnixSeconds: number): boolean {
  return validUntil === null || validUntil <= nowUnixSeconds;
}

function currentUnixSeconds(nowUnixSeconds?: () => number): number {
  return nowUnixSeconds?.() ?? Math.floor(Date.now() / 1_000);
}

function sameAddress(left: unknown, right: unknown): boolean {
  return (
    typeof left === 'string' &&
    typeof right === 'string' &&
    isAddress(left) &&
    isAddress(right) &&
    left.toLowerCase() === right.toLowerCase()
  );
}

function sameCodeHash(left: unknown, right: string): boolean {
  return (
    typeof left === 'string' &&
    /^0x[0-9a-fA-F]{64}$/.test(left) &&
    left.toLowerCase() === right.toLowerCase()
  );
}

function effectiveDestinationPerSource(prepared: PreparedBaseDirectSwap): number {
  const quote = prepared.quote.quote;
  return quote.direction === 'token1-to-token0'
    ? quote.effectiveToken0PerToken1!
    : quote.effectiveToken1PerToken0!;
}

/**
 * The preparation helpers independently verify these deployments at the quote
 * block.  Repeating the immutable profile identities here prevents a future
 * preparer regression from turning matching metadata and well-formed calldata
 * into an authorization for a different router or pool.
 */
function reviewedProfileBindingIsValid(prepared: PreparedBaseDirectSwap): boolean {
  const spec = GUARD_PROFILE_SPECS[prepared.exactInput.profileId];
  const venue =
    spec.kind === 'aerodrome-slipstream-exact-input-v1' ? 'aerodrome-slipstream' : 'pancakeswap-v3';
  const shared = [
    prepared.quote.venue === venue,
    prepared.quote.market === spec.market,
    sameAddress(prepared.quote.contracts.factory, prepared.router.factory),
    sameAddress(prepared.quote.contracts.pool, spec.pool),
  ];
  if (!shared.every(Boolean)) return false;

  const forward =
    prepared.exactInput.tokenIn.toLowerCase() === spec.token0.address.toLowerCase() &&
    prepared.exactInput.tokenOut.toLowerCase() === spec.token1.address.toLowerCase();
  const reverse =
    prepared.exactInput.tokenIn.toLowerCase() === spec.token1.address.toLowerCase() &&
    prepared.exactInput.tokenOut.toLowerCase() === spec.token0.address.toLowerCase();
  if (!forward && !reverse) return false;

  if (prepared.kind === 'aerodrome-slipstream-exact-input-v1') {
    return (
      sameAddress(prepared.router.address, AERODROME_SLIPSTREAM_SWAP_ROUTER) &&
      sameCodeHash(prepared.router.codeHash, AERODROME_SLIPSTREAM_SWAP_ROUTER_CODE_HASH) &&
      sameAddress(prepared.quote.contracts.factory, AERODROME_SLIPSTREAM_FACTORY) &&
      sameAddress(prepared.quote.contracts.quoterV2, AERODROME_SLIPSTREAM_QUOTER_V2) &&
      prepared.exactInput.tickSpacing === spec.tickSpacing
    );
  }

  // PancakeSwap V3 is admitted per reviewed chain deployment. A profile on a
  // chain without a reviewed bundle (or one bound to another chain's router
  // bytes) can never validate here.
  const deployment = pancakeSwapV3DeploymentForChain(spec.chainId);
  if (!deployment) return false;
  return (
    sameAddress(prepared.router.address, deployment.swapRouter) &&
    sameCodeHash(prepared.router.codeHash, deployment.routerCodeHash) &&
    sameAddress(prepared.quote.contracts.factory, deployment.factory) &&
    sameAddress(prepared.quote.contracts.quoterV2, deployment.quoterV2) &&
    prepared.exactInput.feeTier === spec.feeTier
  );
}

function hasCanonicalApprovalBinding(prepared: PreparedBaseDirectSwap): boolean {
  try {
    const decoded = decodeFunctionData({ abi: ERC20_APPROVE_ABI, data: prepared.approval.data });
    if (decoded.functionName !== 'approve') return false;
    const [spender, amount] = decoded.args as readonly [string, bigint];
    const canonical = encodeFunctionData({
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [spender as `0x${string}`, amount],
    });
    return (
      canonical.toLowerCase() === prepared.approval.data.toLowerCase() &&
      sameAddress(spender, prepared.router.address) &&
      sameAddress(spender, prepared.approval.spender) &&
      amount.toString() === prepared.approval.amountRaw &&
      prepared.approval.amountRaw === prepared.exactInput.amountInRaw &&
      sameAddress(prepared.approval.token, prepared.exactInput.tokenIn)
    );
  } catch {
    return false;
  }
}

type AerodromeExactInputParams = {
  tokenIn: string;
  tokenOut: string;
  tickSpacing: number;
  recipient: string;
  deadline: bigint;
  amountIn: bigint;
  amountOutMinimum: bigint;
  sqrtPriceLimitX96: bigint;
};

type PancakeExactInputParams = Omit<AerodromeExactInputParams, 'tickSpacing'> & {
  fee: number;
};

function hasCanonicalSwapBinding(prepared: PreparedBaseDirectSwap): boolean {
  try {
    if (prepared.kind === 'aerodrome-slipstream-exact-input-v1') {
      const decoded = decodeFunctionData({
        abi: AERODROME_EXACT_INPUT_SINGLE_ABI,
        data: prepared.transaction.data,
      });
      if (decoded.functionName !== 'exactInputSingle') return false;
      const canonical = encodeFunctionData({
        abi: AERODROME_EXACT_INPUT_SINGLE_ABI,
        functionName: 'exactInputSingle',
        args: decoded.args,
      });
      const params = decoded.args[0] as AerodromeExactInputParams;
      return (
        canonical.toLowerCase() === prepared.transaction.data.toLowerCase() &&
        sameAddress(params.tokenIn, prepared.exactInput.tokenIn) &&
        sameAddress(params.tokenOut, prepared.exactInput.tokenOut) &&
        params.tickSpacing === prepared.exactInput.tickSpacing &&
        sameAddress(params.recipient, prepared.exactInput.recipient) &&
        params.deadline.toString() === String(prepared.exactInput.deadlineUnixSeconds) &&
        params.amountIn.toString() === prepared.exactInput.amountInRaw &&
        params.amountOutMinimum.toString() === prepared.exactInput.amountOutMinimumRaw &&
        params.sqrtPriceLimitX96 === 0n
      );
    }

    const decoded = decodeFunctionData({
      abi: PANCAKE_EXACT_INPUT_SINGLE_ABI,
      data: prepared.transaction.data,
    });
    if (decoded.functionName !== 'exactInputSingle') return false;
    const canonical = encodeFunctionData({
      abi: PANCAKE_EXACT_INPUT_SINGLE_ABI,
      functionName: 'exactInputSingle',
      args: decoded.args,
    });
    const params = decoded.args[0] as PancakeExactInputParams;
    return (
      canonical.toLowerCase() === prepared.transaction.data.toLowerCase() &&
      sameAddress(params.tokenIn, prepared.exactInput.tokenIn) &&
      sameAddress(params.tokenOut, prepared.exactInput.tokenOut) &&
      params.fee === prepared.exactInput.feeTier &&
      sameAddress(params.recipient, prepared.exactInput.recipient) &&
      params.deadline.toString() === String(prepared.exactInput.deadlineUnixSeconds) &&
      params.amountIn.toString() === prepared.exactInput.amountInRaw &&
      params.amountOutMinimum.toString() === prepared.exactInput.amountOutMinimumRaw &&
      params.sqrtPriceLimitX96 === 0n
    );
  } catch {
    return false;
  }
}

function preparedCallBindingIsValid(
  prepared: PreparedBaseDirectSwap,
  input: BaseAgentSwapGuardInput
): boolean {
  return (
    prepared.chainId === GUARD_PROFILE_SPECS[input.profileId].chainId &&
    prepared.kind === GUARD_PROFILE_SPECS[input.profileId].kind &&
    prepared.exactInput.profileId === input.profileId &&
    // The swap the preparer actually bound must be the direction the oracle
    // gates were selected for; a mismatch would price one trade and sign another.
    prepared.quote.quote.direction === input.direction &&
    prepared.transaction.value === '0x0' &&
    sameAddress(prepared.transaction.to, prepared.router.address) &&
    sameAddress(prepared.approval.spender, prepared.router.address) &&
    sameAddress(prepared.exactInput.recipient, input.recipient) &&
    prepared.exactInput.maxSlippageBps === input.policy.maxSlippageBps &&
    reviewedProfileBindingIsValid(prepared) &&
    hasCanonicalApprovalBinding(prepared) &&
    hasCanonicalSwapBinding(prepared)
  );
}

/**
 * Prepare and gate one Base direct-router swap.  It fails closed: an unavailable
 * quote, stale quote, policy breach, or unavailable/sufficient oracle evidence
 * produces BLOCK and never returns calls suitable for signing.
 */
export async function prepareBaseAgentSwapGuard(
  rawInput: BaseAgentSwapGuardInput,
  dependencies: BaseAgentSwapGuardDependencies = {}
): Promise<BaseAgentSwapGuardResult> {
  const input = BaseAgentSwapGuardInputSchema.parse(rawInput);
  const now = currentUnixSeconds(dependencies.nowUnixSeconds);
  const evaluatedAt = new Date(now * 1_000).toISOString();
  const assets = profileAssets(input.profileId, input.direction);
  const prepareAerodrome = dependencies.prepareAerodrome ?? prepareAerodromeSlipstreamExactInput;
  const preparePancake = dependencies.preparePancake ?? preparePancakeSwapV3ExactInput;
  const spec = GUARD_PROFILE_SPECS[input.profileId];

  let prepared: PreparedBaseDirectSwap;
  try {
    prepared =
      spec.kind === 'aerodrome-slipstream-exact-input-v1'
        ? await prepareAerodrome({
            profileId: input.profileId as ReviewedAerodromeSlipstreamProfileId,
            direction: input.direction,
            amountIn: input.amountIn,
            recipient: input.recipient,
            deadlineUnixSeconds: input.deadlineUnixSeconds,
            maxSlippageBps: input.policy.maxSlippageBps,
          })
        : await preparePancake({
            profileId: input.profileId as ReviewedPancakeSwapV3ProfileId,
            direction: input.direction,
            amountIn: input.amountIn,
            recipient: input.recipient,
            deadlineUnixSeconds: input.deadlineUnixSeconds,
            maxSlippageBps: input.policy.maxSlippageBps,
          });
  } catch {
    return complete(
      baseResult(input, evaluatedAt, 'BLOCK', ['PREPARATION_OR_EVIDENCE_UNAVAILABLE'], {
        validUntil: null,
        market: null,
        binding: null,
        oracleChecks: null,
        preTradeAttestations: null,
        transactionsToSign: null,
        next: noCallsNext('BLOCK'),
      })
    );
  }

  const observedAtSeconds = timestampSeconds(prepared.quote.observedAt);
  const quoteAgeSeconds = observedAtSeconds === null ? null : now - observedAtSeconds;
  const validUntil =
    observedAtSeconds === null
      ? null
      : Math.min(input.deadlineUnixSeconds, observedAtSeconds + input.policy.maxQuoteAgeSeconds);
  const { market, binding } = marketAndBinding(prepared, assets, quoteAgeSeconds);
  const exactReasons: string[] = [];

  if (!preparedCallBindingIsValid(prepared, input)) {
    exactReasons.push('PREPARED_CALL_BINDING_INVALID');
  }

  if (
    observedAtSeconds === null ||
    quoteAgeSeconds === null ||
    quoteAgeSeconds < -5 ||
    validUntil === null ||
    validUntil <= now
  ) {
    exactReasons.push('QUOTE_EXPIRED_OR_TIMESTAMP_INVALID');
  }
  if (!finiteNonnegative(prepared.quote.sourceFreshnessSeconds)) {
    exactReasons.push('QUOTE_SOURCE_FRESHNESS_INVALID');
  } else if (prepared.quote.sourceFreshnessSeconds > input.policy.maxQuoteAgeSeconds) {
    exactReasons.push('QUOTE_SOURCE_FRESHNESS_EXCEEDED');
  }
  if (
    !finitePositive(effectiveDestinationPerSource(prepared)) ||
    !finiteNonnegative(prepared.quote.quote.priceImpactBps) ||
    !finiteNonnegative(twapDeviationBps(prepared))
  ) {
    exactReasons.push('QUOTE_METRICS_INVALID');
  } else {
    if (prepared.quote.quote.priceImpactBps > input.policy.maxPriceImpactBps)
      exactReasons.push('PRICE_IMPACT_EXCEEDS_POLICY');
    if (twapDeviationBps(prepared) > input.policy.maxTwapDeviationBps)
      exactReasons.push('TWAP_DEVIATION_EXCEEDS_POLICY');
  }

  if (exactReasons.length > 0) {
    return complete(
      baseResult(input, evaluatedAt, 'BLOCK', exactReasons, {
        validUntil,
        market,
        binding,
        oracleChecks: null,
        preTradeAttestations: null,
        transactionsToSign: null,
        next: noCallsNext('BLOCK'),
      })
    );
  }

  const sourceTradeAmountUsd = prepared.quote.quote.amountIn * input.sourceDecisionPriceUsd;
  const destinationDeclaredTradeAmountUsd =
    prepared.quote.quote.amountOut * input.destinationDecisionPriceUsd;
  if (!finitePositive(sourceTradeAmountUsd) || !finitePositive(destinationDeclaredTradeAmountUsd)) {
    return complete(
      baseResult(input, evaluatedAt, 'BLOCK', ['DECLARED_PRICE_SCOPE_INVALID'], {
        validUntil,
        market,
        binding,
        oracleChecks: null,
        preTradeAttestations: null,
        transactionsToSign: null,
        next: noCallsNext('BLOCK'),
      })
    );
  }

  const preTrade = dependencies.preTrade ?? preTradeSafetyCheck;
  let destination: PreTradeSafetyResult;
  try {
    // Establish this independently before converting the exact DEX quote to
    // USD. Otherwise a false destination price supplied by the agent could
    // make a false source-side route price appear internally consistent.
    destination = await preTrade({
      asset: assets.destination.symbol,
      destinationAsset: assets.source.symbol,
      chainId: spec.chainId,
      action: 'swap',
      tradeAmountUsd: destinationDeclaredTradeAmountUsd,
      schemaVersion: 3,
    });
  } catch {
    return complete(
      baseResult(input, evaluatedAt, 'BLOCK', ['ORACLE_EVIDENCE_UNAVAILABLE'], {
        validUntil,
        market,
        binding,
        oracleChecks: null,
        preTradeAttestations: null,
        transactionsToSign: null,
        next: noCallsNext('BLOCK'),
      })
    );
  }

  const destinationSummary = oracleSummary(
    assets.destination.symbol,
    destination,
    input.destinationDecisionPriceUsd
  );
  const destinationOnlyOracleChecks = {
    source: null,
    destination: destinationSummary,
  };
  const destinationOnlyAttestations = {
    source: null,
    destination: destination.attestation,
  };
  const destinationReasons: string[] = [];
  if (destination.verdict === 'DANGER' || destination.verdict === 'BLOCK') {
    destinationReasons.push('DESTINATION_ORACLE_RISK_REJECTED');
  }
  if (!finitePositive(destination.consensusPrice)) {
    destinationReasons.push('DESTINATION_CONSENSUS_PRICE_INVALID');
  } else if (
    destinationSummary.decisionPriceDeviationBps === null ||
    destinationSummary.decisionPriceDeviationBps > input.policy.maxReferenceDeviationBps
  ) {
    destinationReasons.push('DESTINATION_DECISION_PRICE_DEVIATION_EXCEEDED');
  }
  if (destinationReasons.length > 0) {
    return complete(
      baseResult(input, evaluatedAt, 'BLOCK', destinationReasons, {
        validUntil,
        market,
        binding,
        oracleChecks: destinationOnlyOracleChecks,
        preTradeAttestations: destinationOnlyAttestations,
        transactionsToSign: null,
        next: noCallsNext('BLOCK'),
      })
    );
  }
  if (isExpired(validUntil, currentUnixSeconds(dependencies.nowUnixSeconds))) {
    return complete(
      baseResult(input, evaluatedAt, 'BLOCK', ['QUOTE_EXPIRED_DURING_ASSESSMENT'], {
        validUntil,
        market,
        binding,
        oracleChecks: destinationOnlyOracleChecks,
        preTradeAttestations: destinationOnlyAttestations,
        transactionsToSign: null,
        next: noCallsNext('BLOCK'),
      })
    );
  }

  const routeQuotePriceUsd = effectiveDestinationPerSource(prepared) * destination.consensusPrice;
  if (!finitePositive(routeQuotePriceUsd)) {
    return complete(
      baseResult(input, evaluatedAt, 'BLOCK', ['ROUTE_QUOTE_PRICE_INVALID'], {
        validUntil,
        market,
        binding,
        oracleChecks: destinationOnlyOracleChecks,
        preTradeAttestations: destinationOnlyAttestations,
        transactionsToSign: null,
        next: noCallsNext('BLOCK'),
      })
    );
  }
  // marketAndBinding is populated immediately after a successful preparation.
  // Keep this runtime guard so a future refactor cannot silently turn a partial
  // result into a signable response.
  if (!market) {
    return complete(
      baseResult(input, evaluatedAt, 'BLOCK', ['PREPARED_MARKET_INVALID'], {
        validUntil,
        market: null,
        binding,
        oracleChecks: destinationOnlyOracleChecks,
        preTradeAttestations: destinationOnlyAttestations,
        transactionsToSign: null,
        next: noCallsNext('BLOCK'),
      })
    );
  }
  const marketWithIndependentDestinationPrice = {
    ...market,
    exactInput: {
      ...market.exactInput,
      routeQuotePriceUsd,
      destinationConsensusPriceUsd: destination.consensusPrice,
    },
  };

  let source: PreTradeSafetyResult;
  try {
    source = await preTrade({
      asset: assets.source.symbol,
      destinationAsset: assets.destination.symbol,
      chainId: spec.chainId,
      action: 'swap',
      tradeAmountUsd: sourceTradeAmountUsd,
      schemaVersion: 3,
      decisionInput: {
        decisionPriceUsd: input.sourceDecisionPriceUsd,
        quotePriceUsd: routeQuotePriceUsd,
        quoteObservedAt: prepared.quote.observedAt,
        maxReferenceDeviationBps: input.policy.maxReferenceDeviationBps,
        maxSlippageBps: input.policy.maxSlippageBps,
        maxQuoteAgeSeconds: input.policy.maxQuoteAgeSeconds,
        ...(spec.kind === 'aerodrome-slipstream-exact-input-v1'
          ? {
              reviewedAerodromeSlipstream: {
                amountIn: input.amountIn,
                maxQuoteDeviationBps: input.policy.maxReferenceDeviationBps,
                maxTwapDeviationBps: input.policy.maxTwapDeviationBps,
              },
            }
          : {
              reviewedUniswapV3: {
                amountIn: input.amountIn,
                maxQuoteDeviationBps: input.policy.maxReferenceDeviationBps,
                maxTwapDeviationBps: input.policy.maxTwapDeviationBps,
              },
            }),
      },
    });
  } catch {
    return complete(
      baseResult(input, evaluatedAt, 'BLOCK', ['ORACLE_EVIDENCE_UNAVAILABLE'], {
        validUntil,
        market: marketWithIndependentDestinationPrice,
        binding,
        oracleChecks: destinationOnlyOracleChecks,
        preTradeAttestations: destinationOnlyAttestations,
        transactionsToSign: null,
        next: noCallsNext('BLOCK'),
      })
    );
  }

  const sourceSummary = oracleSummary(assets.source.symbol, source, input.sourceDecisionPriceUsd);
  const oracleChecks = {
    source: sourceSummary,
    destination: destinationSummary,
  };
  const preTradeAttestations = {
    source: source.attestation,
    destination: destination.attestation,
  };
  if (isExpired(validUntil, currentUnixSeconds(dependencies.nowUnixSeconds))) {
    return complete(
      baseResult(input, evaluatedAt, 'BLOCK', ['QUOTE_EXPIRED_DURING_ASSESSMENT'], {
        validUntil,
        market: marketWithIndependentDestinationPrice,
        binding,
        oracleChecks,
        preTradeAttestations,
        transactionsToSign: null,
        next: noCallsNext('BLOCK'),
      })
    );
  }
  const oracleReasons: string[] = [];
  if (source.decisionInputAssessment?.status !== 'SUFFICIENT') {
    oracleReasons.push('SOURCE_DECISION_INPUT_INSUFFICIENT');
  }
  if (!finitePositive(source.consensusPrice)) {
    oracleReasons.push('SOURCE_CONSENSUS_PRICE_INVALID');
  } else if (
    sourceSummary.decisionPriceDeviationBps === null ||
    sourceSummary.decisionPriceDeviationBps > input.policy.maxReferenceDeviationBps
  ) {
    oracleReasons.push('SOURCE_DECISION_PRICE_DEVIATION_EXCEEDED');
  }
  if (source.verdict === 'DANGER' || source.verdict === 'BLOCK') {
    oracleReasons.push('SOURCE_ORACLE_RISK_REJECTED');
  }
  if (oracleReasons.length > 0) {
    return complete(
      baseResult(input, evaluatedAt, 'BLOCK', oracleReasons, {
        validUntil,
        market: marketWithIndependentDestinationPrice,
        binding,
        oracleChecks,
        preTradeAttestations,
        transactionsToSign: null,
        next: noCallsNext('BLOCK'),
      })
    );
  }
  if (source.verdict === 'CAUTION' || destination.verdict === 'CAUTION') {
    return complete(
      baseResult(input, evaluatedAt, 'CAUTION', ['ORACLE_CAUTION_REQUIRES_NEW_ASSESSMENT'], {
        validUntil,
        market: marketWithIndependentDestinationPrice,
        binding,
        oracleChecks,
        preTradeAttestations,
        transactionsToSign: null,
        next: noCallsNext('CAUTION'),
      })
    );
  }

  return complete(
    baseResult(input, evaluatedAt, 'ALLOW', [], {
      validUntil,
      market: marketWithIndependentDestinationPrice,
      binding,
      oracleChecks,
      preTradeAttestations,
      transactionsToSign: {
        approval: {
          // ERC-20 approve calldata must be sent to the input token contract,
          // not to the router which will receive the allowance. Keeping those
          // two addresses distinct is essential for an exact-call authorization.
          to: prepared.approval.token,
          value: '0x0',
          data: prepared.approval.data,
        },
        swap: {
          to: prepared.transaction.to,
          value: '0x0',
          data: prepared.transaction.data,
        },
      },
      next: {
        humanConfirmationRequired: true,
        action: 'bind_and_request_user_confirmation',
        priorSeal: 'Bind decisionHash and the identical approval/swap calls before authorization.',
      },
    })
  );
}
