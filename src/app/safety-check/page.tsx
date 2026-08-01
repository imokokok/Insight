import SafetyCheckContent from './SafetyCheckContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Safety Check - Insight',
  description: 'Calculate your personal position critical deviation and liquidation risk',
};

export default function SafetyCheckPage() {
  return <SafetyCheckContent />;
}
