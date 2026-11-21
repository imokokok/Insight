import { bindings, defineConfig, defineWorker, triggers } from 'cf/config';
import { createWorkersCacheConfig } from '@vinext/cloudflare/cache/config';

const cache = await createWorkersCacheConfig();

export default defineConfig({
  worker: defineWorker({
    ...cache,
    name: 'insight-web',
    triggers: [triggers.fetch({ pattern: 'www.oracleinsight.xyz/*', zone: 'oracleinsight.xyz' })],
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
      INSIGHT_RUNTIME: bindings.text('cloudflare'),
      INSIGHT_RELEASE_SHA: bindings.text(process.env.GITHUB_SHA ?? 'local'),
      ASSETS: bindings.assets(),
    },
  }),
});
