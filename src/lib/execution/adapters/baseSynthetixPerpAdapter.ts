/**
 * Base Synthetix Perps V3 order adapter.
 *
 * Thin wrapper around the reviewed order-envelope module: it does not re-run
 * guard rules or rebuild calldata. The payload is real EVM calldata, so the
 * preflight state is READY exactly when the envelope verdict is READY_TO_SIGN.
 */

import {
  prepareBasePerpOrderEnvelope,
  type BasePerpOrderEnvelope,
  type BasePerpOrderEnvelopeRequest,
} from '@/lib/perps/basePerpOrderEnvelope';

import { noVenueFeeCommercialTerms } from '../commerce';

import { createPreparedExecution, type ExecutionAdapter } from './contracts';

export const BASE_SYNTHETIX_PERPS_ADAPTER_ID = 'insight.evm.synthetix-perps-v3-order.v1';

export const baseSynthetixPerpAdapter: ExecutionAdapter<
  BasePerpOrderEnvelopeRequest,
  BasePerpOrderEnvelope
> = {
  id: BASE_SYNTHETIX_PERPS_ADAPTER_ID,
  family: 'evm',
  supportsObservation: false,
  async preflight(request) {
    const native = await prepareBasePerpOrderEnvelope(request);
    const state = native.verdict === 'READY_TO_SIGN' ? 'READY' : 'BLOCK';
    // The exact call carries no on-chain deadline; validity is the adapter's
    // observed quote window. The observed block stays in `native.observation`.
    const expiresAt = new Date(native.quote.validUntil * 1_000).toISOString();
    const transaction = native.unsignedTransaction;
    return createPreparedExecution({
      schema: 'insight.prepared-execution.v1',
      adapterId: this.id,
      state,
      authorization: 'user-controlled',
      intent: { algorithm: 'keccak256', digest: native.intentHash },
      observedAt: native.observedAt,
      expiresAt,
      validityAnchor: { kind: 'timestamp', expiresAt },
      evidence: [
        {
          kind: 'oracle-consensus-quote',
          observedAt: native.observedAt,
          source: native.quote.source,
        },
      ],
      caveats: native.caveats,
      commerce: noVenueFeeCommercialTerms(),
      payload:
        state === 'BLOCK' || transaction === null
          ? null
          : {
              kind: 'evm-transaction',
              chainId: native.chain.chainId,
              transaction: {
                to: transaction.to,
                data: transaction.data,
                value: `0x${BigInt(transaction.value).toString(16)}`,
              },
            },
      native,
    });
  },
};
