'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createLogger } from '@/lib/utils/logger';
import type { PriceDataForAlert } from '@/types/oracle';

const logger = createLogger('PriceAlerts');

const STORAGE_KEY = 'price_alerts_v1';
const ALERT_HISTORY_KEY = 'price_alert_history_v1';

export type AlertCondition = 'above' | 'below' | 'increase_by' | 'decrease_by';
export type AlertType = 'price' | 'change';

export interface PriceAlert {
  id: string;
  symbol: string;
  type: AlertType;
  condition: AlertCondition;
  threshold: number;
  isActive: boolean;
  createdAt: number;
  triggeredAt?: number;
  triggeredCount: number;
  notifyBrowser: boolean;
  notifySound: boolean;
}

export interface AlertHistory {
  id: string;
  alertId: string;
  symbol: string;
  type: AlertType;
  condition: AlertCondition;
  threshold: number;
  triggeredValue: number;
  triggeredAt: number;
  acknowledged: boolean;
}

export interface AlertCheckResult {
  triggered: boolean;
  alert: PriceAlert;
  currentValue: number;
  history: AlertHistory;
}

export type { PriceDataForAlert };

// 从 localStorage 加载预警规则
function loadAlertsFromStorage(): PriceAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    logger.error('Failed to load alerts from storage', error as Error);
    return [];
  }
}

// 保存预警规则到 localStorage
function saveAlertsToStorage(alerts: PriceAlert[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch (error) {
    logger.error('Failed to save alerts to storage', error as Error);
  }
}

// 从 localStorage 加载预警历史
function loadHistoryFromStorage(): AlertHistory[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(ALERT_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    logger.error('Failed to load alert history from storage', error as Error);
    return [];
  }
}

// 保存预警历史到 localStorage
function saveHistoryToStorage(history: AlertHistory[]): void {
  if (typeof window === 'undefined') return;
  try {
    // 只保留最近100条历史记录
    const trimmed = history.slice(-100);
    localStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    logger.error('Failed to save alert history to storage', error as Error);
  }
}

// 生成唯一ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 检查单个预警是否触发
function checkAlert(alert: PriceAlert, priceData: PriceData): AlertCheckResult | null {
  if (!alert.isActive) return null;

  let triggered = false;
  let currentValue = 0;

  switch (alert.type) {
    case 'price':
      currentValue = priceData.price;
      if (alert.condition === 'above') {
        triggered = priceData.price >= alert.threshold;
      } else if (alert.condition === 'below') {
        triggered = priceData.price <= alert.threshold;
      }
      break;

    case 'change':
      currentValue = priceData.changePercent24h;
      if (alert.condition === 'increase_by') {
        triggered = priceData.changePercent24h >= alert.threshold;
      } else if (alert.condition === 'decrease_by') {
        triggered = priceData.changePercent24h <= -alert.threshold;
      }
      break;
  }

  if (!triggered) return null;

  const history: AlertHistory = {
    id: generateId(),
    alertId: alert.id,
    symbol: alert.symbol,
    type: alert.type,
    condition: alert.condition,
    threshold: alert.threshold,
    triggeredValue: currentValue,
    triggeredAt: Date.now(),
    acknowledged: false,
  };

  return {
    triggered: true,
    alert,
    currentValue,
    history,
  };
}

// 发送浏览器通知
function sendBrowserNotification(title: string, body: string): void {
  if (typeof window === 'undefined') return;

  if (!('Notification' in window)) {
    logger.warn('Browser notifications not supported');
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      }
    });
  }
}

