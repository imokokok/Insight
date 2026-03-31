'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { RedStoneClient } from '@/lib/oracles/redstone';

interface RedStoneClientContextValue {
  client: RedStoneClient;
}

const RedStoneClientContext = createContext<RedStoneClientContextValue | null>(null);

export function RedStoneClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => new RedStoneClient(), []);

  return (
    <RedStoneClientContext.Provider value={{ client }}>{children}</RedStoneClientContext.Provider>
  );
}

export function useRedStoneClient(): RedStoneClient {
  const context = useContext(RedStoneClientContext);
  if (!context) {
    throw new Error('useRedStoneClient must be used within RedStoneClientProvider');
  }
  return context.client;
}
