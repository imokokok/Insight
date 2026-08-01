import { type OracleProvider, ORACLE_PROVIDER_VALUES } from '@/types/oracle';

export const REPORT_ASSETS = [
  // Major crypto
  'BTC',
  'ETH',
  'SOL',
  'BNB',
  'XRP',
  'ADA',
  'DOGE',
  'LINK',
  // Stablecoins (depeg risk)
  'USDC',
  'USDT',
  'DAI',
  // Wrapped / liquid-staking assets (peg risk)
  'WBTC',
  'CBBTC',
  'TBTC',
  'STETH',
  'WSTETH',
  'CBETH',
  // Major DeFi collateral/borrow assets (liquidation risk)
  'AAVE',
  'UNI',
  'CRV',
  'COMP',
  'MKR',
  'SNX',
] as const;

// Derive the provider list from the OracleProvider enum so newly added
// providers are included in the daily report automatically. The previous
// hand-maintained array silently drifted out of sync with the enum.
export const REPORT_PROVIDERS: OracleProvider[] = [...ORACLE_PROVIDER_VALUES];
