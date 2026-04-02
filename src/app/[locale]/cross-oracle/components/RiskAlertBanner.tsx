/**
 * @fileoverview 风险预警横幅组件
 * @description 显示价格异常检测的风险预警信息
 */

'use client';

import React, { memo } from 'react';

import { oracleNames } from '../constants';
import { type PriceAnomaly, type AnomalySeverity } from '../hooks/usePriceAnomalyDetection';

interface RiskAlertBannerProps {
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
  /** 点击查看详情回调 */
  onViewDetails?: () => void;
  /** 国际化翻译函数 */
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * 获取风险等级对应的样式
 */
function getRiskStyles(
  highRiskCount: number,
  mediumRiskCount: number,
  lowRiskCount: number
): {
  containerClass: string;
  iconColor: string;
  alertLevel: 'error' | 'warning' | 'info';
  alertTitle: string;
} {
  if (highRiskCount > 0) {
    return {
      containerClass: 'bg-red-50 border-red-200',
      iconColor: 'text-red-600',
      alertLevel: 'error',
      alertTitle: '高风险预警',
    };
  }
  if (mediumRiskCount > 0) {
    return {
      containerClass: 'bg-orange-50 border-orange-200',
      iconColor: 'text-orange-600',
      alertLevel: 'warning',
      alertTitle: '中风险预警',
    };
  }
  if (lowRiskCount > 0) {
    return {
      containerClass: 'bg-yellow-50 border-yellow-200',
      iconColor: 'text-yellow-600',
      alertLevel: 'info',
      alertTitle: '低风险提示',
    };
  }
  return {
    containerClass: 'bg-gray-50 border-gray-200',
    iconColor: 'text-gray-600',
    alertLevel: 'info',
    alertTitle: '正常',
  };
}

/**
 * 获取严重程度对应的颜色类
 */
function getSeverityColorClass(severity: AnomalySeverity): string {
  switch (severity) {
    case 'high':
      return 'text-red-600 bg-red-100';
    case 'medium':
      return 'text-orange-600 bg-orange-100';
    case 'low':
      return 'text-yellow-600 bg-yellow-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

/**
 * 获取严重程度标签文本
 */
function getSeverityLabel(severity: AnomalySeverity): string {
  switch (severity) {
    case 'high':
      return '高';
    case 'medium':
      return '中';
    case 'low':
      return '低';
    default:
      return '未知';
  }
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
 * 箭头右图标组件
 */
function ArrowRightIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

/**
 * 风险预警横幅组件
 */
function RiskAlertBannerComponent({
  anomalies,
  count,
  highRiskCount,
  mediumRiskCount,
  lowRiskCount,
  maxDeviation,
  onViewDetails,
}: RiskAlertBannerProps): React.ReactElement | null {
  // 如果没有异常，不显示横幅
  if (count === 0) {
    return null;
  }

  const { containerClass, iconColor, alertTitle } = getRiskStyles(
    highRiskCount,
    mediumRiskCount,
    lowRiskCount
  );

  // 只显示前3个异常
  const displayedAnomalies = anomalies.slice(0, 3);
  const remainingCount = count - displayedAnomalies.length;

  return (
    <div className={`rounded-lg border p-4 mb-4 ${containerClass}`}>
      {/* 头部：图标、标题和统计 */}
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${iconColor}`}>
          <WarningIcon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">{alertTitle}</h4>
              <p className="text-xs text-gray-600 mt-0.5">
                检测到 {count} 个价格异常
                {highRiskCount > 0 && `，其中 ${highRiskCount} 个高风险`}
                {maxDeviation > 0 && `，最大偏差 ${maxDeviation.toFixed(2)}%`}
              </p>
            </div>
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-md transition-colors whitespace-nowrap"
              >
                查看详情
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 异常列表 */}
      <div className="mt-3 space-y-2">
        {displayedAnomalies.map((anomaly, index) => (
          <div key={`${anomaly.provider}-${index}`} className="flex items-center gap-2 text-sm">
            <span
              className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded ${getSeverityColorClass(anomaly.severity)}`}
            >
              {getSeverityLabel(anomaly.severity)}
            </span>
            <span className="font-medium text-gray-900">{oracleNames[anomaly.provider]}</span>
            <span className="text-gray-600">
              偏差
              <span
                className={`font-mono font-medium ${
                  anomaly.deviationPercent >= 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {anomaly.deviationPercent >= 0 ? '+' : ''}
                {anomaly.deviationPercent.toFixed(2)}%
              </span>
            </span>
            <span className="text-gray-400 text-xs truncate">{anomaly.reason}</span>
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="text-xs text-gray-500 pl-1">还有 {remainingCount} 个异常...</div>
        )}
      </div>

      {/* 风险分布指示器 */}
      <div className="mt-3 pt-3 border-t border-gray-200/50">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-500">风险分布：</span>
          <div className="flex items-center gap-3">
            {highRiskCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-gray-700">高风险 {highRiskCount}</span>
              </span>
            )}
            {mediumRiskCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-gray-700">中风险 {mediumRiskCount}</span>
              </span>
            )}
            {lowRiskCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-gray-700">低风险 {lowRiskCount}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 使用 React.memo 优化性能
const RiskAlertBanner = memo(RiskAlertBannerComponent);
RiskAlertBanner.displayName = 'RiskAlertBanner';

export { RiskAlertBanner };
export default RiskAlertBanner;
