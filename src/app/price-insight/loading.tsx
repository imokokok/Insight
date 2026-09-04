import { TwoColumnPageLoading } from '@/components/ui/SkeletonPatternsTwoColumn';

export default function PriceInsightLoading() {
  return (
    <div className="editorial-workspace min-h-screen">
      <TwoColumnPageLoading
        headerTitleWidth="460px"
        headerSubtitleWidth="520px"
        formFields={[
          { labelWidth: '90px', inputHeight: '40px' },
          { labelWidth: '70px', inputHeight: '40px' },
          { labelWidth: '90px', inputHeight: '40px' },
        ]}
        chartTitleWidth="140px"
        listItemCount={6}
      />
    </div>
  );
}
