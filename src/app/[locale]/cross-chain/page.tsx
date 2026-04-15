import { getTranslations } from 'next-intl/server';

import CrossChainContent from './CrossChainContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'crossChain' });
  return {
    title: t('meta.title', { defaultValue: 'Cross-Chain - Insight' }),
    description: t('meta.description', {
      defaultValue: 'Compare oracle prices across blockchains',
    }),
  };
}

export default function CrossChainPage() {
  return <CrossChainContent />;
}
