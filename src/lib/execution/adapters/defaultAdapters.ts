import { keccak256, stringToHex } from 'viem';

import {
  prepareAerodromeSlipstreamExactInput,
  type PrepareAerodromeSlipstreamExactInputRequest,
  type PreparedAerodromeSlipstreamExactInput,
} from '@/lib/dex/aerodromeSlipstreamSwap';
import {
  verifyHyperliquidPerpExecution,
  type HyperliquidPerpExecutionEvidence,
  type HyperliquidPerpExecutionVerificationRequest,
} from '@/lib/dex/hyperliquidPerpExecution';
import {
  prepareHyperliquidPerpOrder,
  type HyperliquidPerpOrderPreflight,
  type HyperliquidPerpOrderPreflightRequest,
} from '@/lib/dex/hyperliquidPerpOrder';
import {
  preparePancakeSwapV3ExactInput,
  type PreparePancakeSwapV3ExactInputRequest,
  type PreparedPancakeSwapV3ExactInput,
} from '@/lib/dex/pancakeSwapV3Swap';
import {
  serializeUnsignedSolanaLendingTransaction,
  solanaLendingMessageHash,
} from '@/lib/lending/solanaLendingAction';
import {
  assessSolanaLendingGuard,
  type SolanaLendingGuardExactInput,
  type SolanaLendingGuardResult,
} from '@/lib/lending/solanaLendingGuard';
import { canonicalJsonString } from '@/lib/utils/canonicalJson';

import {
  createPreparedExecution,
  ExecutionAdapterRegistry,
  type ExecutionAdapter,
  type ExecutionObservation,
  type ExecutionReference,
  type PreparedExecution,
} from './contracts';

type EvmExactInput = PreparedAerodromeSlipstreamExactInput | PreparedPancakeSwapV3ExactInput;

function keccakIntent(value: unknown) {
  return {
    algorithm: 'keccak256' as const,
    digest: keccak256(stringToHex(canonicalJsonString(value))),
  };
}

function evmPrepared<Native extends EvmExactInput>(
  adapterId: string,
  native: Native
): PreparedExecution<Native> {
  return createPreparedExecution({
    schema: 'insight.prepared-execution.v1',
    adapterId,
    state: 'READY',
    authorization: 'user-controlled',
    intent: keccakIntent({ adapterId, transaction: native.transaction, approval: native.approval }),
    observedAt: native.quote.observedAt,
    expiresAt: new Date(native.exactInput.deadlineUnixSeconds * 1_000).toISOString(),
    evidence: [
      {
        kind: 'pinned-quote',
        observedAt: native.quote.observedAt,
        source: native.quote.venue,
      },
    ],
    caveats: native.caveats,
    payload: {
      kind: 'evm-transaction',
      chainId: native.chainId,
      transaction: native.transaction,
      approval: native.approval,
    },
    native,
  });
}

export const aerodromeSlipstreamAdapter: ExecutionAdapter<
  PrepareAerodromeSlipstreamExactInputRequest,
  PreparedAerodromeSlipstreamExactInput
> = {
  id: 'insight.evm.aerodrome-slipstream-exact-input.v1',
  family: 'evm',
  supportsObservation: false,
  async preflight(request, options) {
    return evmPrepared(
      this.id,
      options?.signal
        ? await prepareAerodromeSlipstreamExactInput(request, { signal: options.signal })
        : await prepareAerodromeSlipstreamExactInput(request)
    );
  },
};

export const pancakeSwapV3Adapter: ExecutionAdapter<
  PreparePancakeSwapV3ExactInputRequest,
  PreparedPancakeSwapV3ExactInput
> = {
  id: 'insight.evm.pancakeswap-v3-exact-input.v1',
  family: 'evm',
  supportsObservation: false,
  async preflight(request, options) {
    return evmPrepared(
      this.id,
      options?.signal
        ? await preparePancakeSwapV3ExactInput(request, { signal: options.signal })
        : await preparePancakeSwapV3ExactInput(request)
    );
  },
};

export const solanaLendingAdapter: ExecutionAdapter<
  SolanaLendingGuardExactInput,
  SolanaLendingGuardResult
