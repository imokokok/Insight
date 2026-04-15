import { getTranslations } from 'next-intl/server';

import ResendVerificationContent from './ResendVerificationContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return {
    title: t('meta.resendVerificationTitle', { defaultValue: 'Resend Verification - Insight' }),
    description: t('meta.resendVerificationDescription', {
      defaultValue: 'Resend email verification',
    }),
  };
}

export default function ResendVerificationPage() {
  return <ResendVerificationContent />;
}
