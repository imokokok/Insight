'use client';

import dynamic from 'next/dynamic';

import { ShortcutProvider, ShortcutInitializer } from '@/components/shortcuts';

const ShortcutHelpPanel = dynamic(
  () => import('@/components/shortcuts').then((m) => m.ShortcutHelpPanel),
  { ssr: false }
);

export function AppInitializer({ children }: { children: React.ReactNode }) {
  return (
    <ShortcutProvider>
      <ShortcutInitializer />
      <ShortcutHelpPanel />
      {children}
    </ShortcutProvider>
  );
}
