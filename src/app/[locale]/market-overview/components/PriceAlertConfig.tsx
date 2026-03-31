'use client';

import { useState, useEffect } from 'react';

import { Bell, Plus, Trash2, Edit2, X, Check, TrendingUp, TrendingDown } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type PriceAlert } from '../types';

interface PriceAlertConfigProps {
  alerts: PriceAlert[];
  onAdd: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, alert: Partial<PriceAlert>) => void;
  loading?: boolean;
}

export default function PriceAlertConfig({
  alerts,
  onAdd,
  onRemove,
  onUpdate,
  loading = false,
}: PriceAlertConfigProps) {
  const t = useTranslations('marketOverview.priceAlert');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    asset: '',
    type: 'above' as PriceAlert['type'],
    price: '',
    note: '',
  });

  // 重置表单
  const resetForm = () => {
    setFormData({
      asset: '',
      type: 'above',
      price: '',
      note: '',
    });
    setIsAdding(false);
    setEditingId(null);
  };

  // 处理提交
  const handleSubmit = () => {
    if (!formData.asset || !formData.price) return;

    const priceValue = parseFloat(formData.price);
    if (isNaN(priceValue) || priceValue <= 0) return;

    if (editingId) {
      onUpdate(editingId, {
        asset: formData.asset,
        type: formData.type,
        price: priceValue,
        note: formData.note,
        channels: ['email'],
      });
    } else {
      onAdd({
        asset: formData.asset,
        type: formData.type,
        price: priceValue,
        note: formData.note,
        enabled: true,
        channels: ['email'],
      });
    }
    resetForm();
  };

  // 开始编辑
  const startEdit = (alert: PriceAlert) => {
    setFormData({
      asset: alert.asset,
      type: alert.type,
      price: alert.price.toString(),
      note: alert.note || '',
    });
    setEditingId(alert.id);
    setIsAdding(true);
  };

  // 切换启用状态
  const toggleEnabled = (alert: PriceAlert) => {
    onUpdate(alert.id, { enabled: !alert.enabled });
  };

  // 格式化价格
  const formatPrice = (price: number) => {
    return price >= 1000 ? `$${(price / 1000).toFixed(2)}K` : `$${price.toFixed(2)}`;
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent animate-spin" />
          <span className="text-gray-500 text-sm">{t('loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {t('activeAlerts')}: {alerts.filter((a) => a.enabled).length}
          </span>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('addAlert')}
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="p-4 bg-gray-50 border border-gray-200">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('asset')}</label>
                <input
                  type="text"
                  value={formData.asset}
                  onChange={(e) =>
                    setFormData({ ...formData, asset: e.target.value.toUpperCase() })
                  }
                  placeholder={t('assetPlaceholder')}
                  className="w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('alertType')}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as PriceAlert['type'] })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="above">{t('priceAbove')}</option>
                  <option value="below">{t('priceBelow')}</option>
                  <option value="percent_change">{t('percentChange')}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {formData.type === 'percent_change' ? t('changePercent') : t('targetPrice')}
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder={formData.type === 'percent_change' ? '5' : '1000'}
                className="w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('note')} ({t('optional')})
              </label>
              <input
                type="text"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder={t('notePlaceholder')}
                className="w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSubmit}
                disabled={!formData.asset || !formData.price}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Check className="w-4 h-4" />
                {editingId ? t('update') : t('create')}
              </button>
              <button
                onClick={resetForm}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert List */}
      <div className="space-y-2 max-h-[300px] overflow-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{t('noAlerts')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('addAlertHint')}</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 border ${alert.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'} ${alert.triggered ? 'border-l-4 border-l-warning-500' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleEnabled(alert)}
                    className={`mt-0.5 w-4 h-4 border ${alert.enabled ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'} flex items-center justify-center transition-colors`}
                  >
                    {alert.enabled && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{alert.asset}</span>
                      <span
                        className={`px-1.5 py-0.5 text-xs font-medium flex items-center gap-1 ${
                          alert.type === 'above'
                            ? 'bg-success-100 text-success-700'
                            : alert.type === 'below'
                              ? 'bg-danger-100 text-danger-700'
                              : 'bg-primary-100 text-primary-700'
                        }`}
                      >
                        {alert.type === 'above' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : alert.type === 'below' ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <span>%</span>
                        )}
                        {alert.type === 'above'
                          ? t('above')
                          : alert.type === 'below'
                            ? t('below')
                            : t('change')}
                      </span>
                      {alert.triggered && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-warning-100 text-warning-700">
                          {t('triggered')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                      <span>
                        {alert.type === 'percent_change'
                          ? `${alert.price > 0 ? '+' : ''}${alert.price}%`
                          : formatPrice(alert.price)}
                      </span>
                      {alert.note && (
                        <span className="text-gray-400 truncate max-w-[150px]">{alert.note}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {t('createdAt')}: {formatTime(alert.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(alert)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onRemove(alert.id)}
                    className="p-1.5 text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      {alerts.length > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">{t('alertNote')}</p>
        </div>
      )}
    </div>
  );
}
