import { createServiceRoleClient } from '@/lib/supabase/server';
import { addDay } from '@/lib/utils/date';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export interface FeedFailureIncident {
  type: 'feed_failure';
  severity: SeverityLevel;
  status: 'ongoing' | 'recovered';
  provider: string;
  symbol: string;
  chainId: number;
  feedName: string;
  feedId: string;
  consecutiveFailures: number;
  isActive: boolean;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  description: string;
}

export interface DeviationEventIncident {
  type: 'deviation_event';
  severity: SeverityLevel;
  status: 'recorded';
  provider: string;
  symbol: string;
  snapshotTime: string;
  isSuccess: boolean;
  failureMode: string | null;
  deviationPct: number | null;
  errorMessage: string | null;
  description: string;
}

export type Incident = FeedFailureIncident | DeviationEventIncident;

export interface IncidentServiceInput {
  from: string;
  to: string;
  provider?: string;
  minSeverity?: SeverityLevel;
  limit: number;
  offset: number;
}

export interface IncidentServiceResult {
  from: string;
  to: string;
  total: number;
  bySeverity: Record<SeverityLevel, number>;
  byType: Record<string, number>;
  incidents: Incident[];
}

export function classifySeverity(
  consecutiveFailures: number,
  isFailure: boolean,
  deviationPct: number | null
): SeverityLevel {
  if (consecutiveFailures >= 5) return 'critical';
  if (consecutiveFailures >= 3) return 'high';
  if (isFailure && consecutiveFailures >= 1) return 'medium';
  if (deviationPct != null && Math.abs(deviationPct) > 2) return 'high';
  if (deviationPct != null && Math.abs(deviationPct) > 0.5) return 'medium';
  return 'low';
}

/**
 * Aggregate oracle incidents from oracle_feeds and reputation_history.
 * Shared between the v1/incidents API route and the MCP get_incidents tool.
 */
export async function getIncidentAggregation(
  input: IncidentServiceInput
): Promise<IncidentServiceResult> {
  const { provider, minSeverity, from, to, limit, offset } = input;

  const supabase = createServiceRoleClient();

  let feedQuery = supabase
    .from('oracle_feeds')
    .select(
      'id, provider, symbol, chain_id, name, consecutive_failures, last_success_at, last_failure_at, is_active'
    )
    .gte('last_failure_at', from);

  if (provider) {
    feedQuery = feedQuery.eq('provider', provider);
  }

  const { data: feedsData, error: feedsError } = await feedQuery;

  if (feedsError) {
    throw new Error(`Failed to fetch incident data: ${feedsError.message}`);
  }

  let historyQuery = supabase
    .from('reputation_history')
    .select(
      'provider, symbol, snapshot_time, is_success, error_message, failure_mode, deviation_pct'
    )
    .gte('snapshot_time', from)
    .lt('snapshot_time', addDay(to))
    .or('is_success.eq.false,deviation_pct.gt.1')
    .order('snapshot_time', { ascending: false });

  if (provider) {
    historyQuery = historyQuery.eq('provider', provider);
  }

  const { data: historyData, error: historyError } = await historyQuery;

  if (historyError) {
    throw new Error(`Failed to fetch incident history: ${historyError.message}`);
  }

  const feedIncidents: FeedFailureIncident[] = (feedsData ?? []).map((feed) => {
    const severity = classifySeverity(feed.consecutive_failures, true, null);
    const status: 'ongoing' | 'recovered' =
      feed.consecutive_failures === 0 && feed.last_success_at ? 'recovered' : 'ongoing';

    return {
      type: 'feed_failure',
      severity,
      status,
      provider: feed.provider,
      symbol: feed.symbol,
      chainId: feed.chain_id,
      feedName: feed.name,
      feedId: feed.id,
      consecutiveFailures: feed.consecutive_failures,
      isActive: feed.is_active,
      lastSuccessAt: feed.last_success_at,
      lastFailureAt: feed.last_failure_at,
      description: `${feed.provider}/${feed.symbol} has ${feed.consecutive_failures} consecutive failure(s). ${status === 'ongoing' ? 'Incident is ongoing.' : 'Feed has recovered.'}`,
    };
  });

  const historyIncidents: DeviationEventIncident[] = (historyData ?? []).map((record) => {
    const severity = classifySeverity(0, !record.is_success, record.deviation_pct);
    return {
      type: 'deviation_event',
      severity,
      status: 'recorded',
      provider: record.provider,
      symbol: record.symbol,
      snapshotTime: record.snapshot_time,
      isSuccess: record.is_success,
      failureMode: record.failure_mode,
      deviationPct: record.deviation_pct,
      errorMessage: record.error_message,
      description: record.is_success
        ? `${record.provider}/${record.symbol} deviated ${Math.abs(record.deviation_pct ?? 0).toFixed(2)}% from consensus at ${record.snapshot_time}`
        : `${record.provider}/${record.symbol} failed at ${record.snapshot_time}: ${record.error_message ?? 'Unknown error'}`,
    };
  });

  const allIncidents = [...feedIncidents, ...historyIncidents];

  const minOrder = minSeverity ? SEVERITY_ORDER[minSeverity] : 0;
  const filtered = allIncidents.filter((incident) => SEVERITY_ORDER[incident.severity] >= minOrder);

  filtered.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);

  const paged = filtered.slice(offset, offset + limit);

  const bySeverity: Record<SeverityLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const incident of filtered) {
    bySeverity[incident.severity]++;
  }

  const byType: Record<string, number> = {};
  for (const incident of filtered) {
    byType[incident.type] = (byType[incident.type] ?? 0) + 1;
  }

  return {
    from,
    to,
    total: filtered.length,
    bySeverity,
    byType,
    incidents: paged,
  };
}
