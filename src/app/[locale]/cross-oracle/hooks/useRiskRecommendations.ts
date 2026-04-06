/**
 * @fileoverview 建议生成 Hook
 * @description 基于异常数据生成风险建议和优化建议
 */

import { useMemo } from 'react';

import type { OracleProvider } from '@/types/oracle';

import type { PriceAnomaly } from './usePriceAnomalyDetection';

/** 建议优先级 */
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

/** 建议类别 */
export type RecommendationCategory =
  | 'anomaly'
  | 'latency'
  | 'consistency'
  | 'reliability'
  | 'optimization';

/** 风险建议 */
export interface RiskRecommendation {
  /** 建议唯一ID */
  id: string;
  /** 建议标题 */
  title: string;
  /** 建议详细描述 */
  description: string;
  /** 优先级 */
  priority: RecommendationPriority;
  /** 建议类别 */
  category: RecommendationCategory;
  /** 相关预言机 */
  relatedOracles: OracleProvider[];
  /** 建议创建时间 */
  timestamp: number;
  /** 建议操作 */
  action?: string;
  /** 预期效果 */
  expectedOutcome?: string;
}

/** 建议生成结果 */
export interface RiskRecommendationsResult {
  /** 建议列表 */
  recommendations: RiskRecommendation[];
  /** 按优先级分组的建议 */
  byPriority: {
    critical: RiskRecommendation[];
    high: RiskRecommendation[];
    medium: RiskRecommendation[];
    low: RiskRecommendation[];
  };
  /** 按类别分组的建议 */
  byCategory: Record<RecommendationCategory, RiskRecommendation[]>;
  /** 建议总数 */
  totalCount: number;
  /** 需要立即处理的建议数量 */
  urgentCount: number;
}

/**
 * 生成唯一ID
 * @returns 唯一ID字符串
 */
function generateId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 根据异常生成建议
 * @param anomalies - 异常列表
 * @returns 建议列表
 */
function generateAnomalyRecommendations(anomalies: PriceAnomaly[]): RiskRecommendation[] {
  const recommendations: RiskRecommendation[] = [];

  if (anomalies.length === 0) {
    return recommendations;
  }

  // 高风险异常建议
  const highRiskAnomalies = anomalies.filter((a) => a.severity === 'high');
  if (highRiskAnomalies.length > 0) {
    recommendations.push({
      id: generateId(),
      title: '检测到高风险价格异常',
      description: `发现 ${highRiskAnomalies.length} 个高风险价格异常，偏差超过 3%。建议立即检查相关预言机数据源。`,
      priority: 'critical',
      category: 'anomaly',
      relatedOracles: highRiskAnomalies.map((a) => a.provider),
      timestamp: Date.now(),
      action: '检查并验证异常数据源',
      expectedOutcome: '恢复数据一致性',
    });
  }

  // 中风险异常建议
  const mediumRiskAnomalies = anomalies.filter((a) => a.severity === 'medium');
  if (mediumRiskAnomalies.length > 0) {
    recommendations.push({
      id: generateId(),
      title: '价格偏差警告',
      description: `检测到 ${mediumRiskAnomalies.length} 个中等风险的价格偏差（1-3%）。建议监控这些数据源的表现。`,
      priority: 'high',
      category: 'anomaly',
      relatedOracles: mediumRiskAnomalies.map((a) => a.provider),
      timestamp: Date.now(),
      action: '监控并分析偏差原因',
      expectedOutcome: '识别并解决数据源问题',
    });
  }

  // 多个异常的综合建议
  if (anomalies.length >= 3) {
    recommendations.push({
      id: generateId(),
      title: '多个数据源出现异常',
      description: `共有 ${anomalies.length} 个数据源报告异常。这可能表明市场波动剧烈或存在系统性问题。`,
      priority: 'high',
      category: 'reliability',
      relatedOracles: anomalies.map((a) => a.provider),
      timestamp: Date.now(),
      action: '评估市场整体状况',
      expectedOutcome: '确定异常根本原因',
    });
  }

  return recommendations;
}

/**
 * 生成延迟相关建议
 * @param anomalies - 异常列表
 * @returns 建议列表
 */
