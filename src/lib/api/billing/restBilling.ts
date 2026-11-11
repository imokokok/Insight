import { NextResponse } from 'next/server';

import { applyCreditBillingHeaders } from '@/lib/billing/billingHeaders';
import { consumeCredits, recordWaivedCredit } from '@/lib/billing/creditWallet';
import { BILLING_ZERO_REASONS, isDeterministicZeroReason } from '@/lib/billing/exemptions';
import {
  BATCH_UNIT_CREDITS,
  CREDIT_EXHAUSTED_RETRY_AFTER_SECONDS,
  REST_BATCH_METERED_PATHS,
} from '@/lib/billing/metering';

import { type QuotaInfo } from '../middleware';
import { ApiResponseBuilder } from '../response';
import { snapshotResponse } from '../transport/responseSnapshot';

export interface RestChargeOutcome {
  ok: boolean;
  confirmed?: boolean;
  idempotent?: boolean;
  balance?: number;
  reason?: string;
}

/** Count batch rows that actually delivered usable data. */
export async function countUsableBatchRows(
  response: NextResponse
): Promise<{ usable: number | null; response: NextResponse }> {
  try {
    const snapshot = await snapshotResponse(response);
    const body: unknown = JSON.parse(snapshot.body);
    if (body === null || typeof body !== 'object') {
      return { usable: null, response: snapshot.response };
    }
    const rows = (body as { data?: unknown }).data;
    if (!Array.isArray(rows)) return { usable: null, response: snapshot.response };
    return {
      usable: rows.filter((row) => {
        if (row === null || typeof row !== 'object') return false;
        return (row as { error?: unknown }).error === null;
      }).length,
      response: snapshot.response,
    };
  } catch {
    return { usable: null, response };
  }
}

/** Emit the canonical per-request X-Credit-* receipt. */
export function applyRestBillingReceipt(
  response: NextResponse,
  quotaInfo: QuotaInfo | undefined,
  charge: RestChargeOutcome | null,
  exemption?: string,
  billedItems?: number,
  receipt?: string | null
): void {
  if (quotaInfo?.creditCost === undefined) return;
  const items = billedItems ?? quotaInfo.billableItems ?? 1;
  const priceCredits = exemption
    ? 0
    : quotaInfo.creditUnitCost !== undefined
      ? quotaInfo.creditUnitCost * items
      : quotaInfo.creditCost;
  const status = isDeterministicZeroReason(exemption)
    ? 'waived'
    : exemption
      ? 'not_charged'
      : charge?.confirmed === false
        ? 'degraded'
        : charge?.ok
          ? charge.idempotent
            ? 'replayed'
            : 'charged'
          : 'not_charged';
  const charged = status === 'charged';
  const balanceAfter = charge?.balance ?? null;
  const balance =
    quotaInfo.creditBalance ??
    (charged && balanceAfter !== null ? balanceAfter + priceCredits : balanceAfter);
  applyCreditBillingHeaders(response.headers, {
    costCredits: priceCredits,
    balance,
    balanceAfter,
    status,
    zeroReason: isDeterministicZeroReason(exemption)
      ? exemption
      : exemption === 'upstream_timeout'
        ? BILLING_ZERO_REASONS.timeout
        : undefined,
    receipt,
  });
}

export function buildConsumeRejectedResponse(input: {
  cost: number;
  quotaInfo: QuotaInfo | undefined;
  charge: RestChargeOutcome;
  receiptKey: string;
}): NextResponse {
  const response = NextResponse.json(
    ApiResponseBuilder.error(
      'CREDIT_EXHAUSTED',
      `This call requires ${input.cost} credit${input.cost === 1 ? '' : 's'} but the charge could not be applied. Top up at /pricing.`,
      { retryable: false, details: { reason: input.charge.reason, cost: input.cost } }
    ),
    { status: 402 }
  );
  response.headers.set('X-Credit-Cost', String(input.cost));
  response.headers.set('X-Credit-Receipt', input.receiptKey);
  response.headers.set('X-Credit-Status', 'not_charged');
  response.headers.set('Retry-After', String(CREDIT_EXHAUSTED_RETRY_AFTER_SECONDS));
  applyRestBillingReceipt(response, input.quotaInfo, input.charge);
  return response;
}

