'use client';

import { useState } from 'react';
import { ScheduledExport } from '../types';
import { useI18n } from '@/lib/i18n/provider';
import {
  Calendar,
  Clock,
  Mail,
  Trash2,
  Plus,
  Check,
  X,
  Repeat,
} from 'lucide-react';

interface ScheduledExportConfigProps {
  schedules: ScheduledExport[];
  onAddSchedule?: (schedule: Omit<ScheduledExport, 'id' | 'createdAt' | 'updatedAt' | 'lastRun' | 'nextRun'>) => void;
  onRemoveSchedule?: (id: string) => void;
  onToggleSchedule?: (id: string, enabled: boolean) => void;
}

export default function ScheduledExportConfig({
  schedules,
  onAddSchedule,
  onRemoveSchedule,
  onToggleSchedule,
}: ScheduledExportConfigProps) {
  const { locale } = useI18n();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    frequency: 'daily' as const,
    time: '09:00',
    email: '',
    format: 'csv' as const,
  });

  const handleAddSchedule = () => {
    if (!newSchedule.name || !newSchedule.email) return;

    onAddSchedule?.({
      name: newSchedule.name,
      frequency: newSchedule.frequency,
      time: newSchedule.time,
      email: newSchedule.email,
      format: newSchedule.format,
      enabled: true,
    });

    setNewSchedule({
      name: '',
      frequency: 'daily',
      time: '09:00',
      email: '',
      format: 'csv',
    });
    setShowAddForm(false);
  };

  const getFrequencyLabel = (frequency: ScheduledExport['frequency']) => {
    const labels: Record<ScheduledExport['frequency'], string> = {
      daily: locale === 'zh-CN' ? '每天' : 'Daily',
      weekly: locale === 'zh-CN' ? '每周' : 'Weekly',
      monthly: locale === 'zh-CN' ? '每月' : 'Monthly',
    };
    return labels[frequency];
  };

  const getStatusColor = (schedule: ScheduledExport) => {
    if (!schedule.enabled) return 'bg-gray-100 text-gray-500';
    if (schedule.lastRunStatus === 'success') return 'bg-green-50 text-green-700';
    if (schedule.lastRunStatus === 'failed') return 'bg-red-50 text-red-700';
    return 'bg-blue-50 text-blue-700';
  };

  return (
    <div className="space-y-3">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">
            {locale === 'zh-CN' ? '定时导出' : 'Scheduled Exports'} ({schedules.length})
          </span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          {locale === 'zh-CN' ? '添加' : 'Add'}
        </button>
      </div>

      {/* 添加表单 */}
      {showAddForm && (
        <div className="py-3 border-t border-gray-100">
          <div className="space-y-2">
            <input
              type="text"
              placeholder={locale === 'zh-CN' ? '任务名称' : 'Schedule Name'}
              value={newSchedule.name}
              onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newSchedule.frequency}
                onChange={(e) => setNewSchedule({ ...newSchedule, frequency: e.target.value as ScheduledExport['frequency'] })}
                className="px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">{locale === 'zh-CN' ? '每天' : 'Daily'}</option>
                <option value="weekly">{locale === 'zh-CN' ? '每周' : 'Weekly'}</option>
                <option value="monthly">{locale === 'zh-CN' ? '每月' : 'Monthly'}</option>
              </select>
              <input
                type="time"
                value={newSchedule.time}
                onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                className="px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="email"
              placeholder={locale === 'zh-CN' ? '接收邮箱' : 'Email Address'}
              value={newSchedule.email}
              onChange={(e) => setNewSchedule({ ...newSchedule, email: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <select
                value={newSchedule.format}
                onChange={(e) => setNewSchedule({ ...newSchedule, format: e.target.value as ScheduledExport['format'] })}
                className="px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="xlsx">Excel</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddSchedule}
                disabled={!newSchedule.name || !newSchedule.email}
                className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {locale === 'zh-CN' ? '保存' : 'Save'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-sm"
              >
                {locale === 'zh-CN' ? '取消' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 计划列表 */}
      <div className="space-y-1.5">
        {schedules.map((schedule) => (
          <div
            key={schedule.id}
            className={`py-2.5 px-3 rounded ${getStatusColor(schedule)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <button
                  onClick={() => onToggleSchedule?.(schedule.id, !schedule.enabled)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors mt-0.5 ${
                    schedule.enabled
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 hover:border-gray-400 bg-white'
                  }`}
                >
                  {schedule.enabled && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-900 text-sm">{schedule.name}</span>
                    <span className="px-1.5 py-0.5 bg-white/60 rounded text-xs text-gray-600">
                      {schedule.format.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Repeat className="w-3 h-3" />
                      {getFrequencyLabel(schedule.frequency)} {schedule.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {schedule.email}
                    </span>
                  </div>
                  {schedule.lastRun && (
                    <div className="mt-1 text-xs text-gray-500">
                      {locale === 'zh-CN' ? '上次运行:' : 'Last run:'}{' '}
                      {new Date(schedule.lastRun).toLocaleDateString()}
                      {schedule.lastRunStatus && (
                        <span
                          className={`ml-1 ${
                            schedule.lastRunStatus === 'success'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          ({schedule.lastRunStatus === 'success'
                            ? locale === 'zh-CN'
                              ? '成功'
                              : 'Success'
                            : locale === 'zh-CN'
                            ? '失败'
                            : 'Failed'})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => onRemoveSchedule?.(schedule.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors ml-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {schedules.length === 0 && !showAddForm && (
        <div className="text-center py-6">
          <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            {locale === 'zh-CN' ? '暂无定时导出任务' : 'No scheduled exports'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {locale === 'zh-CN' ? '点击添加按钮创建新任务' : 'Click add button to create one'}
          </p>
        </div>
      )}
    </div>
  );
}
