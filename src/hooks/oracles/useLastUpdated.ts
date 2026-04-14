'use client';

import { useState, useCallback, useRef } from 'react';

export function useLastUpdated() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const dateRef = useRef<Date | null>(null);

  const updateLastUpdated = useCallback(() => {
    dateRef.current = new Date();
    setLastUpdated(dateRef.current);
  }, []);

  return {
    lastUpdated,
    updateLastUpdated,
  };
}
