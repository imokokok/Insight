'use client';

import { use } from 'react';

import ProviderReputationContent from './ProviderReputationContent';

export default function ProviderReputationPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = use(params);
  return <ProviderReputationContent provider={decodeURIComponent(provider)} />;
}
