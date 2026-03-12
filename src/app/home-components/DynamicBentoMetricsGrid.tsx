import dynamic from 'next/dynamic';
import { MetricCardSkeleton } from '@/components/ui/ChartSkeleton';

export const DynamicBentoMetricsGrid = dynamic(
  () => import('@/app/home-components/BentoMetricsGrid').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <section className="py-20 bg-gradient-to-b from-white to-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50/80 border border-blue-100 rounded-full mb-5 shadow-sm animate-pulse">
              <div className="w-4 h-4 bg-blue-200 rounded" />
              <div className="w-20 h-4 bg-blue-200 rounded" />
            </div>
            <div className="h-10 w-64 bg-gray-200 rounded mx-auto mb-4 animate-pulse" />
            <div className="h-6 w-96 bg-gray-200 rounded mx-auto animate-pulse" />
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
