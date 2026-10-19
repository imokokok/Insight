import { getX402Config, X402_EVM_NETWORK_IDS, usdcForNetwork } from '@/lib/api/x402/config';
import {
  getAllCatalogFeeds,
  CHAINLINK_CATALOG_VERSION,
} from '@/lib/oracles/constants/chainlinkCatalogLoader';
import { getAllActiveFeedsByProviderWithStatus } from '@/lib/oracles/utils/dynamicFeedResolver';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

export const revalidate = 900;

export const metadata: Metadata = {
  title: 'Monad Oracle Health - Insight',
  description:
    'Public oracle health page for Monad mainnet: official Chainlink feed coverage, monitored feeds, latest sampled prices, and x402 paid-check availability.',
};

const MONAD_CHAIN_ID = 143;
/** Official Chainlink Reference Data Directory for Monad mainnet. */
const MONAD_FEED_SOURCE = 'https://reference-data-directory.vercel.app/feeds-monad-mainnet.json';
const MONAD_EXPLORER = 'https://monadvision.com';
const MONAD_RPC = 'https://rpc.monad.xyz';

interface ProviderFeedSummary {
  provider: string;
  feeds: number;
  symbols: string[];
  lastSuccessAt: string | null;
  consecutiveFailures: number;
}

interface MonadSnapshotRow {
  symbol: string;
  price: number;
  is_success: boolean;
  deviation_pct: number | null;
  latency_ms: number | null;
}

interface MonadSampleSummary {
  sampledSymbols: number;
  successCount: number;
  failureCount: number;
  maxDeviationPct: number | null;
  latest: MonadSnapshotRow[];
  windowStartIso: string;
}

async function loadMonitoredFeeds(): Promise<{
  providers: ProviderFeedSummary[];
  errored: boolean;
}> {
  try {
    const registry = await getAllActiveFeedsByProviderWithStatus();
    if (registry.errored) return { providers: [], errored: true };
    const providers: ProviderFeedSummary[] = [];
    for (const [provider, feeds] of registry.feeds) {
      const onChain = feeds.filter((feed) => feed.chain_id === MONAD_CHAIN_ID);
      if (onChain.length === 0) continue;
      const lastSuccessAt = onChain
        .map((feed) => feed.last_success_at)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1);
      providers.push({
        provider,
        feeds: onChain.length,
        symbols: onChain
          .map((feed) => feed.symbol)
          .filter((symbol, index, all) => all.indexOf(symbol) === index)
          .sort(),
        lastSuccessAt: lastSuccessAt ?? null,
        consecutiveFailures: onChain.reduce(
          (max, feed) => Math.max(max, feed.consecutive_failures ?? 0),
          0
        ),
      });
    }
    providers.sort((a, b) => a.provider.localeCompare(b.provider));
    return { providers, errored: false };
  } catch {
    return { providers: [], errored: true };
  }
}

async function loadRecentSamples(): Promise<MonadSampleSummary | null> {
  try {
    const supabase = createServiceRoleClient();
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from('hourly_price_snapshots')
      .select('snapshot_hour,provider,symbol,chain_id,price,is_success,deviation_pct,latency_ms')
      .eq('chain_id', MONAD_CHAIN_ID)
      .gte('snapshot_hour', start.toISOString())
      .lt('snapshot_hour', end.toISOString())
      .order('snapshot_hour', { ascending: false })
      .limit(500);
    if (error) return null;
    const rows = (data ?? []) as Array<
      MonadSnapshotRow & { snapshot_hour: string; provider: string }
    >;
    if (rows.length === 0) return null;
    const bySymbol = new Map<string, MonadSnapshotRow & { snapshot_hour: string }>();
    let successCount = 0;
    let failureCount = 0;
    let maxDeviationPct: number | null = null;
    for (const row of rows) {
      if (row.is_success) successCount++;
      else failureCount++;
      if (typeof row.deviation_pct === 'number') {
        maxDeviationPct =
          maxDeviationPct === null
            ? row.deviation_pct
            : Math.max(maxDeviationPct, row.deviation_pct);
      }
      const key = `${row.provider}:${row.symbol}`;
      // Rows arrive newest-first; keep the first (latest) row per provider+symbol.
      if (!bySymbol.has(key)) {
        bySymbol.set(key, {
          symbol: row.symbol,
          price: row.price,
          is_success: row.is_success,
          deviation_pct: row.deviation_pct,
          latency_ms: row.latency_ms,
          snapshot_hour: row.snapshot_hour,
        });
      }
    }
    const latest = Array.from(bySymbol.values()).map((row) => ({
      symbol: row.symbol,
      price: row.price,
      is_success: row.is_success,
      deviation_pct: row.deviation_pct,
      latency_ms: row.latency_ms,
    }));
    latest.sort((a, b) => a.symbol.localeCompare(b.symbol));
    return {
      sampledSymbols: latest.length,
      successCount,
      failureCount,
      maxDeviationPct,
      latest,
      windowStartIso: start.toISOString(),
    };
  } catch {
    return null;
  }
}

