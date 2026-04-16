import { getTranslations } from 'next-intl/server';

import PriceQueryContent from './PriceQueryContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t('meta.title', { defaultValue: 'Price Query - Insight' }),
    description: t('meta.description', { defaultValue: 'Query real-time oracle prices' }),
  };
}

export default function PriceQueryPage() {
  return <PriceQueryContent />;
}
