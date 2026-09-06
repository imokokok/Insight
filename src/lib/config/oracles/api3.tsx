import { OracleProvider, Blockchain } from '@/types/oracle';

import { COMMON_TABS, createOracleConfig } from './helpers';

export const api3Config = createOracleConfig({
  provider: OracleProvider.API3,
  name: 'API3',
  symbol: 'API3',
  defaultChain: Blockchain.ETHEREUM,
  supportedChains: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
    Blockchain.OPTIMISM,
  ],
  color: '#DB2777',
  features: {
    hasQuantifiableSecurity: true,
    hasFirstPartyOracle: true,
    hasRiskAssessment: true,
  },
  tabs: [
    COMMON_TABS.MARKET,
    COMMON_TABS.NETWORK,
    { id: 'airnode', label: 'Airnode' },
    { id: 'dapi', label: 'dAPI' },
    COMMON_TABS.ECOSYSTEM,
    COMMON_TABS.RISK,
  ],
});
