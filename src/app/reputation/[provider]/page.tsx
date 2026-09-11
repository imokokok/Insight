import { notFound } from 'next/navigation';

import { providerNames } from '@/lib/constants';
import { QueryProvider } from '@/providers/QueryProvider';
import { ORACLE_PROVIDER_VALUES, type OracleProvider } from '@/types/oracle';

import ProviderReputationContent from './ProviderReputationContent';

import type { Metadata } from 'next';

interface ProviderPageProps {
  params: Promise<{ provider: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return ORACLE_PROVIDER_VALUES.map((provider) => ({ provider }));
}

function parseProvider(value: string): OracleProvider | null {
  const normalized = value.trim().toLowerCase() as OracleProvider;
  return ORACLE_PROVIDER_VALUES.includes(normalized) ? normalized : null;
}

export async function generateMetadata({ params }: ProviderPageProps): Promise<Metadata> {
  const provider = parseProvider((await params).provider);

  if (!provider) {
    return {
      title: 'Oracle Provider Not Found — Insight',
      robots: { index: false, follow: false },
    };
  }

  const name = providerNames[provider];
  return {
    title: `${name} Oracle Reputation — Insight`,
    description: `Inspect ${name} oracle reliability, freshness, coverage, and historical reputation evidence.`,
  };
}

export default async function ProviderReputationPage({ params }: ProviderPageProps) {
  const provider = parseProvider((await params).provider);
  if (!provider) notFound();

  return (
    <QueryProvider>
      <ProviderReputationContent provider={provider} />
    </QueryProvider>
  );
}
