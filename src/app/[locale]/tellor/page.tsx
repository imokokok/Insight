import { Metadata } from 'next';

import { OracleProvider } from '@/types/oracle';
import { TellorPageClient } from './TellorPageClient';

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: 'Tellor Oracle',
    description: 'Decentralized crypto-native oracle for transparency and decentralization',
  };
}

export default async function TellorPage({ params }: PageProps) {
  const { locale } = await params;

  return <TellorPageClient locale={locale} />;
}
