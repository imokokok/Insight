'use client';

import { TrendingUp } from 'lucide-react';

import { EmptyStateEnhanced, SegmentedControl } from '@/components/ui';
import { useTranslations } from '@/i18n';

interface QueryResultsEmptyProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

export function QueryResultsEmpty({ selectedSymbol, onSymbolChange }: QueryResultsEmptyProps) {
  const t = useTranslations();

  return (
    <EmptyStateEnhanced
      type="search"
      title={t('priceQuery.noResults.title', { symbol: selectedSymbol })}
      description={t('priceQuery.noResults.description')}
      size="lg"
      variant="page"
    >
      <div className="mt-8 pt-6 border-t border-gray-100 w-full max-w-md">
        <p className="text-xs text-gray-400 mb-4 flex items-center justify-center gap-1">
          <TrendingUp className="w-3 h-3" aria-hidden="true" />
          {t('priceQuery.noResults.popularTokens')}
        </p>
        <div className="flex items-center justify-center">
          <SegmentedControl
            options={['BTC', 'ETH', 'BNB', 'AVAX', 'MATIC', 'USDT', 'USDC'].map((token) => ({
              value: token,
              label: token,
            }))}
            value={selectedSymbol}
            onChange={(value) => onSymbolChange(value as string)}
            size="sm"
          />
        </div>
      </div>
    </EmptyStateEnhanced>
  );
}