> = {
  id: 'insight.solana.direct-lending-guard.v1',
  family: 'solana',
  supportsObservation: false,
  async preflight(request) {
    const native = await assessSolanaLendingGuard(request.guard, request.transaction);
    const state =
      native.verdict === 'ALLOW' ? 'READY' : native.verdict === 'CAUTION' ? 'CAUTION' : 'BLOCK';
    const messageHash =
      native.exactAction?.messageHash ?? solanaLendingMessageHash(request.transaction);
    return createPreparedExecution({
      schema: 'insight.prepared-execution.v1',
      adapterId: this.id,
      state,
      authorization: 'user-controlled',
      intent: { algorithm: 'sha256', digest: messageHash },
      observedAt: native.evaluatedAt,
      expiresAt: null,
      evidence: [
        {
          kind: 'protocol-simulation',
          observedAt: native.simulation
            ? new Date(native.simulation.simulatedAt * 1_000).toISOString()
            : native.evaluatedAt,
          source: native.simulation?.network ?? 'solana-mainnet-rpc',
        },
      ],
      caveats: native.reasons,
      payload:
        state === 'BLOCK'
          ? null
          : {
              kind: 'solana-message',
              network: native.chainRef,
              transactionBase64: serializeUnsignedSolanaLendingTransaction(request.transaction),
              messageHash,
            },
      native,
    });
  },
};

function hyperliquidLifecycle(native: HyperliquidPerpExecutionEvidence) {
  if (!native.order.known) return 'NOT_FOUND' as const;
  if (native.order.status === 'filled') return 'CONFIRMED' as const;
  if (native.order.status === 'rejected' || native.order.status === 'canceled')
    return 'REVERTED' as const;
  return 'OBSERVED' as const;
}

export const hyperliquidPerpAdapter: ExecutionAdapter<
  HyperliquidPerpOrderPreflightRequest,
  HyperliquidPerpOrderPreflight,
  HyperliquidPerpExecutionEvidence
> = {
  id: 'insight.venue.hyperliquid-perp-ioc.v1',
  family: 'venue',
  supportsObservation: true,
  async preflight(request, options) {
    const native = options?.signal
      ? await prepareHyperliquidPerpOrder(request, { signal: options.signal })
      : await prepareHyperliquidPerpOrder(request);
    const ready = native.verdict === 'READY_TO_SIGN';
    return createPreparedExecution({
      schema: 'insight.prepared-execution.v1',
      adapterId: this.id,
      state: ready ? 'READY' : 'BLOCK',
      authorization: 'user-controlled',
      intent: { algorithm: 'keccak256', digest: native.intentHash },
      observedAt: native.observedAt,
      expiresAt: native.unsignedExchangeEnvelope
        ? new Date(native.unsignedExchangeEnvelope.expiresAfter).toISOString()
        : null,
      evidence: [
        {
          kind: 'displayed-order-book',
          observedAt: native.market.bookTimestamp,
          source: 'hyperliquid-info:l2Book+metaAndAssetCtxs',
        },
      ],
      caveats: native.caveats,
      payload: native.unsignedExchangeEnvelope
        ? {
            kind: 'venue-action',
            venue: 'hyperliquid',
            network: 'hyperliquid:mainnet',
            action: native.unsignedExchangeEnvelope.action,
            expiresAfter: native.unsignedExchangeEnvelope.expiresAfter,
          }
        : null,
      native,
    });
  },
  async observe(
    reference,
    expected,
    options
  ): Promise<ExecutionObservation<HyperliquidPerpExecutionEvidence>> {
    if (reference.kind !== 'venue-order' || reference.venue !== 'hyperliquid') {
      throw new TypeError('Hyperliquid observation requires a Hyperliquid venue order reference.');
    }
    const request = {
      ...(expected as Omit<HyperliquidPerpExecutionVerificationRequest, 'user' | 'orderId'>),
      user: reference.account,
      orderId: reference.clientOrderId,
    };
    const native = options?.signal
      ? await verifyHyperliquidPerpExecution(request, { signal: options.signal })
      : await verifyHyperliquidPerpExecution(request);
    return {
      schema: 'insight.execution-observation.v1',
      adapterId: this.id,
      reference,
      lifecycle: hyperliquidLifecycle(native),
      observedAt: native.observedAt,
      caveats: native.caveats,
      native,
    };
  },
};

/** The default registry contains protocol adapters, not product-specific routes. */
export function createDefaultExecutionAdapterRegistry(): ExecutionAdapterRegistry {
  return new ExecutionAdapterRegistry()
    .register(aerodromeSlipstreamAdapter)
    .register(pancakeSwapV3Adapter)
    .register(solanaLendingAdapter)
    .register(hyperliquidPerpAdapter);
}

/** Shared application registry; it has no network or wallet side effects at import time. */
export const executionAdapterRegistry = createDefaultExecutionAdapterRegistry();

export function isHyperliquidOrderReference(
  value: ExecutionReference
): value is Extract<ExecutionReference, { kind: 'venue-order' }> {
  return value.kind === 'venue-order' && value.venue === 'hyperliquid';
}
