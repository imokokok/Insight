import VerifyClient from './VerifyClient';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verify a Receipt - Insight',
  description:
    'Check an Insight oracle-assessment receipt locally in your browser with no API key. Independently establish issuer-key trust; the demo fetches its sample and public registry.',
};

export default function VerifyPage() {
  return <VerifyClient />;
}
