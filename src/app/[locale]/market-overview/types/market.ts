/**
 * 市场统计数据类型定义
 */

/**
 * 市场统计数据
 */
export interface MarketStats {
  /** 总 TVS */
  totalTVS: number;
  /** 总链数 */
  totalChains: number;
  /** 总协议数 */
  totalProtocols: number;
  /** 总资产数 */
  totalAssets: number;
  /** 平均更新延迟 (ms) */
  avgUpdateLatency: number;
  /** 市场主导率 (%) */
  marketDominance: number;
  /** 预言机数量 */
  oracleCount: number;
  /** 24小时变化率 (%) */
  change24h: number;
  /** 链数量24小时变化率 (%) */
  chainsChange24h: number;
  /** 协议数量24小时变化率 (%) */
  protocolsChange24h: number;
  /** 主导率24小时变化率 (%) */
  dominanceChange24h: number;
  /** 延迟24小时变化率 (%) */
  latencyChange24h: number;
  /** 预言机数量24小时变化率 (%) */
  oracleCountChange24h: number;
}
