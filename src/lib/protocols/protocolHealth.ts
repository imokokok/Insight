import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider } from '@/types/oracle';

// Types are imported dynamically inside calculatePositionCriticalDeviation

const logger = createLogger('protocol-health');

export type HealthStatus = 'safe' | 'warning' | 'critical' | 'liquidated';

export interface PricePoint {
  deviationPercent: number;
  collateralPrice: number;
  collateralValue: number;
  borrowValue: number;
  collateralRatio: number;
  status: HealthStatus;
  statusLabel: string;
}

export interface PositionCriticalResult {
  protocolId: string;
  protocolName: string;
  chain: string;
  collateralSymbol: string;
  collateralAmount: number;
  collateralPrice: number;
  borrowSymbol: string;
  borrowAmount: number;
  borrowPrice: number;
  liquidationThreshold: number;
  currentCollateralRatio: number;
  currentHealthFactor: number;
  criticalDeviationPercent: number;
  criticalCollateralPrice: number;
  pricePoints: PricePoint[];
  lastUpdated: number;
}

interface PriceLookup {
  provider: OracleProvider;
  symbol: string;
  price: number;
  timestamp: number;
}

export interface PositionInput {
  protocolId: string;
  collateralSymbol: string;
  collateralAmount: number;
  borrowSymbol: string;
  borrowAmount: number;
}

export async function calculatePositionCriticalDeviation(
  input: PositionInput,
  fetchPrices: (queries: { provider: OracleProvider; symbol: string }[]) => Promise<PriceLookup[]>
): Promise<PositionCriticalResult> {
  const startTime = Date.now();

  try {
    const { getProtocolById } = await import('./protocolRegistry');
    const protocol = getProtocolById(input.protocolId);

    if (!protocol) {
      throw new Error(`Protocol not found: ${input.protocolId}`);
    }

    const collateralAsset = protocol.assets.find((a) => a.symbol === input.collateralSymbol);
    const borrowAsset = protocol.assets.find((a) => a.symbol === input.borrowSymbol);

    if (!collateralAsset) {
      throw new Error(
        `Collateral asset ${input.collateralSymbol} not supported in ${protocol.name}`
      );
    }
    if (!borrowAsset) {
      throw new Error(`Borrow asset ${input.borrowSymbol} not supported in ${protocol.name}`);
    }

    // 获取实时价格
    const prices = await fetchPrices([
      { provider: collateralAsset.oracleProvider, symbol: input.collateralSymbol },
      { provider: borrowAsset.oracleProvider, symbol: input.borrowSymbol },
    ]);

    const collateralPrice =
      prices.find((p) => p.symbol === input.collateralSymbol && p.price > 0)?.price ?? 0;
    const borrowPrice =
      prices.find((p) => p.symbol === input.borrowSymbol && p.price > 0)?.price ?? 0;

    if (collateralPrice <= 0 || borrowPrice <= 0) {
      throw new Error('Failed to fetch required price data');
    }

    const liquidationThreshold = collateralAsset.liquidationCollateralRatio;

    // 计算当前状态
    const collateralValue = input.collateralAmount * collateralPrice;
    const borrowValue = input.borrowAmount * borrowPrice;
    const currentCollateralRatio = borrowValue > 0 ? collateralValue / borrowValue : 0;
    const currentHealthFactor = currentCollateralRatio / liquidationThreshold;

    // 计算临界价格：collateralAmount * price * (1/liquidationThreshold) = borrowValue
    // price_critical = (borrowValue * liquidationThreshold) / collateralAmount
    const criticalCollateralPrice =
      input.collateralAmount > 0
        ? (borrowValue * liquidationThreshold) / input.collateralAmount
        : 0;

    const criticalDeviationPercent =
      collateralPrice > 0 ? (criticalCollateralPrice / collateralPrice - 1) * 100 : 0;

    // 生成价格点表格
    const pricePoints = generatePricePoints(
      collateralPrice,
      criticalCollateralPrice,
      criticalDeviationPercent,
      input.collateralAmount,
      borrowValue,
      liquidationThreshold
    );

    logger.info(
      `Position critical deviation calculated for ${protocol.id}: ${criticalDeviationPercent.toFixed(2)}%`,
      { durationMs: Date.now() - startTime }
    );

    return {
      protocolId: protocol.id,
      protocolName: protocol.name,
      chain: protocol.chain,
      collateralSymbol: input.collateralSymbol,
      collateralAmount: input.collateralAmount,
      collateralPrice,
      borrowSymbol: input.borrowSymbol,
      borrowAmount: input.borrowAmount,
      borrowPrice,
      liquidationThreshold,
      currentCollateralRatio,
      currentHealthFactor,
      criticalDeviationPercent: Number(criticalDeviationPercent.toFixed(4)),
      criticalCollateralPrice: Number(criticalCollateralPrice.toFixed(4)),
      pricePoints,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    logger.error(
      `Failed to calculate position critical deviation`,
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

function generatePricePoints(
  currentPrice: number,
  _criticalPrice: number,
  criticalDeviation: number,
  collateralAmount: number,
  borrowValue: number,
  liquidationThreshold: number
): PricePoint[] {
  const points: PricePoint[] = [];

  // 定义几个关键偏差点
  const deviationPoints = [
    0, // 真实价格
    -5,
    -10,
    -20,
    -30,
    Math.round(criticalDeviation), // 刚好临界（向下取整到整数）
    Math.round(criticalDeviation * 10) / 10, // 精确临界值
  ];

  // 去重并排序
  const uniqueDeviations = Array.from(new Set(deviationPoints)).sort((a, b) => b - a);

  for (const deviation of uniqueDeviations) {
    const price = currentPrice * (1 + deviation / 100);
    const cValue = collateralAmount * price;
    const ratio = borrowValue > 0 ? cValue / borrowValue : 0;
    const hf = ratio / liquidationThreshold;

    let status: HealthStatus;
    let statusLabel: string;

    if (hf < 1) {
      status = 'liquidated';
      statusLabel = '被清算';
    } else if (hf < 1.05) {
      status = 'critical';
      statusLabel = '刚好卡在边界';
    } else if (hf < 1.2) {
      status = 'warning';
      statusLabel = '接近清算线';
    } else {
      status = 'safe';
      statusLabel = '安全';
    }

    points.push({
      deviationPercent: Number(deviation.toFixed(2)),
      collateralPrice: Number(price.toFixed(2)),
      collateralValue: Number(cValue.toFixed(2)),
      borrowValue: Number(borrowValue.toFixed(2)),
      collateralRatio: Number((ratio * 100).toFixed(2)),
      status,
      statusLabel,
    });
  }

  return points;
}
