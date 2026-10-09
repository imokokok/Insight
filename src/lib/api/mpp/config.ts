import type { X402Config } from '@/lib/api/x402/config';

export const MPP_MCP_TOOL = 'pre_trade_safety_check';

export interface MppConfig {
  enabled: boolean;
  /** Independent opt-in for the MCP pre-trade tool pilot. */
  mcpEnabled: boolean;
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
  if (env.MPP_MCP_ENABLED === 'true' && env.MPP_ENABLED !== 'true') {
    throw new Error('MPP_MCP_ENABLED requires MPP_ENABLED=true');
  }

  if (env.MPP_ENABLED !== 'true') {
    return { enabled: false, mcpEnabled: false, secretKey: null };
  }

  if (!x402Config.enabled) {
    throw new Error('MPP_ENABLED requires the x402 paid tier to be enabled');
  }

  const secretKey = env.MPP_SECRET_KEY?.trim() ?? '';
  if (new TextEncoder().encode(secretKey).byteLength < 32) {
    throw new Error('MPP_SECRET_KEY must contain at least 32 bytes');
  }

  return {
    enabled: true,
    mcpEnabled: env.MPP_MCP_ENABLED === 'true',
    secretKey,
  };
}
