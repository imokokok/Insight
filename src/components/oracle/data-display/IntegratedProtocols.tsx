'use client';

import { useTranslations } from '@/i18n';

import { DashboardCard } from './DashboardCard';

interface Protocol {
  name: string;
  category: string;
  tvl: number;
}

const mockProtocols: Protocol[] = [
  { name: 'Aave', category: 'Lending', tvl: 12000000000 },
  { name: 'Compound', category: 'Lending', tvl: 5000000000 },
  { name: 'Uniswap', category: 'DEX', tvl: 8000000000 },
  { name: 'SushiSwap', category: 'DEX', tvl: 2000000000 },
  { name: 'MakerDAO', category: 'CDP', tvl: 7000000000 },
];

function formatTVL(value: number): string {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }
  return `$${value.toLocaleString()}`;
}

export function IntegratedProtocols() {
  const t = useTranslations();

  return (
    <DashboardCard title={t('integratedProtocols.title')}>
      <div className="space-y-3">
        {mockProtocols.map((protocol) => (
          <div
            key={protocol.name}
            className="flex items-center justify-between p-3 bg-gray-50  hover:bg-gray-100 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{protocol.name}</p>
              <p className="text-xs text-gray-500">{protocol.category}</p>
            </div>
            <p className="text-sm font-semibold text-gray-900">{formatTVL(protocol.tvl)}</p>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
