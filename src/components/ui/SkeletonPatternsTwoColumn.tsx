import { Skeleton } from '@/components/ui/Skeleton';
import {
  PageHeaderSkeleton,
  StatsCardsSkeleton,
  ChartAreaSkeleton,
  SkeletonCard,
  FormFieldSkeleton,
} from '@/components/ui/SkeletonPatterns';

interface TwoColumnPageLoadingProps {
  headerTitleWidth?: string;
  headerSubtitleWidth?: string;
  sidebarWidth?: string;
  formFields: Array<{ labelWidth: string; inputHeight: string }>;
  extraSidebarContent?: React.ReactNode;
  chartTitleWidth?: string;
  listItemCount?: number;
  listItemContent?: (index: number) => React.ReactNode;
}

export function TwoColumnPageLoading({
  headerTitleWidth = '240px',
  headerSubtitleWidth = '360px',
  sidebarWidth = 'xl:w-[400px]',
  formFields,
  extraSidebarContent,
  chartTitleWidth = '150px',
  listItemCount = 5,
  listItemContent,
}: TwoColumnPageLoadingProps) {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeaderSkeleton titleWidth={headerTitleWidth} subtitleWidth={headerSubtitleWidth} />
          <Skeleton variant="rounded" width="160px" height="24px" />
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <aside className={`${sidebarWidth} xl:flex-shrink-0`}>
          <SkeletonCard className="p-6">
            {formFields.map((field, i) => (
              <FormFieldSkeleton
                key={i}
                labelWidth={field.labelWidth}
                inputHeight={field.inputHeight}
              />
            ))}
            {extraSidebarContent}
          </SkeletonCard>
        </aside>

        <main className="flex-1 min-w-0 space-y-4">
          <StatsCardsSkeleton />
          <ChartAreaSkeleton titleWidth={chartTitleWidth} />
          <SkeletonCard className="p-6">
            <Skeleton variant="text" width="120px" height="18px" className="mb-4" />
            {Array.from({ length: listItemCount }).map((_, i) =>
              listItemContent ? (
                listItemContent(i)
              ) : (
                <div
                  key={i}
                  className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0"
                >
                  <Skeleton variant="circular" width="32px" height="32px" />
                  <Skeleton variant="text" width="120px" height="16px" />
                  <Skeleton variant="text" width="100px" height="16px" />
                  <Skeleton variant="rounded" width="60px" height="24px" />
                </div>
              )
            )}
          </SkeletonCard>
        </main>
      </div>
    </div>
  );
}
