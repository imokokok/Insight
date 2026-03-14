'use client';

import { OraclePageTemplate } from '@/components/oracle';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';

export default function BandProtocolPage() {
  const config = getOracleConfig(OracleProvider.BAND_PROTOCOL);
  return <OraclePageTemplate config={config} />;
}
