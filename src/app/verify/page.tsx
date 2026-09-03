import VerifyClient from './VerifyClient';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verify a Receipt - Insight',
  description:
    'Verify an Insight OracleSafetyCheck receipt entirely in your browser — no server, no API key, no trust in Insight. Powered by verify-insight-receipt.',
};

export default function VerifyPage() {
  return <VerifyClient />;
}
