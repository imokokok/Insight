import { Skeleton } from '@/components/ui/Skeleton';
import { TwoColumnPageLoading } from '@/components/ui/SkeletonPatternsTwoColumn';

export default function CrossOracleLoading() {
  return (
    <TwoColumnPageLoading
      headerTitleWidth="280px"
      headerSubtitleWidth="400px"
      formFields={[
        { labelWidth: '100px', inputHeight: '40px' },
        { labelWidth: '80px', inputHeight: '36px' },
      ]}
      extraSidebarContent={
        <>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                width="100%"
                height="36px"
                className="rounded-md"
              />
            ))}
          </div>
          <FormFieldSkeleton labelWidth="80px" inputHeight="32px" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" width="60px" height="32px" />
            ))}
          </div>
        </>
      }
      chartTitleWidth="160px"
    />
  );
}

function FormFieldSkeleton({
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
