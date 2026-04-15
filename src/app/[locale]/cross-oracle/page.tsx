import { getTranslations } from 'next-intl/server';

import CrossOracleContent from './CrossOracleContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'crossOracle' });
  return {
    title: t('meta.title', { defaultValue: 'Cross-Oracle - Insight' }),
    description: t('meta.description', { defaultValue: 'Compare prices across multiple oracles' }),
  };
}

export default function CrossOraclePage() {
  return <CrossOracleContent />;
}