// 播放提示音
function playAlertSound(): void {
  if (typeof window === 'undefined') return;

  try {
    const audio = new Audio('/sounds/alert.mp3');
    audio.volume = 0.5;
    audio.play().catch((error) => {
      logger.warn('Failed to play alert sound', error);
    });
  } catch (error) {
    logger.warn(
      'Failed to create audio element',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

// ==================== Hook ====================

export interface UsePriceAlertsReturn {
  alerts: PriceAlert[];
  history: AlertHistory[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggeredCount'>) => void;
  removeAlert: (id: string) => void;
  updateAlert: (id: string, updates: Partial<PriceAlert>) => void;
  toggleAlert: (id: string) => void;
  acknowledgeHistory: (historyId: string) => void;
  clearHistory: () => void;
  checkPriceAlerts: (priceData: PriceData[]) => AlertCheckResult[];
  requestNotificationPermission: () => Promise<boolean>;
  hasNotificationPermission: boolean;
}

export function usePriceAlerts(): UsePriceAlertsReturn {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const lastPricesRef = useRef<Map<string, PriceData>>(new Map());

  // 初始加载
  useEffect(() => {
    setAlerts(loadAlertsFromStorage());
    setHistory(loadHistoryFromStorage());

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasNotificationPermission(Notification.permission === 'granted');
    }
  }, []);

  // 保存到 localStorage
  useEffect(() => {
    saveAlertsToStorage(alerts);
  }, [alerts]);

  useEffect(() => {
    saveHistoryToStorage(history);
  }, [history]);

  // 添加预警
  const addAlert = useCallback((alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggeredCount'>) => {
    const newAlert: PriceAlert = {
      ...alert,
      id: generateId(),
      createdAt: Date.now(),
      triggeredCount: 0,
    };
    setAlerts((prev) => [...prev, newAlert]);
    logger.info('Alert added', { symbol: alert.symbol, type: alert.type });
  }, []);

  // 删除预警
  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    logger.info('Alert removed', { id });
  }, []);

  // 更新预警
  const updateAlert = useCallback((id: string, updates: Partial<PriceAlert>) => {
    setAlerts((prev) => prev.map((alert) => (alert.id === id ? { ...alert, ...updates } : alert)));
  }, []);

  // 切换预警开关
  const toggleAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((alert) => (alert.id === id ? { ...alert, isActive: !alert.isActive } : alert))
    );
  }, []);

  // 确认历史记录
  const acknowledgeHistory = useCallback((historyId: string) => {
    setHistory((prev) => prev.map((h) => (h.id === historyId ? { ...h, acknowledged: true } : h)));
  }, []);

  // 清空历史
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // 检查价格预警
  const checkPriceAlerts = useCallback(
    (priceData: PriceData[]): AlertCheckResult[] => {
      const results: AlertCheckResult[] = [];
      const newHistory: AlertHistory[] = [];

      priceData.forEach((data) => {
        // 更新最后价格
        lastPricesRef.current.set(data.symbol, data);

        // 检查相关预警
        const relevantAlerts = alerts.filter((a) => a.symbol === data.symbol && a.isActive);

        relevantAlerts.forEach((alert) => {
          const result = checkAlert(alert, data);
          if (result) {
            results.push(result);
            newHistory.push(result.history);

            // 发送通知
            if (alert.notifyBrowser) {
              const title = `Price Alert: ${alert.symbol}`;
              const body =
                alert.type === 'price'
                  ? `Price is ${alert.condition === 'above' ? 'above' : 'below'} $${alert.threshold}`
                  : `24h change is ${alert.condition === 'increase_by' ? 'up' : 'down'} ${Math.abs(result.currentValue).toFixed(2)}%`;
              sendBrowserNotification(title, body);
            }

            // 播放声音
            if (alert.notifySound) {
              playAlertSound();
            }

            // 更新预警触发次数
            setAlerts((prev) =>
              prev.map((a) =>
                a.id === alert.id
                  ? { ...a, triggeredCount: a.triggeredCount + 1, triggeredAt: Date.now() }
                  : a
              )
            );
          }
        });
      });

      // 添加历史记录
      if (newHistory.length > 0) {
        setHistory((prev) => [...prev, ...newHistory]);
      }

      return results;
    },
    [alerts]
  );

  // 请求通知权限
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasNotificationPermission(granted);
      return granted;
    } catch (error) {
      logger.error('Failed to request notification permission', error as Error);
      return false;
    }
  }, []);

  return {
    alerts,
    history,
    addAlert,
    removeAlert,
    updateAlert,
    toggleAlert,
    acknowledgeHistory,
    clearHistory,
    checkPriceAlerts,
    requestNotificationPermission,
    hasNotificationPermission,
  };
}

// ==================== 工具函数 ====================

export function formatAlertCondition(condition: AlertCondition, type: AlertType): string {
  const conditionMap: Record<AlertCondition, string> = {
    above: type === 'price' ? '高于' : '超过',
    below: type === 'price' ? '低于' : '跌破',
    increase_by: '涨幅超过',
    decrease_by: '跌幅超过',
  };
  return conditionMap[condition] || condition;
}

export function formatAlertType(type: AlertType): string {
  const typeMap: Record<AlertType, string> = {
    price: '价格预警',
    change: '涨跌幅预警',
  };
  return typeMap[type] || type;
}

export function getAlertConditionOptions(
  type: AlertType
): { value: AlertCondition; label: string }[] {
  if (type === 'price') {
    return [
      { value: 'above', label: '高于' },
      { value: 'below', label: '低于' },
    ];
  }
  return [
    { value: 'increase_by', label: '涨幅超过' },
    { value: 'decrease_by', label: '跌幅超过' },
  ];
}

// ==================== 默认预警配置 ====================

export const DEFAULT_ALERT_SYMBOLS = ['BTC', 'ETH', 'LINK', 'PYTH'];

export const ALERT_TEMPLATES = [
  {
    name: '价格突破',
    type: 'price' as AlertType,
    condition: 'above' as AlertCondition,
    description: '当价格突破设定阈值时触发',
  },
  {
    name: '价格下跌',
    type: 'price' as AlertType,
    condition: 'below' as AlertCondition,
    description: '当价格跌破设定阈值时触发',
  },
  {
    name: '大涨预警',
    type: 'change' as AlertType,
    condition: 'increase_by' as AlertCondition,
    description: '当24小时涨幅超过设定百分比时触发',
  },
  {
    name: '大跌预警',
    type: 'change' as AlertType,
    condition: 'decrease_by' as AlertCondition,
    description: '当24小时跌幅超过设定百分比时触发',
  },
];