export function buildSettlementUnavailableResponse(input: {
  cost: number;
  quotaInfo: QuotaInfo | undefined;
  charge: RestChargeOutcome;
}): NextResponse {
  const response = NextResponse.json(
    ApiResponseBuilder.error(
      'CREDIT_SETTLEMENT_UNAVAILABLE',
      'The credit ledger is temporarily unavailable. Retry shortly; this call was not charged.',
      { retryable: true, details: { cost: input.cost } }
    ),
    { status: 503 }
  );
  response.headers.set('Retry-After', '30');
  applyRestBillingReceipt(response, input.quotaInfo, input.charge);
  return response;
}

export async function chargeRestRequest(params: {
  path: string;
  pendingCharge: NonNullable<QuotaInfo['pendingCharge']>;
  quotaInfo: QuotaInfo | undefined;
  chargedCost: number;
  chargedItems: number;
  exemption: string | undefined;
}): Promise<RestChargeOutcome> {
  const { pendingCharge } = params;
  const isBatch = REST_BATCH_METERED_PATHS.has(params.path);
  const requestedItems = params.quotaInfo?.billableItems ?? 1;
  const reason = params.exemption
    ? BILLING_ZERO_REASONS.insufficientData
    : isBatch
      ? params.chargedItems < requestedItems
        ? 'batch_partial'
        : 'prices.batch'
      : params.path;
  return consumeCredits(
    pendingCharge.apiKeyId,
    params.chargedCost,
    pendingCharge.meteringKey,
    params.path,
    {
      reason,
      requestId: pendingCharge.meteringKey,
      meta: isBatch ? { requested: requestedItems, charged: params.chargedItems } : undefined,
      previousMeteringKey: pendingCharge.previousMeteringKey,
    }
  );
}

export async function recordBatchWaiver(
  pendingCharge: NonNullable<QuotaInfo['pendingCharge']>,
  path: string,
  quotaInfo: QuotaInfo | undefined
): Promise<void> {
  await recordWaivedCredit({
    keyId: pendingCharge.apiKeyId,
    meteringKey: pendingCharge.meteringKey,
    ref: path,
    reason: BILLING_ZERO_REASONS.upstreamFailed,
    meta: { requested: quotaInfo?.billableItems ?? 1, charged: 0 },
  });
}

export async function echoBatchBilling(
  response: NextResponse,
  quotaInfo: QuotaInfo | undefined,
  chargedCost: number,
  chargedItems: number,
  exemption: string | undefined
): Promise<NextResponse> {
  const requestedItems = quotaInfo?.billableItems ?? 1;
  const status =
    chargedCost === 0
      ? isDeterministicZeroReason(exemption)
        ? 'waived'
        : 'not_charged'
      : chargedItems < requestedItems
        ? 'batch_partial'
        : 'charged';
  try {
    const snapshot = await snapshotResponse(response);
    const parsed = JSON.parse(snapshot.body) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return response;
    parsed.billing = {
      itemsRequested: requestedItems,
      itemsCharged: chargedItems,
      unitCredits: BATCH_UNIT_CREDITS,
      costCredits: chargedCost,
      status,
    };
    return new NextResponse(snapshot.body ? JSON.stringify(parsed) : snapshot.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch {
    return response;
  }
}

export async function maybeRecordErrorWaiver(params: {
  keyId: string | undefined;
  receiptKey: string | null;
  path: string;
  exemption: string;
}): Promise<void> {
  if (!params.keyId || !params.receiptKey) return;
  if (
    params.exemption !== BILLING_ZERO_REASONS.insufficientData &&
    params.exemption !== 'upstream_timeout'
  ) {
    return;
  }
  await recordWaivedCredit({
    keyId: params.keyId,
    meteringKey: params.receiptKey,
    ref: params.path,
    reason:
      params.exemption === BILLING_ZERO_REASONS.insufficientData
        ? BILLING_ZERO_REASONS.insufficientData
        : BILLING_ZERO_REASONS.timeout,
  });
}
