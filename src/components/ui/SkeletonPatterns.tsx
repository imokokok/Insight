import { Skeleton } from '@/components/ui/Skeleton';

export function PageHeaderSkeleton({
  titleWidth = '240px',
  subtitleWidth = '360px',
}: {
  titleWidth?: string;
  subtitleWidth?: string;
}) {
  return (
    <div className="mb-6">
      <Skeleton variant="text" width={titleWidth} height="28px" className="mb-2" />
      <Skeleton variant="text" width={subtitleWidth} height="16px" />
    </div>
  );
}

export function StatsCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
          <Skeleton variant="text" width="80px" height="14px" />
          <Skeleton variant="text" width="100px" height="24px" />
        </div>
      ))}
    </div>
  );
}

export function ChartAreaSkeleton({ titleWidth = '150px' }: { titleWidth?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <Skeleton variant="text" width={titleWidth} height="18px" className="mb-4" />
      <Skeleton variant="rectangular" width="100%" height="300px" className="rounded-md" />
    </div>
  );
}

export function SkeletonCard({
  children,
  className = 'p-4',
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className} space-y-3`}>
      {children}
    </div>
  );
}

export function FormFieldSkeleton({
  labelWidth = '100px',
  inputHeight = '40px',
}: {
  labelWidth?: string;
  inputHeight?: string;
}) {
  return (
    <div className="space-y-2">
      <Skeleton variant="text" width={labelWidth} height="18px" />
      <Skeleton variant="rectangular" width="100%" height={inputHeight} className="rounded-md" />
    </div>
  );
}
