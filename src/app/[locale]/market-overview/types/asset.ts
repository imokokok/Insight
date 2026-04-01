/**
 * 资产数据类型定义
 */

/**
 * 资产数据源
 */
export interface PriceSource {
  /** 预言机名称 */
  oracle: string;
  /** 价格 */
  price: number;
  /** 延迟 (ms) */
  latency: number;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 资产数据
 */
export interface AssetData {
  /** 资产符号 */
  symbol: string;
  /** 当前价格 */
  price: number;
  /** 24小时变化率 (%) */
  change24h: number;
  /** 7天变化率 (%) */
  change7d: number;
  /** 24小时交易量 */
  volume24h: number;
  /** 市值 */
  marketCap: number;
  /** 主要预言机 */
  primaryOracle: string;
  /** 预言机数量 */
  oracleCount: number;
  /** 价格数据源 */
  priceSources: PriceSource[];
}

/**
 * 资产类别分析
 */
export interface AssetCategory {
  /** 类别标识 */
  category: string;
  /** 类别标签 */
  label: string;
  /** 数值 */
  value: number;
  /** 份额 (%) */
  share: number;
  /** 颜色标识 */
  color: string;
  /** 包含的资产 */
  assets: string[];
  /** 平均波动率 */
  avgVolatility: number;
  /** 平均流动性 */
  avgLiquidity: number;
}
