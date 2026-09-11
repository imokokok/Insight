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
  VerifiableReceiptsSection,
} from './components';

export default function DocsContent() {
  return (
    <div className="editorial-workspace evidence-workbench developer-workbench docs-workbench min-h-screen">
      <DocsHero />

      <div className="docs-content-ledger editorial-frame mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12">
        <QuickStartSection />
        <FeaturesGuideSection />
        <VerifiableReceiptsSection />
        <TechnicalDocsSection />
        <MethodologySection />
        <ArchitectureSection />
        <DataSourcesSection />
        <DeveloperResourcesSection />
      </div>
    </div>
  );
}
