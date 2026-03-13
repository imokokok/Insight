'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  ExportConfig,
  ExportFormat,
  ExportTimeRange,
  ExportDataType,
  FieldGroup,
  ExportField,
  createDefaultExportConfig,
  createExportConfig,
  getFieldLabel,
  getFieldGroupLabel,
  getFormatLabel,
  getTimeRangeLabel,
  getDataTypeLabel,
  toggleFieldSelection,
  setFieldGroupSelection,
  getSelectedFields,
  validateExportConfig,
  generateExportFileName,
  loadExportConfigsFromStorage,
  saveExportConfigsToStorage,
  getTimeRangeHours,
} from '@/lib/export/exportConfig';
import {
  Download,
  Settings,
  FileText,
  Table,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Save,
  Trash2,
  Copy,
  Eye,
  Calendar,
  Clock,
  Filter,
  Columns,
  CheckSquare,
  Square,
} from 'lucide-react';

interface ExportConfigProps {
  locale?: string;
  onExport?: (config: ExportConfig) => void;
  onSaveConfig?: (config: ExportConfig) => void;
  className?: string;
}

const FORMAT_OPTIONS: ExportFormat[] = ['csv', 'json', 'excel'];
const TIME_RANGE_OPTIONS: ExportTimeRange[] = ['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'];
const DATA_TYPE_OPTIONS: ExportDataType[] = [
  'oracleMarket',
  'assets',
  'trendData',
  'chainBreakdown',
  'protocolDetails',
  'riskMetrics',
  'anomalies',
];

