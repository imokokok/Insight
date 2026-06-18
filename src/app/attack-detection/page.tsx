import AttackDetectionContent from './AttackDetectionContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Attack Detection - Insight',
  description:
    'Oracle manipulation & liquidity anomaly detection — monitors stale prices, low-liquidity exploitation, and cross-source divergence for DeFi protocols',
};

export default function AttackDetectionPage() {
  return <AttackDetectionContent />;
}
