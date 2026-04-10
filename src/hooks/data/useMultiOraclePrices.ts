'use client';

import { useState, useEffect } from 'react';

import { ChainlinkClient, PythClient } from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';
import { Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

const logger = createLogger('useMultiOraclePrices');

export function useMultiOraclePrices() {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const chainlinkClient = new ChainlinkClient();
        const pythClient = new PythClient();

        const [linkPrice, pythPrice] = await Promise.allSettled([
          chainlinkClient.getPrice('LINK', Blockchain.ETHEREUM),
          pythClient.getPrice('PYTH', Blockchain.SOLANA),
        ]);

        const priceMap: Record<string, PriceData> = {};
        if (linkPrice.status === 'fulfilled') priceMap['LINK'] = linkPrice.value;
        if (pythPrice.status === 'fulfilled') priceMap['PYTH'] = pythPrice.value;

        setPrices(priceMap);
      } catch (error) {
        logger.error(
          'Error fetching prices',
          error instanceof Error ? error : new Error(String(error))
        );
      } finally {
        setLoading(false);
      }
    }
    fetchPrices();
  }, []);

  return { prices, loading };
}
