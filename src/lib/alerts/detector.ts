import { supabase, queries } from '@/lib/supabase/client';
import type {
  PriceAlert,
  AlertEvent,
  AlertConditionType,
  PriceRecord,
} from '@/lib/supabase/database.types';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('alert-detector');

interface PriceHistoryCache {
  data: Map<string, { price: number; timestamp: string }>;
  timestamp: number;
}

const priceHistoryCache = new Map<string, PriceHistoryCache>();
const CACHE_TTL = 60 * 1000;

interface PerformanceMetrics {
  startTime: number;
  dbQueries: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface PriceDataForAlert {
  provider: string;
  symbol: string;
  chain?: string | null;
  price: number;
  timestamp: number;
}

export interface AlertCheckResult {
  alertId: string;
  userId: string;
  conditionMet: boolean;
  currentPrice: number;
  targetValue: number;
  conditionType: AlertConditionType;
  symbol: string;
  provider?: string | null;
  chain?: string | null;
}

export interface TriggeredAlertData {
  alertId: string;
  userId: string;
  price: number;
  conditionMet: string;
}

function getCacheKey(symbol: string, provider: string, chain?: string | null): string {
  return `${symbol}:${provider}:${chain || 'all'}`;
}

function isCacheValid(cacheEntry: PriceHistoryCache): boolean {
  return Date.now() - cacheEntry.timestamp < CACHE_TTL;
}

async function batchGetPriceHistory(
  symbolsData: Array<{ symbol: string; provider: string; chain?: string | null }>,
  metrics: PerformanceMetrics
): Promise<Map<string, { price: number; timestamp: string }>> {
  const result = new Map<string, { price: number; timestamp: string }>();
  const symbolsToFetch: Array<{ symbol: string; provider: string; chain?: string | null }> = [];

  for (const item of symbolsData) {
    const cacheKey = getCacheKey(item.symbol, item.provider, item.chain);
    const cached = priceHistoryCache.get(cacheKey);

    if (cached && isCacheValid(cached)) {
      metrics.cacheHits++;
      const latestPrice = cached.data.get('latest');
      if (latestPrice) {
        result.set(cacheKey, latestPrice);
      }
    } else {
      metrics.cacheMisses++;
      symbolsToFetch.push(item);
    }
  }

  if (symbolsToFetch.length === 0) {
    return result;
  }

  metrics.dbQueries++;

  const orConditions = symbolsToFetch.map((item) => {
    const conditions = [`symbol.eq.${item.symbol}`, `provider.eq.${item.provider}`];
    if (item.chain !== null && item.chain !== undefined) {
      conditions.push(`chain.eq.${item.chain}`);
    }
    return `(${conditions.join(',')})`;
  });

  const { data: priceRecords, error } = await supabase
    .from('price_records')
    .select('*')
    .or(orConditions.join(','))
    .order('timestamp', { ascending: false })
    .limit(2 * symbolsToFetch.length);

  if (error || !priceRecords) {
    logger.error(
      'Failed to batch fetch price history',
      error instanceof Error ? error : new Error(String(error))
    );
    return result;
  }

  const groupedRecords = new Map<string, PriceRecord[]>();
  for (const record of priceRecords as PriceRecord[]) {
    const key = getCacheKey(record.symbol, record.provider, record.chain);
    if (!groupedRecords.has(key)) {
      groupedRecords.set(key, []);
    }
    groupedRecords.get(key)!.push(record);
  }

  for (const [key, records] of groupedRecords.entries()) {
    const cacheData = new Map<string, { price: number; timestamp: string }>();

    if (records.length > 0) {
      cacheData.set('latest', { price: records[0].price, timestamp: records[0].timestamp });
      result.set(key, { price: records[0].price, timestamp: records[0].timestamp });
    }

    priceHistoryCache.set(key, {
      data: cacheData,
      timestamp: Date.now(),
    });
  }

  return result;
}

export function checkAlertCondition(
  alert: PriceAlert,
  currentPrice: number,
  previousPrice?: number
): boolean {
  const { condition_type, target_value } = alert;

  switch (condition_type) {
    case 'above':
      return currentPrice >= target_value;

    case 'below':
      return currentPrice <= target_value;

    case 'change_percent':
      if (!previousPrice || previousPrice === 0) return false;
      const changePercent = Math.abs((currentPrice - previousPrice) / previousPrice) * 100;
      return changePercent >= target_value;

    default:
      return false;
  }
}

export function formatConditionMet(
  conditionType: AlertConditionType,
  currentPrice: number,
  targetValue: number,
  previousPrice?: number
): string {
  switch (conditionType) {
    case 'above':
      return `价格 ${currentPrice.toFixed(4)} 达到目标 ${targetValue.toFixed(4)}`;

    case 'below':
      return `价格 ${currentPrice.toFixed(4)} 低于目标 ${targetValue.toFixed(4)}`;

    case 'change_percent':
      if (previousPrice && previousPrice !== 0) {
        const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
        return `价格变化 ${changePercent.toFixed(2)}% 达到目标 ${targetValue.toFixed(2)}%`;
      }
      return `价格变化达到目标 ${targetValue.toFixed(2)}%`;

    default:
      return '条件已满足';
  }
}

export async function checkAlertConditions(
  priceData: PriceDataForAlert[]
): Promise<AlertCheckResult[]> {
  const results: AlertCheckResult[] = [];
  const metrics: PerformanceMetrics = {
    startTime: Date.now(),
    dbQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  metrics.dbQueries++;

  const { data: activeAlerts, error } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('is_active', true);

  if (error || !activeAlerts) {
    logger.error(
      'Failed to fetch active alerts',
      error instanceof Error ? error : new Error(String(error))
    );
    return results;
  }

  const symbolsNeedingHistory: Array<{
    symbol: string;
    provider: string;
    chain?: string | null;
  }> = [];

  for (const alert of activeAlerts as PriceAlert[]) {
    if (alert.condition_type === 'change_percent') {
      const matchingPrice = priceData.find(
        (p) =>
          p.symbol === alert.symbol &&
          (alert.provider === null || p.provider === alert.provider) &&
          (alert.chain === null || p.chain === alert.chain)
      );

      if (matchingPrice) {
        symbolsNeedingHistory.push({
          symbol: alert.symbol,
          provider: matchingPrice.provider,
          chain: alert.chain,
        });
      }
    }
  }

  const priceHistoryMap = await batchGetPriceHistory(symbolsNeedingHistory, metrics);

  for (const alert of activeAlerts as PriceAlert[]) {
    const matchingPrice = priceData.find(
      (p) =>
        p.symbol === alert.symbol &&
        (alert.provider === null || p.provider === alert.provider) &&
        (alert.chain === null || p.chain === alert.chain)
    );

    if (!matchingPrice) continue;

    let previousPrice: number | undefined;
    if (alert.condition_type === 'change_percent') {
      const cacheKey = getCacheKey(alert.symbol, matchingPrice.provider, alert.chain);
      const historyData = priceHistoryMap.get(cacheKey);

      if (historyData) {
        previousPrice = historyData.price;
      }
    }

    const conditionMet = checkAlertCondition(alert, matchingPrice.price, previousPrice);

    results.push({
      alertId: alert.id,
      userId: alert.user_id,
      conditionMet,
      currentPrice: matchingPrice.price,
      targetValue: alert.target_value,
      conditionType: alert.condition_type,
      symbol: alert.symbol,
      provider: alert.provider,
      chain: alert.chain,
    });
  }

  const duration = Date.now() - metrics.startTime;
  const totalRequests = metrics.cacheHits + metrics.cacheMisses;
  const hitRate = totalRequests > 0 ? ((metrics.cacheHits / totalRequests) * 100).toFixed(2) : '0';

  logger.info('Alert check performance metrics', {
    duration: `${duration}ms`,
    dbQueries: metrics.dbQueries,
    cacheHits: metrics.cacheHits,
    cacheMisses: metrics.cacheMisses,
    hitRate: `${hitRate}%`,
    activeAlerts: activeAlerts.length,
    resultsCount: results.length,
  });

  return results;
}

export async function triggerAlert(
  alertId: string,
  eventData: TriggeredAlertData
): Promise<AlertEvent | null> {
  const { data: existingEvent, error: checkError } = await supabase
    .from('alert_events')
    .select('id')
    .eq('alert_id', alertId)
    .gte('triggered_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .maybeSingle();

  if (checkError) {
    logger.error(
      'Error checking existing events',
      checkError instanceof Error ? checkError : new Error(String(checkError))
    );
    return null;
  }

  if (existingEvent) {
    logger.info('Alert already triggered recently, skipping', { alertId });
    return null;
  }

  const event = await queries.triggerAlert(alertId, eventData.userId, {
    price: eventData.price,
    triggered_at: new Date().toISOString(),
    condition_met: eventData.conditionMet,
    acknowledged: false,
  });

  if (event) {
    logger.info('Alert triggered', { alertId, conditionMet: eventData.conditionMet });
  }

  return event as AlertEvent | null;
}

export async function processPriceUpdate(priceData: PriceDataForAlert[]): Promise<AlertEvent[]> {
  const checkResults = await checkAlertConditions(priceData);
  const triggeredEvents: AlertEvent[] = [];

  for (const result of checkResults) {
    if (!result.conditionMet) continue;

    const event = await triggerAlert(result.alertId, {
      alertId: result.alertId,
      userId: result.userId,
      price: result.currentPrice,
      conditionMet: formatConditionMet(
        result.conditionType,
        result.currentPrice,
        result.targetValue
      ),
    });

    if (event) {
      triggeredEvents.push(event);
    }
  }

  return triggeredEvents;
}

export class AlertDetector {
  private checkInterval: NodeJS.Timeout | null = null;
  private lastPrices: Map<string, number> = new Map();

  constructor(private intervalMs: number = 30000) {}

  start(fetchPriceData: () => Promise<PriceDataForAlert[]>) {
    if (this.checkInterval) {
      this.stop();
    }

    this.checkInterval = setInterval(async () => {
      try {
        const priceData = await fetchPriceData();
        const events = await processPriceUpdate(priceData);

        if (events.length > 0) {
          logger.info(`Processed ${events.length} triggered alerts`);
        }

        priceData.forEach((p) => {
          const key = `${p.provider}-${p.symbol}-${p.chain ?? 'all'}`;
          this.lastPrices.set(key, p.price);
        });
      } catch (error) {
        logger.error(
          'Error in alert detector',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }, this.intervalMs);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  getLastPrice(provider: string, symbol: string, chain?: string | null): number | undefined {
    const key = `${provider}-${symbol}-${chain ?? 'all'}`;
    return this.lastPrices.get(key);
  }

  isRunning(): boolean {
    return this.checkInterval !== null;
  }
}

export const alertDetector = new AlertDetector();
