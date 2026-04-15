import { getTranslations } from 'next-intl/server';

import ForgotPasswordContent from './ForgotPasswordContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return {
    title: t('meta.forgotPasswordTitle', { defaultValue: 'Forgot Password - Insight' }),
    description: t('meta.forgotPasswordDescription', { defaultValue: 'Reset your password' }),
  };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordContent />;
}
