import { withSentryConfig } from '@sentry/nextjs';
import createBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: process.env.CI !== 'true',
});

const isDevelopment = process.env.NODE_ENV === 'development';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  // App Router emits per-page inline Flight payloads. A nonce would require
  // dynamic rendering for every page, while fixed hashes would require a
  // route-specific and constantly regenerated header set. Keep the required
  // inline compatibility for static pages, but never permit eval in production
  // and use SRI below to verify every framework bundle.
  `script-src 'self' 'unsafe-inline' https://vercel.live${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
  "form-action 'self' https://*.nowpayments.io",
  'report-uri /api/security/csp-report',
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  // Hash framework bundles at build time so production can enforce a strict
  // CSP without turning every public, cacheable page into nonce-based SSR.
  // Nonce CSP would disable static generation across this App Router site.
  // These SDKs are referenced exclusively from route handlers and server-side
  // services. Keep their Node-only dynamic worker paths out of Webpack's
  // browser-oriented dependency analysis while retaining them in the server
  // deployment trace.
  serverExternalPackages: ['mppx', 'viem'],
  transpilePackages: [
    'recharts',
    'uint8array-extras',
    '@exodus/bytes',
    '@stellar/stellar-sdk',
    '@noble/hashes',
    '@noble/curves',
    '@noble/ed25519',
  ],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'coins.llama.fi',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: {
    sri: {
      algorithm: 'sha384',
    },
    optimizePackageImports: [
      'recharts',
      'framer-motion',
      'lucide-react',
      'fuse.js',
      '@scalar/api-reference-react',
    ],
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {},
  async redirects() {
    return [
      {
        source: '/docs/methodology',
        destination: '/docs#methodology',
        permanent: true,
      },
      {
        source: '/docs/architecture',
        destination: '/docs#architecture',
        permanent: true,
      },
      {
        source: '/docs/data-sources',
        destination: '/docs#data-sources',
        permanent: true,
      },
      // The MCP page has been superseded by the comprehensive AI hub at /ai.
      // Keep the /mcp URL resolving (legacy links, docs, external references)
      // via a permanent redirect.
      {
        source: '/mcp',
        destination: '/ai',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
          },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      ...[
        '/api/v1/:path*',
        '/api/auth/:path*',
        '/api/user/:path*',
        '/api/billing/:path*',
        '/api/cron/:path*',
        '/api/price-records/:path*',
        '/api/protocol-health/:path*',
        '/api/stablecoin-depeg',
        '/api/mcp',
      ].map((source) => ({
        source,
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      })),
    ];
  },
};

const sentryConfig = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  disableLogger: true,
  automaticVercelMonitors: true,
};

const config = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryConfig)
  : nextConfig;

export default withBundleAnalyzer(config);
