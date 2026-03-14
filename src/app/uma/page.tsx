'use client';

import { OraclePageTemplate } from '@/components/oracle';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';

export default function UMAPage() {
  const config = getOracleConfig(OracleProvider.UMA);
  return <OraclePageTemplate config={config} />;
}
