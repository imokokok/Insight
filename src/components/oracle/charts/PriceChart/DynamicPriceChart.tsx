'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/ui';
import { BaseOracleClient } from '@/lib/oracles/base';
import { Blockchain } from '@/types/oracle';
import { AdaptiveDownsampleConfig } from '@/utils/downsampling';

export interface DynamicPriceChartProps {
  client: BaseOracleClient;
  symbol: string;
  chain?: Blockchain;
  height?: number;
  showToolbar?: boolean;
  defaultPrice?: number;
  enableRealtime?: boolean;
  downsamplingConfig?: AdaptiveDownsampleConfig;
  autoDownsample?: boolean;
}

const PriceChart = dynamic(
  () => import('@/components/oracle/charts/PriceChart').then((mod) => mod.PriceChart),
  {
    ssr: false,
    loading: ({ error }) => {
      if (error) {
        return (
          <div className="flex items-center justify-center h-[400px] text-red-500">
            Failed to load chart component
          </div>
        );
      }
      return <ChartSkeleton height={400} showToolbar={true} variant="price" />;
    },
  }
);

export function DynamicPriceChart({
  client,
  symbol,
  chain,
  height = 600,
  showToolbar = true,
  defaultPrice,
  enableRealtime = true,
  downsamplingConfig,
  autoDownsample = true,
}: DynamicPriceChartProps) {
  return (
    <PriceChart
      client={client}
      symbol={symbol}
      chain={chain}
      height={height}
      showToolbar={showToolbar}
      defaultPrice={defaultPrice}
      enableRealtime={enableRealtime}
      downsamplingConfig={downsamplingConfig}
      autoDownsample={autoDownsample}
    />
  );
}

export default DynamicPriceChart;
