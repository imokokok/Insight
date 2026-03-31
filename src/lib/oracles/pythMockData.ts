/**
 * Pyth 模拟数据生成工具
 * 集中管理所有 Pyth 相关的模拟数据生成函数
 */

export interface StakeHistoryPoint {
  date: string;
  stake: number;
}

export interface AccuracyHistoryPoint {
  date: string;
  accuracy: number;
}

export interface PriceSource {
  id: string;
  name: string;
  category: string;
  lastUpdate: string;
  status: 'active' | 'inactive';
}

export interface PerformanceMetric {
  label: string;
  value: number;
  change: number;
}

export interface PriceHistoryPoint {
  time: string;
  price: number;
  confidence: number;
}

/**
 * 生成质押历史数据
 * 生成最近 31 天的质押量变化数据
 */
export function generateStakeHistory(): StakeHistoryPoint[] {
  const data: StakeHistoryPoint[] = [];
  const baseStake = Math.random() * 50 + 50;
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const variation = (Math.random() - 0.5) * 10;
    data.push({
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      stake: Math.max(0, baseStake + variation + (30 - i) * 0.5),
    });
  }
  return data;
}

/**
 * 生成准确率历史数据
 * 生成最近 31 天的准确率变化数据
 */
export function generateAccuracyHistory(): AccuracyHistoryPoint[] {
  const data: AccuracyHistoryPoint[] = [];
  const baseAccuracy = 97 + Math.random() * 2;
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const variation = (Math.random() - 0.5) * 2;
    data.push({
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      accuracy: Math.min(100, Math.max(95, baseAccuracy + variation)),
    });
  }
  return data;
}

/**
 * 生成价格源列表
 * 返回发布者贡献的价格源模拟数据
 */
export function generatePriceSources(): PriceSource[] {
  const sources = [
    { name: 'BTC/USD', category: 'Crypto' },
    { name: 'ETH/USD', category: 'Crypto' },
    { name: 'SOL/USD', category: 'Crypto' },
    { name: 'BNB/USD', category: 'Crypto' },
    { name: 'XRP/USD', category: 'Crypto' },
    { name: 'ADA/USD', category: 'Crypto' },
    { name: 'DOGE/USD', category: 'Crypto' },
    { name: 'AVAX/USD', category: 'Crypto' },
  ];
  return sources.map((source, index) => ({
    id: `source-${index}`,
    name: source.name,
    category: source.category,
    lastUpdate: new Date(Date.now() - Math.random() * 60000).toLocaleTimeString('zh-CN'),
    status: Math.random() > 0.1 ? 'active' : 'inactive',
  }));
}

/**
 * 生成性能指标数据
 * 返回发布者的各项性能指标
 */
export function generatePerformanceMetrics(): PerformanceMetric[] {
  return [
    {
      label: '数据提交次数',
      value: Math.floor(Math.random() * 10000 + 5000),
      change: Math.random() * 10 - 5,
    },
    {
      label: '平均响应时间',
      value: Math.floor(Math.random() * 100 + 50),
      change: -(Math.random() * 5),
    },
    { label: '成功率', value: 99 + Math.random() * 0.9, change: Math.random() * 0.5 },
    { label: '活跃天数', value: Math.floor(Math.random() * 300 + 100), change: 1 },
  ];
}

/**
 * 获取基础价格
 * 根据价格源名称返回对应的基础价格
 */
export function getBasePrice(name: string): number {
  const prices: Record<string, number> = {
    'BTC/USD': 67500,
    'ETH/USD': 3450,
    'SOL/USD': 145,
    'EUR/USD': 1.08,
    'GBP/USD': 1.27,
    'XAU/USD': 2350,
    'AAPL/USD': 178,
    'TSLA/USD': 245,
    'NVDA/USD': 875,
    'JPY/USD': 0.0067,
  };
  return prices[name] || 100;
}

/**
 * 生成价格历史数据
 * 生成最近 25 小时的价格变化数据
 */
export function generatePriceHistory(basePrice: number): PriceHistoryPoint[] {
  const data: PriceHistoryPoint[] = [];
  const now = Date.now();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now - i * 3600000);
    const variation = (Math.random() - 0.5) * basePrice * 0.02;
    const price = basePrice + variation;
    const confidence = Math.random() * basePrice * 0.001 + basePrice * 0.0005;
    data.push({
      time: time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      price: parseFloat(price.toFixed(2)),
      confidence: parseFloat(confidence.toFixed(4)),
    });
  }
  return data;
}
