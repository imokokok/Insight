/**
 * Scheduled Export Module
 *
 * 提供定时导出功能，包括定时任务管理、本地存储配置、导出历史记录等。
 */

import { ExportConfig, ExportFormat } from './exportConfig';
import { createLogger } from '@/lib/utils/logger';
import { isChineseLocale } from '@/i18n/routing';

const logger = createLogger('ScheduledExport');

/**
 * 定时导出频率
 */
export type ExportFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly';

/**
 * 定时导出任务
 */
export interface ScheduledExportTask {
  id: string;
  name: string;
  nameZh: string;
  description?: string;
  descriptionZh?: string;
  config: ExportConfig;
  frequency: ExportFrequency;
  enabled: boolean;
  lastRunAt?: number;
  nextRunAt?: number;
  runCount: number;
  createdAt: number;
  updatedAt: number;
  notifyOnComplete: boolean;
  emailNotification?: string;
}

/**
 * 导出历史记录
 */
export interface ExportHistory {
  id: string;
  taskId?: string;
  taskName?: string;
  config: ExportConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  fileName?: string;
  fileSize?: number;
  recordCount?: number;
  error?: string;
  downloadUrl?: string;
}

/**
 * 定时导出设置
 */
export interface ScheduledExportSettings {
  enabled: boolean;
  defaultFrequency: ExportFrequency;
  maxHistoryItems: number;
  autoCleanup: boolean;
  cleanupAfterDays: number;
}

/**
 * 默认设置
 */
export const DEFAULT_SCHEDULED_EXPORT_SETTINGS: ScheduledExportSettings = {
  enabled: true,
  defaultFrequency: 'daily',
  maxHistoryItems: 100,
  autoCleanup: true,
  cleanupAfterDays: 30,
};

/**
 * 频率选项
 */
export const FREQUENCY_OPTIONS: { value: ExportFrequency; label: string; labelZh: string }[] = [
  { value: 'hourly', label: 'Hourly', labelZh: '每小时' },
  { value: 'daily', label: 'Daily', labelZh: '每天' },
  { value: 'weekly', label: 'Weekly', labelZh: '每周' },
  { value: 'monthly', label: 'Monthly', labelZh: '每月' },
];

/**
 * 创建定时导出任务
 */
export function createScheduledExportTask(
  config: ExportConfig,
  frequency: ExportFrequency,
  options?: {
    name?: string;
    nameZh?: string;
    description?: string;
    descriptionZh?: string;
    notifyOnComplete?: boolean;
    emailNotification?: string;
  }
): ScheduledExportTask {
  const now = Date.now();
  const nextRunAt = calculateNextRunTime(now, frequency);

  return {
    id: `task-${now}`,
    name: options?.name || `Scheduled Export - ${frequency}`,
    nameZh: options?.nameZh || `定时导出 - ${getFrequencyLabel(frequency, 'zh-CN')}`,
    description: options?.description,
    descriptionZh: options?.descriptionZh,
    config,
    frequency,
    enabled: true,
    nextRunAt,
    runCount: 0,
    createdAt: now,
    updatedAt: now,
    notifyOnComplete: options?.notifyOnComplete ?? false,
    emailNotification: options?.emailNotification,
  };
}

/**
 * 计算下次运行时间
 */
export function calculateNextRunTime(fromTime: number, frequency: ExportFrequency): number {
  const date = new Date(fromTime);

  switch (frequency) {
    case 'hourly':
      date.setHours(date.getHours() + 1, 0, 0, 0);
      break;
    case 'daily':
      date.setDate(date.getDate() + 1);
      date.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      date.setDate(date.getDate() + (7 - date.getDay()));
      date.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1, 1);
      date.setHours(0, 0, 0, 0);
      break;
  }

  return date.getTime();
}

/**
 * 更新任务下次运行时间
 */
export function updateTaskNextRunTime(task: ScheduledExportTask): ScheduledExportTask {
  const now = Date.now();
  return {
    ...task,
    lastRunAt: now,
    nextRunAt: calculateNextRunTime(now, task.frequency),
    runCount: task.runCount + 1,
    updatedAt: now,
  };
}

/**
 * 获取频率标签
 */
export function getFrequencyLabel(frequency: ExportFrequency, locale: string = 'en'): string {
  const option = FREQUENCY_OPTIONS.find((o) => o.value === frequency);
  if (!option) return frequency;
  return isChineseLocale(locale) ? option.labelZh : option.label;
}

/**
 * 检查任务是否应该运行
 */
export function shouldRunTask(task: ScheduledExportTask): boolean {
  if (!task.enabled) return false;
  if (!task.nextRunAt) return false;
  return Date.now() >= task.nextRunAt;
}

