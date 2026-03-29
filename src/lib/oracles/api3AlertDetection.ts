import type {
  API3Alert,
  AlertThreshold,
  DAPIPriceDeviation,
  AirnodeNetworkStats,
  CoveragePoolDetails,
} from './api3';

export function detectPriceDeviationAlert(
  deviations: DAPIPriceDeviation[],
  thresholds: AlertThreshold[]
): API3Alert[] {
  const alerts: API3Alert[] = [];
  const now = new Date();

  const warningThreshold = thresholds.find(
    (t) => t.type === 'price_deviation_warning' && t.enabled
  );
  const criticalThreshold = thresholds.find(
    (t) => t.type === 'price_deviation_critical' && t.enabled
  );

  if (!warningThreshold && !criticalThreshold) {
    return alerts;
  }

  for (const deviation of deviations) {
    const warningValue = warningThreshold?.threshold ?? 1.5;
    const criticalValue = criticalThreshold?.threshold ?? 3.0;

    if (criticalThreshold && deviation.deviation >= criticalValue) {
      alerts.push({
        id: `price-dev-critical-${deviation.symbol}-${now.getTime()}`,
        type: 'price_deviation',
        severity: 'critical',
        title: `${deviation.symbol} 价格偏差严重`,
        message: `${deviation.symbol} dAPI 价格与市场价格偏差达到 ${deviation.deviation.toFixed(2)}%，超过临界阈值 ${criticalValue}%`,
        timestamp: now,
        isRead: false,
        isResolved: false,
        metadata: {
          symbol: deviation.symbol,
          threshold: criticalValue,
          currentValue: deviation.deviation,
        },
      });
    } else if (warningThreshold && deviation.deviation >= warningValue) {
      alerts.push({
        id: `price-dev-warning-${deviation.symbol}-${now.getTime()}`,
        type: 'price_deviation',
        severity: 'warning',
        title: `${deviation.symbol} 价格偏差警告`,
        message: `${deviation.symbol} dAPI 价格与市场价格偏差达到 ${deviation.deviation.toFixed(2)}%，建议关注`,
        timestamp: now,
        isRead: false,
        isResolved: false,
        metadata: {
          symbol: deviation.symbol,
          threshold: warningValue,
          currentValue: deviation.deviation,
        },
      });
    }
  }

  return alerts;
}

export function detectNodeOfflineAlert(
  airnodeStats: AirnodeNetworkStats,
  thresholds: AlertThreshold[]
): API3Alert[] {
  const alerts: API3Alert[] = [];
  const now = new Date();

  const responseTimeThreshold = thresholds.find(
    (t) => t.type === 'node_response_time' && t.enabled
  );
  const nodeOfflineThreshold = thresholds.find(
    (t) => t.type === 'node_offline' && t.enabled
  );

  if (responseTimeThreshold && airnodeStats.avgResponseTime > responseTimeThreshold.threshold) {
    const severity: API3Alert['severity'] =
      airnodeStats.avgResponseTime > responseTimeThreshold.threshold * 1.5 ? 'critical' : 'warning';

    alerts.push({
      id: `node-response-${now.getTime()}`,
      type: 'node_offline',
      severity,
      title: severity === 'critical' ? 'Airnode 响应严重延迟' : 'Airnode 响应延迟警告',
      message: `平均响应时间 ${airnodeStats.avgResponseTime}ms 超过阈值 ${responseTimeThreshold.threshold}ms`,
      timestamp: now,
      isRead: false,
      isResolved: false,
      metadata: {
        threshold: responseTimeThreshold.threshold,
        currentValue: airnodeStats.avgResponseTime,
      },
    });
  }

  if (nodeOfflineThreshold) {
    const uptimeThreshold = 100 - nodeOfflineThreshold.threshold;
    if (airnodeStats.nodeUptime < uptimeThreshold) {
      const severity: API3Alert['severity'] =
        airnodeStats.nodeUptime < uptimeThreshold - 5 ? 'critical' : 'warning';

      alerts.push({
        id: `node-uptime-${now.getTime()}`,
        type: 'node_offline',
        severity,
        title: severity === 'critical' ? '节点在线率严重下降' : '节点在线率下降',
        message: `节点在线率 ${airnodeStats.nodeUptime}% 低于正常水平`,
        timestamp: now,
        isRead: false,
        isResolved: false,
        metadata: {
          threshold: uptimeThreshold,
          currentValue: airnodeStats.nodeUptime,
        },
      });
    }
  }

  if (airnodeStats.status === 'offline') {
    alerts.push({
      id: `network-offline-${now.getTime()}`,
      type: 'node_offline',
      severity: 'critical',
      title: '网络离线',
      message: 'API3 网络当前处于离线状态，请立即检查',
      timestamp: now,
      isRead: false,
      isResolved: false,
    });
  } else if (airnodeStats.status === 'warning') {
    alerts.push({
      id: `network-warning-${now.getTime()}`,
      type: 'node_offline',
      severity: 'warning',
      title: '网络状态警告',
      message: 'API3 网络存在潜在问题，建议关注',
      timestamp: now,
      isRead: false,
      isResolved: false,
    });
  }

  return alerts;
}

