import { getTranslations } from 'next-intl/server';

import SettingsContent from './SettingsContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'settings' });
  return {
    title: t('meta.title', { defaultValue: 'Settings - Insight' }),
    description: t('meta.description', { defaultValue: 'Manage your account settings' }),
  };
}

export default function SettingsPage() {
  return <SettingsContent />;
}
