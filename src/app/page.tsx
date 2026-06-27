import { Suspense } from 'react';

import { fetchDashboardInitialData } from '@/lib/home/dashboardData';

import HomeContent from './HomeContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insight - Oracle Data Platform',
  description:
    'Comprehensive analysis and comparison of major oracle protocols. Real-time price monitoring, protocol performance evaluation for Web3 developers and analysts.',
  keywords: ['oracle', 'chainlink', 'pyth', 'price data', 'blockchain', 'DeFi', 'data analytics'],
  openGraph: {
    title: 'Insight - Oracle Data Platform',
    description: 'Comprehensive analysis and comparison of major oracle protocols.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Insight - Oracle Data Platform',
    description: 'Comprehensive analysis and comparison of major oracle protocols.',
  },
};

export const revalidate = 15;

function HomeFallback() {
  return (
    <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Loading dashboard...</span>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const initialData = await fetchDashboardInitialData();

  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent initialData={initialData} />
    </Suspense>
  );
}
