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
  // 返回空数组，表示暂无数据
  return [];
}

/**
 * Retrieves historical alerts with pagination
 * @param limit - Maximum number of alerts to retrieve (default: 20)
 * @returns Array of historical API3 alerts sorted by timestamp
 */
export async function getAlertHistory(limit: number = 20): Promise<API3Alert[]> {
  // 返回空数组，表示暂无数据
  return [];
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
      lastTriggered: undefined,
    },
    {
      type: 'price_deviation_critical',
      enabled: true,
      threshold: 3.0,
      lastTriggered: undefined,
    },
    {
      type: 'node_response_time',
      enabled: true,
      threshold: 500,
      lastTriggered: undefined,
    },
    {
      type: 'coverage_pool_ratio',
      enabled: true,
      threshold: 40,
      lastTriggered: undefined,
    },
    {
      type: 'security_event',
      enabled: true,
      threshold: 1,
      lastTriggered: undefined,
    },
  ];
}

/**
 * Acknowledges an alert
 * @param alertId - The ID of the alert to acknowledge
 */
export async function acknowledgeAlert(alertId: string): Promise<void> {
  console.log(`Alert ${alertId} acknowledged`);
}

/**
 * Resolves an alert
 * @param alertId - The ID of the alert to resolve
 */
export async function resolveAlert(alertId: string): Promise<void> {
  console.log(`Alert ${alertId} resolved`);
}

/**
 * Updates alert threshold
 * @param type - The type of alert threshold to update
 * @param threshold - The new threshold value
 */
export async function updateAlertThreshold(
  type: AlertThreshold['type'],
  threshold: number
): Promise<void> {
  console.log(`Updated threshold for ${type} to ${threshold}`);
}
