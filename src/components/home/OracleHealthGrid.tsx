'use client';

import { useMemo, type CSSProperties } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { ArrowUpRight, Clock } from 'lucide-react';

import { providerNames } from '@/lib/constants';
import type { OracleReputation } from '@/lib/oracles/services/reputationService';
import { type OracleProvider, ORACLE_PROVIDER_VALUES } from '@/types/oracle';

type NetworkStatus = 'healthy' | 'degraded' | 'down';

function getStatusFromScore(score: number): NetworkStatus {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'degraded';
  return 'down';
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

function formatRelativeTime(timestamp: string | number | null | undefined, now: number): string {
  if (!timestamp) return '—';
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  if (!time || time <= 0) return '—';
  const seconds = Math.floor((now - time) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface AggregateMetrics {
  avgScore: number;
  totalSymbols: number;
  totalChains: number;
  avgUptime: number;
  avgDeviation: number;
  totalQueries: number;
}

export function OracleHealthGrid({
  now,
  reputations,
  isLoading = false,
  displayLimit,
}: {
  now: number;
  reputations: OracleReputation[];
  isLoading?: boolean;
  displayLimit?: number;
}) {
  const { providers, detailsMap, counts, aggregates } = useMemo(() => {
    const detailsMap = new Map<string, OracleReputation>();
    for (const reputation of reputations) detailsMap.set(reputation.provider, reputation);

    const providers =
      reputations.length > 0
        ? reputations.map((reputation) => reputation.provider as OracleProvider)
        : ([...ORACLE_PROVIDER_VALUES] as OracleProvider[]);

    const counts = { healthy: 0, degraded: 0, down: 0, total: providers.length };
    for (const provider of providers) {
      const score = detailsMap.get(provider)?.overall_score ?? 0;
      counts[getStatusFromScore(score)] += 1;
    }

    const scored = reputations.filter((reputation) => reputation.overall_score > 0);
    const aggregates: AggregateMetrics = {
      avgScore:
        scored.length > 0
          ? scored.reduce((sum, reputation) => sum + reputation.overall_score, 0) / scored.length
          : 0,
      totalSymbols: reputations.reduce(
        (sum, reputation) => sum + (reputation.supported_symbols_count ?? 0),
        0
      ),
      totalChains: reputations.reduce(
        (sum, reputation) => sum + (reputation.supported_chains_count ?? 0),
        0
      ),
      avgUptime:
        scored.length > 0
          ? scored.reduce((sum, reputation) => sum + (reputation.uptime_percentage ?? 0), 0) /
            scored.length
          : 0,
      avgDeviation:
        scored.length > 0
          ? scored.reduce((sum, reputation) => sum + (reputation.avg_deviation_pct ?? 0), 0) /
            scored.length
          : 0,
      totalQueries: reputations.reduce(
        (sum, reputation) => sum + (reputation.total_queries ?? 0),
        0
      ),
    };

    return { providers, detailsMap, counts, aggregates };
  }, [reputations]);

  const statusEntries = (['healthy', 'degraded', 'down'] as const).map((status) => ({
    status,
    count: counts[status],
    percentage: counts.total > 0 ? (counts[status] / counts.total) * 100 : 0,
  }));

  return (
    <section className="network-field home-view-reveal" aria-labelledby="network-field-title">
      <header className="network-field-header">
        <div>
          <p className="instrument-label">Evidence instrument 03 / provider field</p>
          <h3 id="network-field-title">Oracle network spectrum</h3>
        </div>
        <p>
          Reputation is shown as measured behaviour: uptime, deviation, coverage, and successful
          observations—not a decorative badge.
        </p>
        <Link href="/reputation">
          Open directory <ArrowUpRight aria-hidden="true" />
        </Link>
      </header>

      <div className="network-field-status" aria-label="Network status distribution">
        {statusEntries.map(({ status, count, percentage }) => (
          <div
            key={status}
            className={`network-status-${status}`}
            style={{ '--status-width': `${Math.max(percentage, 1)}%` } as CSSProperties}
          >
            <span>{status}</span>
            <strong>{count}</strong>
            <i />
            <small>{percentage.toFixed(0)}% of network</small>
          </div>
        ))}
      </div>

      <div className="network-field-body">
        <div className="network-spectrum">
          <div className="network-spectrum-ruler" aria-hidden="true">
            <span>Provider</span>
            <span>Reliability field</span>
            <span>Observed behaviour</span>
          </div>

          {providers.slice(0, displayLimit ?? providers.length).map((provider, index) => {
            const details = detailsMap.get(provider);
            const score = details?.overall_score ?? 0;
            const status = getStatusFromScore(score);
            return (
              <article className="network-provider" key={provider}>
                <div className="network-provider-identity">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <Image src={`/logos/oracles/${provider}.svg`} alt="" width={30} height={30} />
                  <strong>{providerNames[provider] ?? provider}</strong>
                </div>

                <div className="network-provider-score">
                  <div>
                    <strong>{score > 0 ? score.toFixed(0) : '—'}</strong>
                    <span>/100</span>
                    <small className={`status-${status}`}>{isLoading ? 'sampling' : status}</small>
                  </div>
                  <div
                    className="network-provider-track"
                    style={{ '--health-width': `${score}%` } as CSSProperties}
                    aria-label={`${providerNames[provider] ?? provider} health score ${score} out of 100`}
                  >
                    <i />
                  </div>
                </div>

                <dl className="network-provider-metrics">
                  <div>
                    <dt>Uptime</dt>
                    <dd>
                      {details?.uptime_percentage
                        ? `${details.uptime_percentage.toFixed(1)}%`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Deviation</dt>
                    <dd>
                      {details?.avg_deviation_pct
                        ? `${details.avg_deviation_pct.toFixed(3)}%`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Coverage</dt>
                    <dd>
                      {details
                        ? `${formatNumber(details.supported_symbols_count ?? 0)} sym / ${formatNumber(details.supported_chains_count ?? 0)} chn`
                        : '—'}
                    </dd>
                  </div>
                </dl>

                <div className="network-provider-time">
                  <Clock aria-hidden="true" />
                  <span>{formatRelativeTime(details?.last_calculated_at, now)}</span>
                </div>

                <Link
                  href={`/reputation/${provider}`}
                  aria-label={`Inspect ${providerNames[provider] ?? provider}`}
                >
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>

        <aside className="network-aggregate" aria-label="Network aggregate metrics">
          <div className="network-aggregate-score">
            <span>Aggregate health</span>
            <strong>{aggregates.avgScore > 0 ? aggregates.avgScore.toFixed(0) : '—'}</strong>
            <small>/100 across observed providers</small>
          </div>
          <dl>
            <div>
              <dt>Symbols mapped</dt>
              <dd>{aggregates.totalSymbols > 0 ? formatNumber(aggregates.totalSymbols) : '—'}</dd>
            </div>
            <div>
              <dt>Chains mapped</dt>
              <dd>{aggregates.totalChains > 0 ? formatNumber(aggregates.totalChains) : '—'}</dd>
            </div>
            <div>
              <dt>Average uptime</dt>
              <dd>{aggregates.avgUptime > 0 ? `${aggregates.avgUptime.toFixed(1)}%` : '—'}</dd>
            </div>
            <div>
              <dt>Average deviation</dt>
              <dd>
                {aggregates.avgDeviation > 0 ? `${aggregates.avgDeviation.toFixed(3)}%` : '—'}
              </dd>
            </div>
            <div>
              <dt>Observed queries</dt>
              <dd>{aggregates.totalQueries > 0 ? formatNumber(aggregates.totalQueries) : '—'}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
