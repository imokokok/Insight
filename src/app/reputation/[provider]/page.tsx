'use client';

import { use } from 'react';

import { QueryProvider } from '@/providers/QueryProvider';

import ProviderReputationContent from './ProviderReputationContent';

export default function ProviderReputationPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = use(params);
  return (
    <QueryProvider>
      <ProviderReputationContent provider={decodeURIComponent(provider)} />
    </QueryProvider>
  );
}
