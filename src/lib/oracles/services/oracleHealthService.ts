import {
  calculateFeedBehavior,
  type FeedHealthScore,
  type FeedBehaviorResult,
} from '@/lib/analytics/feedBehavior';
import {
  calculateSharedDependency,
  type RiskLevel as DependencyRiskLevel,
} from '@/lib/analytics/riskMetrics';
import { providerNames } from '@/lib/constants';
import {
  calculateAnomalySummary,
  calculateAssetStats,
  calculateFailureBreakdown,
  calculateProviderRankings,
  extractDeviationEvents,
  generateRiskImpacts,
} from '@/lib/reports/reportCalculations';
import { type SnapshotRow } from '@/lib/reports/types';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getTodayUtc } from '@/lib/utils/date';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider } from '@/types/oracle';

import { getProviderDefaults } from '../utils/performanceMetricsConfig';

type OracleHealthRiskLevel = 'low' | 'medium' | 'high';

type ProviderIssueCode =
  | 'heartbeat_missing'
  | 'update_delay'
  | 'provider_deviation'
  | 'failure_rate'
  | 'single_source_dependency'
  | 'shared_source_dependency';

interface OracleHealthIssue {
  code: ProviderIssueCode;
  severity: OracleHealthRiskLevel;
  message: string;
}

interface OracleHealthProviderStatus {
  provider: OracleProvider;
  displayName: string;
  riskLevel: OracleHealthRiskLevel;
  reason: string;
  issues: OracleHealthIssue[];
  stats: {
    totalSnapshots: number;
    successRate: number;
    avgLatencyMs: number;
    avgDeviationPct: number;
    maxDeviationPct: number;
    avgDataAgeSeconds: number;
    maxDataAgeSeconds: number;
    observedAssets: string[];
  };
  feedHealth: {
    score: number;
    level: FeedHealthScore['level'];
    rhythmStability: number;
    confidenceStability: number;
    heartbeatReliability: number;
    freshness: number;
    expectedIntervalSeconds: number;
    actualAvgIntervalSeconds: number;
    intervalCv: number;
    isHeartbeatLost: boolean;
    missedBeats: number;
    maxGapSeconds: number;
  };
  dependency: {
    riskLevel: OracleHealthRiskLevel;
    reason: string;
    primaryDataSources: string[];
    dataSourceCount: number;
    sharedWithProviders: string[];
    overlapRatio: number;
    aggregationMethod: string;
    hasOnChainVerification: boolean;
  };
}

interface OracleHealthOverview {
  riskLevel: OracleHealthRiskLevel;
  reason: string;
  monitoredProviders: number;
  lowRiskProviders: number;
  mediumRiskProviders: number;
  highRiskProviders: number;
  heartbeatMissingProviders: number;
  delayedProviders: number;
  providersWithDeviation: number;
  providersWithDependencyRisk: number;
  overallHealthAvg: number;
  overallHealthLevel: FeedBehaviorResult['overallHealthLevel'];
  anomalyCount: number;
  heartbeatLostCount: number;
  confidenceSurgeCount: number;
}

interface OracleHealthApiResponse {
  reportDate: string;
  summary: ReturnType<typeof calculateAnomalySummary>;
  overview: OracleHealthOverview;
  providers: OracleHealthProviderStatus[];
  sharedDependency: {
    score: number;
    level: DependencyRiskLevel;
    systemicRiskFactor: number;
    sharedSourceGroups: Array<{ source: string; oracles: string[] }>;
  };
  feedHealth: Pick<
    FeedBehaviorResult,
    | 'overallHealthAvg'
    | 'overallHealthLevel'
    | 'anomalyCount'
    | 'heartbeatLostCount'
    | 'confidenceSurgeCount'
    | 'rhythmMetrics'
    | 'heartbeatMetrics'
    | 'confidenceMetrics'
    | 'healthScores'
  >;
  providerRankings: ReturnType<typeof calculateProviderRankings>;
  failureBreakdown: ReturnType<typeof calculateFailureBreakdown>;
  deviationEvents: ReturnType<typeof extractDeviationEvents>;
  riskImpacts: ReturnType<typeof generateRiskImpacts>;
}

const logger = createLogger('oracle-health-service');

const ISSUE_PRIORITY: Record<ProviderIssueCode, number> = {
  heartbeat_missing: 0,
  update_delay: 1,
  provider_deviation: 2,
  failure_rate: 3,
  single_source_dependency: 4,
  shared_source_dependency: 5,
};

