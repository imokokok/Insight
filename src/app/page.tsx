'use client';

import ProfessionalHero from './home-components/ProfessionalHero';
import LivePriceTicker from './home-components/LivePriceTicker';
import BentoMetricsGrid from './home-components/BentoMetricsGrid';
import OracleMarketOverview from './home-components/OracleMarketOverview';
import ArbitrageHeatmap from './home-components/ArbitrageHeatmap';
import ProfessionalCTA from './home-components/ProfessionalCTA';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* 1. Hero Section - Value proposition, search, 3 core metrics with animated background */}
      <ProfessionalHero />

      {/* 2. Live Price Ticker - Real-time scrolling price data */}
      <LivePriceTicker />

      {/* 3. Bento Metrics Grid - Key platform metrics with charts */}
      <BentoMetricsGrid />

      {/* 4. Oracle Market Overview - Market share, trends, chain support */}
      <OracleMarketOverview />

      {/* 5. Arbitrage Heatmap - Cross-chain price differences */}
      <ArbitrageHeatmap />

      {/* 6. CTA Section - Single primary action */}
      <ProfessionalCTA />
    </main>
  );
}
