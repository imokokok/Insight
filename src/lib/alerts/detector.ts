import { supabase, queries } from '@/lib/supabase/client';
import type { PriceAlert, AlertEvent, AlertConditionType } from '@/lib/supabase/database.types';
import type { PriceData } from '@/lib/types/oracle';

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

  const { data: activeAlerts, error } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('is_active', true);

  if (error || !activeAlerts) {
    console.error('Failed to fetch active alerts:', error);
    return results;
  }

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
      const { data: priceHistory } = await supabase
        .from('price_records')
        .select('price')
        .eq('symbol', alert.symbol)
        .eq('provider', matchingPrice.provider)
        .order('timestamp', { ascending: false })
        .limit(2);

      if (priceHistory && priceHistory.length > 1) {
        previousPrice = priceHistory[1].price;
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
    console.error('Error checking existing events:', checkError);
    return null;
  }

  if (existingEvent) {
    console.log('Alert already triggered recently, skipping:', alertId);
    return null;
  }

  const event = await queries.triggerAlert(alertId, {
    user_id: eventData.userId,
    price: eventData.price,
    triggered_at: new Date().toISOString(),
    condition_met: eventData.conditionMet,
    acknowledged: false,
  });

  if (event) {
    console.log('Alert triggered:', alertId, eventData.conditionMet);
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
          console.log(`Processed ${events.length} triggered alerts`);
        }

        priceData.forEach((p) => {
          const key = `${p.provider}-${p.symbol}-${p.chain ?? 'all'}`;
          this.lastPrices.set(key, p.price);
        });
      } catch (error) {
        console.error('Error in alert detector:', error);
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
