'use client';

import { OracleProvider as OracleProviderEnum } from '@/lib/oracles';
import type { RedStoneTokenOnChainData } from '@/lib/oracles/clients/redstone';
import type { SupraTokenOnChainData } from '@/lib/oracles/clients/supra';
import type { DIATokenOnChainData } from '@/lib/oracles/services/diaDataService';
import type { WINkLinkTokenOnChainData } from '@/lib/oracles/services/winklinkRealDataService';

import {
  ChainlinkStats,
  PythStats,
  API3Stats,
  DIAStats,
  WINkLinkStats,
  RedStoneStats,
  SupraStats,
  DefaultStats,
} from './index';

import type { QueryResult } from '../../constants';

type AnyOnChainData =
  | DIATokenOnChainData
  | RedStoneTokenOnChainData
  | SupraTokenOnChainData
  | WINkLinkTokenOnChainData;

interface StatsCardsSelectorProps {
  currentResult: QueryResult;
  diaOnChainData?: AnyOnChainData | null;
  winklinkOnChainData?: AnyOnChainData | null;
  redstoneOnChainData?: AnyOnChainData | null;
  supraOnChainData?: AnyOnChainData | null;
  maxPrice: number;
  minPrice: number;
  avgPrice: number;
  priceRange: number;
  volume24h: number;
  consistencyRating: {
    label: string;
    color: string;
  } | null;
  standardDeviationPercent: number;
}

export function StatsCardsSelector({
  currentResult,
  diaOnChainData,
  winklinkOnChainData,
  redstoneOnChainData,
  supraOnChainData,
  maxPrice,
  minPrice,
  avgPrice,
  priceRange,
  volume24h,
  consistencyRating,
  standardDeviationPercent,
}: StatsCardsSelectorProps) {
  const isChainlink = currentResult?.provider === OracleProviderEnum.CHAINLINK;
  const chainlinkData = isChainlink ? currentResult?.priceData : null;

  const isPyth = currentResult?.provider === OracleProviderEnum.PYTH;
  const pythData = isPyth ? currentResult?.priceData : null;

  const isAPI3 = currentResult?.provider === OracleProviderEnum.API3;
  const api3Data = isAPI3 ? currentResult?.priceData : null;

  const isSupra = currentResult?.provider === OracleProviderEnum.SUPRA;
  const supraData = isSupra ? currentResult?.priceData : null;

  if (isChainlink && chainlinkData) {
    return (
      <ChainlinkStats
        roundId={chainlinkData.roundId}
        answeredInRound={chainlinkData.answeredInRound}
        decimals={chainlinkData.decimals}
        version={chainlinkData.version}
        startedAt={chainlinkData.startedAt}
        source={chainlinkData.source}
      />
    );
  }

  if (isPyth && pythData) {
    return (
      <PythStats
        priceId={pythData.priceId}
        exponent={pythData.exponent}
        conf={pythData.conf}
        publishTime={pythData.publishTime}
        confidenceInterval={pythData.confidenceInterval}
        confidence={pythData.confidence}
      />
    );
  }

  if (isAPI3 && api3Data) {
    return (
      <API3Stats
        dapiName={api3Data.dapiName}
        proxyAddress={api3Data.proxyAddress}
        chain={api3Data.chain}
        decimals={api3Data.decimals}
        dataAge={api3Data.dataAge}
        confidence={api3Data.confidence}
      />
    );
  }

  if (isSupra && supraData) {
    const supraStatsData: SupraTokenOnChainData = {
      symbol: supraData.symbol,
      price: supraData.price,
      decimals: supraData.decimals ?? 8,
      pairIndex: (supraData as unknown as { pairIndex?: number }).pairIndex ?? 0,
      pairName: `${supraData.symbol}/USDT`,
      supportedChainsCount: 27,
      updateIntervalMinutes: 5,
      dataAge: supraData.timestamp ? Math.round((Date.now() - supraData.timestamp) / 1000) : null,
      lastUpdated: supraData.timestamp,
      source: supraData.source || 'DORA V2',
    };
    return <SupraStats data={supraStatsData} />;
  }

  if (diaOnChainData) {
    return <DIAStats data={diaOnChainData as DIATokenOnChainData} />;
  }

  if (winklinkOnChainData) {
    return <WINkLinkStats data={winklinkOnChainData as WINkLinkTokenOnChainData} />;
  }

  if (redstoneOnChainData) {
    return <RedStoneStats data={redstoneOnChainData as RedStoneTokenOnChainData} />;
  }

  if (supraOnChainData) {
    return <SupraStats data={supraOnChainData as SupraTokenOnChainData} />;
  }

  return (
    <DefaultStats
      maxPrice={maxPrice}
      minPrice={minPrice}
      avgPrice={avgPrice}
      priceRange={priceRange}
      volume24h={volume24h}
      consistencyRating={consistencyRating}
      standardDeviationPercent={standardDeviationPercent}
    />
  );
}
