import type { API3Alert, AlertThreshold } from './types';

function generateAlertTitle(type: API3Alert['type'], symbol: string): string {
  const titles: Record<API3Alert['type'], string> = {
    price_deviation: `${symbol} 价格偏差警告`,
    node_offline: 'Airnode 节点异常',
    coverage_pool_risk: '覆盖池风险警告',
    security_event: '安全事件通知',
  };
  return titles[type];
}

function generateAlertMessage(
  type: API3Alert['type'],
  symbol: string,
  severity: API3Alert['severity']
): string {
  const messages: Record<API3Alert['type'], Record<API3Alert['severity'], string>> = {
    price_deviation: {
      info: `${symbol} 价格偏差轻微，持续监控中`,
      warning: `${symbol} dAPI 价格与市场价格偏差超过阈值，建议关注`,
      critical: `${symbol} 价格偏差严重，需要立即处理`,
    },
    node_offline: {
      info: '部分节点响应时间增加',
      warning: '多个 Airnode 节点响应延迟',
      critical: '关键 Airnode 节点离线',
    },
    coverage_pool_risk: {
      info: '覆盖池抵押率接近阈值',
      warning: '覆盖池抵押率低于推荐值',
      critical: '覆盖池抵押率严重不足',
    },
    security_event: {
      info: '检测到潜在安全风险',
      warning: '发现异常交易活动',
      critical: '安全事件需要立即处理',
    },
  };
  return messages[type][severity];
}

export async function getActiveAlerts(): Promise<API3Alert[]> {
  const now = Date.now();
  return [
    {
      id: 'alert-001',
      type: 'price_deviation',
      severity: 'critical',
      title: 'UNI/USD 价格偏差过高',
      message: 'UNI/USD dAPI 价格与市场价格偏差达到 3.62%，超过临界阈值 3%',
      timestamp: new Date(now - 300000),
      isRead: false,
      isResolved: false,
      metadata: {
        symbol: 'UNI/USD',
        threshold: 3,
        currentValue: 3.62,
        chain: 'Ethereum',
      },
    },
    {
      id: 'alert-002',
      type: 'price_deviation',
      severity: 'warning',
      title: 'AVAX/USD 价格偏差警告',
      message: 'AVAX/USD dAPI 价格与市场价格偏差达到 1.52%，建议关注',
      timestamp: new Date(now - 600000),
      isRead: false,
      isResolved: false,
      metadata: {
        symbol: 'AVAX/USD',
        threshold: 1.5,
        currentValue: 1.52,
        chain: 'Avalanche',
      },
    },
    {
      id: 'alert-003',
      type: 'price_deviation',
      severity: 'warning',
      title: 'LINK/USD 价格偏差警告',
      message: 'LINK/USD dAPI 价格与市场价格偏差达到 1.44%，呈扩大趋势',
      timestamp: new Date(now - 900000),
      isRead: true,
      isResolved: false,
      metadata: {
        symbol: 'LINK/USD',
        threshold: 1.5,
        currentValue: 1.44,
        chain: 'Ethereum',
      },
    },
    {
      id: 'alert-004',
      type: 'node_offline',
      severity: 'warning',
      title: 'Airnode 节点响应延迟',
      message: '亚太地区部分 Airnode 节点响应时间超过 500ms',
      timestamp: new Date(now - 1800000),
      isRead: true,
      isResolved: false,
      metadata: {
        nodeId: 'airnode-ap-003',
        threshold: 300,
        currentValue: 520,
      },
    },
    {
      id: 'alert-005',
      type: 'coverage_pool_risk',
      severity: 'info',
      title: '覆盖池抵押率下降',
      message: '覆盖池抵押率从 38% 下降至 34%，建议增加质押',
      timestamp: new Date(now - 3600000),
      isRead: true,
      isResolved: true,
      metadata: {
        threshold: 40,
        currentValue: 34,
      },
    },
  ];
}

export async function getAlertHistory(limit: number = 20): Promise<API3Alert[]> {
  const now = Date.now();
  const alerts: API3Alert[] = [];
  const types: API3Alert['type'][] = [
    'price_deviation',
    'node_offline',
    'coverage_pool_risk',
    'security_event',
  ];
  const severities: API3Alert['severity'][] = ['info', 'warning', 'critical'];
  const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'LINK/USD', 'UNI/USD'];

  for (let i = 0; i < limit; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const isResolved = Math.random() > 0.3;
    const isRead = isResolved || Math.random() > 0.5;

    alerts.push({
      id: `alert-history-${i}`,
      type,
      severity,
      title: generateAlertTitle(type, symbol),
      message: generateAlertMessage(type, symbol, severity),
      timestamp: new Date(now - (i + 1) * 3600000 * Math.random() * 24),
      isRead,
      isResolved,
      metadata: {
        symbol,
        threshold: 1.5 + Math.random() * 2,
        currentValue: 2 + Math.random() * 3,
        chain: 'Ethereum',
      },
    });
  }

  return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export async function getAlertThresholds(): Promise<AlertThreshold[]> {
  return [
    {
      type: 'price_deviation_warning',
      enabled: true,
      threshold: 1.5,
      lastTriggered: new Date(Date.now() - 3600000),
    },
    {
      type: 'price_deviation_critical',
      enabled: true,
      threshold: 3.0,
      lastTriggered: new Date(Date.now() - 7200000),
    },
    {
      type: 'node_response_time',
      enabled: true,
      threshold: 500,
      lastTriggered: new Date(Date.now() - 1800000),
    },
    {
      type: 'coverage_pool_ratio',
      enabled: true,
      threshold: 30,
      lastTriggered: new Date(Date.now() - 86400000),
    },
    {
      type: 'node_offline',
      enabled: true,
      threshold: 5,
    },
  ];
}
