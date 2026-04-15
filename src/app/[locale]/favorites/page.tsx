import { getTranslations } from 'next-intl/server';

import FavoritesContent from './FavoritesContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'favorites' });
  return {
    title: t('meta.title', { defaultValue: 'Favorites - Insight' }),
    description: t('meta.description', {
      defaultValue: 'Manage your favorite oracle configurations',
    }),
  };
}

export default function FavoritesPage() {
  return <FavoritesContent />;
}