const SEVERITY_PRIORITY: Record<OracleHealthRiskLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function getDateRange(date: string): { startAt: string; endAt: string; evaluationTime: number } {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const now = Date.now();
  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    evaluationTime: Math.min(now, end.getTime() - 1),
  };
}

function toRiskLevel(severities: OracleHealthRiskLevel[]): OracleHealthRiskLevel {
  if (severities.includes('high')) return 'high';
  if (severities.includes('medium')) return 'medium';
  return 'low';
}

function getDependencyRiskLevel(params: {
  dataSourceCount: number;
  overlapRatio: number;
}): OracleHealthRiskLevel {
  const { dataSourceCount, overlapRatio } = params;
  if (dataSourceCount <= 2 || overlapRatio >= 0.8) return 'high';
  if (dataSourceCount <= 3 || overlapRatio >= 0.5) return 'medium';
  return 'low';
}

function getDependencyReason(params: {
  displayName: string;
  dataSourceCount: number;
  overlapRatio: number;
  sharedWithProviders: string[];
}): string {
  const { displayName, dataSourceCount, overlapRatio, sharedWithProviders } = params;
  if (dataSourceCount <= 2) {
    return `${displayName} relies on only ${dataSourceCount} primary price source(s), increasing single-source dependency risk`;
  }
  if (overlapRatio >= 0.8 && sharedWithProviders.length > 0) {
    return `${displayName} shares most primary price sources with ${sharedWithProviders.join(', ')}, so a common upstream issue could propagate quickly`;
  }
  if (overlapRatio >= 0.5 && sharedWithProviders.length > 0) {
    return `${displayName} has moderate upstream overlap with ${sharedWithProviders.join(', ')}`;
  }
  return `${displayName} maintains sufficiently diversified primary data sources`;
}

function buildDependencyIndex(providers: OracleProvider[]) {
  const sourceToProviders = new Map<string, OracleProvider[]>();

  for (const provider of providers) {
    const defaults = getProviderDefaults(provider);
    for (const source of defaults.primaryDataSources) {
      const current = sourceToProviders.get(source) ?? [];
      if (!current.includes(provider)) {
        current.push(provider);
      }
      sourceToProviders.set(source, current);
    }
  }

  return sourceToProviders;
}

