import PreTradeSafetyContent from './PreTradeSafetyContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pre-Trade Safety - Insight',
  description:
    'Run an oracle immune-system check before any on-chain trade, then verify Insight EIP-712 safety attestations.',
};

export default function PreTradeSafetyPage() {
  return <PreTradeSafetyContent />;
}
