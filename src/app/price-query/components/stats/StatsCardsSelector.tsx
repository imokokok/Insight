'use client';

import { useMemo } from 'react';

import type { ReflectorTokenOnChainData } from '@/hooks/oracles/useReflectorOnChainData';
import type { TwapOnChainData } from '@/hooks/oracles/useTwapOnChainData';
import type { FlareTokenOnChainData } from '@/lib/oracles/clients/flare';
import type { RedStoneTokenOnChainData } from '@/lib/oracles/clients/redstone';
import type { SupraTokenOnChainData } from '@/lib/oracles/clients/supra';
import type { DIATokenOnChainData } from '@/lib/oracles/services/diaDataService';
import type { WINkLinkTokenOnChainData } from '@/lib/oracles/services/winklinkRealDataService';
import { OracleProvider as OracleProviderEnum } from '@/types/oracle';

import {
  ChainlinkStats,
  PythStats,
  API3Stats,
  DIAStats,
  WINkLinkStats,
  RedStoneStats,
  SupraStats,
  TwapStats,
  ReflectorStats,
  FlareStats,
} from './index';

import type { QueryResult, AnyOnChainData } from '../../constants';

interface StatsCardsSelectorProps {
  currentResult: QueryResult;
  diaOnChainData?: AnyOnChainData | null;
  winklinkOnChainData?: AnyOnChainData | null;
  redstoneOnChainData?: AnyOnChainData | null;
  supraOnChainData?: AnyOnChainData | null;
  twapOnChainData?: AnyOnChainData | null;
  reflectorOnChainData?: AnyOnChainData | null;
  flareOnChainData?: AnyOnChainData | null;
}

export function StatsCardsSelector({
  currentResult,
  diaOnChainData,
  winklinkOnChainData,
  redstoneOnChainData,
  supraOnChainData,
  twapOnChainData,
  reflectorOnChainData,
  flareOnChainData,
}: StatsCardsSelectorProps) {
  const provider = currentResult?.provider;
  const priceData = currentResult?.priceData;

  const providerStatsComponent = useMemo(() => {
    switch (provider) {
      case OracleProviderEnum.CHAINLINK:
        if (!priceData) return null;
        return (
          <ChainlinkStats
            roundId={priceData.roundId}
            answeredInRound={priceData.answeredInRound}
            decimals={priceData.decimals}
            version={priceData.version}
            startedAt={priceData.startedAt}
            source={priceData.source}
          />
        );

      case OracleProviderEnum.PYTH:
        if (!priceData) return null;
        return (
          <PythStats
            priceId={priceData.priceId}
            exponent={priceData.exponent}
            conf={priceData.conf}
            publishTime={priceData.publishTime}
            confidenceInterval={priceData.confidenceInterval}
            confidence={priceData.confidence}
          />
        );

      case OracleProviderEnum.API3:
        if (!priceData) return null;
        return (
          <API3Stats
            dapiName={priceData.dapiName}
            proxyAddress={priceData.proxyAddress}
            chain={priceData.chain}
            decimals={priceData.decimals}
            dataAge={priceData.dataAge}
            confidence={priceData.confidence}
          />
        );

      case OracleProviderEnum.SUPRA:
        if (supraOnChainData) {
          return <SupraStats data={supraOnChainData as SupraTokenOnChainData} />;
        }
        if (priceData) {
          const supraStatsData: SupraTokenOnChainData = {
            symbol: priceData.symbol,
            price: priceData.price,
            decimals: priceData.decimals ?? 8,
            pairIndex: priceData.pairIndex ?? 0,
            pairName: `${priceData.symbol}/USDT`,
            supportedChainsCount: 27,
            updateIntervalMinutes: 5,
            dataAge: priceData.dataAge ?? null,
            lastUpdated: priceData.timestamp,
            source: priceData.source || 'DORA V2',
          };
          return <SupraStats data={supraStatsData} />;
        }
        return null;

      case OracleProviderEnum.DIA:
        if (diaOnChainData) {
          return <DIAStats data={diaOnChainData as DIATokenOnChainData} />;
        }
        return null;

      case OracleProviderEnum.WINKLINK:
        if (winklinkOnChainData) {
          return <WINkLinkStats data={winklinkOnChainData as WINkLinkTokenOnChainData} />;
        }
        return null;

      case OracleProviderEnum.REDSTONE:
        if (redstoneOnChainData) {
          return <RedStoneStats data={redstoneOnChainData as RedStoneTokenOnChainData} />;
        }
        return null;

      case OracleProviderEnum.TWAP:
        if (twapOnChainData) {
          return <TwapStats data={twapOnChainData as TwapOnChainData} />;
        }
        return null;

      case OracleProviderEnum.REFLECTOR:
        if (reflectorOnChainData) {
          return <ReflectorStats data={reflectorOnChainData as ReflectorTokenOnChainData} />;
        }
        return null;

      case OracleProviderEnum.FLARE:
        if (flareOnChainData) {
          return <FlareStats data={flareOnChainData as FlareTokenOnChainData} />;
        }
        return null;

      default:
        return null;
    }
  }, [
    provider,
    priceData,
    supraOnChainData,
    diaOnChainData,
    winklinkOnChainData,
    redstoneOnChainData,
    twapOnChainData,
    reflectorOnChainData,
    flareOnChainData,
  ]);

  return <>{providerStatsComponent}</>;
}
