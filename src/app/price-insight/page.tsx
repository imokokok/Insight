import { QueryProvider } from '@/providers/QueryProvider';

import PriceInsightContent from './PriceInsightContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Oracle Evidence - Insight',
  description: 'Inspect source records, compare oracle evidence and assess price risk',
};

export default function PriceInsightPage() {
  return (
    <QueryProvider>
      <PriceInsightContent />
    </QueryProvider>
  );
}
