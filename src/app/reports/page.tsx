import { type Metadata } from 'next';

import ReportsContent from './ReportsContent';

export const metadata: Metadata = {
  title: 'Daily Oracle Reports - Insight',
  description:
    'Daily summaries of oracle price performance, cross-provider deviations, and risk highlights across the Insight network.',
};

export default function ReportsPage() {
  return <ReportsContent />;
}
