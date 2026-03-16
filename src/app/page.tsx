'use client';

import dynamic from 'next/dynamic';
import ProfessionalHero from './home-components/ProfessionalHero';
import LivePriceTicker from './home-components/LivePriceTicker';
import BentoMetricsGrid from './home-components/BentoMetricsGrid';
import OracleMarketOverviewSkeleton from './home-components/OracleMarketOverviewSkeleton';
import ArbitrageHeatmapSkeleton from './home-components/ArbitrageHeatmapSkeleton';
import ProfessionalCTA from './home-components/ProfessionalCTA';

const OracleMarketOverview = dynamic(() => import('./home-components/OracleMarketOverview'), {
  loading: () => <OracleMarketOverviewSkeleton />,
  ssr: false,
});

const ArbitrageHeatmap = dynamic(() => import('./home-components/ArbitrageHeatmap'), {
  loading: () => <ArbitrageHeatmapSkeleton />,
  ssr: false,
});

export default function Home() {
  return (
    <main className="min-h-screen">
      <ProfessionalHero />
      <LivePriceTicker />
      <BentoMetricsGrid />
      <OracleMarketOverview />
      <ArbitrageHeatmap />
      <ProfessionalCTA />
    </main>
  );
}