export function detectCoveragePoolRiskAlert(
  coveragePool: CoveragePoolDetails,
  thresholds: AlertThreshold[]
): API3Alert[] {
  const alerts: API3Alert[] = [];
  const now = new Date();

  const ratioThreshold = thresholds.find(
    (t) => t.type === 'coverage_pool_ratio' && t.enabled
  );

  if (!ratioThreshold) {
    return alerts;
  }

  const coveragePercent = coveragePool.collateralizationRatio;

  if (coveragePercent < ratioThreshold.threshold) {
    const severity: API3Alert['severity'] =
      coveragePercent < ratioThreshold.threshold * 0.5 ? 'critical' : 'warning';

    alerts.push({
      id: `coverage-pool-${now.getTime()}`,
      type: 'coverage_pool_risk',
      severity,
      title: severity === 'critical' ? '覆盖池抵押严重不足' : '覆盖池抵押率警告',
      message: `覆盖池抵押率 ${coveragePercent.toFixed(1)}% 低于阈值 ${ratioThreshold.threshold}%，建议增加质押`,
      timestamp: now,
      isRead: false,
      isResolved: false,
      metadata: {
        threshold: ratioThreshold.threshold,
        currentValue: coveragePercent,
      },
    });
  }

  if (coveragePool.collateralizationRatio < 100) {
    alerts.push({
      id: `collateralization-${now.getTime()}`,
      type: 'coverage_pool_risk',
      severity: 'critical',
      title: '抵押率不足',
      message: `覆盖池抵押率 ${coveragePool.collateralizationRatio}% 低于 100%，存在偿付风险`,
      timestamp: now,
      isRead: false,
      isResolved: false,
      metadata: {
        threshold: 100,
        currentValue: coveragePool.collateralizationRatio,
      },
    });
  }

  return alerts;
}

export function detectAllAlerts(
  deviations: DAPIPriceDeviation[],
  airnodeStats: AirnodeNetworkStats,
  coveragePool: CoveragePoolDetails,
  thresholds: AlertThreshold[]
): API3Alert[] {
  const priceAlerts = detectPriceDeviationAlert(deviations, thresholds);
  const nodeAlerts = detectNodeOfflineAlert(airnodeStats, thresholds);
  const coverageAlerts = detectCoveragePoolRiskAlert(coveragePool, thresholds);

  return [...priceAlerts, ...nodeAlerts, ...coverageAlerts].sort(
    (a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
  );
}

export function getAlertSeverityColor(severity: API3Alert['severity']): string {
  const colors = {
    info: 'text-blue-600 bg-blue-50 border-blue-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    critical: 'text-red-600 bg-red-50 border-red-200',
  };
  return colors[severity];
}

export function getAlertSeverityBgColor(severity: API3Alert['severity']): string {
  const colors = {
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
  };
  return colors[severity];
}

export function getAlertTypeIcon(type: API3Alert['type']): string {
  const icons = {
    price_deviation: '📈',
    node_offline: '🔌',
    coverage_pool_risk: '🛡️',
    security_event: '🔒',
  };
  return icons[type];
}

export function formatAlertTime(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;

  return timestamp.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
