import type { PriceHistoryEntry } from '@/app/cross-oracle/hooks/useOracleMemory';
import { getSymbolCategory } from '@/lib/constants';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('liquidityAnalysis');

// ── 流动性抽取检测阈值（相对历史均值的下降比例）──
const LIQUIDITY_DRAIN_THRESHOLDS = {
  warning: 0.3, // 下降 30% → 警告
  severe: 0.5, // 下降 50% → 严重
  critical: 0.7, // 下降 70% → critical
} as const;

// ── 流动性水平分级阈值（按 symbol 类别的绝对值）──
const LIQUIDITY_LEVEL_THRESHOLDS: Record<string, { deep: number; moderate: number; thin: number }> =
  {
    stablecoin: { deep: 1e8, moderate: 1e7, thin: 1e6 },
    major: { deep: 1e8, moderate: 1e7, thin: 1e6 },
    alt: { deep: 1e7, moderate: 1e6, thin: 1e5 },
    micro: { deep: 1e6, moderate: 1e5, thin: 1e4 },
  };

// ── 历史样本数（取最近 N 个有效流动性点做基线）──
const LIQUIDITY_BASELINE_SAMPLES = 10;

// ── sqrtPriceX96 与 tick 一致性偏差阈值 ──
const POOL_CONSISTENCY_THRESHOLD = 0.005; // 0.5%

export type LiquidityLevel = 'deep' | 'moderate' | 'thin' | 'critical';

export interface LiquidityAnalysisResult {
  currentLiquidity: number;
  avgLiquidity: number;
  liquidityChangeRate: number;
  isLiquidityDrain: boolean;
  drainSeverity: number;
  liquidityLevel: LiquidityLevel;
  priceImpactRisk: number;
  consistencyDeviation: number;
  hasInconsistency: boolean;
}

function tickToPrice(tick: number): number {
  if (tick === 0) return 1;
  const absTick = Math.abs(tick);
  if (absTick <= 100) {
    return Math.pow(1.0001, tick);
  }
  const absPrice = Math.exp(absTick * Math.log(1.0001));
  return tick > 0 ? absPrice : 1 / absPrice;
}

function calculatePoolConsistency(
  sqrtPriceX96: string | undefined,
  tick: number | undefined
): { deviation: number; hasInconsistency: boolean } {
  if (!sqrtPriceX96 || tick === undefined) {
    return { deviation: 0, hasInconsistency: false };
  }

  try {
    const sqrtPrice = (Number(BigInt(sqrtPriceX96)) / Math.pow(2, 96)) ** 2;
    const tickPrice = tickToPrice(tick);
    if (tickPrice <= 0 || !Number.isFinite(sqrtPrice)) {
      return { deviation: 0, hasInconsistency: false };
    }
    const deviation = Math.abs(sqrtPrice - tickPrice) / tickPrice;
    return {
      deviation: Number(deviation.toFixed(6)),
      hasInconsistency: deviation > POOL_CONSISTENCY_THRESHOLD,
    };
  } catch (error) {
    logger.error(
      'Failed to calculate pool consistency',
      error instanceof Error ? error : new Error(String(error))
    );
    return { deviation: 0, hasInconsistency: false };
  }
}

export function analyzeLiquidity(
  history: PriceHistoryEntry[],
  currentLiquidity: number,
  symbol: string,
  sqrtPriceX96?: string,
  tick?: number
): LiquidityAnalysisResult {
  try {
    // 1. 计算历史平均流动性
    const validLiquidity = history
      .filter((h) => h.liquidity !== undefined && h.liquidity > 0)
      .slice(-LIQUIDITY_BASELINE_SAMPLES)
      .map((h) => h.liquidity as number);

    const avgLiquidity =
      validLiquidity.length > 0
        ? validLiquidity.reduce((s, v) => s + v, 0) / validLiquidity.length
        : currentLiquidity;

    // 2. 流动性变化率
    const liquidityChangeRate =
      avgLiquidity > 0 ? (currentLiquidity - avgLiquidity) / avgLiquidity : 0;

    // 3. 流动性抽取检测（只关注下降）
    const drainMagnitude = Math.max(0, -liquidityChangeRate);
    const isLiquidityDrain = drainMagnitude >= LIQUIDITY_DRAIN_THRESHOLDS.warning;
    const drainSeverity = Math.min(1, drainMagnitude / LIQUIDITY_DRAIN_THRESHOLDS.critical);

    // 4. 流动性水平分级
    const category = getSymbolCategory(symbol);
    const thresholds = LIQUIDITY_LEVEL_THRESHOLDS[category] ?? LIQUIDITY_LEVEL_THRESHOLDS.alt;
    let liquidityLevel: LiquidityLevel;
    if (currentLiquidity >= thresholds.deep) liquidityLevel = 'deep';
    else if (currentLiquidity >= thresholds.moderate) liquidityLevel = 'moderate';
    else if (currentLiquidity >= thresholds.thin) liquidityLevel = 'thin';
    else liquidityLevel = 'critical';

    // 5. 价格冲击风险：流动性越低，同等交易量造成的价格冲击越大
    const priceImpactRisk: Record<LiquidityLevel, number> = {
      deep: 0.1,
      moderate: 0.3,
      thin: 0.7,
      critical: 1.0,
    };

    // 6. sqrtPriceX96 与 tick 一致性校验
    const { deviation: consistencyDeviation, hasInconsistency } = calculatePoolConsistency(
      sqrtPriceX96,
      tick
    );

    logger.debug(
      `Liquidity analysis for ${symbol}: level=${liquidityLevel}, changeRate=${(liquidityChangeRate * 100).toFixed(2)}%, drain=${isLiquidityDrain}, severity=${drainSeverity.toFixed(2)}, consistency=${(consistencyDeviation * 100).toFixed(3)}%`
    );

    return {
      currentLiquidity,
      avgLiquidity,
      liquidityChangeRate: Number(liquidityChangeRate.toFixed(6)),
      isLiquidityDrain,
      drainSeverity: Number(drainSeverity.toFixed(4)),
      liquidityLevel,
      priceImpactRisk: priceImpactRisk[liquidityLevel],
      consistencyDeviation,
      hasInconsistency,
    };
  } catch (error) {
    logger.error(
      'Failed to analyze liquidity',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      currentLiquidity,
      avgLiquidity: currentLiquidity,
      liquidityChangeRate: 0,
      isLiquidityDrain: false,
      drainSeverity: 0,
      liquidityLevel: 'deep',
      priceImpactRisk: 0.1,
      consistencyDeviation: 0,
      hasInconsistency: false,
    };
  }
}
