import { QueryProvider } from '@/providers/QueryProvider';

import PriceQueryContent from './PriceQueryContent';

export const metadata = {
  title: 'Price Query - Insight',
  description: 'Query current oracle prices',
};

export default function PriceQueryPage() {
  return (
    <QueryProvider>
      <PriceQueryContent />
    </QueryProvider>
  );
}
