import { lazy, Suspense } from 'react';
import { ChartSkeleton, MiniChartSkeleton } from '@/components/ui/ChartSkeleton';

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

export function SuspenseAreaChart({ children, height = 112, ...props }: any) {
  return (
    <Suspense fallback={<MiniChartSkeleton height={height} />}>
      <LazyAreaChart {...props}>{children}</LazyAreaChart>
    </Suspense>
  );
}

export function SuspenseLineChart({ children, height = 80, ...props }: any) {
  return (
    <Suspense fallback={<MiniChartSkeleton height={height} />}>
      <LazyLineChart {...props}>{children}</LazyLineChart>
    </Suspense>
  );
}

export function SuspenseComposedChart({ children, height = 400, ...props }: any) {
  return (
    <Suspense fallback={<ChartSkeleton height={height} variant="price" />}>
      <LazyComposedChart {...props}>{children}</LazyComposedChart>
    </Suspense>
  );
}

export function SuspenseBarChart({ children, height = 300, ...props }: any) {
  return (
    <Suspense fallback={<ChartSkeleton height={height} variant="bar" />}>
      <LazyBarChart {...props}>{children}</LazyBarChart>
    </Suspense>
  );
}
