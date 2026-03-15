'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ScheduledExportTask,
  ExportHistory,
  ExportFrequency,
  createScheduledExportTask,
  updateTaskNextRunTime,
  getFrequencyLabel,
  shouldRunTask,
  createExportHistory,
  updateExportHistory,
  loadScheduledTasksFromStorage,
  saveScheduledTasksToStorage,
  loadExportHistoryFromStorage,
  saveExportHistoryToStorage,
  loadScheduledExportSettings,
  saveScheduledExportSettings,
  addScheduledTask,
  updateScheduledTask,
  removeScheduledTask,
  toggleTaskEnabled,
  addExportHistory,
  removeExportHistory,
  cleanupExportHistory,
  getPendingTasks,
  getTaskStatistics,
  formatFileSize,
  formatDuration,
  filterExportHistory,
  sortExportHistory,
  FREQUENCY_OPTIONS,
  DEFAULT_SCHEDULED_EXPORT_SETTINGS,
  ExportHistoryFilter,
  ExportHistorySort,
} from '@/lib/export/scheduledExport';
import {
  ExportConfig,
  createDefaultExportConfig,
  getFormatLabel,
  getTimeRangeLabel,
} from '@/lib/export/exportConfig';
import {
  Clock,
  Calendar,
  Play,
  Pause,
  Trash2,
  Plus,
  History,
  Settings,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Download,
  Filter,
  Bell,
  Mail,
} from 'lucide-react';

interface ScheduledExportConfigProps {
  locale?: string;
  onRunTask?: (task: ScheduledExportTask) => Promise<void>;
  className?: string;
}

