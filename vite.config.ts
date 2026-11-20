import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import vinext from 'vinext';
import { cloudflare } from '@cloudflare/vite-plugin';
import { workersCacheCdnAdapter } from '@vinext/cloudflare/cache/workers-cache-cdn-adapter';

export default defineConfig({
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
