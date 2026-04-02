/**
 * @fileoverview 风险预警仪表盘组件
 * @description 页面顶部全宽展示的风险预警仪表盘，用于展示价格异常检测信息
 */

'use client';

import React, { memo } from 'react';

import { oracleNames } from '../constants';
import { type PriceAnomaly, type AnomalySeverity } from '../hooks/usePriceAnomalyDetection';

interface RiskAlertDashboardProps {
  /** 异常列表 */
  anomalies: PriceAnomaly[];
  /** 异常总数 */
  count: number;
  /** 高风险异常数量 */
  highRiskCount: number;
  /** 中风险异常数量 */
  mediumRiskCount: number;
  /** 低风险异常数量 */
  lowRiskCount: number;
  /** 最高偏差值 */
  maxDeviation: number;
  /** 国际化翻译函数 */
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * 警告图标组件
 */
function WarningIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

/**
 * 对勾图标组件
 */
function CheckIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

/**
 * 箭头下图标组件
 */
function ArrowDownIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 14l-7 7m0 0l-7-7m7 7V3"
      />
    </svg>
  );
}

/**
 * 获取严重程度对应的颜色类
 */
function getSeverityColorClass(severity: AnomalySeverity): string {
  switch (severity) {
    case 'high':
      return 'text-red-700 bg-red-100 border-red-200';
    case 'medium':
      return 'text-orange-700 bg-orange-100 border-orange-200';
    case 'low':
      return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    default:
      return 'text-gray-700 bg-gray-100 border-gray-200';
  }
}

/**
 * 获取严重程度标签文本
 */
function getSeverityLabel(severity: AnomalySeverity): string {
  switch (severity) {
    case 'high':
      return '高风险';
    case 'medium':
      return '中风险';
    case 'low':
      return '低风险';
    default:
      return '未知';
  }
}

/**
 * 风险分布卡片组件
 */
function RiskDistributionCard({
  label,
  count,
  colorClass,
  dotColor,
}: {
  label: string;
  count: number;
  colorClass: string;
  dotColor: string;
}): React.ReactElement {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colorClass}`}>
      <span className={`w-3 h-3 rounded-full ${dotColor}`} />
      <div className="flex flex-col">
        <span className="text-xs opacity-80">{label}</span>
        <span className="text-xl font-bold">{count}</span>
      </div>
    </div>
  );
}

/**
 * 异常预言机列表项组件
 */
function AnomalyListItem({
  anomaly,
  index,
}: {
  anomaly: PriceAnomaly;
  index: number;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400 w-6">{index + 1}</span>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${getSeverityColorClass(anomaly.severity)}`}
        >
          {getSeverityLabel(anomaly.severity)}
        </span>
        <span className="font-medium text-gray-900">{oracleNames[anomaly.provider]}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 hidden sm:inline">{anomaly.reason}</span>
        <span
          className={`font-mono font-semibold ${anomaly.deviationPercent >= 0 ? 'text-red-600' : 'text-green-600'}`}
        >
          {anomaly.deviationPercent >= 0 ? '+' : ''}
          {anomaly.deviationPercent.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

/**
 * 滚动到价格对比区域的函数
 */
function scrollToPriceComparison(): void {
  const element = document.getElementById('price-comparison');
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * 风险预警仪表盘组件
 */
function RiskAlertDashboardComponent({
  anomalies,
  count,
  highRiskCount,
  mediumRiskCount,
  lowRiskCount,
  maxDeviation,
  t,
}: RiskAlertDashboardProps): React.ReactElement {
  // 有异常时的展示
  if (count > 0) {
    const isHighRisk = highRiskCount > 0;
    const displayedAnomalies = anomalies.slice(0, 3);
    const remainingCount = count - displayedAnomalies.length;

    return (
      <div
        className={`w-full rounded-xl shadow-lg overflow-hidden ${isHighRisk ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-orange-400 to-orange-500'}`}
      >
        <div className="p-6 text-white">
          {/* 头部区域 */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <WarningIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">⚠️ 检测到 {count} 个价格异常</h2>
                <p className="text-white/80 mt-1">
                  最大偏差值:{' '}
                  <span className="font-mono font-semibold">{maxDeviation.toFixed(2)}%</span>
                </p>
              </div>
            </div>
            <button
              onClick={scrollToPriceComparison}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-gray-900 hover:bg-gray-100 rounded-lg font-medium transition-colors shadow-md"
            >
              查看详情
              <ArrowDownIcon className="w-4 h-4" />
            </button>
          </div>

          {/* 风险等级分布卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <RiskDistributionCard
              label="高风险"
              count={highRiskCount}
              colorClass="bg-white/95 text-red-700 border-red-100"
              dotColor="bg-red-500"
            />
            <RiskDistributionCard
              label="中风险"
              count={mediumRiskCount}
              colorClass="bg-white/95 text-orange-700 border-orange-100"
              dotColor="bg-orange-500"
            />
            <RiskDistributionCard
              label="低风险"
              count={lowRiskCount}
              colorClass="bg-white/95 text-yellow-700 border-yellow-100"
              dotColor="bg-yellow-500"
            />
          </div>

          {/* 异常预言机列表 */}
          <div className="bg-white/95 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">异常预言机列表（前3个）</h3>
            <div className="divide-y divide-gray-100">
              {displayedAnomalies.map((anomaly, index) => (
                <AnomalyListItem
                  key={`${anomaly.provider}-${index}`}
                  anomaly={anomaly}
                  index={index}
                />
              ))}
            </div>
            {remainingCount > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                <span className="text-sm text-gray-500">还有 {remainingCount} 个异常未显示</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 无异常时的安全状态展示
  return (
    <div className="w-full rounded-xl shadow-sm border border-emerald-200 bg-emerald-50/50">
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckIcon className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">数据正常</h2>
            <p className="text-gray-500 text-sm mt-0.5">所有预言机价格数据在合理范围内，未发现异常偏差</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-gray-600">实时监控中</span>
          </div>
        </div>

        {/* 安全状态指标 */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white rounded-lg px-3 py-2.5 text-center border border-emerald-100">
            <span className="text-2xl font-semibold text-gray-900">0</span>
            <span className="block text-xs text-gray-500 mt-0.5">价格异常</span>
          </div>
          <div className="bg-white rounded-lg px-3 py-2.5 text-center border border-emerald-100">
            <span className="text-2xl font-semibold text-gray-900">&lt;1%</span>
            <span className="block text-xs text-gray-500 mt-0.5">最大偏差</span>
          </div>
          <div className="bg-white rounded-lg px-3 py-2.5 text-center border border-emerald-100">
            <span className="text-2xl font-semibold text-emerald-600">正常</span>
            <span className="block text-xs text-gray-500 mt-0.5">系统状态</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 使用 React.memo 优化性能
const RiskAlertDashboard = memo(RiskAlertDashboardComponent);
RiskAlertDashboard.displayName = 'RiskAlertDashboard';

export default RiskAlertDashboard;
