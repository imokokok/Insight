'use client';

import { useState, useCallback, useMemo } from 'react';

import {
  useRefresh,
  useExport,
  useBandProtocolAllData,
  useBandIBCConnections,
  useBandIBCTransferStats,
  useBandIBCTransferTrends,
  useBandStakingInfo,
  useBandStakingDistribution,
  useBandGovernanceProposals,
  useBandGovernanceParams,
  useBandDataSources,
  useBandOracleScripts,
} from '@/hooks';
import { useTranslations } from '@/i18n';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';

import { type BandProtocolTabId } from '../types';

export function useBandProtocolPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<BandProtocolTabId>('market');

  const config = useMemo(() => getOracleConfig(OracleProvider.BAND_PROTOCOL), []);

  const {
    price,
    historicalData,
    networkStats,
    validators,
    crossChainStats,
    isLoading,
    isError,
    errors,
    refetchAll,
    lastUpdated,
  } = useBandProtocolAllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const { ibcConnections } = useBandIBCConnections(true);
  const { ibcTransferStats } = useBandIBCTransferStats(true);
  const { ibcTransferTrends } = useBandIBCTransferTrends({ days: 7, enabled: true });
  const { stakingInfo } = useBandStakingInfo(true);
  const { stakingDistribution } = useBandStakingDistribution(true);
  const { proposals: governanceProposals } = useBandGovernanceProposals({ enabled: true });
  const { governanceParams } = useBandGovernanceParams(true);
  const {
    dataSources,
    total: dataSourcesTotal,
    error: dataSourcesError,
    isLoading: dataSourcesLoading,
    refetch: refetchDataSources,
  } = useBandDataSources({ getAllDataSources: true });
  const {
    oracleScripts,
    error: oracleScriptsError,
    isLoading: oracleScriptsLoading,
    refetch: refetchOracleScripts,
  } = useBandOracleScripts(true);

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      network: networkStats,
      validators,
      crossChain: crossChainStats,
    },
    filename: 'band-protocol-data',
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const aggregatedError = useMemo(() => {
    if (errors.length === 0) return null;
    if (errors.length === 1) return errors[0];
    return new Error(
      `${errors.length} errors occurred: ${errors.map((e) => e.message).join('; ')}`
    );
  }, [errors]);

  const handleTabChange = useCallback((tab: BandProtocolTabId) => {
    setActiveTab(tab);
  }, []);

  return {
    activeTab,
    config,
    price,
    historicalData,
    networkStats,
    validators,
    crossChainStats,
    ibcConnections,
    ibcTransferStats,
    ibcTransferTrends,
    stakingInfo,
    stakingDistribution,
    governanceProposals,
    governanceParams,
    dataSources,
    dataSourcesTotal,
    dataSourcesLoading,
    dataSourcesError,
    oracleScripts,
    oracleScriptsLoading,
    oracleScriptsError,
    isLoading,
    isError,
    errors,
    aggregatedError,
    error: errors[0] || null,
    lastUpdated,
    isRefreshing,
    setActiveTab: handleTabChange,
    refresh,
    refetchDataSources,
    refetchOracleScripts,
    exportData,
    t,
  };
}
