import { Skeleton } from '@/components/ui/Skeleton';
import { TwoColumnPageLoading } from '@/components/ui/SkeletonPatternsTwoColumn';

export default function PriceQueryLoading() {
  return (
    <div className="editorial-workspace min-h-screen">
      <TwoColumnPageLoading
        headerTitleWidth="420px"
        headerSubtitleWidth="520px"
        formFields={[
          { labelWidth: '100px', inputHeight: '40px' },
          { labelWidth: '80px', inputHeight: '40px' },
          { labelWidth: '80px', inputHeight: '40px' },
          { labelWidth: '80px', inputHeight: '40px' },
        ]}
        chartTitleWidth="140px"
        listItemContent={(i) => (
          <div
            key={i}
            className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0"
          >
            <Skeleton variant="circular" width="32px" height="32px" />
            <Skeleton variant="text" width="120px" height="16px" />
            <Skeleton variant="text" width="100px" height="16px" />
            <Skeleton variant="text" width="80px" height="16px" />
          </div>
        )}
      />
    </div>
  );
}
