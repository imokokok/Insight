'use client';

import { OraclePageTemplate } from '@/components/oracle';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';

export default function PythNetworkPage() {
  const config = getOracleConfig(OracleProvider.PYTH);
  return <OraclePageTemplate config={config} />;
}
