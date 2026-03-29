'use client';

import { useState, useCallback, useMemo } from 'react';

import {
  FileText,
  Download,
  Save,
  Eye,
  Plus,
  X,
  Calendar,
  BarChart3,
  LineChart,
  AreaChart,
  Filter,
  Settings,
  ChevronDown,
  Check,
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
} from 'recharts';

import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';
import {
  type MetricDefinition,
  type ReportConfig,
  type DataPoint,
} from '@/hooks/useAPI3Analytics';

export interface CustomReportGeneratorProps {
  availableMetrics: MetricDefinition[];
  onGenerate: (config: ReportConfig) => void;
  data?: DataPoint[];
}

const chartTypeOptions = [
  { id: 'line', label: 'Line Chart', icon: LineChart },
  { id: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { id: 'area', label: 'Area Chart', icon: AreaChart },
  { id: 'scatter', label: 'Scatter Plot', icon: BarChart3 },
];

const quickTimeRanges = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'Last Year', days: 365 },
];

export function CustomReportGenerator({
  availableMetrics,
  onGenerate,
  data = [],
}: CustomReportGeneratorProps) {
  const t = useTranslations();

  const [title, setTitle] = useState('Custom Report');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ReportConfig['chartType']>('line');
  const [timeRange, setTimeRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [showMetricSelector, setShowMetricSelector] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<ReportConfig[]>([]);

  const handleMetricToggle = useCallback((metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId]
    );
  }, []);

  const handleQuickTimeRange = useCallback((days: number) => {
    setTimeRange({
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      end: new Date(),
    });
  }, []);

  const handleGenerate = useCallback(() => {
    const config: ReportConfig = {
      title,
      metrics: selectedMetrics,
      timeRange,
      chartType,
      filters,
    };
    onGenerate(config);
    setShowPreview(true);
  }, [title, selectedMetrics, timeRange, chartType, filters, onGenerate]);

  const handleSaveTemplate = useCallback(() => {
    const config: ReportConfig = {
      title,
      metrics: selectedMetrics,
      timeRange,
      chartType,
      filters,
    };
    setSavedTemplates((prev) => [...prev, config]);
  }, [title, selectedMetrics, timeRange, chartType, filters]);

  const handleExportPDF = useCallback(() => {
    console.log('Exporting to PDF...');
  }, []);

  const handleExportImage = useCallback(() => {
    console.log('Exporting to image...');
  }, []);

  const previewData = useMemo(() => {
    if (!showPreview || data.length === 0) return [];
    return data
      .filter(
        (d) => d.timestamp >= timeRange.start.getTime() && d.timestamp <= timeRange.end.getTime()
      )
      .map((d) => ({
        ...d,
        time: new Date(d.timestamp).toLocaleDateString(),
      }));
  }, [showPreview, data, timeRange]);

  const groupedMetrics = useMemo(() => {
    const groups: Record<string, MetricDefinition[]> = {};
    availableMetrics.forEach((metric) => {
      if (!groups[metric.category]) {
        groups[metric.category] = [];
      }
      groups[metric.category].push(metric);
    });
    return groups;
  }, [availableMetrics]);

  const renderChart = () => {
    if (previewData.length === 0) return null;

    const commonProps = {
      data: previewData,
    };

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={previewData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke={chartColors.oracle.api3}
                strokeWidth={2}
                dot={false}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsBarChart data={previewData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill={chartColors.oracle.api3} />
            </RechartsBarChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsAreaChart data={previewData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColors.oracle.api3}
                fill={chartColors.oracle.api3}
                fillOpacity={0.3}
              />
            </RechartsAreaChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip />
              <Legend />
              <Scatter data={previewData} fill={chartColors.oracle.api3} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('api3.analytics.reportGenerator.title') || 'Custom Report Generator'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('api3.analytics.reportGenerator.subtitle') ||
              'Create custom reports with selected metrics and time ranges'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveTemplate}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Save className="w-4 h-4" />
            {t('api3.analytics.reportGenerator.saveTemplate') || 'Save Template'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('api3.analytics.reportGenerator.reportTitle') || 'Report Title'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Enter report title..."
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                {t('api3.analytics.reportGenerator.selectMetrics') || 'Select Metrics'}
              </label>
              <button
                onClick={() => setShowMetricSelector(!showMetricSelector)}
                className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
              >
                <Plus className="w-4 h-4" />
                {t('api3.analytics.reportGenerator.addMetric') || 'Add Metric'}
              </button>
            </div>

            {selectedMetrics.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedMetrics.map((metricId) => {
                  const metric = availableMetrics.find((m) => m.id === metricId);
                  return metric ? (
                    <span
                      key={metricId}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-sm"
                    >
                      {metric.name}
                      <button
                        onClick={() => handleMetricToggle(metricId)}
                        className="hover:text-emerald-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}

            {showMetricSelector && (
              <div className="border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                {Object.entries(groupedMetrics).map(([category, metrics]) => (
                  <div key={category} className="border-b border-gray-100 last:border-0">
                    <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                      {category}
                    </div>
                    {metrics.map((metric) => (
                      <button
                        key={metric.id}
                        onClick={() => handleMetricToggle(metric.id)}
                        className={`w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 ${
                          selectedMetrics.includes(metric.id) ? 'bg-emerald-50' : ''
                        }`}
                      >
                        <div className="text-left">
                          <div className="text-sm text-gray-900">{metric.name}</div>
                          {metric.description && (
                            <div className="text-xs text-gray-500">{metric.description}</div>
                          )}
                        </div>
                        {selectedMetrics.includes(metric.id) && (
                          <Check className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('api3.analytics.reportGenerator.timeRange') || 'Time Range'}
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {quickTimeRanges.map((range) => (
                <button
                  key={range.label}
                  onClick={() => handleQuickTimeRange(range.days)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {range.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={timeRange.start.toISOString().split('T')[0]}
                  onChange={(e) => setTimeRange((prev) => ({ ...prev, start: new Date(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={timeRange.end.toISOString().split('T')[0]}
                  onChange={(e) => setTimeRange((prev) => ({ ...prev, end: new Date(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('api3.analytics.reportGenerator.chartType') || 'Chart Type'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {chartTypeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => setChartType(option.id as ReportConfig['chartType'])}
                    className={`flex flex-col items-center gap-1 p-3 border rounded-md transition-colors ${
                      chartType === option.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              {t('api3.analytics.reportGenerator.savedTemplates') || 'Saved Templates'}
            </h3>
            {savedTemplates.length > 0 ? (
              <div className="space-y-2">
                {savedTemplates.map((template, index) => (
                  <button
                    key={index}
                    className="w-full text-left px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 text-sm"
                    onClick={() => {
                      setTitle(template.title);
                      setSelectedMetrics(template.metrics);
                      setTimeRange(template.timeRange);
                      setChartType(template.chartType);
                      setFilters(template.filters);
                    }}
                  >
                    {template.title}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {t('api3.analytics.reportGenerator.noTemplates') || 'No saved templates'}
              </p>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              {t('api3.analytics.reportGenerator.filters') || 'Filters'}
            </h3>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 text-sm">
                <span className="text-gray-600">Add Filter</span>
                <Plus className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleGenerate}
              disabled={selectedMetrics.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="w-4 h-4" />
              {t('api3.analytics.reportGenerator.preview') || 'Preview Report'}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!showPreview}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {t('api3.analytics.reportGenerator.exportPDF') || 'Export PDF'}
            </button>
            <button
              onClick={handleExportImage}
              disabled={!showPreview}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {t('api3.analytics.reportGenerator.exportImage') || 'Export Image'}
            </button>
          </div>
        </div>
      </div>

      {showPreview && previewData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            {t('api3.analytics.reportGenerator.previewTitle') || 'Report Preview'}
          </h3>
          {renderChart()}
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-500">Data Points</div>
              <div className="text-lg font-semibold text-gray-900">{previewData.length}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">Min Value</div>
              <div className="text-lg font-semibold text-gray-900">
                {Math.min(...previewData.map((d) => d.value)).toFixed(2)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">Max Value</div>
              <div className="text-lg font-semibold text-gray-900">
                {Math.max(...previewData.map((d) => d.value)).toFixed(2)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">Average</div>
              <div className="text-lg font-semibold text-gray-900">
                {(previewData.reduce((sum, d) => sum + d.value, 0) / previewData.length).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomReportGenerator;
