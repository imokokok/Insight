import { bindings, defineConfig, defineWorker, triggers } from 'cf/config';
import { createWorkersCacheConfig } from '@vinext/cloudflare/cache/config';

const cache = await createWorkersCacheConfig();

export default defineConfig({
  worker: defineWorker({
    ...cache,
    name: 'insight-web',
    triggers: [
      triggers.fetch({ pattern: 'oracleinsight.xyz/*', zone: 'oracleinsight.xyz' }),
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
      PRICE_RECORDS: bindings.d1({
        id: 'c23c2775-998b-48a5-b428-7b53e25a3d24',
        name: 'insight-price-records',
      }),
      TURSO_PRICE_RECORDS_MODE: bindings.text('d1'),
      TURSO_PRICE_RECORDS_FALLBACK_ON_MISS: bindings.text('true'),
      INSIGHT_RUNTIME: bindings.text('cloudflare'),
      INSIGHT_RELEASE_SHA: bindings.text(process.env.GITHUB_SHA ?? 'local'),
      ASSETS: bindings.assets(),
    },
  }),
});
