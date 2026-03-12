'use client';

import ProfessionalHero from './home-components/ProfessionalHero';
import FeatureCards from './home-components/FeatureCards';
import ProfessionalCTA from './home-components/ProfessionalCTA';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* 1. Hero Section - Value proposition, search, 3 core metrics */}
      <ProfessionalHero />

      {/* 2. Feature Cards - 4 feature entry points */}
      <FeatureCards />

      {/* 3. CTA Section - Clean call to action */}
      <ProfessionalCTA />
    </main>
  );
}
