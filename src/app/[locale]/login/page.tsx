import { getTranslations } from 'next-intl/server';

import LoginContent from './LoginContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return {
    title: t('meta.loginTitle', { defaultValue: 'Login - Insight' }),
    description: t('meta.loginDescription', { defaultValue: 'Sign in to your Insight account' }),
  };
}

export default function LoginPage() {
  return <LoginContent />;
}
