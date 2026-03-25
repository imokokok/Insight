'use client';

import { useState } from 'react';
import { ScheduledExport } from '../types';
import { useTranslations } from '@/i18n';
import { Calendar, Mail, Trash2, Plus, Check, Repeat } from 'lucide-react';
import { SegmentedControl, DropdownSelect, MultiSelect } from '@/components/ui';

interface ScheduledExportConfigProps {
  schedules: ScheduledExport[];
  onAddSchedule?: (
    schedule: Omit<ScheduledExport, 'id' | 'createdAt' | 'updatedAt' | 'lastRun' | 'nextRun'>
  ) => void;
  onRemoveSchedule?: (id: string) => void;
  onToggleSchedule?: (id: string, enabled: boolean) => void;
}

export default function ScheduledExportConfig({
  schedules,
  onAddSchedule,
  onRemoveSchedule,
  onToggleSchedule,
}: ScheduledExportConfigProps) {
  const t = useTranslations();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState<{
    name: string;
    frequency: ScheduledExport['frequency'];
    time: string;
    email: string;
    format: ScheduledExport['format'];
  }>({
    name: '',
    frequency: 'daily',
    time: '09:00',
    email: '',
    format: 'csv',
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
      daily: t('marketOverview.scheduledExport.frequency.daily'),
      weekly: t('marketOverview.scheduledExport.frequency.weekly'),
      monthly: t('marketOverview.scheduledExport.frequency.monthly'),
    };
    return labels[frequency];
  };

  const getStatusColor = (schedule: ScheduledExport) => {
    if (!schedule.enabled) return 'bg-gray-100 text-gray-500';
    if (schedule.lastRunStatus === 'success') return 'bg-success-50 text-success-700';
    if (schedule.lastRunStatus === 'failed') return 'bg-danger-50 text-danger-700';
    return 'bg-primary-50 text-primary-700';
  };

  return (
    <div className="space-y-3">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">
            {t('marketOverview.scheduledExport.title')} ({schedules.length})
          </span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-2.5 py-1 bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('marketOverview.scheduledExport.add')}
        </button>
      </div>

      {/* 添加表单 */}
      {showAddForm && (
        <div className="py-3 border-t border-gray-100">
          <div className="space-y-2">
            <input
              type="text"
              placeholder={t('marketOverview.scheduledExport.scheduleName')}
              value={newSchedule.name}
              onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <SegmentedControl
                options={[
                  { value: 'daily', label: t('marketOverview.scheduledExport.frequency.daily') },
                  { value: 'weekly', label: t('marketOverview.scheduledExport.frequency.weekly') },
                  {
                    value: 'monthly',
                    label: t('marketOverview.scheduledExport.frequency.monthly'),
                  },
                ]}
                value={newSchedule.frequency}
                onChange={(value) =>
                  setNewSchedule({
                    ...newSchedule,
                    frequency: value as ScheduledExport['frequency'],
                  })
                }
                size="sm"
              />
              <input
                type="time"
                value={newSchedule.time}
                onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                className="px-2 py-1.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <input
              type="email"
              placeholder={t('marketOverview.scheduledExport.email')}
              value={newSchedule.email}
              onChange={(e) => setNewSchedule({ ...newSchedule, email: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex gap-2">
              <SegmentedControl
                options={[
                  { value: 'csv', label: 'CSV' },
                  { value: 'json', label: 'JSON' },
                  { value: 'xlsx', label: 'Excel' },
                ]}
                value={newSchedule.format}
                onChange={(value) =>
                  setNewSchedule({
                    ...newSchedule,
                    format: value as ScheduledExport['format'],
                  })
                }
                size="sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddSchedule}
                disabled={!newSchedule.name || !newSchedule.email}
                className="flex-1 px-3 py-1.5 bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {t('marketOverview.scheduledExport.save')}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
              >
                {t('marketOverview.scheduledExport.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 计划列表 */}
      <div className="space-y-1.5">
        {schedules.map((schedule) => (
          <div key={schedule.id} className={`py-2.5 px-3 border ${getStatusColor(schedule)}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <button
                  onClick={() => onToggleSchedule?.(schedule.id, !schedule.enabled)}
                  className={`w-4 h-4 border flex items-center justify-center transition-colors mt-0.5 ${
                    schedule.enabled
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'border-gray-300 hover:border-gray-400 bg-white'
                  }`}
                >
                  {schedule.enabled && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-900 text-sm">{schedule.name}</span>
                    <span className="px-1.5 py-0.5 bg-white/60 text-xs text-gray-600">
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
                      {t('marketOverview.scheduledExport.lastRun')}:{' '}
                      {new Date(schedule.lastRun).toLocaleDateString()}
                      {schedule.lastRunStatus && (
                        <span
                          className={`ml-1 ${
                            schedule.lastRunStatus === 'success' ? 'text-success-600' : 'text-danger-600'
                          }`}
                        >
                          (
                          {schedule.lastRunStatus === 'success'
                            ? t('marketOverview.scheduledExport.success')
                            : t('marketOverview.scheduledExport.failed')}
                          )
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => onRemoveSchedule?.(schedule.id)}
                className="p-1.5 text-gray-400 hover:text-danger-500 hover:bg-danger-50 transition-colors ml-2"
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
          <p className="text-gray-500 text-sm">{t('marketOverview.scheduledExport.noSchedules')}</p>
          <p className="text-xs text-gray-400 mt-1">
            {t('marketOverview.scheduledExport.createSchedule')}
          </p>
        </div>
      )}
    </div>
  );
}
