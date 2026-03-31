'use client';

import {
  DocsHero,
  QuickStartSection,
  FeaturesGuideSection,
  TechnicalDocsSection,
  DeveloperResourcesSection,
} from './components';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <DocsHero />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <QuickStartSection />
        <FeaturesGuideSection />
        <TechnicalDocsSection />
        <DeveloperResourcesSection />
      </main>
    </div>
  );
}
