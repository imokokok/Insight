import { TwoColumnPageLoading } from '@/components/ui/SkeletonPatternsTwoColumn';

export default function PriceInsightLoading() {
  return (
    <TwoColumnPageLoading
      headerTitleWidth="160px"
      headerSubtitleWidth="360px"
      formFields={[
        { labelWidth: '90px', inputHeight: '40px' },
        { labelWidth: '70px', inputHeight: '40px' },
        { labelWidth: '90px', inputHeight: '40px' },
      ]}
      chartTitleWidth="140px"
      listItemCount={6}
    />
  );
}
