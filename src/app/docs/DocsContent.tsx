'use client';

import {
  ArchitectureSection,
  DataSourcesSection,
  DeveloperResourcesSection,
  DocsHero,
  FeaturesGuideSection,
  MethodologySection,
  QuickStartSection,
  TechnicalDocsSection,
} from './components';

export default function DocsContent() {
  return (
    <div className="min-h-screen bg-slate-50">
      <DocsHero />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <QuickStartSection />
        <FeaturesGuideSection />
        <TechnicalDocsSection />
        <MethodologySection />
        <ArchitectureSection />
        <DataSourcesSection />
        <DeveloperResourcesSection />
      </main>
    </div>
  );
}
