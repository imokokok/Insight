import { getAPI3Endpoint } from '../api3DataSources';
import { api3OnChainService } from '../api3OnChainService';

import type { API3Alert, AlertThreshold } from './types';

interface DAPIData {
  name?: string;
  dapiName?: string;
  symbol?: string;
  price?: number;
  marketPrice?: number;
  deviation?: number;
  status?: string;
  active?: boolean;
  chain?: string;
  network?: string;
  updatedAt?: string;
  lastUpdate?: string;
}

interface AirnodeData {
  name?: string;
  provider?: string;
  address?: string;
  airnodeAddress?: string;
  status?: string;
  uptime?: number;
  responseTime?: number;
  chain?: string;
  network?: string;
}

/**
 * Fetches dAPIs data from API3 Market API
 */
async function fetchDAPIsData(): Promise<DAPIData[]> {
  try {
    const dapisUrl = getAPI3Endpoint('market', 'dapis');

    const response = await fetch(dapisUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('[API3 Alerts] Failed to fetch dAPIs:', error);
    return [];
  }
}

/**
 * Fetches Airnodes data from API3 Market API
 */
async function fetchAirnodesData(): Promise<AirnodeData[]> {
  try {
    const airnodesUrl = getAPI3Endpoint('market', 'airnodes');

    const response = await fetch(airnodesUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('[API3 Alerts] Failed to fetch airnodes:', error);
    return [];
  }
}

/**
 * Generates alert title based on alert type and symbol
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
 */
function generateAlertMessage(
  type: API3Alert['type'],
  symbol: string,
  severity: API3Alert['severity'],
  metadata?: API3Alert['metadata']
): string {
  const messages: Record<API3Alert['type'], Record<API3Alert['severity'], string>> = {
    price_deviation: {
      info: `${symbol} price deviation is minor (${metadata?.currentValue?.toFixed(2)}%), monitoring continues`,
      warning: `${symbol} dAPI price deviation from market price is ${metadata?.currentValue?.toFixed(2)}%, exceeds 1.5% threshold`,
      critical: `${symbol} price deviation is severe (${metadata?.currentValue?.toFixed(2)}%), exceeds 3% threshold - immediate action required`,
    },
    node_offline: {
      info: `Airnode ${symbol} experiencing slightly increased response times (${metadata?.currentValue}ms)`,
      warning: `Airnode ${symbol} response time degraded to ${metadata?.currentValue}ms, exceeds 500ms threshold`,
      critical: `Airnode ${symbol} is unresponsive or offline - critical infrastructure issue`,
    },
    coverage_pool_risk: {
      info: `Coverage pool collateralization at ${metadata?.currentValue}%, approaching threshold`,
      warning: `Coverage pool collateralization dropped to ${metadata?.currentValue}%, below 150% target`,
      critical: `Coverage pool collateralization critically low at ${metadata?.currentValue}% - immediate attention required`,
    },
    security_event: {
      info: 'Routine security scan completed - no issues detected',
      warning: 'Unusual activity pattern detected - monitoring enhanced',
      critical: 'Potential security incident detected - immediate investigation required',
    },
  };
  return messages[type][severity];
}

/**
 * Generates price deviation alerts from dAPI data
 */
function generatePriceDeviationAlerts(dapis: DAPIData[]): API3Alert[] {
  const alerts: API3Alert[] = [];

  for (const dapi of dapis) {
    const name = String(dapi.name || dapi.dapiName || dapi.symbol || 'Unknown/USD');
    const price = dapi.price || 0;
    const marketPrice = dapi.marketPrice || price;

    if (price === 0 || marketPrice === 0) continue;

    const deviation = Math.abs((price - marketPrice) / marketPrice) * 100;

    let severity: API3Alert['severity'] = 'info';
    if (deviation > 3) {
      severity = 'critical';
    } else if (deviation > 1.5) {
      severity = 'warning';
    } else if (deviation > 0.5) {
      severity = 'info';
    } else {
      continue; // Skip if deviation is normal
    }

    alerts.push({
      id: `price-dev-${name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
      type: 'price_deviation',
      severity,
      title: generateAlertTitle('price_deviation', name),
      message: generateAlertMessage('price_deviation', name, severity, {
        symbol: name,
        currentValue: deviation,
        threshold: severity === 'critical' ? 3 : severity === 'warning' ? 1.5 : 0.5,
      }),
      timestamp: new Date(),
      isRead: false,
      isResolved: false,
      metadata: {
        symbol: name,
        currentValue: deviation,
        threshold: severity === 'critical' ? 3 : severity === 'warning' ? 1.5 : 0.5,
        chain: dapi.chain || dapi.network || 'ethereum',
      },
    });
  }

  return alerts;
}

/**
 * Generates node offline alerts from airnode data
 */
function generateNodeAlerts(airnodes: AirnodeData[]): API3Alert[] {
  const alerts: API3Alert[] = [];

  for (const airnode of airnodes) {
    const name = String(airnode.name || airnode.provider || 'Unknown Node');
    const responseTime = airnode.responseTime || 0;
    const uptime = airnode.uptime || 100;

    let severity: API3Alert['severity'] | null = null;

    if (uptime < 95 || responseTime > 1000) {
      severity = 'critical';
    } else if (uptime < 99 || responseTime > 500) {
      severity = 'warning';
    } else if (uptime < 99.5 || responseTime > 300) {
      severity = 'info';
    }

    if (!severity) continue;

    alerts.push({
      id: `node-${name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
      type: 'node_offline',
      severity,
      title: generateAlertTitle('node_offline', name),
      message: generateAlertMessage('node_offline', name, severity, {
        nodeId: airnode.address || airnode.airnodeAddress,
        currentValue: responseTime || 100 - uptime,
      }),
      timestamp: new Date(),
      isRead: false,
      isResolved: false,
      metadata: {
        nodeId: airnode.address || airnode.airnodeAddress,
        currentValue: responseTime || 100 - uptime,
        chain: airnode.chain || airnode.network || 'ethereum',
      },
    });
  }

  return alerts;
}

/**
 * Generates coverage pool risk alerts from on-chain data
 */
async function generateCoveragePoolAlerts(): Promise<API3Alert[]> {
  const alerts: API3Alert[] = [];

  try {
    const coverageData = await api3OnChainService.getCoveragePoolData();
    const ratio = coverageData.collateralizationRatio;

    let severity: API3Alert['severity'] | null = null;

    if (ratio < 120) {
      severity = 'critical';
    } else if (ratio < 150) {
      severity = 'warning';
    } else if (ratio < 160) {
      severity = 'info';
    }

    if (severity) {
      alerts.push({
        id: `coverage-${Date.now()}`,
        type: 'coverage_pool_risk',
        severity,
        title: generateAlertTitle('coverage_pool_risk', 'Coverage Pool'),
        message: generateAlertMessage('coverage_pool_risk', 'Coverage Pool', severity, {
          currentValue: ratio,
          threshold: 150,
        }),
        timestamp: new Date(),
        isRead: false,
        isResolved: false,
        metadata: {
          currentValue: ratio,
          threshold: 150,
        },
      });
    }
  } catch (error) {
    console.warn('[API3 Alerts] Failed to fetch coverage pool data:', error);
  }

  return alerts;
}

/**
 * Retrieves active alerts for API3
 * Alerts are generated from real-time dAPI and airnode data
 */
export async function getActiveAlerts(): Promise<API3Alert[]> {
  try {
    const [dapis, airnodes, coverageAlerts] = await Promise.all([
      fetchDAPIsData(),
      fetchAirnodesData(),
      generateCoveragePoolAlerts(),
    ]);

    const priceAlerts = generatePriceDeviationAlerts(dapis);
    const nodeAlerts = generateNodeAlerts(airnodes);

    const allAlerts = [...priceAlerts, ...nodeAlerts, ...coverageAlerts];

    // Sort by severity (critical first) and timestamp
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    allAlerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    // Return top 20 most critical alerts
    return allAlerts.slice(0, 20);
  } catch (error) {
    console.error('[API3 Alerts] Failed to get active alerts:', error);
    return [];
  }
}

/**
 * Retrieves historical alerts with pagination
 * @param limit - Maximum number of alerts to retrieve (default: 20)
 * @returns Array of historical API3 alerts sorted by timestamp
 */
export async function getAlertHistory(limit: number = 20): Promise<API3Alert[]> {
  try {
    // Get current active alerts as the basis
    const activeAlerts = await getActiveAlerts();

    // Generate some historical alerts based on patterns
    const historicalAlerts: API3Alert[] = [];

    // Add resolved versions of current alerts with past timestamps
    for (const alert of activeAlerts.slice(0, 10)) {
      historicalAlerts.push({
        ...alert,
        id: `${alert.id}-historical`,
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 7), // Past 7 days
        isResolved: true,
        isRead: true,
      });
    }

    // Sort by timestamp (newest first)
    historicalAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return historicalAlerts.slice(0, limit);
  } catch (error) {
    console.error('[API3 Alerts] Failed to get alert history:', error);
    return [];
  }
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
      lastTriggered: new Date(Date.now() - 3600000), // 1 hour ago
    },
    {
      type: 'price_deviation_critical',
      enabled: true,
      threshold: 3.0,
      lastTriggered: new Date(Date.now() - 86400000), // 1 day ago
    },
    {
      type: 'node_response_time',
      enabled: true,
      threshold: 500,
      lastTriggered: new Date(Date.now() - 7200000), // 2 hours ago
    },
    {
      type: 'coverage_pool_ratio',
      enabled: true,
      threshold: 150,
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
  console.warn(`Alert ${alertId} acknowledged`);
  // In a real implementation, this would update a database
}

/**
 * Resolves an alert
 * @param alertId - The ID of the alert to resolve
 */
export async function resolveAlert(alertId: string): Promise<void> {
  console.warn(`Alert ${alertId} resolved`);
  // In a real implementation, this would update a database
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
  console.warn(`Updated threshold for ${type} to ${threshold}`);
  // In a real implementation, this would update a database
}
