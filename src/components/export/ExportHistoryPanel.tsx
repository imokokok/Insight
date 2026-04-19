'use client';

import { motion } from 'framer-motion';
import { X, Download, Trash2, FileText, FileJson, Table, FileSpreadsheet } from 'lucide-react';

import { type ExportDataSource, type ExportHistoryItem, type ExportFormat } from './types';
import { useExportHistory } from './useExportHistory';

interface ExportHistoryPanelProps {
  onClose: () => void;
  dataSource?: ExportDataSource;
}

const formatIcons: Record<ExportFormat, React.ReactNode> = {
  csv: <Table className="w-4 h-4" />,
  json: <FileJson className="w-4 h-4" />,
  excel: <FileSpreadsheet className="w-4 h-4" />,
  pdf: <FileText className="w-4 h-4" />,
};

export function ExportHistoryPanel({ onClose, dataSource }: ExportHistoryPanelProps) {
  const { history, removeHistoryItem, clearHistory, formatFileSize, isLoading } =
    useExportHistory();

  const filteredHistory = dataSource
    ? history.filter((item) => item.dataSource === dataSource)
    : history;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US');
  };

  const handleReDownload = (item: ExportHistoryItem) => {
    if (item.downloadUrl) {
      const link = document.createElement('a');
      link.href = item.downloadUrl;
      link.download = item.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed right-4 top-16 z-50 w-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Export History</h3>
        <div className="flex items-center gap-2">
          {filteredHistory.length > 0 && (
            <button
              onClick={clearHistory}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
              title="Clear History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No export history</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredHistory.map((item) => (
              <div key={item.id} className="p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="p-1.5 bg-gray-100 rounded text-gray-600">
                      {formatIcons[item.format]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.fileName}</p>
                      <p className="text-xs text-gray-500">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">{formatFileSize(item.fileSize)}</span>
                    {item.downloadUrl && (
                      <button
                        onClick={() => handleReDownload(item)}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => removeHistoryItem(item.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
