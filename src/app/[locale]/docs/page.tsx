import { getTranslations } from 'next-intl/server';

import DocsContent from './DocsContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'docs' });
  return {
    title: t('meta.title', { defaultValue: 'Documentation - Insight' }),
    description: t('meta.description', { defaultValue: 'Learn how to use Insight' }),
  };
}

export default function DocsPage() {
  return <DocsContent />;
}
