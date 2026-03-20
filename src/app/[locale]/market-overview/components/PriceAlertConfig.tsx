'use client';

import { useState } from 'react';
import { PriceAlert } from '../types';
import { useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';
import { SegmentedControl } from '@/components/ui/selectors';
import {
  Bell,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Mail,
  MessageSquare,
  Smartphone,
  Check,
} from 'lucide-react';

interface PriceAlertConfigProps {
  alerts: PriceAlert[];
  onAddAlert?: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onRemoveAlert?: (id: string) => void;
  onToggleAlert?: (id: string, enabled: boolean) => void;
}

export default function PriceAlertConfig({
  alerts,
  onAddAlert,
  onRemoveAlert,
  onToggleAlert,
}: PriceAlertConfigProps) {
  const locale = useLocale();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAlert, setNewAlert] = useState<{
    asset: string;
    type: 'above' | 'below';
    price: string;
    channels: PriceAlert['channels'];
  }>({
    asset: '',
    type: 'above',
    price: '',
    channels: ['email'],
  });

  const typeOptions = [
    { value: 'above' as const, label: isChineseLocale(locale) ? '高于' : 'Above' },
    { value: 'below' as const, label: isChineseLocale(locale) ? '低于' : 'Below' },
  ];

  const handleAddAlert = () => {
    if (!newAlert.asset || !newAlert.price) return;

    onAddAlert?.({
      asset: newAlert.asset.toUpperCase(),
      type: newAlert.type,
      price: parseFloat(newAlert.price),
      enabled: true,
      channels: newAlert.channels,
    });

    setNewAlert({
      asset: '',
      type: 'above',
      price: '',
      channels: ['email'],
    });
    setShowAddForm(false);
  };

  const toggleChannel = (channel: PriceAlert['channels'][0]) => {
    setNewAlert((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const getChannelIcon = (channel: PriceAlert['channels'][0]) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-3 h-3" />;
      case 'push':
        return <Smartphone className="w-3 h-3" />;
      case 'webhook':
        return <MessageSquare className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">
            {isChineseLocale(locale) ? '价格警报' : 'Price Alerts'} ({alerts.length})
          </span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-2.5 py-1 bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          {isChineseLocale(locale) ? '添加' : 'Add'}
        </button>
      </div>

      {showAddForm && (
        <div className="py-3 border-t border-gray-100">
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder={isChineseLocale(locale) ? '资产 (如: BTC)' : 'Asset (e.g., BTC)'}
                value={newAlert.asset}
                onChange={(e) => setNewAlert({ ...newAlert, asset: e.target.value })}
                className="px-2 py-1.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <SegmentedControl
                options={typeOptions}
                value={newAlert.type}
                onChange={(value) => setNewAlert({ ...newAlert, type: value as 'above' | 'below' })}
                size="sm"
              />
              <input
                type="number"
                placeholder={isChineseLocale(locale) ? '价格' : 'Price'}
                value={newAlert.price}
                onChange={(e) => setNewAlert({ ...newAlert, price: e.target.value })}
                className="px-2 py-1.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {isChineseLocale(locale) ? '通知方式:' : 'Notify via:'}
              </span>
              <div className="flex gap-1.5">
                {(['email', 'push', 'webhook'] as const).map((channel) => (
                  <button
                    key={channel}
                    onClick={() => toggleChannel(channel)}
                    className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors ${
                      newAlert.channels.includes(channel)
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {getChannelIcon(channel)}
                    {channel === 'email' && (isChineseLocale(locale) ? '邮件' : 'Email')}
                    {channel === 'push' && (isChineseLocale(locale) ? '推送' : 'Push')}
                    {channel === 'webhook' && 'Webhook'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddAlert}
                disabled={!newAlert.asset || !newAlert.price}
                className="flex-1 px-3 py-1.5 bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isChineseLocale(locale) ? '保存' : 'Save'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
              >
                {isChineseLocale(locale) ? '取消' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-center justify-between py-2.5 px-3 border ${
              alert.enabled ? 'bg-gray-50 border-gray-200' : 'bg-gray-50/50 border-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleAlert?.(alert.id, !alert.enabled)}
                className={`w-4 h-4 border flex items-center justify-center transition-colors ${
                  alert.enabled
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {alert.enabled && <Check className="w-3 h-3" />}
              </button>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-900 text-sm">{alert.asset}</span>
                  {alert.type === 'above' ? (
                    <TrendingUp className="w-3 h-3 text-success-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-danger-500" />
                  )}
                  <span className="text-sm text-gray-600">
                    {alert.type === 'above'
                      ? isChineseLocale(locale)
                        ? '高于'
                        : 'above'
                      : isChineseLocale(locale)
                        ? '低于'
                        : 'below'}
                  </span>
                  <span className="font-medium text-gray-900 text-sm">
                    ${alert.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {alert.channels.map((channel) => (
                    <span key={channel} className="flex items-center gap-0.5 text-xs text-gray-500">
                      {getChannelIcon(channel)}
                    </span>
                  ))}
                  <span className="text-xs text-gray-400">
                    {new Date(alert.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onRemoveAlert?.(alert.id)}
              className="p-1.5 text-gray-400 hover:text-danger-500 hover:bg-danger-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {alerts.length === 0 && !showAddForm && (
        <div className="text-center py-6">
          <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            {isChineseLocale(locale) ? '暂无价格警报' : 'No price alerts'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isChineseLocale(locale) ? '点击添加按钮创建新警报' : 'Click add button to create one'}
          </p>
        </div>
      )}
    </div>
  );
}
