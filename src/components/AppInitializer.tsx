'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { initWebVitals } from '@/lib/monitoring/webVitals';
import { setUser } from '@/lib/monitoring';

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    initializeAuth();
    initWebVitals();
  }, [initializeAuth]);

  useEffect(() => {
    setUser(user);

    if (!user) {
      useRealtimeStore.getState().reset();
    }
  }, [user]);

  return <>{children}</>;
}
