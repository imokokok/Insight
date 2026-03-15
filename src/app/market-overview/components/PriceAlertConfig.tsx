'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import {
  PriceAlert,
  AlertHistory,
  AlertType,
  AlertCondition,
  formatAlertType,
  formatAlertCondition,
  getAlertConditionOptions,
  DEFAULT_ALERT_SYMBOLS,
  ALERT_TEMPLATES,
} from '@/lib/realtime/priceAlerts';
import {
  Bell,
  Plus,
  Trash2,
  History,
  Check,
  X,
  BellRing,
  Volume2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface PriceAlertConfigProps {
  alerts: PriceAlert[];
  history: AlertHistory[];
  onAddAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggeredCount'>) => void;
  onRemoveAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
  onAcknowledgeHistory: (historyId: string) => void;
  onClearHistory: () => void;
  onRequestNotificationPermission: () => Promise<boolean>;
  hasNotificationPermission: boolean;
}

export default function PriceAlertConfig({
  alerts,
  history,
  onAddAlert,
  onRemoveAlert,
  onToggleAlert,
  onAcknowledgeHistory,
  onClearHistory,
  onRequestNotificationPermission,
  hasNotificationPermission,
}: PriceAlertConfigProps) {
  const { locale } = useI18n();
  const isZh = locale === 'zh-CN';
  const [showAddForm, setShowAddForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newAlert, setNewAlert] = useState<{
    symbol: string;
    type: AlertType;
    condition: AlertCondition;
    threshold: string;
    notifyBrowser: boolean;
    notifySound: boolean;
  }>({
    symbol: DEFAULT_ALERT_SYMBOLS[0],
    type: 'price',
    condition: 'above',
    threshold: '',
    notifyBrowser: true,
    notifySound: false,
  });

  const handleAddAlert = () => {
    const threshold = parseFloat(newAlert.threshold);
    if (isNaN(threshold) || threshold <= 0) return;

    onAddAlert({
      symbol: newAlert.symbol,
      type: newAlert.type,
      condition: newAlert.condition,
      threshold,
      isActive: true,
      notifyBrowser: newAlert.notifyBrowser,
      notifySound: newAlert.notifySound,
    });

    setNewAlert({
      symbol: DEFAULT_ALERT_SYMBOLS[0],
      type: 'price',
      condition: 'above',
      threshold: '',
      notifyBrowser: true,
      notifySound: false,
    });
    setShowAddForm(false);
  };

  const handleRequestPermission = async () => {
    await onRequestNotificationPermission();
  };

  const activeAlerts = alerts.filter((a) => a.isActive);
  const inactiveAlerts = alerts.filter((a) => !a.isActive);
  const unacknowledgedHistory = history.filter((h) => !h.acknowledged);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(isZh ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isZh ? '价格预警' : 'Price Alerts'}
            </h3>
            <p className="text-sm text-gray-500">
              {isZh ? `${activeAlerts.length} 个活跃预警` : `${activeAlerts.length} active alerts`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!hasNotificationPermission && (
            <button
              onClick={handleRequestPermission}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <BellRing className="w-4 h-4" />
              {isZh ? '启用通知' : 'Enable Notifications'}
            </button>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showHistory
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <History className="w-4 h-4" />
            {isZh ? '历史' : 'History'}
            {unacknowledgedHistory.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {unacknowledgedHistory.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {isZh ? '添加' : 'Add'}
          </button>
        </div>
      </div>

      {/* Add Alert Form */}
      {showAddForm && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Symbol Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isZh ? '资产' : 'Asset'}
                </label>
                <select
                  value={newAlert.symbol}
                  onChange={(e) => setNewAlert({ ...newAlert, symbol: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {DEFAULT_ALERT_SYMBOLS.map((symbol) => (
                    <option key={symbol} value={symbol}>
                      {symbol}
                    </option>
                  ))}
                </select>
              </div>

              {/* Alert Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isZh ? '预警类型' : 'Alert Type'}
                </label>
                <select
                  value={newAlert.type}
                  onChange={(e) =>
                    setNewAlert({
                      ...newAlert,
                      type: e.target.value as AlertType,
                      condition: getAlertConditionOptions(e.target.value as AlertType)[0].value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="price">{isZh ? '价格预警' : 'Price Alert'}</option>
                  <option value="change">{isZh ? '涨跌幅预警' : 'Change Alert'}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isZh ? '条件' : 'Condition'}
                </label>
                <select
                  value={newAlert.condition}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, condition: e.target.value as AlertCondition })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {getAlertConditionOptions(newAlert.type).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {newAlert.type === 'price'
                    ? isZh
                      ? '价格阈值'
                      : 'Price Threshold'
                    : isZh
                      ? '百分比阈值 (%)'
                      : 'Percentage Threshold (%)'}
                </label>
                <input
                  type="number"
                  value={newAlert.threshold}
                  onChange={(e) => setNewAlert({ ...newAlert, threshold: e.target.value })}
                  placeholder={newAlert.type === 'price' ? '50000' : '5'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Notification Options */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newAlert.notifyBrowser}
                  onChange={(e) => setNewAlert({ ...newAlert, notifyBrowser: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex items-center gap-1">
                  <BellRing className="w-4 h-4" />
                  {isZh ? '浏览器通知' : 'Browser Notification'}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newAlert.notifySound}
                  onChange={(e) => setNewAlert({ ...newAlert, notifySound: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex items-center gap-1">
                  <Volume2 className="w-4 h-4" />
                  {isZh ? '提示音' : 'Sound Alert'}
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                {isZh ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={handleAddAlert}
                disabled={!newAlert.threshold || parseFloat(newAlert.threshold) <= 0}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isZh ? '添加预警' : 'Add Alert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 max-h-64 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">
              {isZh ? '预警历史' : 'Alert History'}
            </h4>
            {history.length > 0 && (
              <button onClick={onClearHistory} className="text-xs text-red-600 hover:text-red-700">
                {isZh ? '清空历史' : 'Clear History'}
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              {isZh ? '暂无预警历史' : 'No alert history'}
            </p>
          ) : (
            <div className="space-y-2">
              {[...history].reverse().map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    item.acknowledged ? 'bg-gray-100' : 'bg-white border border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded ${
                        item.type === 'price'
                          ? item.condition === 'above'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                          : item.condition === 'increase_by'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {item.type === 'price' ? (
                        item.condition === 'above' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )
                      ) : item.condition === 'increase_by' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.symbol} - {formatAlertType(item.type)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatAlertCondition(item.condition, item.type)} {item.threshold}
                        {item.type === 'change' && '%'} → {item.triggeredValue.toFixed(2)}
                        {item.type === 'change' && '%'}
                      </p>
                      <p className="text-xs text-gray-400">{formatTime(item.triggeredAt)}</p>
                    </div>
                  </div>
                  {!item.acknowledged && (
                    <button
                      onClick={() => onAcknowledgeHistory(item.id)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alert List */}
      <div className="px-6 py-4">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{isZh ? '暂无预警规则' : 'No alert rules configured'}</p>
            <p className="text-sm text-gray-400 mt-1">
              {isZh ? '点击上方添加按钮创建预警' : 'Click the Add button to create an alert'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Active Alerts */}
            {activeAlerts.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {isZh ? '活跃预警' : 'Active Alerts'}
                </h4>
                <div className="space-y-2">
                  {activeAlerts.map((alert) => (
                    <AlertItem
                      key={alert.id}
                      alert={alert}
                      onToggle={() => onToggleAlert(alert.id)}
                      onRemove={() => onRemoveAlert(alert.id)}
                      isZh={isZh}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Inactive Alerts */}
            {inactiveAlerts.length > 0 && (
              <div className={activeAlerts.length > 0 ? 'mt-4' : ''}>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {isZh ? '已暂停' : 'Paused'}
                </h4>
                <div className="space-y-2 opacity-60">
                  {inactiveAlerts.map((alert) => (
                    <AlertItem
                      key={alert.id}
                      alert={alert}
                      onToggle={() => onToggleAlert(alert.id)}
                      onRemove={() => onRemoveAlert(alert.id)}
                      isZh={isZh}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Templates */}
      {alerts.length === 0 && !showAddForm && (
        <div className="px-6 pb-6">
          <p className="text-sm text-gray-500 mb-3">{isZh ? '快速模板' : 'Quick Templates'}</p>
          <div className="grid grid-cols-2 gap-2">
            {ALERT_TEMPLATES.map((template) => (
              <button
                key={template.name}
                onClick={() => {
                  setNewAlert({
                    symbol: DEFAULT_ALERT_SYMBOLS[0],
                    type: template.type,
                    condition: template.condition,
                    threshold: '',
                    notifyBrowser: true,
                    notifySound: false,
                  });
                  setShowAddForm(true);
                }}
                className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{template.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Alert Item Component
interface AlertItemProps {
  alert: PriceAlert;
  onToggle: () => void;
  onRemove: () => void;
  isZh: boolean;
}

function AlertItem({ alert, onToggle, onRemove, isZh }: AlertItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={onToggle}
          className={`p-1.5 rounded transition-colors ${
            alert.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
          }`}
        >
          {alert.isActive ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{alert.symbol}</span>
            <span className="text-xs text-gray-500">{formatAlertType(alert.type)}</span>
          </div>
          <p className="text-sm text-gray-600">
            {formatAlertCondition(alert.condition, alert.type)} {alert.threshold}
            {alert.type === 'change' && '%'}
          </p>
          {alert.triggeredCount > 0 && (
            <p className="text-xs text-gray-400">
              {isZh ? '已触发' : 'Triggered'} {alert.triggeredCount} {isZh ? '次' : 'times'}
              {alert.triggeredAt && ` · ${new Date(alert.triggeredAt).toLocaleDateString()}`}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {alert.notifyBrowser && (
          <span title="Browser notification">
            <BellRing className="w-4 h-4 text-gray-400" />
          </span>
        )}
        {alert.notifySound && (
          <span title="Sound alert">
            <Volume2 className="w-4 h-4 text-gray-400" />
          </span>
        )}
        <button
          onClick={onRemove}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
