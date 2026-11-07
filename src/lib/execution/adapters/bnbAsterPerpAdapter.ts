/**
 * BNB Aster perpetual-order adapter.
 *
 * Aster is a centralized venue: the artifact is an HTTPS REST order body, not
 * calldata. The payload member therefore states `provesOnchainExecution: false`
 * and requires user-held venue credentials instead of hiding that in a string.
 */

import {
  prepareBnbPerpOrderEnvelope,
  type BnbPerpOrderEnvelope,
  type BnbPerpOrderEnvelopeRequest,
} from '@/lib/perps/bnbPerpOrderEnvelope';

import { noVenueFeeCommercialTerms } from '../commerce';

import { createPreparedExecution, type ExecutionAdapter } from './contracts';

export const BNB_ASTER_PERPS_ADAPTER_ID = 'insight.venue.aster-perps-order.v1';

export const bnbAsterPerpAdapter: ExecutionAdapter<
  BnbPerpOrderEnvelopeRequest,
  BnbPerpOrderEnvelope
> = {
  id: BNB_ASTER_PERPS_ADAPTER_ID,
  family: 'venue',
  supportsObservation: false,
  async preflight(request) {
    const native = await prepareBnbPerpOrderEnvelope(request);
    const state = native.verdict === 'READY_TO_SIGN' ? 'READY' : 'BLOCK';
    const expiresAt = new Date(native.quote.validUntil * 1_000).toISOString();
    const order = native.unsignedOrderEnvelope;
    return createPreparedExecution({
      schema: 'insight.prepared-execution.v1',
      adapterId: this.id,
      state,
      authorization: 'user-controlled',
      intent: { algorithm: 'keccak256', digest: native.intentHash },
      observedAt: native.observedAt,
      expiresAt,
      validityAnchor: { kind: 'venue-policy', venue: 'aster', expiresAt },
      evidence: [
        {
          kind: 'venue-order-metadata',
          observedAt: native.observedAt,
          source: native.quote.source,
        },
      ],
      caveats: native.caveats,
      commerce: noVenueFeeCommercialTerms(),
      payload:
        state === 'BLOCK' || order === null
          ? null
          : {
              kind: 'venue-rest-order',
              venue: order.venue,
              network: native.chain.caip2,
              transport: 'https',
              endpoint: order.endpoint,
              payload: order.payload as unknown as Record<string, unknown>,
              payloadHash: order.payloadHash,
              bindingSurface: order.bindingSurface,
              provesOnchainExecution: false,
              signing: order.signing,
            },
      native,
    });
  },
};
