// WebSocket 管理模块
export {
  default as WebSocketManager,
  MockWebSocketManager,
  createWebSocketHook,
  useWebSocket,
} from './websocket';
export type {
  WebSocketStatus,
  WebSocketMessage,
  WebSocketConfig,
  MessageHandler,
  StatusHandler,
  UseWebSocketOptions,
} from './websocket';

// 价格预警模块
export {
  usePriceAlerts,
  formatAlertCondition,
  formatAlertType,
  getAlertConditionOptions,
  DEFAULT_ALERT_SYMBOLS,
  ALERT_TEMPLATES,
} from './priceAlerts';
export type {
  AlertCondition,
  AlertType,
  PriceAlert,
  AlertHistory,
  AlertCheckResult,
  UsePriceAlertsReturn,
} from './priceAlerts';
export type { PriceDataForAlert } from './priceAlerts';
