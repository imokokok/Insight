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
    <div className="min-h-screen flex flex-col bg-white">
      <ApiDocsHeader />
      <main className="flex-1">
        <ApiReferenceContainerDynamic />
      </main>
    </div>
  );
}
