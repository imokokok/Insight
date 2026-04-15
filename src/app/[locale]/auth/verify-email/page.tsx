import { getTranslations } from 'next-intl/server';

import VerifyEmailContent from './VerifyEmailContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return {
    title: t('meta.verifyEmailTitle', { defaultValue: 'Verify Email - Insight' }),
    description: t('meta.verifyEmailDescription', { defaultValue: 'Verify your email address' }),
  };
}

export default function VerifyEmailPage() {
  return <VerifyEmailContent />;
}