export default function ExportConfigComponent({
  locale = 'en',
  onExport,
  onSaveConfig,
  className = '',
}: ExportConfigProps) {
  const isZh = locale === 'zh-CN';
  const t = (key: string) => {
    const translations: Record<string, { en: string; zh: string }> = {
      exportConfig: { en: 'Export Configuration', zh: '导出配置' },
      format: { en: 'Format', zh: '格式' },
      timeRange: { en: 'Time Range', zh: '时间范围' },
      dataTypes: { en: 'Data Types', zh: '数据类型' },
      fieldSelection: { en: 'Field Selection', zh: '字段选择' },
      preview: { en: 'Preview', zh: '预览' },
      export: { en: 'Export', zh: '导出' },
      saveConfig: { en: 'Save Config', zh: '保存配置' },
      loadConfig: { en: 'Load Config', zh: '加载配置' },
      selectAll: { en: 'Select All', zh: '全选' },
      deselectAll: { en: 'Deselect All', zh: '取消全选' },
      includeMetadata: { en: 'Include Metadata', zh: '包含元数据' },
      includeTimestamp: { en: 'Include Timestamp', zh: '包含时间戳' },
      fileName: { en: 'File Name', zh: '文件名' },
      customFileName: { en: 'Custom File Name', zh: '自定义文件名' },
      autoGenerate: { en: 'Auto Generate', zh: '自动生成' },
      noFieldsSelected: { en: 'No fields selected', zh: '未选择字段' },
      selectedFields: { en: 'Selected Fields', zh: '已选字段' },
      expandAll: { en: 'Expand All', zh: '展开全部' },
      collapseAll: { en: 'Collapse All', zh: '收起全部' },
      configName: { en: 'Configuration Name', zh: '配置名称' },
      configDescription: { en: 'Description', zh: '描述' },
      savedConfigs: { en: 'Saved Configurations', zh: '已保存配置' },
      delete: { en: 'Delete', zh: '删除' },
      duplicate: { en: 'Duplicate', zh: '复制' },
      use: { en: 'Use', zh: '使用' },
      validationErrors: { en: 'Please fix the following errors', zh: '请修复以下错误' },
    };
    return translations[key]?.[isZh ? 'zh' : 'en'] || key;
  };

  const [config, setConfig] = useState<ExportConfig>(createDefaultExportConfig());
  const [savedConfigs, setSavedConfigs] = useState<ExportConfig[]>(() =>
    loadExportConfigsFromStorage()
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<ExportDataType>>(
    new Set(['oracleMarket'])
  );
  const [showPreview, setShowPreview] = useState(false);
  const [showSavedConfigs, setShowSavedConfigs] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogData, setSaveDialogData] = useState({
    name: '',
    nameZh: '',
    description: '',
    descriptionZh: '',
  });

  const toggleGroup = (groupKey: ExportDataType) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const handleFormatChange = (format: ExportFormat) => {
    setConfig((prev) => ({ ...prev, format }));
  };

  const handleTimeRangeChange = (timeRange: ExportTimeRange) => {
    setConfig((prev) => ({ ...prev, timeRange }));
  };

  const handleDataTypeToggle = (dataType: ExportDataType) => {
    setConfig((prev) => {
      const dataTypes = prev.dataTypes.includes(dataType)
        ? prev.dataTypes.filter((t) => t !== dataType)
        : [...prev.dataTypes, dataType];
      return { ...prev, dataTypes };
    });
  };

  const handleFieldToggle = (groupKey: ExportDataType, fieldKey: string) => {
    setConfig((prev) => ({
      ...prev,
      fieldGroups: toggleFieldSelection(prev.fieldGroups, groupKey, fieldKey),
    }));
  };

  const handleGroupSelectAll = (groupKey: ExportDataType, selected: boolean) => {
    setConfig((prev) => ({
      ...prev,
      fieldGroups: setFieldGroupSelection(prev.fieldGroups, groupKey, selected),
    }));
  };

  const handleExport = () => {
    const { valid, errors } = validateExportConfig(config);
    if (!valid) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    onExport?.(config);
  };

  const handleSaveConfig = () => {
    if (!saveDialogData.name) return;

    const newConfig = createExportConfig({
      ...config,
      name: saveDialogData.name,
      nameZh: saveDialogData.nameZh || saveDialogData.name,
      description: saveDialogData.description,
      descriptionZh: saveDialogData.descriptionZh || saveDialogData.description,
    });

    const updated = [...savedConfigs, newConfig];
    setSavedConfigs(updated);
    saveExportConfigsToStorage(updated);
    setShowSaveDialog(false);
    setSaveDialogData({ name: '', nameZh: '', description: '', descriptionZh: '' });
    onSaveConfig?.(newConfig);
  };

  const handleLoadConfig = (loadedConfig: ExportConfig) => {
    setConfig(loadedConfig);
    setShowSavedConfigs(false);
  };

  const handleDeleteConfig = (configId: string) => {
    const updated = savedConfigs.filter((c) => c.id !== configId);
    setSavedConfigs(updated);
    saveExportConfigsToStorage(updated);
  };

  const handleDuplicateConfig = (configToDuplicate: ExportConfig) => {
    const duplicated = createExportConfig({
      ...configToDuplicate,
      name: `${configToDuplicate.name} (Copy)`,
      nameZh: `${configToDuplicate.nameZh} (复制)`,
    });
    const updated = [...savedConfigs, duplicated];
    setSavedConfigs(updated);
    saveExportConfigsToStorage(updated);
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'csv':
        return <Table className="w-4 h-4" />;
      case 'json':
        return <FileText className="w-4 h-4" />;
      case 'excel':
        return <FileSpreadsheet className="w-4 h-4" />;
    }
  };

  const selectedFieldCount = useMemo(() => {
    return config.fieldGroups.reduce(
      (sum, group) => sum + group.fields.filter((f) => f.selected).length,
      0
    );
  }, [config.fieldGroups]);

  const previewData = useMemo(() => {
    const data: Record<string, unknown>[] = [];
    for (let i = 0; i < 3; i++) {
      const row: Record<string, unknown> = {};
      config.fieldGroups.forEach((group) => {
        if (!config.dataTypes.includes(group.key)) return;
        group.fields
          .filter((f) => f.selected)
          .forEach((field) => {
            row[`${group.key}.${field.key}`] =
              field.dataType === 'number'
                ? Math.random() * 100
                : field.dataType === 'boolean'
                  ? Math.random() > 0.5
                  : `Sample ${field.key}`;
          });
      });
      data.push(row);
    }
    return data;
  }, [config]);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">{t('exportConfig')}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSavedConfigs(!showSavedConfigs)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {t('loadConfig')}
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {t('saveConfig')}
            </button>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-100">
          <p className="text-sm text-red-600 font-medium">{t('validationErrors')}:</p>
          <ul className="mt-1 text-sm text-red-500 list-disc list-inside">
            {validationErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Saved Configs Panel */}
      {showSavedConfigs && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">{t('savedConfigs')}</h4>
          {savedConfigs.length === 0 ? (
            <p className="text-sm text-gray-500">
              {isZh ? '暂无保存的配置' : 'No saved configurations'}
            </p>
          ) : (
            <div className="space-y-2">
              {savedConfigs.map((savedConfig) => (
                <div
                  key={savedConfig.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {isZh ? savedConfig.nameZh : savedConfig.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getFormatLabel(savedConfig.format, locale)} •{' '}
                      {getTimeRangeLabel(savedConfig.timeRange, locale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleLoadConfig(savedConfig)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      title={t('use')}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicateConfig(savedConfig)}
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                      title={t('duplicate')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteConfig(savedConfig.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      title={t('delete')}
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

      <div className="p-6 space-y-6">
        {/* Format Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Download className="w-4 h-4" />
            {t('format')}
          </label>
          <div className="flex gap-2">
            {FORMAT_OPTIONS.map((format) => (
              <button
                key={format}
                onClick={() => handleFormatChange(format)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  config.format === format
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                {getFormatIcon(format)}
                <span className="text-sm font-medium">{getFormatLabel(format, locale)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time Range Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Clock className="w-4 h-4" />
            {t('timeRange')}
          </label>
          <div className="flex flex-wrap gap-2">
            {TIME_RANGE_OPTIONS.map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  config.timeRange === range
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getTimeRangeLabel(range, locale)}
              </button>
            ))}
          </div>
        </div>

        {/* Data Types Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Filter className="w-4 h-4" />
            {t('dataTypes')}
          </label>
          <div className="flex flex-wrap gap-2">
            {DATA_TYPE_OPTIONS.map((dataType) => (
              <button
                key={dataType}
                onClick={() => handleDataTypeToggle(dataType)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  config.dataTypes.includes(dataType)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {config.dataTypes.includes(dataType) ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {getDataTypeLabel(dataType, locale)}
              </button>
            ))}
          </div>
        </div>

        {/* Field Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Columns className="w-4 h-4" />
              {t('fieldSelection')}
              <span className="text-xs text-gray-500">
                ({selectedFieldCount} {t('selectedFields')})
              </span>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => config.fieldGroups.forEach((g) => handleGroupSelectAll(g.key, true))}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {t('selectAll')}
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() =>
                  config.fieldGroups.forEach((g) => handleGroupSelectAll(g.key, false))
                }
                className="text-xs text-gray-600 hover:text-gray-700"
              >
                {t('deselectAll')}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {config.fieldGroups
              .filter((group) => config.dataTypes.includes(group.key))
              .map((group) => {
                const selectedCount = group.fields.filter((f) => f.selected).length;
                const isExpanded = expandedGroups.has(group.key);

                return (
                  <div
                    key={group.key}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="font-medium text-gray-900">
                          {getFieldGroupLabel(group, locale)}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({selectedCount}/{group.fields.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGroupSelectAll(group.key, true);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1"
                        >
                          {t('selectAll')}
                        </button>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 py-3 bg-white">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {group.fields.map((field) => (
                            <label
                              key={field.key}
                              className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={field.selected}
                                onChange={() => handleFieldToggle(group.key, field.key)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">
                                {getFieldLabel(field, locale)}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeMetadata}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, includeMetadata: e.target.checked }))
              }
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{t('includeMetadata')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeTimestamp}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, includeTimestamp: e.target.checked }))
              }
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{t('includeTimestamp')}</span>
          </label>
        </div>

        {/* File Name */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <FileText className="w-4 h-4" />
            {t('fileName')}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={config.fileName || ''}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, fileName: e.target.value || undefined }))
              }
              placeholder={generateExportFileName(config)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => setConfig((prev) => ({ ...prev, fileName: undefined }))}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {t('autoGenerate')}
            </button>
          </div>
        </div>

        {/* Preview */}
        {showPreview && previewData.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{t('preview')}</span>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(previewData[0]).map((key) => (
                      <th
                        key={key}
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      {Object.values(row).map((value, j) => (
                        <td key={j} className="px-3 py-2 text-gray-700">
                          {typeof value === 'number' ? value.toFixed(2) : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            {showPreview ? (isZh ? '隐藏预览' : 'Hide Preview') : t('preview')}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            {t('export')}
          </button>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900">{t('saveConfig')}</h4>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('configName')} (EN)
                </label>
                <input
                  type="text"
                  value={saveDialogData.name}
                  onChange={(e) => setSaveDialogData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={isZh ? '输入配置名称' : 'Enter configuration name'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('configName')} (中文)
                </label>
                <input
                  type="text"
                  value={saveDialogData.nameZh}
                  onChange={(e) =>
                    setSaveDialogData((prev) => ({ ...prev, nameZh: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={isZh ? '输入中文名称' : 'Enter Chinese name'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('configDescription')} (EN)
                </label>
                <textarea
                  value={saveDialogData.description}
                  onChange={(e) =>
                    setSaveDialogData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder={isZh ? '输入描述（可选）' : 'Enter description (optional)'}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                {isZh ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={!saveDialogData.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('saveConfig')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
