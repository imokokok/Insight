import type { ReactNode } from 'react';

/**
 * A server-rendered marker for the public marketing chrome. The /ops layout
 * exposes `.ops-workspace`; CSS hides these markers there without hydrating a
 * pathname-aware wrapper on every route.
 */
export function PublicChrome({ children }: { children: ReactNode }) {
  return <div className="public-chrome contents">{children}</div>;
}
