import { lazy, Suspense } from 'react';
import { ChartSkeleton, MiniChartSkeleton } from '@/components/ui';

import { chartColors, getChartColor } from '@/lib/chartColors';

export const LazyAreaChart = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.AreaChart }))
);

export const LazyLineChart = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.LineChart }))
);

export const LazyComposedChart = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.ComposedChart }))
);

export const LazyBarChart = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.BarChart }))
);

interface SuspenseChartProps {
  children?: React.ReactNode;
  height?: number;
}

export function SuspenseAreaChart({
  children,
  height = 112,
  ...props
}: SuspenseChartProps & Record<string, unknown>) {
  return (
    <Suspense fallback={<MiniChartSkeleton height={height} />}>
      <LazyAreaChart {...props}>{children}</LazyAreaChart>
    </Suspense>
  );
}

export function SuspenseLineChart({
  children,
  height = 80,
  ...props
}: SuspenseChartProps & Record<string, unknown>) {
  return (
    <Suspense fallback={<MiniChartSkeleton height={height} />}>
      <LazyLineChart {...props}>{children}</LazyLineChart>
    </Suspense>
  );
}

export function SuspenseComposedChart({
  children,
  height = 400,
  ...props
}: SuspenseChartProps & Record<string, unknown>) {
  return (
    <Suspense fallback={<ChartSkeleton height={height} variant="price" />}>
      <LazyComposedChart {...props}>{children}</LazyComposedChart>
    </Suspense>
  );
}

export function SuspenseBarChart({
  children,
  height = 300,
  ...props
}: SuspenseChartProps & Record<string, unknown>) {
  return (
    <Suspense fallback={<ChartSkeleton height={height} variant="bar" />}>
      <LazyBarChart {...props}>{children}</LazyBarChart>
    </Suspense>
  );
}
