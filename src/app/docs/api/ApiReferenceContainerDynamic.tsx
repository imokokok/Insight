'use client';

import dynamic from 'next/dynamic';

// The Scalar API reference is a large client-only package. Load it lazily so it
// does not inflate the shared JavaScript bundles of other pages.
const ApiReferenceContainer = dynamic(
  () => import('./ApiReferenceContainer').then((mod) => mod.ApiReferenceContainer),
  {
    ssr: false,
    loading: () => <div className="flex-1 bg-white" />,
  }
);

export function ApiReferenceContainerDynamic() {
  return <ApiReferenceContainer />;
}
