'use client';

import { useState, useEffect, useMemo, useRef } from 'react';

import {
  type AlertRecord,
  type FlashLoanDetectionResult,
  type OracleDeviationEntry,
  type SpotTwapDeviationPoint,
} from '@/app/attack-detection/types';
import { useDivergenceSignals } from '@/app/cross-oracle/hooks/useDivergenceSignals';
import { useFeedBehavior } from '@/app/cross-oracle/hooks/useFeedBehavior';
import { useOracleData } from '@/app/cross-oracle/hooks/useOracleData';
import { calculateConsensusPrice, type ConsensusPriceInput } from '@/lib/analytics/consensusPrice';
import {
  calculateOracleTwapDeviations,
  detectFlashLoanAttack,
  type FlashLoanDetectionInput,
} from '@/lib/analytics/flashLoanDetection';
import { analyzeLiquidity, type LiquidityAnalysisResult } from '@/lib/analytics/liquidityAnalysis';
import { createLogger } from '@/lib/utils/logger';
import type { RefreshInterval } from '@/types/common';
import { type Blockchain, type OracleProvider, type PriceData } from '@/types/oracle';

const logger = createLogger('useAttackDetection');

const MAX_DEVIATION_HISTORY = 60;
const MAX_ALERT_HISTORY = 50;

export interface UseAttackDetectionOptions {
  symbol: string;
  chain: Blockchain;
  selectedOracles: OracleProvider[];
  refreshIntervalMs: RefreshInterval;
}

