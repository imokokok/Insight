import { getTranslations } from 'next-intl/server';

import ResetPasswordContent from './ResetPasswordContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return {
    title: t('meta.resetPasswordTitle', { defaultValue: 'Reset Password - Insight' }),
    description: t('meta.resetPasswordDescription', { defaultValue: 'Set your new password' }),
  };
}

export default function ResetPasswordPage() {
  return <ResetPasswordContent />;
}
