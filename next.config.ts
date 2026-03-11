/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['recharts'],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizePackageImports: ['recharts'],
  },
  turbopack: {},
};

export default nextConfig;
