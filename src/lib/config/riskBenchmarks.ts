export interface RiskBenchmark {
  metric: string;
  chainlink: number;
  pyth: number;
  band: number;
  api3: number;
}

export const RISK_BENCHMARKS: RiskBenchmark[] = [
  { metric: 'Decentralization', chainlink: 85, pyth: 68, band: 72, api3: 65 },
  { metric: 'Security', chainlink: 92, pyth: 82, band: 78, api3: 78 },
  { metric: 'Reliability', chainlink: 99.5, pyth: 97.0, band: 94.2, api3: 96.5 },
  { metric: 'Transparency', chainlink: 88, pyth: 85, band: 75, api3: 82 },
  { metric: 'Track Record', chainlink: 95, pyth: 72, band: 80, api3: 75 },
];

export const BENCHMARK_LAST_UPDATED = '2024-03-01';
export const BENCHMARK_UPDATE_FREQUENCY = 'quarterly';

/**
 * 数据更新机制说明:
 *
 * 1. 更新频率: 每季度更新一次 (quarterly)
 * 2. 数据来源:
 *    - 去中心化 (Decentralization): 基于验证节点数量、Gini系数、Nakamoto系数等指标
 *    - 安全性 (Security): 基于智能合约审计结果、漏洞历史、安全措施等
 *    - 可靠性 (Reliability): 基于历史运行时间、数据准确性、响应时间等
 *    - 透明度 (Transparency): 基于代码开源程度、文档完整性、社区治理等
 *    - 历史记录 (Track Record): 基于运营时间、处理交易量、市场占有率等
 *
 * 3. 更新流程:
 *    a) 收集各 Oracle 提供商的最新公开数据
 *    b) 由风险评估团队进行数据验证和评分
 *    c) 内部审核后更新配置文件
 *    d) 更新 BENCHMARK_LAST_UPDATED 日期
 *
 * 4. 评分标准:
 *    - 0-60: 高风险
 *    - 60-80: 中等风险
 *    - 80-100: 低风险
 */
