'use client';

import { useState, useEffect } from 'react';

import {
  usePriceAlerts,
  type AlertCheckResult,
  type PriceDataForAlert,
} from '@/lib/realtime/priceAlerts';
import {
  useWebSocket,
  type WebSocketStatus,
  type WebSocketMessage,
} from '@/lib/realtime/websocket';

import { type OracleMarketData, type AssetData } from './types';

export interface UseWebSocketHandlerReturn {
  wsStatus: WebSocketStatus;
  wsLastMessage: WebSocketMessage<unknown> | null;
  wsLastUpdated: Date | null;
  wsReconnect: () => void;
  wsMessageCount: number;
  wsConnectedChannels: string[];
  priceAlerts: import('@/lib/realtime/priceAlerts').PriceAlert[];
  alertHistory: import('@/lib/realtime/priceAlerts').AlertHistory[];
  addPriceAlert: (
    alert: Omit<
      import('@/lib/realtime/priceAlerts').PriceAlert,
      'id' | 'createdAt' | 'triggeredCount'
    >
  ) => void;
  removePriceAlert: (id: string) => void;
  togglePriceAlert: (id: string) => void;
  acknowledgeAlertHistory: (historyId: string) => void;
  clearAlertHistory: () => void;
  requestNotificationPermission: () => Promise<boolean>;
  hasNotificationPermission: boolean;
  triggeredAlerts: AlertCheckResult[];
}

export interface UseWebSocketHandlerParams {
  setOracleData: React.Dispatch<React.SetStateAction<OracleMarketData[]>>;
  setAssets: React.Dispatch<React.SetStateAction<AssetData[]>>;
  setLastUpdated: React.Dispatch<React.SetStateAction<Date | null>>;
}

export function useWebSocketHandler({
  setOracleData,
  setAssets,
  setLastUpdated,
}: UseWebSocketHandlerParams): UseWebSocketHandlerReturn {
  const [wsMessageCount, setWsMessageCount] = useState(0);
  const [wsConnectedChannels] = useState(['prices', 'tvs', 'marketStats']);
  const [triggeredAlerts, setTriggeredAlerts] = useState<AlertCheckResult[]>([]);

  const {
    status: wsStatus,
    lastMessage: wsLastMessage,
    lastUpdated: wsLastUpdated,
    reconnect: wsReconnect,
  } = useWebSocket({
    channels: wsConnectedChannels,
    autoConnect: true,
    useMock: true,
  });

  const {
    alerts: priceAlerts,
    history: alertHistory,
    addAlert: addPriceAlert,
    removeAlert: removePriceAlert,
    toggleAlert: togglePriceAlert,
    acknowledgeHistory: acknowledgeAlertHistory,
    clearHistory: clearAlertHistory,
    checkPriceAlerts,
    requestNotificationPermission,
    hasNotificationPermission,
  } = usePriceAlerts();

  useEffect(() => {
    if (!wsLastMessage) return;

    setWsMessageCount((prev) => prev + 1);

    switch (wsLastMessage.channel) {
      case 'prices': {
        const priceData = wsLastMessage.data as {
          symbol: string;
          price: number;
          change24h: number;
          timestamp: number;
        };
        setAssets((prev) =>
          prev.map((asset) =>
            asset.symbol === priceData.symbol
              ? {
                  ...asset,
                  price: priceData.price,
                  change24h: priceData.change24h,
                }
              : asset
          )
        );

        const priceAlertData: PriceDataForAlert = {
          symbol: priceData.symbol,
          price: priceData.price,
          change24h: priceData.change24h,
          changePercent24h: priceData.change24h,
          timestamp: priceData.timestamp,
        };
        const alerts = checkPriceAlerts([priceAlertData]);
        if (alerts.length > 0) {
          setTriggeredAlerts((prev) => [...prev, ...alerts]);
        }
        break;
      }

      case 'tvs': {
        const tvsData = wsLastMessage.data as {
          oracle: string;
          tvs: number;
          change24h: number;
        };
        setOracleData((prev) =>
          prev.map((oracle) =>
            oracle.name === tvsData.oracle
              ? {
                  ...oracle,
                  tvsValue: tvsData.tvs,
                  change24h: tvsData.change24h,
                }
              : oracle
          )
        );
        break;
      }

      case 'marketStats': {
        break;
      }
    }

    setLastUpdated(new Date());
  }, [wsLastMessage, checkPriceAlerts, setAssets, setOracleData, setLastUpdated]);

  return {
    wsStatus,
    wsLastMessage,
    wsLastUpdated,
    wsReconnect,
    wsMessageCount,
    wsConnectedChannels,
    priceAlerts,
    alertHistory,
    addPriceAlert,
    removePriceAlert,
    togglePriceAlert,
    acknowledgeAlertHistory,
    clearAlertHistory,
    requestNotificationPermission,
    hasNotificationPermission,
    triggeredAlerts,
  };
}