export interface UseAttackDetectionReturn {
  detectionResult: FlashLoanDetectionResult | null;
  oracleDeviations: OracleDeviationEntry[];
  deviationHistory: SpotTwapDeviationPoint[];
  priceData: PriceData[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  fetchPriceData: () => Promise<void>;
  activeAlertCount: number;
  alertHistory: AlertRecord[];
  priceHistoryMapRef: React.MutableRefObject<
    Map<OracleProvider, { price: number; timestamp: number; success: boolean }[]>
  >;
}

function toConsensusInputs(priceData: PriceData[]): ConsensusPriceInput[] {
  return priceData
    .filter((p) => p.price > 0 && Number.isFinite(p.price))
    .map((p) => ({
      provider: p.provider,
      price: p.price,
      timestamp: p.timestamp,
      confidence: p.confidence,
      confidenceInterval: p.confidenceInterval,
    }));
}

export function useAttackDetection({
  symbol,
  chain,
  selectedOracles,
  refreshIntervalMs,
}: UseAttackDetectionOptions): UseAttackDetectionReturn {
  // ── Oracle data fetching ──
  const { priceData, isLoading, error, lastUpdated, fetchPriceData, priceHistoryMapRef } =
    useOracleData({
      selectedOracles,
      selectedSymbol: symbol,
      initialRefreshInterval: refreshIntervalMs,
    });

  // ── Divergence signals ──
  const divergenceSignals = useDivergenceSignals(priceData, priceHistoryMapRef);

  // ── Feed behavior ──
  const feedBehavior = useFeedBehavior(priceData, priceHistoryMapRef);

  // ── Consensus price (direct calculation, not hook) ──
  const consensusResult = useMemo(() => {
    const inputs = toConsensusInputs(priceData);
    if (inputs.length === 0) return null;
    return calculateConsensusPrice(inputs, undefined, symbol);
  }, [priceData, symbol]);

  // ── TWAP data extraction ──
  const twapData = useMemo(() => {
    let spotPrice = 0;
    let twapPrice = 0;

    for (const item of priceData) {
      if (item.provider === 'twap') {
        spotPrice = item.spotPrice ?? 0;
        twapPrice = item.twapPrice ?? 0;
        break;
      }
    }

    return { spotPrice, twapPrice };
  }, [priceData]);

  // ── Liquidity analysis (only for TWAP provider, which reads on-chain pool state) ──
  const liquidityAnalysis = useMemo<LiquidityAnalysisResult | null>(() => {
    if (priceData.length === 0) return null;

    const twapEntry = priceData.find((p) => p.provider === 'twap');
    if (!twapEntry || !twapEntry.liquidity) return null;

    try {
      const currentLiquidity = Number(BigInt(twapEntry.liquidity));
      if (!Number.isFinite(currentLiquidity) || currentLiquidity <= 0) return null;

      const history = priceHistoryMapRef.current.get('twap' as OracleProvider) ?? [];
      return analyzeLiquidity(
        history,
        currentLiquidity,
        symbol,
        twapEntry.sqrtPriceX96,
        twapEntry.tick
      );
    } catch (err) {
      logger.error(
        'Liquidity analysis failed',
        err instanceof Error ? err : new Error(String(err))
      );
      return null;
    }
  }, [priceData, priceHistoryMapRef, symbol]);

  // ── Deviation history (local state, max 60 points) ──
  const [deviationHistory, setDeviationHistory] = useState<SpotTwapDeviationPoint[]>([]);

  // ── Alert history (local state, max 50 items) ──
  const [alertHistory, setAlertHistory] = useState<AlertRecord[]>([]);

  // ── Alert counter ref for unique IDs ──
  const alertCounterRef = useRef(0);

  // ── Flash loan detection ──
  const detectionResult = useMemo<FlashLoanDetectionResult | null>(() => {
    if (priceData.length === 0) return null;
    if (!divergenceSignals.divergenceResult) return null;
    if (!consensusResult) return null;
    if (!feedBehavior.feedBehaviorResult) return null;

    try {
      const { spotPrice, twapPrice } = twapData;

      // Build oracle prices array
      const oraclePrices = priceData
        .filter((p) => p.price > 0 && Number.isFinite(p.price))
        .map((p) => ({
          provider: p.provider,
          price: p.price,
          timestamp: p.timestamp,
        }));

      // Fallback: if TWAP data is not available, use consensus price as reference
      const effectiveSpotPrice = spotPrice > 0 ? spotPrice : consensusResult.price;
      const effectiveTwapPrice = twapPrice > 0 ? twapPrice : consensusResult.price;

      const input: FlashLoanDetectionInput = {
        symbol,
        oraclePrices,
        twapPrice: effectiveTwapPrice,
        spotPrice: effectiveSpotPrice,
        divergenceResult: divergenceSignals.divergenceResult,
        consensusResult,
        feedBehaviorResult: feedBehavior.feedBehaviorResult,
        liquidityAnalysis: liquidityAnalysis ?? undefined,
      };

      return detectFlashLoanAttack(input);
    } catch (err) {
      logger.error(
        'Flash loan detection failed',
        err instanceof Error ? err : new Error(String(err))
      );
      return null;
    }
  }, [
    priceData,
    twapData,
    divergenceSignals.divergenceResult,
    consensusResult,
    feedBehavior.feedBehaviorResult,
    symbol,
    liquidityAnalysis,
  ]);

  // ── Oracle deviations ──
  const oracleDeviations = useMemo<OracleDeviationEntry[]>(() => {
    if (priceData.length === 0) return [];

    try {
      const { twapPrice } = twapData;
      const effectiveTwapPrice = twapPrice > 0 ? twapPrice : (consensusResult?.price ?? 0);

      if (effectiveTwapPrice <= 0) return [];

      const oraclePrices = priceData
        .filter((p) => p.price > 0 && Number.isFinite(p.price))
        .map((p) => ({
          provider: p.provider,
          price: p.price,
          timestamp: p.timestamp,
        }));

      return calculateOracleTwapDeviations(oraclePrices, effectiveTwapPrice, symbol);
    } catch (err) {
      logger.error(
        'Oracle deviation calculation failed',
        err instanceof Error ? err : new Error(String(err))
      );
      return [];
    }
  }, [priceData, twapData, consensusResult, symbol]);

  // ── Update deviation history on each fetch ──
  useEffect(() => {
    if (priceData.length === 0 || !consensusResult) return;

    const { spotPrice, twapPrice } = twapData;
    const effectiveSpotPrice = spotPrice > 0 ? spotPrice : consensusResult.price;
    const effectiveTwapPrice = twapPrice > 0 ? twapPrice : consensusResult.price;

    if (effectiveTwapPrice <= 0) return;

    const deviationPercent = ((effectiveSpotPrice - effectiveTwapPrice) / effectiveTwapPrice) * 100;

    const point: SpotTwapDeviationPoint = {
      timestamp: Date.now(),
      spotPrice: effectiveSpotPrice,
      twapPrice: effectiveTwapPrice,
      consensusPrice: consensusResult.price,
      deviationPercent: Number(deviationPercent.toFixed(4)),
      isOverThreshold: oracleDeviations.some((d) => d.isOverThreshold),
    };

    setDeviationHistory((prev) => {
      const next = [...prev, point];
      if (next.length > MAX_DEVIATION_HISTORY) {
        return next.slice(next.length - MAX_DEVIATION_HISTORY);
      }
      return next;
    });
  }, [priceData, twapData, consensusResult, oracleDeviations]);

  // ── Update alert history when threat level is medium or above ──
  useEffect(() => {
    if (!detectionResult) return;

    const threatLevel = detectionResult.threatLevel;
    if (threatLevel !== 'medium' && threatLevel !== 'high' && threatLevel !== 'critical') return;

    const now = new Date();

    for (const alert of detectionResult.alerts) {
      alertCounterRef.current += 1;

      const record: AlertRecord = {
        id: `alert-${alertCounterRef.current}-${now.getTime()}`,
        level: alert.level,
        threatLevel,
        symbol,
        chain,
        provider: alert.provider,
        spotTwapDeviation: detectionResult.signature.spotTwapDeviation,
        deviationAcceleration: detectionResult.signature.deviationAcceleration,
        crossOracleAgreement: detectionResult.signature.crossOracleAgreement,
        directionalBiasCount: detectionResult.signature.directionalBiasCount,
        message: alert.message,
        recommendation: detectionResult.recommendation,
        liquidityLevel: detectionResult.signature.liquidityLevel,
        liquidityChangeRate: detectionResult.signature.liquidityChangeRate,
        drainSeverity: detectionResult.signature.drainSeverity,
        startedAt: now.toISOString(),
        resolvedAt: null,
        durationSeconds: null,
      };

      setAlertHistory((prev) => {
        const next = [record, ...prev];
        if (next.length > MAX_ALERT_HISTORY) {
          return next.slice(0, MAX_ALERT_HISTORY);
        }
        return next;
      });
    }
  }, [detectionResult, symbol, chain]);

  // ── Active alert count ──
  const activeAlertCount = useMemo(() => {
    if (!detectionResult) return 0;
    const level = detectionResult.threatLevel;
    if (level === 'medium' || level === 'high' || level === 'critical') {
      return detectionResult.alerts.length;
    }
    return 0;
  }, [detectionResult]);

  return {
    detectionResult,
    oracleDeviations,
    deviationHistory,
    priceData,
    isLoading,
    error,
    lastUpdated,
    fetchPriceData,
    activeAlertCount,
    alertHistory,
    priceHistoryMapRef,
  };
}
