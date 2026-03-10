'use client';

import { useState, useEffect } from 'react';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythNetworkClient,
  PriceData,
  Blockchain,
} from '@/lib/oracles';

export function useOraclePrices() {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const chainlinkClient = new ChainlinkClient();
        const bandClient = new BandProtocolClient();
        const umaClient = new UMAClient();
        const pythClient = new PythNetworkClient();

        const [linkPrice, bandPrice, umaPrice, pythPrice] = await Promise.allSettled([
          chainlinkClient.getPrice('LINK', Blockchain.ETHEREUM),
          bandClient.getPrice('BAND', Blockchain.ETHEREUM),
          umaClient.getPrice('UMA', Blockchain.ETHEREUM),
          pythClient.getPrice('PYTH', Blockchain.SOLANA),
        ]);

        const priceMap: Record<string, PriceData> = {};
        if (linkPrice.status === 'fulfilled') priceMap['LINK'] = linkPrice.value;
        if (bandPrice.status === 'fulfilled') priceMap['BAND'] = bandPrice.value;
        if (umaPrice.status === 'fulfilled') priceMap['UMA'] = umaPrice.value;
        if (pythPrice.status === 'fulfilled') priceMap['PYTH'] = pythPrice.value;

        setPrices(priceMap);
      } catch (error) {
        console.error('Error fetching prices:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPrices();
  }, []);

  return { prices, loading };
}
