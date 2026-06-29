import WrappedAssetsContent from './WrappedAssetsContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wrapped Asset Peg Monitor - Insight',
  description:
    'Monitor wrapped and liquid staking token peg risks against their underlying assets with protocol impact analysis',
};

export default function WrappedAssetsPage() {
  return <WrappedAssetsContent />;
}
