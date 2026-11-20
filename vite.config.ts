import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import vinext from 'vinext';
import { cloudflare } from '@cloudflare/vite-plugin';
import { workersCacheCdnAdapter } from '@vinext/cloudflare/cache/workers-cache-cdn-adapter';

export default defineConfig({
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
});
