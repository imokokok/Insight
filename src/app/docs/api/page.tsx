import Link from 'next/link';

import { ArrowUpRight } from 'lucide-react';

import { ApiDocsHeader } from './ApiDocsHeader';
import { ApiReferenceContainerDynamic } from './ApiReferenceContainerDynamic';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Reference — Insight',
  description:
    'Interactive API reference for the Insight Oracle Risk & Transparency API. Explore all endpoints, try requests, and generate code snippets.',
};

export default function ApiDocsPage() {
  return (
    <div className="editorial-workspace evidence-workbench developer-workbench api-reference-workbench flex min-h-screen flex-col">
      <ApiDocsHeader />
      <section
        className="api-reference-orientation"
        aria-labelledby="api-reference-orientation-title"
      >
        <div className="api-reference-orientation-lead">
          <span>Reference / REST v1</span>
          <h2 id="api-reference-orientation-title">Find the contract behind each signal.</h2>
          <p>
            Explore parameters, response schemas, and credit requirements before sending a request.
          </p>
          <Link href="/api#first-request">
            Start with one request <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="api-reference-orientation-steps">
          <div>
            <span>01 / Access</span>
            <strong>Bring an API key</strong>
            <small>Use X-API-Key on metered endpoints.</small>
          </div>
          <div>
            <span>02 / Discover</span>
            <strong>Search the operation</strong>
            <small>Read parameters and response shape.</small>
          </div>
          <div>
            <span>03 / Verify</span>
            <strong>Inspect the evidence</strong>
            <small>Check source, freshness, and errors.</small>
          </div>
        </div>
      </section>
      <main
        id="examples"
        className="api-reference-surface min-w-0 scroll-mt-24 flex-1 border-t border-slate-900/10 bg-white/65"
      >
        <ApiReferenceContainerDynamic />
      </main>
    </div>
  );
}
