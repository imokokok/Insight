'use client';

import { OraclePageTemplate } from '@/components/oracle';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/lib/types/oracle';

export default function API3Page() {
  const config = getOracleConfig(OracleProvider.API3);
  return <OraclePageTemplate config={config} />;
}
