'use client';

import type { ReactNode } from 'react';

import { usePathname } from 'next/navigation';

/**
 * Hides the public marketing chrome (Navbar / Footer / Feedback / status pill)
 * on the internal /ops console. The console renders its own full-screen shell
 * (sidebar + content), so showing the public nav/footer around it is redundant
 * and unprofessional. Returns null for any /ops* route.
 */
export function PublicChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/ops')) return null;
  return <>{children}</>;
}
