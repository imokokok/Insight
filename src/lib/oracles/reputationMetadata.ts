import { OracleProvider } from '@/types/oracle';

export type ProviderType = 'onchain' | 'api' | 'hybrid';

export interface ProviderTypeConfig {
  type: ProviderType;
  latencyBaseline: number;
}

/**
 * Presentation and scoring metadata shared by server and client code.
 *
 * This intentionally lives outside reputationService so UI components do not
 * bundle the oracle factory, database client, and provider SDKs just to render
 * a provider badge.
 */
export const PROVIDER_TYPE_CONFIG: Record<OracleProvider, ProviderTypeConfig> = {
  [OracleProvider.FLARE]: { type: 'onchain', latencyBaseline: 1500 },
  [OracleProvider.CHAINLINK]: { type: 'onchain', latencyBaseline: 1200 },
  [OracleProvider.API3]: { type: 'onchain', latencyBaseline: 1000 },
  [OracleProvider.TWAP]: { type: 'onchain', latencyBaseline: 1400 },
  [OracleProvider.WINKLINK]: { type: 'onchain', latencyBaseline: 1200 },
  [OracleProvider.REFLECTOR]: { type: 'onchain', latencyBaseline: 1200 },
  [OracleProvider.DIA]: { type: 'api', latencyBaseline: 500 },
  [OracleProvider.REDSTONE]: { type: 'api', latencyBaseline: 350 },
  [OracleProvider.SUPRA]: { type: 'api', latencyBaseline: 500 },
  [OracleProvider.SWITCHBOARD]: { type: 'api', latencyBaseline: 450 },
};