function getObservedAssets(rows: SnapshotRow[]): string[] {
  return [...new Set(rows.map((row) => row.symbol))].sort();
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildProviderIssues(params: {
  provider: OracleProvider;
  displayName: string;
  successRate: number;
  avgDeviationPct: number;
  maxDeviationPct: number;
  avgDataAgeSeconds: number;
  maxDataAgeSeconds: number;
  expectedIntervalSeconds: number;
  isHeartbeatLost: boolean;
  missedBeats: number;
  overlapRatio: number;
  dataSourceCount: number;
  sharedWithProviders: string[];
}): OracleHealthIssue[] {
  const {
    displayName,
    successRate,
    avgDeviationPct,
    maxDeviationPct,
    avgDataAgeSeconds,
    maxDataAgeSeconds,
    expectedIntervalSeconds,
    isHeartbeatLost,
    missedBeats,
    overlapRatio,
    dataSourceCount,
    sharedWithProviders,
  } = params;

  const issues: OracleHealthIssue[] = [];

  if (isHeartbeatLost) {
    issues.push({
      code: 'heartbeat_missing',
      severity: 'high',
      message: `${displayName} missed heartbeat expectations and appears stale for more than 2 expected update intervals`,
    });
  } else if (missedBeats > 0) {
    issues.push({
      code: 'heartbeat_missing',
      severity: 'medium',
      message: `${displayName} missed ${missedBeats} expected heartbeat update(s) during the period`,
    });
  }

  if (
    avgDataAgeSeconds > expectedIntervalSeconds * 1.5 ||
    maxDataAgeSeconds > expectedIntervalSeconds * 3
  ) {
    issues.push({
      code: 'update_delay',
      severity:
        avgDataAgeSeconds > expectedIntervalSeconds * 2 ||
        maxDataAgeSeconds > expectedIntervalSeconds * 4
          ? 'high'
          : 'medium',
      message: `${displayName} showed delayed updates, with average data age ${avgDataAgeSeconds.toFixed(0)}s vs expected ${expectedIntervalSeconds}s`,
    });
  }

  if (maxDeviationPct >= 1 || avgDeviationPct >= 0.5) {
    issues.push({
      code: 'provider_deviation',
      severity: maxDeviationPct >= 1.5 || avgDeviationPct >= 0.75 ? 'high' : 'medium',
      message: `${displayName} deviated from consensus by up to ${maxDeviationPct.toFixed(3)}% during the period`,
    });
  } else if (maxDeviationPct >= 0.5) {
    issues.push({
      code: 'provider_deviation',
      severity: 'medium',
      message: `${displayName} had several material deviations from consensus, peaking at ${maxDeviationPct.toFixed(3)}%`,
    });
  }

  if (successRate < 97) {
    issues.push({
      code: 'failure_rate',
      severity: successRate < 90 ? 'high' : 'medium',
      message: `${displayName} completed only ${successRate.toFixed(2)}% of tracked snapshots successfully`,
    });
  }

  const dependencyRiskLevel = getDependencyRiskLevel({ dataSourceCount, overlapRatio });
  if (dataSourceCount <= 2) {
    issues.push({
      code: 'single_source_dependency',
      severity: dependencyRiskLevel,
      message: `${displayName} depends on only ${dataSourceCount} primary source(s), leaving limited redundancy if an upstream venue fails`,
    });
  } else if (dependencyRiskLevel !== 'low' && sharedWithProviders.length > 0) {
    issues.push({
      code: 'shared_source_dependency',
      severity: dependencyRiskLevel,
      message: `${displayName} shares a large portion of upstream sources with ${sharedWithProviders.join(', ')}`,
    });
  }

  return issues.sort((a, b) => {
    const severityDiff = SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return ISSUE_PRIORITY[a.code] - ISSUE_PRIORITY[b.code];
  });
}

function buildOverview(params: {
  providers: OracleHealthProviderStatus[];
  feedBehavior: FeedBehaviorResult;
}): OracleHealthOverview {
  const { providers, feedBehavior } = params;
  const lowRiskProviders = providers.filter((provider) => provider.riskLevel === 'low').length;
  const mediumRiskProviders = providers.filter(
    (provider) => provider.riskLevel === 'medium'
  ).length;
  const highRiskProviders = providers.filter((provider) => provider.riskLevel === 'high').length;
  const heartbeatMissingProviders = providers.filter(
    (provider) => provider.feedHealth.isHeartbeatLost
  ).length;
  const delayedProviders = providers.filter((provider) =>
    provider.issues.some((issue) => issue.code === 'update_delay')
  ).length;
  const providersWithDeviation = providers.filter((provider) =>
    provider.issues.some((issue) => issue.code === 'provider_deviation')
  ).length;
  const providersWithDependencyRisk = providers.filter((provider) =>
    provider.issues.some(
      (issue) =>
        issue.code === 'single_source_dependency' || issue.code === 'shared_source_dependency'
    )
  ).length;

  const overviewRiskLevel: OracleHealthRiskLevel =
    highRiskProviders > 0 ? 'high' : mediumRiskProviders > 0 ? 'medium' : 'low';

  let reason =
    'All tracked oracle providers remained healthy with no material heartbeat, staleness, or dependency concerns';
  if (highRiskProviders > 0) {
    const topProvider = providers.find((provider) => provider.riskLevel === 'high');
    reason = `${highRiskProviders} provider(s) are high risk today, led by ${topProvider?.displayName ?? 'an affected provider'}: ${topProvider?.reason ?? 'material heartbeat or deviation issues detected'}`;
  } else if (mediumRiskProviders > 0) {
    const topProvider = providers.find((provider) => provider.riskLevel === 'medium');
    reason = `${mediumRiskProviders} provider(s) need review today, led by ${topProvider?.displayName ?? 'an affected provider'}: ${topProvider?.reason ?? 'moderate reliability issues detected'}`;
  }

  return {
    riskLevel: overviewRiskLevel,
    reason,
    monitoredProviders: providers.length,
    lowRiskProviders,
    mediumRiskProviders,
    highRiskProviders,
    heartbeatMissingProviders,
    delayedProviders,
    providersWithDeviation,
    providersWithDependencyRisk,
    overallHealthAvg: feedBehavior.overallHealthAvg,
    overallHealthLevel: feedBehavior.overallHealthLevel,
    anomalyCount: feedBehavior.anomalyCount,
    heartbeatLostCount: feedBehavior.heartbeatLostCount,
    confidenceSurgeCount: feedBehavior.confidenceSurgeCount,
  };
}

export async function getOracleHealthReport(
  date?: string
): Promise<OracleHealthApiResponse | null> {
  const reportDate = date ?? getTodayUtc();
  const { startAt, endAt, evaluationTime } = getDateRange(reportDate);
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('hourly_price_snapshots')
    .select('*')
    .gte('snapshot_hour', startAt)
    .lt('snapshot_hour', endAt)
    .order('snapshot_hour', { ascending: true });

  if (error) {
    logger.error(`Failed to load oracle health snapshots for ${reportDate}`, error);
    throw error;
  }

  const snapshots = ((data ?? []) as SnapshotRow[]).filter((row) => row.provider) as SnapshotRow[];
  if (snapshots.length === 0) {
    return null;
  }

  const providerRankings = calculateProviderRankings(snapshots);
  const deviationEvents = extractDeviationEvents(snapshots).slice(0, 50);
  const summary = calculateAnomalySummary(snapshots, deviationEvents);
  const failureBreakdown = calculateFailureBreakdown(snapshots);
  const topAssets = calculateAssetStats(snapshots);
  const riskImpacts = generateRiskImpacts(
    deviationEvents,
    failureBreakdown,
    providerRankings,
    topAssets
  ).slice(0, 20);

  const presentProviders = providerRankings.map((ranking) => ranking.provider) as OracleProvider[];
  const dependencyIndex = buildDependencyIndex(presentProviders);
  const sharedDependency = calculateSharedDependency({
    oracleData: presentProviders.map((provider) => {
      const defaults = getProviderDefaults(provider);
      return {
        name: provider,
        primaryDataSources: defaults.primaryDataSources,
      };
    }),
  });

  const byProvider = new Map<OracleProvider, SnapshotRow[]>();
  for (const snapshot of snapshots) {
    const provider = snapshot.provider as OracleProvider;
    const rows = byProvider.get(provider) ?? [];
    rows.push(snapshot);
    byProvider.set(provider, rows);
  }

  const historyMap = new Map<
    string,
    Array<{ price: number; timestamp: number; success: boolean; confidence?: number }>
  >();
  const latestEntries: Array<{
    provider: string;
    price: number;
    timestamp: number;
    success: boolean;
    confidence?: number;
  }> = [];

  for (const provider of presentProviders) {
    const rows = (byProvider.get(provider) ?? [])
      .filter((row) => row.is_success && row.price > 0)
      .map((row) => ({
        price: row.price,
        timestamp: new Date(row.snapshot_hour).getTime(),
        success: true,
        confidence: row.confidence ?? undefined,
      }));

    if (rows.length === 0) continue;
    historyMap.set(provider, rows);
    latestEntries.push({
      provider,
      ...rows[rows.length - 1],
    });
  }

  const feedBehavior = calculateFeedBehavior(latestEntries, historyMap, evaluationTime);
  const healthScoreMap = new Map(feedBehavior.healthScores.map((score) => [score.provider, score]));
  const rhythmMap = new Map(feedBehavior.rhythmMetrics.map((metric) => [metric.provider, metric]));
  const heartbeatMap = new Map(
    feedBehavior.heartbeatMetrics.map((metric) => [metric.provider, metric])
  );

  const providerStatuses = providerRankings.map((ranking): OracleHealthProviderStatus => {
    const provider = ranking.provider;
    const displayName = providerNames[provider] ?? provider;
    const rows = byProvider.get(provider) ?? [];
    const successfulRows = rows.filter((row) => row.is_success);
    const observedAssets = getObservedAssets(rows);
    const dataAges = successfulRows
      .map((row) => row.data_age_seconds)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

    const avgDataAgeSeconds = average(dataAges);
    const maxDataAgeSeconds = dataAges.length > 0 ? Math.max(...dataAges) : 0;

    const defaults = getProviderDefaults(provider);
    const score = healthScoreMap.get(provider);
    const rhythm = rhythmMap.get(provider);
    const heartbeat = heartbeatMap.get(provider);
    const primaryDataSources = defaults.primaryDataSources;
    const sharedWithProviders = [
      ...new Set(
        primaryDataSources.flatMap((source) =>
          (dependencyIndex.get(source) ?? []).filter((name) => name !== provider)
        )
      ),
    ] as OracleProvider[];
    const overlapRatio =
      primaryDataSources.length > 0
        ? primaryDataSources.filter((source) => (dependencyIndex.get(source) ?? []).length > 1)
            .length / primaryDataSources.length
        : 0;

    const issues = buildProviderIssues({
      provider,
      displayName,
      successRate: ranking.successRate,
      avgDeviationPct: ranking.avgDeviationPct,
      maxDeviationPct: ranking.maxDeviationPct,
      avgDataAgeSeconds,
      maxDataAgeSeconds,
      expectedIntervalSeconds: defaults.updateFrequency,
      isHeartbeatLost: heartbeat?.isHeartbeatLost ?? false,
      missedBeats: heartbeat?.missedBeats ?? 0,
      overlapRatio,
      dataSourceCount: primaryDataSources.length,
      sharedWithProviders: sharedWithProviders.map((name) => providerNames[name] ?? name),
    });

    const riskLevel = toRiskLevel(issues.map((issue) => issue.severity));
    const reason =
      issues[0]?.message ?? `${displayName} remained healthy with no material oracle health issues`;

    const dependencyRiskLevel = getDependencyRiskLevel({
      dataSourceCount: primaryDataSources.length,
      overlapRatio,
    });

    return {
      provider,
      displayName,
      riskLevel,
      reason,
      issues,
      stats: {
        totalSnapshots: rows.length,
        successRate: ranking.successRate,
        avgLatencyMs: ranking.avgLatencyMs,
        avgDeviationPct: ranking.avgDeviationPct,
        maxDeviationPct: ranking.maxDeviationPct,
        avgDataAgeSeconds: Number(avgDataAgeSeconds.toFixed(2)),
        maxDataAgeSeconds: Number(maxDataAgeSeconds.toFixed(2)),
        observedAssets,
      },
      feedHealth: {
        score: score?.score ?? 0,
        level: score?.level ?? 'critical',
        rhythmStability: score?.rhythmStability ?? 0,
        confidenceStability: score?.confidenceStability ?? 0,
        heartbeatReliability: score?.heartbeatReliability ?? 0,
        freshness: score?.freshness ?? 0,
        expectedIntervalSeconds: defaults.updateFrequency,
        actualAvgIntervalSeconds: rhythm?.actualAvgIntervalSeconds ?? 0,
        intervalCv: rhythm?.intervalCV ?? 0,
        isHeartbeatLost: heartbeat?.isHeartbeatLost ?? false,
        missedBeats: heartbeat?.missedBeats ?? 0,
        maxGapSeconds: heartbeat?.maxGapSeconds ?? 0,
      },
      dependency: {
        riskLevel: dependencyRiskLevel,
        reason: getDependencyReason({
          displayName,
          dataSourceCount: primaryDataSources.length,
          overlapRatio,
          sharedWithProviders: sharedWithProviders.map((name) => providerNames[name] ?? name),
        }),
        primaryDataSources,
        dataSourceCount: primaryDataSources.length,
        sharedWithProviders: sharedWithProviders.map((name) => providerNames[name] ?? name),
        overlapRatio: Number(overlapRatio.toFixed(4)),
        aggregationMethod: defaults.aggregationMethod,
        hasOnChainVerification: defaults.hasOnChainVerification,
      },
    };
  });

  providerStatuses.sort((a, b) => {
    const riskDiff = SEVERITY_PRIORITY[a.riskLevel] - SEVERITY_PRIORITY[b.riskLevel];
    if (riskDiff !== 0) return riskDiff;
    return a.feedHealth.score - b.feedHealth.score;
  });

  return {
    reportDate,
    summary,
    overview: buildOverview({ providers: providerStatuses, feedBehavior }),
    providers: providerStatuses,
    sharedDependency: {
      score: sharedDependency.score,
      level: sharedDependency.level,
      systemicRiskFactor: sharedDependency.systemicRiskFactor,
      sharedSourceGroups: sharedDependency.sharedSourceGroups,
    },
    feedHealth: {
      overallHealthAvg: feedBehavior.overallHealthAvg,
      overallHealthLevel: feedBehavior.overallHealthLevel,
      anomalyCount: feedBehavior.anomalyCount,
      heartbeatLostCount: feedBehavior.heartbeatLostCount,
      confidenceSurgeCount: feedBehavior.confidenceSurgeCount,
      rhythmMetrics: feedBehavior.rhythmMetrics,
      heartbeatMetrics: feedBehavior.heartbeatMetrics,
      confidenceMetrics: feedBehavior.confidenceMetrics,
      healthScores: feedBehavior.healthScores,
    },
    providerRankings,
    failureBreakdown,
    deviationEvents,
    riskImpacts,
  };
}
