import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/ui';
import { BaseOracleClient } from '@/lib/oracles/base';
import { Blockchain } from '@/types/oracle';

interface DynamicPriceChartProps {
  client: BaseOracleClient;
  symbol: string;
  chain?: Blockchain;
  height?: number;
  showToolbar?: boolean;
  defaultPrice?: number;
}

export const DynamicPriceChart = dynamic(
  () => import('@/components/oracle/charts/PriceChart').then((mod) => mod.PriceChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={400} showToolbar={true} variant="price" />,
  }
);

export function PriceChartLoader({
  client,
  symbol,
  chain,
  height = 400,
  showToolbar = true,
  defaultPrice,
}: DynamicPriceChartProps) {
  return (
    <DynamicPriceChart
      client={client}
      symbol={symbol}
      chain={chain}
      height={height}
      showToolbar={showToolbar}
      defaultPrice={defaultPrice}
    />
  );
}
