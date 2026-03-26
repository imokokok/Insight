'use client';

import { useCallback } from 'react';

import { checkApiHealth } from '@/lib/services/marketData';

import {
  type OracleMarketData,
  type AssetData,
  type TVSTrendData,
  type MarketStats,
} from './types';

export interface UseExportReturn {
  exportToCSV: () => void;
  exportToJSON: () => void;
  checkApiHealth: () => Promise<{ healthy: boolean; message: string }>;
}

export interface UseExportParams {
  oracleData: OracleMarketData[];
  assets: AssetData[];
  trendData: TVSTrendData[];
  marketStats: MarketStats;
  selectedTimeRange: string;
}

export function useExport({
  oracleData,
  assets,
  trendData,
  marketStats,
  selectedTimeRange,
}: UseExportParams): UseExportReturn {
  const exportToCSV = useCallback(() => {
    const csvLines: string[] = [];

    csvLines.push('Oracle Market Data');
    csvLines.push(
      [
        'Name',
        'Market Share (%)',
        'TVS',
        'Chains',
        'Protocols',
        '24h Change (%)',
        'Accuracy (%)',
      ].join(',')
    );
    oracleData.forEach((oracle) => {
      csvLines.push(
        [
          oracle.name,
          oracle.share.toFixed(1),
          oracle.tvs,
          oracle.chains,
          oracle.protocols,
          oracle.change24h.toFixed(2),
          oracle.accuracy.toFixed(1),
        ].join(',')
      );
    });

    csvLines.push('');

    csvLines.push('Asset Data');
    csvLines.push(
      ['Symbol', 'Price', '24h Change (%)', 'Volume (24h)', 'Market Cap', 'Primary Oracle'].join(
        ','
      )
    );
    assets.forEach((asset) => {
      csvLines.push(
        [
          asset.symbol,
          asset.price.toFixed(4),
          asset.change24h.toFixed(2),
          asset.volume24h.toString(),
          asset.marketCap.toString(),
          asset.primaryOracle,
        ].join(',')
      );
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `market-overview-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [oracleData, assets]);

  const exportToJSON = useCallback(() => {
    const exportData = {
      metadata: {
        exportTimestamp: new Date().toISOString(),
        timeRange: selectedTimeRange,
        dataPoints: {
          oracles: oracleData.length,
          assets: assets.length,
          trendPoints: trendData.length,
        },
      },
      marketStats: {
        totalTVS: marketStats.totalTVS,
        totalChains: marketStats.totalChains,
        totalProtocols: marketStats.totalProtocols,
        totalAssets: marketStats.totalAssets,
        avgUpdateLatency: marketStats.avgUpdateLatency,
        marketDominance: marketStats.marketDominance,
      },
      oracleData: oracleData.map((oracle) => ({
        name: oracle.name,
        share: oracle.share,
        tvs: oracle.tvs,
        tvsValue: oracle.tvsValue,
        chains: oracle.chains,
        protocols: oracle.protocols,
        avgLatency: oracle.avgLatency,
        accuracy: oracle.accuracy,
        updateFrequency: oracle.updateFrequency,
        change24h: oracle.change24h,
        change7d: oracle.change7d,
        change30d: oracle.change30d,
      })),
      assets: assets.map((asset) => ({
        symbol: asset.symbol,
        price: asset.price,
        change24h: asset.change24h,
        change7d: asset.change7d,
        volume24h: asset.volume24h,
        marketCap: asset.marketCap,
        primaryOracle: asset.primaryOracle,
        oracleCount: asset.oracleCount,
      })),
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `market-overview-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [oracleData, assets, trendData, marketStats, selectedTimeRange]);

  const checkApiHealthWrapper = useCallback(async () => {
    return checkApiHealth();
  }, []);

  return {
    exportToCSV,
    exportToJSON,
    checkApiHealth: checkApiHealthWrapper,
  };
}
