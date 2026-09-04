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
    <div className="editorial-workspace flex min-h-screen flex-col">
      <ApiDocsHeader />
      <main className="min-w-0 flex-1 border-t border-slate-900/10 bg-white/65">
        <ApiReferenceContainerDynamic />
      </main>
    </div>
  );
}
