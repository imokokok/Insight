/**
 * LTTB (Largest Triangle Three Buckets) 数据下采样算法
 * 用于大数据集的可视化优化，保持数据形状的同时减少数据点
 */

export interface LTTBDataPoint {
  timestamp: number;
  price: number;
  [key: string]: number | string | undefined;
}

/**
 * LTTB 下采样算法实现
 * @param data 原始数据点数组
 * @param threshold 目标数据点数量
 * @returns 下采样后的数据点数组
 */
export function lttbDownsample(data: LTTBDataPoint[], threshold: number): LTTBDataPoint[] {
  if (data.length <= threshold || threshold === 0) {
    return data;
  }

  const sampled: LTTBDataPoint[] = [];
  let sampledIndex = 0;

  // 始终保留第一个点
  sampled[sampledIndex++] = data[0];

  const a = 0; // 第一个点的索引

  for (let i = 1; i < threshold - 1; i++) {
    // 计算当前桶的范围
    const avgRangeStart = Math.floor(((i - 1) * (data.length - 2)) / (threshold - 2)) + 1;
    const avgRangeEnd = Math.floor((i * (data.length - 2)) / (threshold - 2)) + 1;
    const avgRangeLength = avgRangeEnd - avgRangeStart;

    // 计算平均点
    let avgTimestamp = 0;
    let avgPrice = 0;
    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgTimestamp += data[j].timestamp;
      avgPrice += data[j].price;
    }
    avgTimestamp /= avgRangeLength;
    avgPrice /= avgRangeLength;

    // 计算下一个桶的范围
    const rangeOffs = Math.floor(((i - 0) * (data.length - 2)) / (threshold - 2)) + 1;
    const rangeTo = Math.floor(((i + 1) * (data.length - 2)) / (threshold - 2)) + 1;

    // 计算点 a 的坐标
    const pointA = data[a];

    // 在桶中找到具有最大三角形面积的点
    let maxArea = -1;
    let maxIdx = -1;

    for (let j = rangeOffs; j < rangeTo; j++) {
      // 计算三角形面积
      const area = Math.abs(
        (pointA.timestamp - avgTimestamp) * (data[j].price - pointA.price) -
          (pointA.timestamp - data[j].timestamp) * (avgPrice - pointA.price)
      );

      if (area > maxArea) {
        maxArea = area;
        maxIdx = j;
      }
    }

    if (maxIdx !== -1) {
      sampled[sampledIndex++] = data[maxIdx];
    }
  }

  // 始终保留最后一个点
  sampled[sampledIndex] = data[data.length - 1];

  return sampled;
}

/**
 * 根据数据量自动计算合适的阈值
 * @param dataLength 数据长度
 * @param maxPoints 最大点数限制
 * @returns 建议的阈值
 */
export function calculateOptimalThreshold(dataLength: number, maxPoints: number = 500): number {
  if (dataLength <= maxPoints) {
    return dataLength;
  }
  return maxPoints;
}

/**
 * 对历史数据进行下采样
 * @param historicalData 历史数据记录
 * @param maxPointsPerOracle 每个预言机的最大点数
 * @returns 下采样后的历史数据
 */
export function downsampleHistoricalData(
  historicalData: Partial<Record<string, LTTBDataPoint[]>>,
  maxPointsPerOracle: number = 500
): Partial<Record<string, LTTBDataPoint[]>> {
  const result: Partial<Record<string, LTTBDataPoint[]>> = {};

  Object.entries(historicalData).forEach(([oracle, data]) => {
    if (data && data.length > maxPointsPerOracle) {
      result[oracle] = lttbDownsample(data, maxPointsPerOracle);
    } else {
      result[oracle] = data;
    }
  });

  return result;
}
