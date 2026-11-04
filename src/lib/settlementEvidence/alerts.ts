/**
 * Outbound alert for inconsistent settlement evidence.
 *
 * When a graded window's declared outcome differs from Insight's independent
 * verdict, the collector can push a compact alert to a configured webhook
 * (Slack-compatible payload: `{ text }`). Delivery is best-effort BY DESIGN:
 * an alert outage must never fail the collection run or mutate stored
 * evidence — the pack is already persisted; the webhook is a notification
 * surface, not a durability mechanism.
 */

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('SettlementEvidenceAlerts');

const ALERT_WEBHOOK_ENV = 'SETTLEMENT_ALERT_WEBHOOK_URL';
const ALERT_TIMEOUT_MS = 10_000;

export interface InconsistentAlert {
  marketSlug: string;
  asset: string;
  settlementVenue: string;
  declaredOutcome: string | null;
  independentOutcome: string | null;
  priceChangeBps: number | null;
  oracleDeviationBps: number | null;
  candleCoverageE4: number | null;
  windowStartMs: number;
  windowEndMs: number;
  payloadHash: string;
}

export function alertWebhookUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env[ALERT_WEBHOOK_ENV]?.trim();
  if (!raw) return null;
  if (!/^https:\/\//.test(raw)) {
    // An http:// webhook would leak settlement findings in cleartext; fail
    // closed to "no alerting" rather than sending.
    logger.warn('Ignoring non-https alert webhook URL', { env: ALERT_WEBHOOK_ENV });
    return null;
  }
  return raw;
}

export function formatInconsistentAlertText(alerts: InconsistentAlert[]): string {
  const head =
    alerts.length === 1
      ? '⚠️ 1 inconsistent prediction-market settlement'
      : `⚠️ ${alerts.length} inconsistent prediction-market settlements`;
  const lines = alerts.map(
    (a) =>
      `• ${a.marketSlug} (${a.asset}, ${a.settlementVenue}): declared ${a.declaredOutcome ?? 'n/a'} vs independent ${a.independentOutcome ?? 'n/a'}, window ${a.priceChangeBps ?? 'n/a'} bps, oracle dev ${a.oracleDeviationBps ?? 'n/a'} bps, hash ${a.payloadHash.slice(0, 12)}…`
  );
  return [head, ...lines].join('\n');
}

/** Fire-and-forget alert delivery. Resolves to the number of alerts delivered
 *  (0 when no webhook is configured) and never throws. */
export async function sendInconsistentAlerts(
  alerts: InconsistentAlert[],
  options?: { webhookUrl?: string | null; fetchImpl?: typeof fetch }
): Promise<number> {
  if (alerts.length === 0) return 0;
  const webhookUrl = options?.webhookUrl !== undefined ? options.webhookUrl : alertWebhookUrl();
  if (!webhookUrl) return 0;
  try {
    const response = await (options?.fetchImpl ?? fetch)(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: formatInconsistentAlertText(alerts) }),
      signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.warn('Settlement alert webhook rejected the payload', {
        status: response.status,
        count: alerts.length,
      });
      return 0;
    }
    logger.info('Settlement alert delivered', { count: alerts.length });
    return alerts.length;
  } catch (error) {
    logger.warn('Settlement alert delivery failed', {
      count: alerts.length,
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}
