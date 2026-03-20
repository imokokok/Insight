'use client';

/**
 * 导出历史记录面板
 *
 * 显示导出历史列表，支持重新下载
 */

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import {
  X,
  Download,
  Trash2,
  FileSpreadsheet,
  FileJson,
  FileText,
  Table,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { ExportFormat } from './types';
import { useExportHistory } from './useExportHistory';

interface ExportHistoryPanelProps {
  onClose: () => void;
  dataSource: string;
}

// 格式图标映射
const formatIcons: Record<ExportFormat, React.ReactNode> = {
  csv: <Table className="w-4 h-4" />,
  json: <FileJson className="w-4 h-4" />,
  excel: <FileSpreadsheet className="w-4 h-4" />,
  pdf: <FileText className="w-4 h-4" />,
};

// 格式颜色映射
const formatColors: Record<ExportFormat, string> = {
  csv: 'text-success-600 bg-success-50',
  json: 'text-primary-600 bg-primary-50',
  excel: 'text-emerald-600 bg-emerald-50',
  pdf: 'text-danger-600 bg-danger-50',
};

export function ExportHistoryPanel({ onClose, dataSource: _dataSource }: ExportHistoryPanelProps) {
  const t = useTranslations('unifiedExport.history');
  const locale = useLocale();
  const isZh = locale === 'zh-CN';

  const {
    history,
    removeHistoryItem,
    clearHistory,
    formatFileSize: formatSize,
  } = useExportHistory();
  const [filter, setFilter] = useState<ExportFormat | 'all'>('all');

  // 过滤历史记录
  const filteredHistory = history.filter((item) => {
    if (filter !== 'all' && item.format !== filter) return false;
    return true;
  });

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 处理重新下载
  const handleReDownload = (item: (typeof history)[0]) => {
    // 重新下载逻辑 - 实际应用中可能需要重新生成文件
    console.log('Re-downloading:', item.fileName);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ duration: 0.2 }}
      className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-900">{t('title')}</h2>
          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
            {filteredHistory.length}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 过滤器 */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex gap-2">
          {(['all', 'csv', 'json', 'excel', 'pdf'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? t('all') : f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 历史列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Clock className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">{t('noHistory')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredHistory.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {/* 格式图标 */}
                    <div className={`p-2 rounded ${formatColors[item.format]}`}>
                      {formatIcons[item.format]}
                    </div>

                    {/* 文件信息 */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.fileName}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{formatTime(item.createdAt)}</span>
                        <span>·</span>
                        <span>{formatSize(item.fileSize)}</span>
                        <span>·</span>
                        <span>
                          {item.recordCount} {isZh ? '条记录' : 'records'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {item.status === 'completed' ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-success-500" />
                            <span className="text-xs text-success-600">{t('completed')}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-danger-500" />
                            <span className="text-xs text-danger-600">{t('failed')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.status === 'completed' && (
                      <button
                        onClick={() => handleReDownload(item)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title={t('reDownload')}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => removeHistoryItem(item.id)}
                      className="p-1.5 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
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

      {/* 底部操作 */}
      {filteredHistory.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200">
          <button
            onClick={clearHistory}
            className="w-full px-4 py-2 text-sm font-medium text-danger-600 bg-danger-50 hover:bg-danger-100 transition-colors rounded"
          >
            {t('clearAll')}
          </button>
        </div>
      )}
    </motion.div>
  );
}
