import type { X402Config } from '@/lib/api/x402/config';

export interface MppConfig {
  enabled: boolean;
  secretKey: string | null;
}

/**
 * MPP is an opt-in companion rail for the existing keyless x402 tier. It uses
 * the same receiving address, USDC network, and price, and remains disabled
 * until both the feature flag and a strong server-only challenge key exist.
 */
export function getMppConfig(
  x402Config: X402Config,
  env: NodeJS.ProcessEnv = process.env
): MppConfig {
  if (env.MPP_ENABLED !== 'true') {
    return { enabled: false, secretKey: null };
  }

  if (!x402Config.enabled) {
    throw new Error('MPP_ENABLED requires the x402 paid tier to be enabled');
  }

  const secretKey = env.MPP_SECRET_KEY?.trim() ?? '';
  if (new TextEncoder().encode(secretKey).byteLength < 32) {
    throw new Error('MPP_SECRET_KEY must contain at least 32 bytes');
  }

  return { enabled: true, secretKey };
}
