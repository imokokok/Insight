import { getTranslations } from 'next-intl/server';

import CrossChainContent from './CrossChainContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t('crossChain.meta.title', { defaultValue: 'Cross-Chain - Insight' }),
    description: t('crossChain.meta.description', {
      defaultValue: 'Compare oracle prices across blockchains',
    }),
  };
}

export default function CrossChainPage() {
  return <CrossChainContent />;
}