function generateLatencyRecommendations(anomalies: PriceAnomaly[]): RiskRecommendation[] {
  const recommendations: RiskRecommendation[] = [];

  // 检查延迟相关的异常
  const staleDataAnomalies = anomalies.filter(
    (a) => a.reasonKeys.some((key) => key.includes('Delayed')) || a.freshnessSeconds > 300
  );

  if (staleDataAnomalies.length > 0) {
    recommendations.push({
      id: generateId(),
      title: '数据源更新延迟',
      description: `${staleDataAnomalies.length} 个预言机数据更新延迟超过 5 分钟。这可能影响价格准确性。`,
      priority: staleDataAnomalies.length > 2 ? 'high' : 'medium',
      category: 'latency',
      relatedOracles: staleDataAnomalies.map((a) => a.provider),
      timestamp: Date.now(),
      action: '检查网络连接和数据源状态',
      expectedOutcome: '恢复正常数据更新频率',
    });
  }

  return recommendations;
}

/**
 * 生成一致性相关建议
 * @param anomalies - 异常列表
 * @param validPriceCount - 有效价格数量
 * @param totalCount - 总数据数量
 * @returns 建议列表
 */
function generateConsistencyRecommendations(
  anomalies: PriceAnomaly[],
  validPriceCount: number,
  totalCount: number
): RiskRecommendation[] {
  const recommendations: RiskRecommendation[] = [];

  // 数据完整性检查
  const completeness = totalCount > 0 ? (validPriceCount / totalCount) * 100 : 0;
  if (completeness < 80) {
    recommendations.push({
      id: generateId(),
      title: '数据完整性不足',
      description: `当前数据完整性为 ${completeness.toFixed(1)}%，低于 80% 阈值。部分预言机可能无法提供有效数据。`,
      priority: 'high',
      category: 'consistency',
      relatedOracles: [],
      timestamp: Date.now(),
      action: '检查失败的预言机连接',
      expectedOutcome: '提高数据完整性至 90% 以上',
    });
  }

  // 价格离散度检查
  if (anomalies.length > 0) {
    const maxDeviation = Math.max(...anomalies.map((a) => Math.abs(a.deviationPercent)));
    if (maxDeviation > 5) {
      recommendations.push({
        id: generateId(),
        title: '价格离散度过高',
        description: `检测到最高 ${maxDeviation.toFixed(2)}% 的价格偏差。各预言机之间的价格一致性较差。`,
        priority: 'critical',
        category: 'consistency',
        relatedOracles: anomalies.map((a) => a.provider),
        timestamp: Date.now(),
        action: '重新评估数据源权重或更换数据源',
        expectedOutcome: '降低价格离散度',
      });
    }
  }

  return recommendations;
}

/**
 * 生成优化建议
 * @param anomalies - 异常列表
 * @returns 建议列表
 */
function generateOptimizationRecommendations(anomalies: PriceAnomaly[]): RiskRecommendation[] {
  const recommendations: RiskRecommendation[] = [];

  // 数据源多样化建议
  if (anomalies.length > 0) {
    const uniqueProviders = new Set(anomalies.map((a) => a.provider));
    if (uniqueProviders.size === 1) {
      recommendations.push({
        id: generateId(),
        title: '建议增加数据源多样性',
        description: '当前依赖单一数据源，建议增加更多预言机以提高系统鲁棒性和数据可靠性。',
        priority: 'medium',
        category: 'optimization',
        relatedOracles: [],
        timestamp: Date.now(),
        action: '配置额外的预言机数据源',
        expectedOutcome: '提高系统容错能力',
      });
    }
  }

  // 异常检测阈值优化建议
  const lowSeverityCount = anomalies.filter((a) => a.severity === 'low').length;
  if (lowSeverityCount > 5) {
    recommendations.push({
      id: generateId(),
      title: '异常检测阈值优化',
      description: `检测到 ${lowSeverityCount} 个低严重度异常，建议调整异常检测阈值以减少误报。`,
      priority: 'low',
      category: 'optimization',
      relatedOracles: [],
      timestamp: Date.now(),
      action: '调整异常检测参数',
      expectedOutcome: '减少误报，提高检测精度',
    });
  }

  // 定期审查建议
  recommendations.push({
    id: generateId(),
    title: '定期审查数据源性能',
    description: '建议每周审查一次各预言机的性能指标，包括准确性、延迟和可用性。',
    priority: 'low',
    category: 'optimization',
    relatedOracles: [],
    timestamp: Date.now(),
    action: '设置定期性能审查提醒',
    expectedOutcome: '持续优化数据质量',
  });

  return recommendations;
}

