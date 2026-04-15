import { getTranslations } from 'next-intl/server';

import AlertsContent from './AlertsContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'alerts' });
  return {
    title: t('meta.title', { defaultValue: 'Alerts - Insight' }),
    description: t('meta.description', { defaultValue: 'Monitor and manage your price alerts' }),
  };
}

export default function AlertsPage() {
  return <AlertsContent />;
}
