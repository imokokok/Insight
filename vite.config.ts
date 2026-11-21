import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import vinext from 'vinext';
import { cloudflare } from '@cloudflare/vite-plugin';
import { workersCacheCdnAdapter } from '@vinext/cloudflare/cache/workers-cache-cdn-adapter';
import { INSIGHT_BUILD_VARIABLE_NAMES } from './src/lib/runtime/insightEnvironment';

export default defineConfig(({ mode }) => {
  const buildEnvironment = { ...loadEnv(mode, process.cwd(), ''), ...process.env };

  return {
    define: Object.fromEntries(
      INSIGHT_BUILD_VARIABLE_NAMES.map((name) => [
        `process.env.${name}`,
        JSON.stringify(buildEnvironment[name]) ?? 'undefined',
      ])
    ),
    environments: {
      rsc: { build: { sourcemap: false } },
      ssr: { build: { sourcemap: false } },
    },
    plugins: [
      tailwindcss(),
      vinext({
        cache: { cdn: workersCacheCdnAdapter() },
      }),
      cloudflare({
        viteEnvironment: {
          name: 'rsc',
          childEnvironments: ['ssr'],
        },
      }),
    ],
  };
});
