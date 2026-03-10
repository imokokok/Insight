'use client';

import { OraclePageTemplate } from '@/components/oracle';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/lib/types/oracle';

export default function PythNetworkPage() {
  const config = getOracleConfig(OracleProvider.PYTH_NETWORK);
  return <OraclePageTemplate config={config} />;
}
