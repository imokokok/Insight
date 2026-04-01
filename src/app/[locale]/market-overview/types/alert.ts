/**
 * 预警功能类型定义
 */

/**
 * 预警类型
 */
export type AlertType = 'above' | 'below' | 'percent_change';

/**
 * 预警通知渠道
 */
export type AlertChannel = 'email' | 'webhook' | 'push';

/**
 * 价格预警
 */
export interface PriceAlert {
  /** 预警ID */
  id: string;
  /** 资产 */
  asset: string;
  /** 类型 */
  type: AlertType;
  /** 价格 */
  price: number;
  /** 是否启用 */
  enabled: boolean;
  /** 通知渠道 */
  channels: AlertChannel[];
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 - 可选 */
  updatedAt?: number;
  /** 备注 - 可选 */
  note?: string;
  /** 是否已触发 - 可选 */
  triggered?: boolean;
}

/**
 * 预警检查结果
 */
export interface AlertCheckResult {
  /** 预警ID */
  alertId: string;
  /** 资产 */
  asset: string;
  /** 是否触发 */
  triggered: boolean;
  /** 当前价格 */
  currentPrice: number;
  /** 触发时间 */
  triggeredAt: number;
  /** 消息 */
  message: string;
}

/**
 * 预警历史记录
 */
export interface AlertHistory {
  /** 记录ID */
  id: string;
  /** 预警ID */
  alertId: string;
  /** 资产 */
  asset: string;
  /** 类型 */
  type: AlertType;
  /** 触发价格 */
  triggerPrice: number;
  /** 触发时间 */
  triggeredAt: number;
  /** 是否已确认 */
  acknowledged: boolean;
  /** 消息 */
  message: string;
}
