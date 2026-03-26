'use client';

import { useEffect } from 'react';

import { ShortcutProvider, ShortcutInitializer, ShortcutHelpPanel } from '@/components/shortcuts';
import { setUser } from '@/lib/monitoring';
import { initWebVitals } from '@/lib/monitoring/webVitals';
import { useAuthStore } from '@/stores/authStore';
import { useRealtimeStore } from '@/stores/realtimeStore';

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const cleanupAuth = useAuthStore((state) => state.cleanup);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    initializeAuth();
    initWebVitals();

    return () => {
      cleanupAuth();
    };
  }, [initializeAuth, cleanupAuth]);

  useEffect(() => {
    setUser(user);

    if (!user) {
      useRealtimeStore.getState().reset();
    }
  }, [user]);

  return (
    <ShortcutProvider>
      <ShortcutInitializer />
      <ShortcutHelpPanel />
      {children}
    </ShortcutProvider>
  );
}
