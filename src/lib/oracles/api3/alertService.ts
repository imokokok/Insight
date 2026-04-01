import type { API3Alert, AlertThreshold } from './types';

/**
 * Generates alert title based on alert type and symbol
 * @param type - The type of alert
 * @param symbol - The trading pair symbol (e.g., BTC/USD)
 * @returns Localized alert title
 */
function generateAlertTitle(type: API3Alert['type'], symbol: string): string {
  const titles: Record<API3Alert['type'], string> = {
    price_deviation: `${symbol} Price Deviation Alert`,
    node_offline: 'Airnode Node Anomaly',
    coverage_pool_risk: 'Coverage Pool Risk Alert',
    security_event: 'Security Event Notification',
  };
  return titles[type];
}

/**
 * Generates alert message based on type, symbol, and severity
 * @param type - The type of alert
 * @param symbol - The trading pair symbol
 * @param severity - The severity level of the alert
 * @returns Localized alert message
 */
function generateAlertMessage(
  type: API3Alert['type'],
  symbol: string,
  severity: API3Alert['severity']
): string {
  const messages: Record<API3Alert['type'], Record<API3Alert['severity'], string>> = {
    price_deviation: {
      info: `${symbol} price deviation is minor, monitoring continues`,
      warning: `${symbol} dAPI price deviation from market price exceeds threshold, attention recommended`,
      critical: `${symbol} price deviation is severe, immediate action required`,
    },
    node_offline: {
      info: 'Some nodes experiencing increased response times',
      warning: 'Multiple Airnode nodes experiencing response delays',
      critical: 'Critical Airnode nodes are offline',
    },
    coverage_pool_risk: {
      info: 'Coverage pool collateralization ratio approaching threshold',
      warning: 'Coverage pool collateralization ratio below recommended value',
      critical: 'Coverage pool collateralization ratio critically low',
    },
    security_event: {
      info: 'Potential security risks detected',
      warning: 'Abnormal transaction activity detected',
      critical: 'Security event requires immediate attention',
    },
  };
  return messages[type][severity];
}

/**
 * Retrieves active alerts for API3
 * @returns Array of active API3 alerts
 */
export async function getActiveAlerts(): Promise<API3Alert[]> {
  const now = Date.now();
  return [
    {
      id: 'alert-001',
      type: 'price_deviation',
      severity: 'critical',
      title: 'UNI/USD Price Deviation Too High',
      message:
        'UNI/USD dAPI price deviation from market price reached 3.62%, exceeding critical threshold of 3%',
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
      title: 'AVAX/USD Price Deviation Warning',
      message:
        'AVAX/USD dAPI price deviation from market price reached 1.52%, attention recommended',
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
      title: 'LINK/USD Price Deviation Warning',
      message:
        'LINK/USD dAPI price deviation from market price reached 1.44%, showing expanding trend',
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
      title: 'Airnode Response Delay',
      message: 'Some Airnode nodes in Asia-Pacific region experiencing response times over 500ms',
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
      title: 'Coverage Pool Collateralization Ratio Decreased',
      message:
        'Coverage pool collateralization ratio decreased from 38% to 34%, additional staking recommended',
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

/**
 * Retrieves historical alerts with pagination
 * @param limit - Maximum number of alerts to retrieve (default: 20)
 * @returns Array of historical API3 alerts sorted by timestamp
 */
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

/**
 * Retrieves configured alert thresholds
 * @returns Array of alert threshold configurations
 */
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
