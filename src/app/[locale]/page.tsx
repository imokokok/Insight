'use client';

import dynamic from 'next/dynamic';
import {
  HeroSkeleton,
  LivePriceTickerSkeleton,
  BentoGridSkeleton,
  CTASkeleton,
} from '@/components/ui/ChartSkeleton';
import OracleMarketOverviewSkeleton from './home-components/OracleMarketOverviewSkeleton';
import ArbitrageHeatmapSkeleton from './home-components/ArbitrageHeatmapSkeleton';

const ProfessionalHero = dynamic(() => import('./home-components/ProfessionalHero'), {
  loading: () => <HeroSkeleton />,
  ssr: true,
});

const LivePriceTicker = dynamic(() => import('./home-components/LivePriceTicker'), {
  loading: () => <LivePriceTickerSkeleton />,
  ssr: false,
});

const BentoMetricsGrid = dynamic(() => import('./home-components/BentoMetricsGrid'), {
  loading: () => <BentoGridSkeleton />,
  ssr: false,
});

const OracleMarketOverview = dynamic(() => import('./home-components/OracleMarketOverview'), {
  loading: () => <OracleMarketOverviewSkeleton />,
  ssr: false,
});

const ArbitrageHeatmap = dynamic(() => import('./home-components/ArbitrageHeatmap'), {
  loading: () => <ArbitrageHeatmapSkeleton />,
  ssr: false,
});

const ProfessionalCTA = dynamic(() => import('./home-components/ProfessionalCTA'), {
  loading: () => <CTASkeleton />,
  ssr: false,
});

export default function Home() {
  return (
    <main className="min-h-screen rounded-lg">
      <ProfessionalHero />
      <div className="non-critical-content">
        <LivePriceTicker />
      </div>
      <div className="non-critical-content">
        <BentoMetricsGrid />
      </div>
      <div className="non-critical-content">
        <OracleMarketOverview />
      </div>
      <div className="non-critical-content">
        <ArbitrageHeatmap />
      </div>
      <div className="non-critical-content">
        <ProfessionalCTA />
      </div>
    </main>
  );
}
