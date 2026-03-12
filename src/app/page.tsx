'use client';

import ProfessionalHero from './home-components/ProfessionalHero';
import BentoMetricsGrid from './home-components/BentoMetricsGrid';
import OracleMarketOverview from './home-components/OracleMarketOverview';
import ArbitrageHeatmap from './home-components/ArbitrageHeatmap';
import ProfessionalCTA from './home-components/ProfessionalCTA';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* 1. Hero Section - Full screen with search */}
      <ProfessionalHero />

      {/* 2. Bento Metrics Grid - Key platform metrics with live data */}
      <BentoMetricsGrid />

      {/* 3. Oracle Market Overview - Interactive charts */}
      <OracleMarketOverview />

      {/* 4. Arbitrage Heatmap - Cross-chain price differences */}
      <ArbitrageHeatmap />

      {/* 5. Professional CTA - Features, stats, partners and call to action */}
      <ProfessionalCTA />
    </main>
  );
}
