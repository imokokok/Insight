import { bindings, defineConfig, defineWorker, triggers } from 'cf/config';
import { createWorkersCacheConfig } from '@vinext/cloudflare/cache/config';

const cache = await createWorkersCacheConfig();

const runtimeVariableNames = [
  'MPP_ENABLED',
  'MPP_MCP_ENABLED',
  'RATE_LIMIT_STORE',
  'TURSO_COVERAGE_SLO_MODE',
  'TURSO_DAILY_REPORTS_MODE',
  'TURSO_DEX_MARKET_MODE',
  'TURSO_FEED_CADENCE_MODE',
  'TURSO_MANIP_COST_MODE',
  'TURSO_ORACLE_WATCH_HISTORY_MODE',
  'TURSO_PRICE_PROJECTION_MODE',
  'TURSO_PRICE_READ_CUTOVER_AT',
  'TURSO_PRICE_WRITE_MODE',
  'WAK_P1_EXTENDED_VALIDITY_UNTIL',
  'WAK_P1_SIGNED_TTL_SECONDS',
  'X402_EVM_ENABLED',
  'X402_EVM_NETWORKS',
  'X402_HYPERCORE_ENABLED',
  'X402_HYPERCORE_FACILITATOR_URL',
  'X402_HYPERCORE_MERCHANT_ID',
  'X402_HYPERCORE_NETWORK',
  'X402_HYPERCORE_PAY_TO',
  'X402_HYPERCORE_TIMEOUT_MS',
  'X402_SOLANA_ENABLED',
  'X402_SOLANA_FACILITATOR_URL',
  'X402_SOLANA_FEE_PAYER',
  'X402_SOLANA_NETWORK',
  'X402_SOLANA_PAY_TO',
] as const;

const runtimeVariables = Object.fromEntries(
  runtimeVariableNames.flatMap((name) => {
    const value = process.env[name];
    return value === undefined ? [] : [[name, bindings.text(value)]];
  }),
);

export default defineConfig({
  worker: defineWorker({
    ...cache,
    name: 'insight-web',
    triggers: [
      triggers.fetch({ pattern: 'www.oracleinsight.xyz/*', zone: 'oracleinsight.xyz' }),
    ],
    workersDev: false,
    entrypoint: 'vinext/server/fetch-handler',
    compatibilityDate: '2026-11-20',
    observability: {
      enabled: true,
      headSamplingRate: 0.1,
      redactQueryString: true,
      logs: { enabled: true, headSamplingRate: 0.1, persist: true },
      traces: { enabled: true, headSamplingRate: 0.1, persist: true },
    },
    assets: {
      htmlHandling: 'none',
      notFoundHandling: 'none',
      runWorkerFirst: ['/*', '!/_next/static/*', '!/*/_next/static/*'],
    },
    env: {
      ...cache.env,
      ...runtimeVariables,
      INSIGHT_RUNTIME: bindings.text('cloudflare'),
      INSIGHT_RELEASE_SHA: bindings.text(process.env.GITHUB_SHA ?? 'local'),
      ASSETS: bindings.assets(),
    },
  }),
});
