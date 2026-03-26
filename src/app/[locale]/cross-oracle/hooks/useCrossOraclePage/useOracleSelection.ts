/**
 * @fileoverview useOracleSelection Hook
 * @description 管理预言机选择状态
 */

import { useState, useCallback } from 'react';

import { OracleProvider } from '@/types/oracle';

export function useOracleSelection(
  initialOracles: OracleProvider[] = [OracleProvider.CHAINLINK, OracleProvider.PYTH]
) {
  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>(initialOracles);

  const toggleOracle = useCallback((oracle: OracleProvider) => {
    setSelectedOracles((prev) =>
      prev.includes(oracle) ? prev.filter((o) => o !== oracle) : [...prev, oracle]
    );
  }, []);

  return {
    selectedOracles,
    setSelectedOracles,
    toggleOracle,
  };
}
