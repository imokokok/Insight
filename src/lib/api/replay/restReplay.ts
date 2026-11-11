import { type NextRequest, type NextResponse } from 'next/server';

import { isDeterministicZeroReason } from '@/lib/billing/exemptions';
import { getCachedMcpResult, setCachedMcpResult } from '@/lib/billing/requestIdempotency';

import { type RestChargeOutcome } from '../billing/restBilling';
import { snapshotResponse } from '../transport/responseSnapshot';

/** Read the body through a clone so retry fingerprints do not consume it. */
export async function readBodyForFingerprint(request: NextRequest): Promise<string> {
  if (request.method === 'GET' || request.method === 'HEAD') return '';
  try {
    return await request.clone().text();
  } catch {
    return '';
  }
}

/** Cache a confirmed success, or a deterministic terminal zero-charge outcome. */
export async function cacheRestReplayResult(params: {
  replayKey: string;
  response: NextResponse;
  chargedCost: number;
  chargedItems: number;
  receiptKey: string;
  zeroReason?: string;
}): Promise<NextResponse> {
  try {
    const snapshot = await snapshotResponse(params.response);
    setCachedMcpResult(params.replayKey, {
      priceCredits: params.chargedCost,
      billableItems: params.chargedItems,
      zeroReason: params.zeroReason,
      result: null,
      rest: {
        status: snapshot.response.status,
        contentType: snapshot.response.headers.get('content-type'),
        body: snapshot.body,
        receipt: params.receiptKey,
      },
    });
    return snapshot.response;
  } catch {
    return params.response;
  }
}

/** Cache priced successes and deterministic all-failed batches only. */
export function shouldCacheRestResult(
  exemption: string | undefined,
  chargedCost: number,
  charge: RestChargeOutcome | null
): boolean {
  return (
    isDeterministicZeroReason(exemption) ||
    (chargedCost > 0 && charge?.ok === true && charge.confirmed !== false)
  );
}

export { getCachedMcpResult };
