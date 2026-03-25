import dynamic from 'next/dynamic';
import { MetricCardSkeleton } from '@/components/ui';

export const DynamicBentoMetricsGrid = dynamic(
  () => import('./BentoMetricsGrid').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
          <div className="text-center mb-14">
            <div className="skeleton-shimmer inline-flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-200 mb-5">
              <div className="w-4 h-4 bg-primary-200" />
              <div className="w-20 h-4 bg-primary-200" />
            </div>
            <div className="h-10 w-64 bg-gray-200 mx-auto mb-4 skeleton-shimmer" />
            <div className="h-6 w-96 bg-gray-200 mx-auto skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            <MetricCardSkeleton className="sm:col-span-2 sm:row-span-2" />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        </div>
      </section>
    ),
  }
);
