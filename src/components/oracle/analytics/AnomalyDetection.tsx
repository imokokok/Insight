'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';

import {
  AlertTriangle,
  AlertCircle,
  Info,
  Download,
  Settings,
  Filter,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  BarChart,
  Bar,
} from 'recharts';

import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';
import useAPI3Analytics, { type DataPoint, type Anomaly } from '@/hooks/useAPI3Analytics';

export interface AnomalyDetectionProps {
  data: DataPoint[];
  sensitivity: 'low' | 'medium' | 'high';
  onAnomalyDetected?: (anomalies: Anomaly[]) => void;
}

const sensitivityOptions = [
  { value: 'low', label: 'Low', description: 'Only detect extreme anomalies' },
  { value: 'medium', label: 'Medium', description: 'Balanced detection sensitivity' },
  { value: 'high', label: 'High', description: 'Detect subtle anomalies' },
];

export function AnomalyDetection({
  data,
  sensitivity: initialSensitivity,
  onAnomalyDetected,
}: AnomalyDetectionProps) {
  const t = useTranslations();
  const { detectAnomalies, detectAnomaliesByZScore, detectAnomaliesByIQR, calculateMean, calculateStandardDeviation } =
    useAPI3Analytics();

  const [sensitivity, setSensitivity] = useState(initialSensitivity);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'combined' | 'zscore' | 'iqr'>('combined');
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);

  const anomalies = useMemo(() => {
    if (data.length < 3) return [];

    let detected: Anomaly[];
    switch (selectedMethod) {
      case 'zscore':
        detected = detectAnomaliesByZScore(data, sensitivity === 'low' ? 3.5 : sensitivity === 'medium' ? 2.5 : 1.5);
        break;
      case 'iqr':
        detected = detectAnomaliesByIQR(data);
        break;
      default:
        detected = detectAnomalies(data, sensitivity);
    }

    return detected;
  }, [data, sensitivity, selectedMethod, detectAnomalies, detectAnomaliesByZScore, detectAnomaliesByIQR]);

  useEffect(() => {
    if (anomalies.length > 0 && onAnomalyDetected) {
      onAnomalyDetected(anomalies);
    }
  }, [anomalies, onAnomalyDetected]);

  const filteredAnomalies = useMemo(() => {
    if (selectedSeverity === 'all') return anomalies;
    return anomalies.filter((a) => a.severity === selectedSeverity);
  }, [anomalies, selectedSeverity]);

  const chartData = useMemo(() => {
    return data.map((d, index) => {
      const anomaly = anomalies.find((a) => a.index === index);
      return {
        time: new Date(d.timestamp).toLocaleDateString(),
        timestamp: d.timestamp,
        value: d.value,
        isAnomaly: !!anomaly,
        anomalySeverity: anomaly?.severity,
        expectedValue: anomaly?.expectedValue,
      };
    });
  }, [data, anomalies]);

  const statistics = useMemo(() => {
    if (data.length === 0) return null;

    const values = data.map((d) => d.value);
    const mean = calculateMean(values);
    const std = calculateStandardDeviation(values);

    return {
      totalPoints: data.length,
      anomalyCount: anomalies.length,
      anomalyRate: (anomalies.length / data.length) * 100,
      mean,
      std,
      severityBreakdown: {
        high: anomalies.filter((a) => a.severity === 'high').length,
        medium: anomalies.filter((a) => a.severity === 'medium').length,
        low: anomalies.filter((a) => a.severity === 'low').length,
      },
    };
  }, [data, anomalies, calculateMean, calculateStandardDeviation]);

  const handleExport = useCallback(() => {
    const exportData = {
      anomalies: filteredAnomalies,
      statistics,
      config: {
        sensitivity,
        method: selectedMethod,
      },
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anomaly-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredAnomalies, statistics, sensitivity, selectedMethod]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 text-red-700';
      case 'medium':
        return 'bg-amber-50 text-amber-700';
      case 'low':
        return 'bg-blue-50 text-blue-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="w-4 h-4" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('api3.analytics.anomaly.title') || 'Anomaly Detection'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('api3.analytics.anomaly.subtitle') ||
              'Detect statistical anomalies using Z-score and IQR methods'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={filteredAnomalies.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {t('api3.analytics.anomaly.export') || 'Export Report'}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
            {t('api3.analytics.anomaly.settings') || 'Settings'}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('api3.analytics.anomaly.sensitivity') || 'Detection Sensitivity'}
              </label>
              <div className="space-y-2">
                {sensitivityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSensitivity(option.value as 'low' | 'medium' | 'high')}
                    className={`w-full text-left px-4 py-3 border rounded-md transition-colors ${
                      sensitivity === option.value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('api3.analytics.anomaly.detectionMethod') || 'Detection Method'}
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedMethod('combined')}
                  className={`w-full text-left px-4 py-3 border rounded-md transition-colors ${
                    selectedMethod === 'combined'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-900">Combined</div>
                  <div className="text-xs text-gray-500">Use both Z-score and IQR methods</div>
                </button>
                <button
                  onClick={() => setSelectedMethod('zscore')}
                  className={`w-full text-left px-4 py-3 border rounded-md transition-colors ${
                    selectedMethod === 'zscore'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-900">Z-Score Only</div>
                  <div className="text-xs text-gray-500">Statistical deviation from mean</div>
                </button>
                <button
                  onClick={() => setSelectedMethod('iqr')}
                  className={`w-full text-left px-4 py-3 border rounded-md transition-colors ${
                    selectedMethod === 'iqr'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-900">IQR Only</div>
                  <div className="text-xs text-gray-500">Interquartile range analysis</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">
              {t('api3.analytics.anomaly.totalPoints') || 'Total Points'}
            </div>
            <div className="text-xl font-bold text-gray-900">{statistics.totalPoints}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">
              {t('api3.analytics.anomaly.anomaliesFound') || 'Anomalies Found'}
            </div>
            <div className="text-xl font-bold text-red-600">{statistics.anomalyCount}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">
              {t('api3.analytics.anomaly.anomalyRate') || 'Anomaly Rate'}
            </div>
            <div className="text-xl font-bold text-gray-900">{statistics.anomalyRate.toFixed(2)}%</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">
              {t('api3.analytics.anomaly.mean') || 'Mean'}
            </div>
            <div className="text-xl font-bold text-gray-900">${statistics.mean.toFixed(2)}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">
              {t('api3.analytics.anomaly.stdDev') || 'Std Dev'}
            </div>
            <div className="text-xl font-bold text-gray-900">${statistics.std.toFixed(2)}</div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">
            {t('api3.analytics.anomaly.chartTitle') || 'Data with Anomalies Highlighted'}
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-gray-500">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs text-gray-500">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-500">Low</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              type="category"
              allowDuplicatedCategory={false}
              tick={{ fontSize: 10, fill: '#6b7280' }}
            />
            <YAxis dataKey="value" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <ZAxis range={[20, 20]} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">{data.time}</p>
                      <p className="text-sm font-medium text-gray-900">Value: ${data.value.toFixed(2)}</p>
                      {data.isAnomaly && (
                        <p className={`text-xs mt-1 ${getSeverityBgColor(data.anomalySeverity)}`}>
                          Anomaly ({data.anomalySeverity})
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter
              data={chartData.filter((d) => !d.isAnomaly)}
              fill={chartColors.oracle.api3}
              name="Normal"
            />
            <Scatter
              data={chartData.filter((d) => d.isAnomaly && d.anomalySeverity === 'high')}
              fill="#ef4444"
              name="High Severity"
            />
            <Scatter
              data={chartData.filter((d) => d.isAnomaly && d.anomalySeverity === 'medium')}
              fill="#f59e0b"
              name="Medium Severity"
            />
            <Scatter
              data={chartData.filter((d) => d.isAnomaly && d.anomalySeverity === 'low')}
              fill="#3b82f6"
              name="Low Severity"
            />
            {statistics && (
              <>
                <ReferenceLine y={statistics.mean} stroke="#6b7280" strokeDasharray="5 5" />
                <ReferenceLine
                  y={statistics.mean + statistics.std * 2}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                />
                <ReferenceLine
                  y={statistics.mean - statistics.std * 2}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                />
              </>
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">
              {t('api3.analytics.anomaly.anomalyList') || 'Detected Anomalies'}
            </h3>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value as 'all' | 'low' | 'medium' | 'high')}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="all">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {filteredAnomalies.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredAnomalies.map((anomaly, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedAnomaly(anomaly)}
                  className={`w-full text-left p-3 border rounded-md transition-colors ${
                    selectedAnomaly?.index === anomaly.index
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getSeverityBgColor(anomaly.severity)}`}
                      >
                        {getSeverityIcon(anomaly.severity)}
                        <span className="ml-1">{anomaly.severity}</span>
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(anomaly.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      ${anomaly.value.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Deviation: ${anomaly.deviation.toFixed(2)} | Expected: ${anomaly.expectedValue.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">
                {t('api3.analytics.anomaly.noAnomalies') || 'No anomalies detected with current settings'}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              {t('api3.analytics.anomaly.severityBreakdown') || 'Severity Breakdown'}
            </h3>
            {statistics && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">High</span>
                    <span className="text-sm font-medium text-red-600">
                      {statistics.severityBreakdown.high}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-red-500"
                      style={{
                        width: `${(statistics.severityBreakdown.high / statistics.anomalyCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Medium</span>
                    <span className="text-sm font-medium text-amber-600">
                      {statistics.severityBreakdown.medium}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-amber-500"
                      style={{
                        width: `${(statistics.severityBreakdown.medium / statistics.anomalyCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Low</span>
                    <span className="text-sm font-medium text-blue-600">
                      {statistics.severityBreakdown.low}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{
                        width: `${(statistics.severityBreakdown.low / statistics.anomalyCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedAnomaly && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                {t('api3.analytics.anomaly.anomalyDetails') || 'Anomaly Details'}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Time</span>
                  <span className="text-gray-900">
                    {new Date(selectedAnomaly.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Value</span>
                  <span className="text-gray-900">${selectedAnomaly.value.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expected</span>
                  <span className="text-gray-900">${selectedAnomaly.expectedValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Deviation</span>
                  <span className="text-gray-900">${selectedAnomaly.deviation.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="text-gray-900 uppercase">{selectedAnomaly.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Severity</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-medium ${getSeverityBgColor(selectedAnomaly.severity)}`}
                  >
                    {selectedAnomaly.severity}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">
                  {t('api3.analytics.anomaly.aboutTitle') || 'About Anomaly Detection'}
                </h4>
                <p className="text-xs text-blue-700 mt-1">
                  {t('api3.analytics.anomaly.aboutDesc') ||
                    'Anomalies are detected using statistical methods. Z-score measures deviation from the mean, while IQR identifies outliers based on quartile ranges.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnomalyDetection;
