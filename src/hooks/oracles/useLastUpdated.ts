'use client';

import { useState, useCallback } from 'react';

export function useLastUpdated() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const updateLastUpdated = useCallback(() => {
    setLastUpdated(new Date());
  }, []);

  return {
    lastUpdated,
    updateLastUpdated,
    setLastUpdated,
  };
}
