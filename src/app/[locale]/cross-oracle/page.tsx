import { getTranslations } from 'next-intl/server';

import CrossOracleContent from './CrossOracleContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t('crossOracle.meta.title', { defaultValue: 'Cross-Oracle - Insight' }),
    description: t('crossOracle.meta.description', {
      defaultValue: 'Compare prices across multiple oracles',
    }),
  };
}

export default function CrossOraclePage() {
  return <CrossOracleContent />;
}