function MonadX402Status() {
  // Env-dependent; evaluated per request on the server (revalidate = 900).
  const cfg = getX402Config();
  const monadAdvertised = (cfg.evmNetworks ?? [cfg.network]).includes('eip155:143');
  const facilitator = cfg.facilitatorUrls['eip155:143'] ?? cfg.facilitatorUrl;
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Paid checks (x402) on Monad</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Pre-trade safety check</dt>
          <dd className="font-medium">
            {cfg.enabled && monadAdvertised
              ? `Enabled — ${cfg.priceUsd.toFixed(2)} USDC per check`
              : 'Not currently advertised'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Settlement asset</dt>
          <dd className="font-mono text-xs">{usdcForNetwork('eip155:143')}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Facilitator</dt>
          <dd className="max-w-[60%] truncate font-mono text-xs" title={facilitator}>
            {new URL(facilitator).host}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Total x402 networks</dt>
          <dd className="font-medium">{X402_EVM_NETWORK_IDS.length} EVM</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        Enablement is environment-driven (X402_EVM_NETWORKS); this page reports the live
        configuration, never intent.
      </p>
    </div>
  );
}

export default async function MonadOracleHealthPage() {
  // No NEXT_PHASE build guard: on Vercel the build-time NEXT_PHASE leaks into
  // the function runtime, so a guard comparison is always true there and the
  // page would serve its empty build render forever (the reports/[date] ISR
  // pages prove runtime DB access works). Build-time fetches are safe: Vercel
  // injects the Supabase env for builds, and local/CI builds without it fall
  // through the try/catch blocks below to the honest "unknown" copy.
  const [monitored, samples] = await Promise.all([loadMonitoredFeeds(), loadRecentSamples()]);

  const catalogFeeds = getAllCatalogFeeds().filter((f) => f.chainId === MONAD_CHAIN_ID);
  const catalogSymbols = Array.from(new Set(catalogFeeds.map((f) => f.symbol))).sort();
  const monitoredSymbols = new Set(monitored.providers.flatMap((provider) => provider.symbols));
  const uncovered = catalogSymbols.filter((symbol) => !monitoredSymbols.has(symbol));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Oracle transparency for Monad mainnet</p>
        <h1 className="mt-1 text-3xl font-bold">Monad Oracle Health</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Independent visibility into which oracle feeds exist on Monad mainnet (chain ID{' '}
          {MONAD_CHAIN_ID}), which of them Insight actually samples, and what those samples show.
          Declared coverage comes from the official Chainlink reference data directory; monitored
          coverage comes from Insight&apos;s own feed registry and 15-minute snapshot pipeline. A
          feed that is declared but not monitored is never treated as verified.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground">Chain facts</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Chain ID</dt>
              <dd className="font-medium">{MONAD_CHAIN_ID}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Public RPC</dt>
              <dd className="font-mono text-xs">{MONAD_RPC.replace('https://', '')}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Explorer</dt>
              <dd>
                <a className="text-blue-600 hover:underline" href={MONAD_EXPLORER}>
                  MonadVision
                </a>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Chainlink feeds since</dt>
              <dd className="font-medium">2025-11-24</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Declared coverage (official)
          </h2>
          <p className="mt-3 text-3xl font-bold">{catalogSymbols.length}</p>
          <p className="text-sm text-muted-foreground">
            USD-quoted Chainlink feeds for Monad in the committed catalog (v
            {CHAINLINK_CATALOG_VERSION}), sourced from the{' '}
            <a className="text-blue-600 hover:underline" href={MONAD_FEED_SOURCE}>
              official feed directory
            </a>
            .
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground">Monitored coverage</h2>
          {monitored.errored ? (
            <p className="mt-3 text-sm text-amber-600">
              Feed registry unavailable — monitored coverage is unknown, not zero.
            </p>
          ) : monitored.providers.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No Monad feeds in the registry yet. Run the feed-sync pipeline to seed them; sampling
              starts automatically after seeding.
            </p>
          ) : (
            <>
              <p className="mt-3 text-3xl font-bold">
                {monitored.providers.reduce((sum, provider) => sum + provider.feeds, 0)}
              </p>
              <p className="text-sm text-muted-foreground">
                active feeds across {monitored.providers.length} provider
                {monitored.providers.length === 1 ? '' : 's'} being sampled on chain{' '}
                {MONAD_CHAIN_ID}.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <MonadX402Status />
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Last 24h samples</h2>
          {!samples ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No snapshots recorded for chain {MONAD_CHAIN_ID} yet. The 15-minute collector adds
              rows once feeds are seeded and sampled.
            </p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Symbols sampled</dt>
                <dd className="font-medium">{samples.sampledSymbols}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Successful / failed snapshots</dt>
                <dd className="font-medium">
                  {samples.successCount} / {samples.failureCount}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Max observed deviation</dt>
                <dd className="font-medium">
                  {samples.maxDeviationPct === null
                    ? 'n/a'
                    : `${samples.maxDeviationPct.toFixed(3)}%`}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Window start (UTC)</dt>
                <dd className="font-mono text-xs">
                  {samples.windowStartIso.slice(0, 16).replace('T', ' ')}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      {monitored.providers.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Monitored feeds by provider</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Provider</th>
                  <th className="px-4 py-2 font-medium">Active feeds</th>
                  <th className="px-4 py-2 font-medium">Symbols</th>
                  <th className="px-4 py-2 font-medium">Last success</th>
                  <th className="px-4 py-2 font-medium">Max consecutive failures</th>
                </tr>
              </thead>
              <tbody>
                {monitored.providers.map((provider) => (
                  <tr key={provider.provider} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">{provider.provider}</td>
                    <td className="px-4 py-2">{provider.feeds}</td>
                    <td className="max-w-xs truncate px-4 py-2" title={provider.symbols.join(', ')}>
                      {provider.symbols.join(', ')}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {provider.lastSuccessAt
                        ? provider.lastSuccessAt.slice(0, 16).replace('T', ' ')
                        : '—'}
                    </td>
                    <td className="px-4 py-2">{provider.consecutiveFailures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {samples && samples.latest.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Latest sampled prices (last 24h)</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Symbol</th>
                  <th className="px-4 py-2 font-medium">Price (USD)</th>
                  <th className="px-4 py-2 font-medium">Deviation vs consensus</th>
                  <th className="px-4 py-2 font-medium">Latency</th>
                </tr>
              </thead>
              <tbody>
                {samples.latest.map((row) => (
                  <tr key={row.symbol} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">{row.symbol}</td>
                    <td className="px-4 py-2 font-mono">{row.price.toLocaleString()}</td>
                    <td className="px-4 py-2">
                      {row.deviation_pct === null ? '—' : `${row.deviation_pct.toFixed(3)}%`}
                    </td>
                    <td className="px-4 py-2">
                      {row.latency_ms === null ? '—' : `${Math.round(row.latency_ms)} ms`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Prices are snapshot samples, not real-time quotes. Check each assessment&apos;s
            freshness before relying on it.
          </p>
        </section>
      )}

      {uncovered.length > 0 && monitored.providers.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">
            Declared but not yet monitored ({uncovered.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Symbols with an official Monad feed in the catalog that have no active registry entry
            yet: <span className="font-mono text-xs">{uncovered.join(', ')}</span>
          </p>
        </section>
      )}

      <section className="mt-10 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Use this from an agent</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>
            Pre-trade check (x402 pay-per-call):{' '}
            <code className="font-mono text-xs">POST /api/v1/safety/pre-trade</code> with{' '}
            <code className="font-mono text-xs">chainId: {MONAD_CHAIN_ID}</code>
          </li>
          <li>
            Coverage for an asset on Monad:{' '}
            <code className="font-mono text-xs">
              GET /api/v1/coverage?asset=BTC&amp;chainId={MONAD_CHAIN_ID}
            </code>
          </li>
          <li>
            MCP tools at <code className="font-mono text-xs">/api/mcp</code> — same verdicts, same
            evidence chain.
          </li>
        </ul>
      </section>
    </div>
  );
}