/**
 * 创建导出历史记录
 */
export function createExportHistory(
  config: ExportConfig,
  taskId?: string,
  taskName?: string
): ExportHistory {
  const now = Date.now();
  return {
    id: `history-${now}`,
    taskId,
    taskName,
    config,
    status: 'pending',
    startedAt: now,
  };
}

/**
 * 更新导出历史状态
 */
export function updateExportHistory(
  history: ExportHistory,
  updates: Partial<ExportHistory>
): ExportHistory {
  return {
    ...history,
    ...updates,
    completedAt:
      updates.status === 'completed' || updates.status === 'failed'
        ? Date.now()
        : history.completedAt,
  };
}

/**
 * 从 localStorage 加载定时导出任务
 */
export function loadScheduledTasksFromStorage(): ScheduledExportTask[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem('oracle_scheduled_export_tasks');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.error(
      'Failed to load scheduled tasks from storage',
      error instanceof Error ? error : new Error(String(error))
    );
  }
  return [];
}

/**
 * 保存定时导出任务到 localStorage
 */
export function saveScheduledTasksToStorage(tasks: ScheduledExportTask[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('oracle_scheduled_export_tasks', JSON.stringify(tasks));
  } catch (error) {
    logger.error(
      'Failed to save scheduled tasks to storage',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * 从 localStorage 加载导出历史
 */
export function loadExportHistoryFromStorage(): ExportHistory[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem('oracle_export_history');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.error(
      'Failed to load export history from storage',
      error instanceof Error ? error : new Error(String(error))
    );
  }
  return [];
}

/**
 * 保存导出历史到 localStorage
 */
export function saveExportHistoryToStorage(history: ExportHistory[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('oracle_export_history', JSON.stringify(history));
  } catch (error) {
    logger.error(
      'Failed to save export history to storage',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * 从 localStorage 加载定时导出设置
 */
export function loadScheduledExportSettings(): ScheduledExportSettings {
  if (typeof window === 'undefined') return DEFAULT_SCHEDULED_EXPORT_SETTINGS;

  try {
    const stored = localStorage.getItem('oracle_scheduled_export_settings');
    if (stored) {
      return { ...DEFAULT_SCHEDULED_EXPORT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    logger.error(
      'Failed to load scheduled export settings',
      error instanceof Error ? error : new Error(String(error))
    );
  }
  return DEFAULT_SCHEDULED_EXPORT_SETTINGS;
}

/**
 * 保存定时导出设置到 localStorage
 */
export function saveScheduledExportSettings(settings: ScheduledExportSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('oracle_scheduled_export_settings', JSON.stringify(settings));
  } catch (error) {
    logger.error(
      'Failed to save scheduled export settings',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * 添加定时导出任务
 */
export function addScheduledTask(
  tasks: ScheduledExportTask[],
  newTask: ScheduledExportTask
): ScheduledExportTask[] {
  return [...tasks, newTask];
}

/**
 * 更新定时导出任务
 */
export function updateScheduledTask(
  tasks: ScheduledExportTask[],
  taskId: string,
  updates: Partial<ScheduledExportTask>
): ScheduledExportTask[] {
  return tasks.map((task) =>
    task.id === taskId ? { ...task, ...updates, updatedAt: Date.now() } : task
  );
}

/**
 * 删除定时导出任务
 */
export function removeScheduledTask(
  tasks: ScheduledExportTask[],
  taskId: string
): ScheduledExportTask[] {
  return tasks.filter((task) => task.id !== taskId);
}

/**
 * 切换任务启用状态
 */
export function toggleTaskEnabled(
  tasks: ScheduledExportTask[],
  taskId: string
): ScheduledExportTask[] {
  return tasks.map((task) =>
    task.id === taskId ? { ...task, enabled: !task.enabled, updatedAt: Date.now() } : task
  );
}

/**
 * 添加导出历史记录
 */
export function addExportHistory(
  history: ExportHistory[],
  newHistory: ExportHistory,
  maxItems: number = 100
): ExportHistory[] {
  const updated = [newHistory, ...history];
  return updated.slice(0, maxItems);
}

/**
 * 删除导出历史记录
 */
export function removeExportHistory(history: ExportHistory[], historyId: string): ExportHistory[] {
  return history.filter((h) => h.id !== historyId);
}

/**
 * 清理旧的导出历史
 */
export function cleanupExportHistory(
  history: ExportHistory[],
  maxAgeDays: number = 30
): ExportHistory[] {
  const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  return history.filter((h) => h.startedAt > cutoffTime);
}

/**
 * 获取待运行的任务
 */
export function getPendingTasks(tasks: ScheduledExportTask[]): ScheduledExportTask[] {
  return tasks.filter(shouldRunTask);
}

/**
 * 获取任务统计
 */
export function getTaskStatistics(tasks: ScheduledExportTask[], history: ExportHistory[]) {
  const totalTasks = tasks.length;
  const enabledTasks = tasks.filter((t) => t.enabled).length;
  const totalRuns = tasks.reduce((sum, t) => sum + t.runCount, 0);

  const completedExports = history.filter((h) => h.status === 'completed').length;
  const failedExports = history.filter((h) => h.status === 'failed').length;
  const pendingExports = history.filter(
    (h) => h.status === 'pending' || h.status === 'running'
  ).length;

  const lastExport = history.find((h) => h.status === 'completed');
  const nextScheduledRun = tasks
    .filter((t) => t.enabled && t.nextRunAt)
    .sort((a, b) => (a.nextRunAt || 0) - (b.nextRunAt || 0))[0]?.nextRunAt;

  return {
    totalTasks,
    enabledTasks,
    disabledTasks: totalTasks - enabledTasks,
    totalRuns,
    completedExports,
    failedExports,
    pendingExports,
    lastExportTime: lastExport?.completedAt,
    nextScheduledRun,
  };
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化持续时间
 */
export function formatDuration(startTime: number, endTime: number): string {
  const duration = endTime - startTime;
  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
  return `${(duration / 60000).toFixed(1)}m`;
}

/**
 * 导出历史过滤器
 */
export interface ExportHistoryFilter {
  status?: ExportHistory['status'];
  taskId?: string;
  dateFrom?: number;
  dateTo?: number;
  format?: ExportFormat;
}

/**
 * 过滤导出历史
 */
export function filterExportHistory(
  history: ExportHistory[],
  filter: ExportHistoryFilter
): ExportHistory[] {
  return history.filter((h) => {
    if (filter.status && h.status !== filter.status) return false;
    if (filter.taskId && h.taskId !== filter.taskId) return false;
    if (filter.dateFrom && h.startedAt < filter.dateFrom) return false;
    if (filter.dateTo && h.startedAt > filter.dateTo) return false;
    if (filter.format && h.config.format !== filter.format) return false;
    return true;
  });
}

/**
 * 排序导出历史
 */
export type ExportHistorySortField = 'startedAt' | 'completedAt' | 'fileSize' | 'recordCount';
export type ExportHistorySortOrder = 'asc' | 'desc';

export interface ExportHistorySort {
  field: ExportHistorySortField;
  order: ExportHistorySortOrder;
}

/**
 * 排序导出历史
 */
export function sortExportHistory(
  history: ExportHistory[],
  sort: ExportHistorySort
): ExportHistory[] {
  return [...history].sort((a, b) => {
    let aValue: number | undefined;
    let bValue: number | undefined;

    switch (sort.field) {
      case 'startedAt':
        aValue = a.startedAt;
        bValue = b.startedAt;
        break;
      case 'completedAt':
        aValue = a.completedAt;
        bValue = b.completedAt;
        break;
      case 'fileSize':
        aValue = a.fileSize;
        bValue = b.fileSize;
        break;
      case 'recordCount':
        aValue = a.recordCount;
        bValue = b.recordCount;
        break;
    }

    if (aValue === undefined && bValue === undefined) return 0;
    if (aValue === undefined) return sort.order === 'asc' ? 1 : -1;
    if (bValue === undefined) return sort.order === 'asc' ? -1 : 1;

    return sort.order === 'asc' ? aValue - bValue : bValue - aValue;
  });
}

/**
 * 定时导出管理器 Hook 返回类型
 */
export interface UseScheduledExportReturn {
  tasks: ScheduledExportTask[];
  history: ExportHistory[];
  settings: ScheduledExportSettings;
  statistics: ReturnType<typeof getTaskStatistics>;

  // 任务操作
  addTask: (task: ScheduledExportTask) => void;
  updateTask: (taskId: string, updates: Partial<ScheduledExportTask>) => void;
  removeTask: (taskId: string) => void;
  toggleTask: (taskId: string) => void;
  runTaskNow: (taskId: string) => Promise<void>;

  // 历史操作
  clearHistory: () => void;
  removeHistoryItem: (historyId: string) => void;
  filterHistory: (filter: ExportHistoryFilter) => ExportHistory[];
  sortHistory: (sort: ExportHistorySort) => ExportHistory[];

  // 设置操作
  updateSettings: (settings: Partial<ScheduledExportSettings>) => void;

  // 工具函数
  getPendingTasks: () => ScheduledExportTask[];
  formatFileSize: (bytes: number) => string;
  formatDuration: (startTime: number, endTime: number) => string;
}