export default function ScheduledExportConfig({
  locale = 'en',
  onRunTask,
  className = '',
}: ScheduledExportConfigProps) {
  const isZh = locale === 'zh-CN';
  const t = (key: string) => {
    const translations: Record<string, { en: string; zh: string }> = {
      scheduledExport: { en: 'Scheduled Export', zh: '定时导出' },
      tasks: { en: 'Tasks', zh: '任务' },
      history: { en: 'History', zh: '历史记录' },
      settings: { en: 'Settings', zh: '设置' },
      addTask: { en: 'Add Task', zh: '添加任务' },
      taskName: { en: 'Task Name', zh: '任务名称' },
      frequency: { en: 'Frequency', zh: '频率' },
      exportConfig: { en: 'Export Configuration', zh: '导出配置' },
      enabled: { en: 'Enabled', zh: '启用' },
      disabled: { en: 'Disabled', zh: '禁用' },
      lastRun: { en: 'Last Run', zh: '上次运行' },
      nextRun: { en: 'Next Run', zh: '下次运行' },
      runCount: { en: 'Run Count', zh: '运行次数' },
      runNow: { en: 'Run Now', zh: '立即运行' },
      edit: { en: 'Edit', zh: '编辑' },
      delete: { en: 'Delete', zh: '删除' },
      noTasks: { en: 'No scheduled tasks', zh: '暂无定时任务' },
      noHistory: { en: 'No export history', zh: '暂无导出历史' },
      status: { en: 'Status', zh: '状态' },
      completed: { en: 'Completed', zh: '已完成' },
      failed: { en: 'Failed', zh: '失败' },
      pending: { en: 'Pending', zh: '等待中' },
      running: { en: 'Running', zh: '运行中' },
      records: { en: 'Records', zh: '记录数' },
      fileSize: { en: 'File Size', zh: '文件大小' },
      duration: { en: 'Duration', zh: '耗时' },
      clearHistory: { en: 'Clear History', zh: '清空历史' },
      autoCleanup: { en: 'Auto Cleanup', zh: '自动清理' },
      maxHistoryItems: { en: 'Max History Items', zh: '最大历史记录数' },
      cleanupAfterDays: { en: 'Cleanup After Days', zh: '清理天数' },
      save: { en: 'Save', zh: '保存' },
      cancel: { en: 'Cancel', zh: '取消' },
      confirmDelete: { en: 'Confirm Delete', zh: '确认删除' },
      deleteConfirmMessage: {
        en: 'Are you sure you want to delete this task?',
        zh: '确定要删除此任务吗？',
      },
      statistics: { en: 'Statistics', zh: '统计' },
      totalTasks: { en: 'Total Tasks', zh: '总任务数' },
      enabledTasks: { en: 'Enabled Tasks', zh: '启用任务数' },
      totalRuns: { en: 'Total Runs', zh: '总运行次数' },
      completedExports: { en: 'Completed Exports', zh: '完成导出数' },
      failedExports: { en: 'Failed Exports', zh: '失败导出数' },
      notifyOnComplete: { en: 'Notify on Complete', zh: '完成时通知' },
      emailNotification: { en: 'Email Notification', zh: '邮件通知' },
    };
    return translations[key]?.[isZh ? 'zh' : 'en'] || key;
  };

  const [tasks, setTasks] = useState<ScheduledExportTask[]>([]);
  const [history, setHistory] = useState<ExportHistory[]>([]);
  const [settings, setSettings] = useState(DEFAULT_SCHEDULED_EXPORT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'tasks' | 'history' | 'settings'>('tasks');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledExportTask | null>(null);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(null);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<ExportHistoryFilter>({});
  const [historySort, setHistorySort] = useState<ExportHistorySort>({
    field: 'startedAt',
    order: 'desc',
  });

  // Load data from storage on mount
  useEffect(() => {
    setTasks(loadScheduledTasksFromStorage());
    setHistory(loadExportHistoryFromStorage());
    setSettings(loadScheduledExportSettings());
  }, []);

  // Check for pending tasks periodically
  useEffect(() => {
    if (!settings.enabled) return;

    const interval = setInterval(() => {
      const pending = getPendingTasks(tasks);
      pending.forEach((task) => {
        handleRunTask(task.id);
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [tasks, settings.enabled]);

  const statistics = getTaskStatistics(tasks, history);

  const handleAddTask = (
    config: ExportConfig,
    frequency: ExportFrequency,
    name: string,
    nameZh: string
  ) => {
    const newTask = createScheduledExportTask(config, frequency, { name, nameZh });
    const updated = addScheduledTask(tasks, newTask);
    setTasks(updated);
    saveScheduledTasksToStorage(updated);
    setShowAddDialog(false);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<ScheduledExportTask>) => {
    const updated = updateScheduledTask(tasks, taskId, updates);
    setTasks(updated);
    saveScheduledTasksToStorage(updated);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = removeScheduledTask(tasks, taskId);
    setTasks(updated);
    saveScheduledTasksToStorage(updated);
    setDeleteConfirmTaskId(null);
  };

  const handleToggleTask = (taskId: string) => {
    const updated = toggleTaskEnabled(tasks, taskId);
    setTasks(updated);
    saveScheduledTasksToStorage(updated);
  };

  const handleRunTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setRunningTaskId(taskId);
    const exportHistory = createExportHistory(task.config, task.id, task.name);
    let updatedHistory = addExportHistory(history, exportHistory, settings.maxHistoryItems);
    setHistory(updatedHistory);
    saveExportHistoryToStorage(updatedHistory);

    try {
      await onRunTask?.(task);

      // Update history to completed
      updatedHistory = updatedHistory.map((h) =>
        h.id === exportHistory.id
          ? updateExportHistory(h, { status: 'completed', recordCount: 100 })
          : h
      );

      // Update task
      const updatedTasks = tasks.map((t) => (t.id === taskId ? updateTaskNextRunTime(t) : t));

      setHistory(updatedHistory);
      setTasks(updatedTasks);
      saveExportHistoryToStorage(updatedHistory);
      saveScheduledTasksToStorage(updatedTasks);
    } catch (error) {
      // Update history to failed
      updatedHistory = updatedHistory.map((h) =>
        h.id === exportHistory.id
          ? updateExportHistory(h, {
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          : h
      );
      setHistory(updatedHistory);
      saveExportHistoryToStorage(updatedHistory);
    } finally {
      setRunningTaskId(null);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    saveExportHistoryToStorage([]);
  };

  const handleUpdateSettings = (updates: Partial<typeof settings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    saveScheduledExportSettings(updated);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString(isZh ? 'zh-CN' : 'en-US');
  };

  const filteredHistory = filterExportHistory(history, historyFilter);
  const sortedHistory = sortExportHistory(filteredHistory, historySort);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">{t('scheduledExport')}</h3>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('addTask')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['tasks', 'history', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t(tab)}
          </button>
        ))}
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="p-6">
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t('noTasks')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-lg border ${
                    task.enabled ? 'border-gray-200' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {isZh ? task.nameZh : task.name}
                        </h4>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            task.enabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {task.enabled ? t('enabled') : t('disabled')}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">{t('frequency')}: </span>
                          <span className="text-gray-700">
                            {getFrequencyLabel(task.frequency, locale)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('exportConfig')}: </span>
                          <span className="text-gray-700">
                            {getFormatLabel(task.config.format, locale)} •{' '}
                            {getTimeRangeLabel(task.config.timeRange, locale)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('lastRun')}: </span>
                          <span className="text-gray-700">{formatDate(task.lastRunAt)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('nextRun')}: </span>
                          <span className="text-gray-700">{formatDate(task.nextRunAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={() => handleToggleTask(task.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          task.enabled
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={task.enabled ? t('enabled') : t('disabled')}
                      >
                        {task.enabled ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRunTask(task.id)}
                        disabled={runningTaskId === task.id}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                        title={t('runNow')}
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${runningTaskId === task.id ? 'animate-spin' : ''}`}
                        />
                      </button>
                      <button
                        onClick={() => setEditingTask(task)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title={t('edit')}
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmTaskId(task.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={historyFilter.status || ''}
                onChange={(e) =>
                  setHistoryFilter({
                    ...historyFilter,
                    status: (e.target.value as ExportHistory['status']) || undefined,
                  })
                }
                className="text-sm border border-gray-300 rounded-lg px-2 py-1"
              >
                <option value="">{isZh ? '全部状态' : 'All Status'}</option>
                <option value="completed">{t('completed')}</option>
                <option value="failed">{t('failed')}</option>
                <option value="pending">{t('pending')}</option>
                <option value="running">{t('running')}</option>
              </select>
            </div>
            <button
              onClick={handleClearHistory}
              className="text-sm text-red-600 hover:text-red-700"
            >
              {t('clearHistory')}
            </button>
          </div>

          {sortedHistory.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t('noHistory')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.status === 'completed'
                              ? 'bg-green-500'
                              : item.status === 'failed'
                                ? 'bg-red-500'
                                : item.status === 'running'
                                  ? 'bg-blue-500'
                                  : 'bg-yellow-500'
                          }`}
                        />
                        <span className="font-medium text-gray-900">
                          {item.taskName || (isZh ? '手动导出' : 'Manual Export')}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            item.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : item.status === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : item.status === 'running'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {t(item.status)}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">{t('status')}: </span>
                          <span className="text-gray-700">{formatDate(item.startedAt)}</span>
                        </div>
                        {item.completedAt && (
                          <div>
                            <span className="text-gray-500">{t('completed')}: </span>
                            <span className="text-gray-700">{formatDate(item.completedAt)}</span>
                          </div>
                        )}
                        {item.recordCount !== undefined && (
                          <div>
                            <span className="text-gray-500">{t('records')}: </span>
                            <span className="text-gray-700">{item.recordCount}</span>
                          </div>
                        )}
                        {item.fileSize !== undefined && (
                          <div>
                            <span className="text-gray-500">{t('fileSize')}: </span>
                            <span className="text-gray-700">{formatFileSize(item.fileSize)}</span>
                          </div>
                        )}
                        {item.completedAt && (
                          <div>
                            <span className="text-gray-500">{t('duration')}: </span>
                            <span className="text-gray-700">
                              {formatDuration(item.startedAt, item.completedAt)}
                            </span>
                          </div>
                        )}
                      </div>
                      {item.error && (
                        <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {item.error}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const updated = removeExportHistory(history, item.id);
                        setHistory(updated);
                        saveExportHistoryToStorage(updated);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="p-6 space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{t('totalTasks')}</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalTasks}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{t('enabledTasks')}</p>
              <p className="text-2xl font-bold text-green-600">{statistics.enabledTasks}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{t('completedExports')}</p>
              <p className="text-2xl font-bold text-blue-600">{statistics.completedExports}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{t('failedExports')}</p>
              <p className="text-2xl font-bold text-red-600">{statistics.failedExports}</p>
            </div>
          </div>

          {/* Settings Form */}
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <span className="text-gray-700">{t('autoCleanup')}</span>
              <input
                type="checkbox"
                checked={settings.autoCleanup}
                onChange={(e) => handleUpdateSettings({ autoCleanup: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
            </label>

            <div className="p-4 border border-gray-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('maxHistoryItems')}
              </label>
              <input
                type="number"
                value={settings.maxHistoryItems}
                onChange={(e) =>
                  handleUpdateSettings({ maxHistoryItems: parseInt(e.target.value) || 100 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min={10}
                max={1000}
              />
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('cleanupAfterDays')}
              </label>
              <input
                type="number"
                value={settings.cleanupAfterDays}
                onChange={(e) =>
                  handleUpdateSettings({ cleanupAfterDays: parseInt(e.target.value) || 30 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min={1}
                max={365}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Task Dialog */}
      {showAddDialog && (
        <AddTaskDialog
          locale={locale}
          onClose={() => setShowAddDialog(false)}
          onAdd={handleAddTask}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmTaskId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h4 className="text-lg font-semibold text-gray-900">{t('confirmDelete')}</h4>
            </div>
            <p className="text-gray-600 mb-6">{t('deleteConfirmMessage')}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmTaskId(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleDeleteTask(deleteConfirmTaskId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add Task Dialog Component
interface AddTaskDialogProps {
  locale: string;
  onClose: () => void;
  onAdd: (config: ExportConfig, frequency: ExportFrequency, name: string, nameZh: string) => void;
}

function AddTaskDialog({ locale, onClose, onAdd }: AddTaskDialogProps) {
  const isZh = locale === 'zh-CN';
  const [name, setName] = useState('');
  const [nameZh, setNameZh] = useState('');
  const [frequency, setFrequency] = useState<ExportFrequency>('daily');
  const [config, setConfig] = useState<ExportConfig>(createDefaultExportConfig());

  const t = (key: string) => {
    const translations: Record<string, { en: string; zh: string }> = {
      addTask: { en: 'Add Scheduled Task', zh: '添加定时任务' },
      taskName: { en: 'Task Name', zh: '任务名称' },
      taskNameZh: { en: 'Task Name (Chinese)', zh: '任务名称（中文）' },
      frequency: { en: 'Frequency', zh: '频率' },
      save: { en: 'Save', zh: '保存' },
      cancel: { en: 'Cancel', zh: '取消' },
    };
    return translations[key]?.[isZh ? 'zh' : 'en'] || key;
  };

  const handleSubmit = () => {
    if (!name) return;
    onAdd(config, frequency, name, nameZh || name);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">{t('addTask')}</h4>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('taskName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder={isZh ? '输入任务名称' : 'Enter task name'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('taskNameZh')}
            </label>
            <input
              type="text"
              value={nameZh}
              onChange={(e) => setNameZh(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder={isZh ? '输入中文名称' : 'Enter Chinese name'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('frequency')}</label>
            <div className="grid grid-cols-2 gap-2">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFrequency(opt.value)}
                  className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                    frequency === opt.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {isZh ? opt.labelZh : opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isZh ? '导出配置' : 'Export Configuration'}
            </label>
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex gap-2">
                {(['csv', 'json', 'excel'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setConfig({ ...config, format: fmt })}
                    className={`px-3 py-1.5 rounded text-sm ${
                      config.format === fmt
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {(['1H', '24H', '7D', '30D', '90D'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setConfig({ ...config, timeRange: range })}
                    className={`px-3 py-1.5 rounded text-sm ${
                      config.timeRange === range
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-900">
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
