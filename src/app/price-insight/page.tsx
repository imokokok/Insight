import { QueryProvider } from '@/providers/QueryProvider';

import PriceInsightContent from './PriceInsightContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Price Insight - Insight',
  description: 'Compare oracle prices across blockchains and providers',
};

export default function PriceInsightPage() {
  return (
    <QueryProvider>
      <PriceInsightContent />
    </QueryProvider>
  );
}
