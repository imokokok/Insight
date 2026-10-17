/**
 * Plugin configuration resolved from the agent runtime settings with
 * process-env fallbacks. All keys are optional except the base URL, which has
 * a production default.
 */
export const DEFAULT_BASE_URL = 'https://www.oracleinsight.xyz';

/** EVM networks the plugin can pay from via the exact EIP-3009 scheme.
 *
 * BNB Smart Chain (eip155:56) is deliberately absent: Insight's BNB settlement
 * uses the AEON facilitator mandate flow (no on-chain EIP-3009), which the
 * stock @x402/evm client scheme does not sign. Agents that need to pay on BNB
 * should pay from another supported network or use the Insight MCP endpoint
 * with an x402-capable wallet plugin.
 */
export const PAYABLE_NETWORKS = [
  'eip155:84532', // Base Sepolia (test)
  'eip155:8453', // Base
  'eip155:1', // Ethereum
  'eip155:10', // OP Mainnet
  'eip155:42161', // Arbitrum One
  'eip155:137', // Polygon PoS
  'eip155:43114', // Avalanche C-Chain
  'eip155:1329', // Sei
  'eip155:196', // X Layer
  'eip155:143', // Monad
] as const;

export const DEFAULT_PAYABLE_NETWORKS: readonly string[] = [
  'eip155:8453',
  'eip155:1',
  'eip155:10',
  'eip155:42161',
  'eip155:137',
  'eip155:143',
];

/** Oracle coverage chain ids accepted by /api/v1/safety/pre-trade. */
export const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  eth: 1,
  base: 8453,
  op: 10,
  optimism: 10,
  arbitrum: 42161,
  arb: 42161,
  polygon: 137,
  matic: 137,
  avalanche: 43114,
  avax: 43114,
  sei: 1329,
  'x-layer': 196,
  xlayer: 196,
  monad: 143,
  bsc: 56,
  bnb: 56,
  'base-sepolia': 84532,
};

export interface InsightSettings {
  baseUrl: string;
  x402PrivateKey: string | null;
  payableNetworks: readonly string[];
}

type RuntimeLike = {
  getSetting?: (key: string) => string | number | boolean | null | undefined;
};

function readSetting(runtime: RuntimeLike, key: string): string | undefined {
  try {
    const value = runtime.getSetting?.(key);
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value).trim();
    }
  } catch {
    /* runtime without settings — fall through to env */
  }
  const env = process.env[key];
  return env && env.trim() !== '' ? env.trim() : undefined;
}

export function resolveSettings(runtime: RuntimeLike): InsightSettings {
  const baseUrl = (readSetting(runtime, 'ORACLE_INSIGHT_BASE_URL') ?? DEFAULT_BASE_URL).replace(
    /\/+$/,
    ''
  );
  const x402PrivateKey = readSetting(runtime, 'ORACLE_INSIGHT_X402_PRIVATE_KEY') ?? null;

  let payableNetworks: readonly string[] = DEFAULT_PAYABLE_NETWORKS;
  const configured = readSetting(runtime, 'ORACLE_INSIGHT_X402_NETWORKS');
  if (configured) {
    payableNetworks = configured
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value !== '');
  }

  return { baseUrl, x402PrivateKey, payableNetworks };
}
