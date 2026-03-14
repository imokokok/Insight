'use client';

import { OraclePageTemplate } from '@/components/oracle';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';

export default function ChainlinkPage() {
  const config = getOracleConfig(OracleProvider.CHAINLINK);
  return <OraclePageTemplate config={config} />;
}
