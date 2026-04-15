import { getTranslations } from 'next-intl/server';

import RegisterContent from './RegisterContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return {
    title: t('meta.registerTitle', { defaultValue: 'Register - Insight' }),
    description: t('meta.registerDescription', { defaultValue: 'Create your Insight account' }),
  };
}

export default function RegisterPage() {
  return <RegisterContent />;
}