/**
 * 按优先级分组建议
 * @param recommendations - 建议列表
 * @returns 按优先级分组的结果
 */
function groupByPriority(
  recommendations: RiskRecommendation[]
): RiskRecommendationsResult['byPriority'] {
  return {
    critical: recommendations.filter((r) => r.priority === 'critical'),
    high: recommendations.filter((r) => r.priority === 'high'),
    medium: recommendations.filter((r) => r.priority === 'medium'),
    low: recommendations.filter((r) => r.priority === 'low'),
  };
}

/**
 * 按类别分组建议
 * @param recommendations - 建议列表
 * @returns 按类别分组的结果
 */
function groupByCategory(
  recommendations: RiskRecommendation[]
): Record<RecommendationCategory, RiskRecommendation[]> {
  const categories: RecommendationCategory[] = [
    'anomaly',
    'latency',
    'consistency',
    'reliability',
    'optimization',
  ];

  return categories.reduce(
    (acc, category) => {
      acc[category] = recommendations.filter((r) => r.category === category);
      return acc;
    },
    {} as Record<RecommendationCategory, RiskRecommendation[]>
  );
}

/**
 * 建议生成 Hook
 * @param anomalies - 异常检测结果
 * @param validPriceCount - 有效价格数量
 * @param totalCount - 总数据数量
 * @returns 建议生成结果
 */
export function useRiskRecommendations(
  anomalies: PriceAnomaly[],
  validPriceCount: number,
  totalCount: number
): RiskRecommendationsResult {
  return useMemo(() => {
    // 生成各类建议
    const anomalyRecommendations = generateAnomalyRecommendations(anomalies);
    const latencyRecommendations = generateLatencyRecommendations(anomalies);
    const consistencyRecommendations = generateConsistencyRecommendations(
      anomalies,
      validPriceCount,
      totalCount
    );
    const optimizationRecommendations = generateOptimizationRecommendations(anomalies);

    // 合并所有建议
    const allRecommendations = [
      ...anomalyRecommendations,
      ...latencyRecommendations,
      ...consistencyRecommendations,
      ...optimizationRecommendations,
    ];

    // 按优先级排序
    const priorityOrder: Record<RecommendationPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    const sortedRecommendations = allRecommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    // 计算紧急建议数量（critical + high）
    const urgentCount = sortedRecommendations.filter(
      (r) => r.priority === 'critical' || r.priority === 'high'
    ).length;

    return {
      recommendations: sortedRecommendations,
      byPriority: groupByPriority(sortedRecommendations),
      byCategory: groupByCategory(sortedRecommendations),
      totalCount: sortedRecommendations.length,
      urgentCount,
    };
  }, [anomalies, validPriceCount, totalCount]);
}

/**
 * 获取优先级颜色
 * @param priority - 优先级
 * @returns 颜色类名
 */
export function getPriorityColor(priority: RecommendationPriority): string {
  const colors = {
    critical: 'text-danger-500 bg-danger-50 border-danger-200',
    high: 'text-warning-500 bg-warning-50 border-warning-200',
    medium: 'text-primary-500 bg-primary-50 border-primary-200',
    low: 'text-success-500 bg-success-50 border-success-200',
  };
  return colors[priority];
}

/**
 * 获取优先级标签
 * @param priority - 优先级
 * @returns 优先级显示文本
 */
export function getPriorityLabel(priority: RecommendationPriority): string {
  const labels = {
    critical: '紧急',
    high: '高',
    medium: '中',
    low: '低',
  };
  return labels[priority];
}

/**
 * 获取类别标签
 * @param category - 类别
 * @returns 类别显示文本
 */
export function getCategoryLabel(category: RecommendationCategory): string {
  const labels = {
    anomaly: '异常检测',
    latency: '延迟优化',
    consistency: '数据一致性',
    reliability: '可靠性',
    optimization: '系统优化',
  };
  return labels[category];
}

/**
 * 获取类别图标
 * @param category - 类别
 * @returns 图标名称或标识
 */
export function getCategoryIcon(category: RecommendationCategory): string {
  const icons = {
    anomaly: 'alert-triangle',
    latency: 'clock',
    consistency: 'check-circle',
    reliability: 'shield',
    optimization: 'settings',
  };
  return icons[category];
}

export default useRiskRecommendations;
