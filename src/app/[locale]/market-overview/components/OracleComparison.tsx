'use client';

import { useState } from 'react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';

import { useTranslations } from '@/i18n';

import { type OracleComparisonData } from '../types';

interface OracleComparisonProps {
  data: OracleComparisonData[];
  loading?: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function OracleComparison({ data, loading = false }: OracleComparisonProps) {
  const t = useTranslations('marketOverview.oracleComparison');
  const [selectedOracles, setSelectedOracles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'bar' | 'radar'>('bar');

  // 格式化TVS
  const formatTVS = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toFixed(0)}`;
  };

  // 切换选择
  const toggleOracle = (name: string) => {
    setSelectedOracles((prev) => {
      if (prev.includes(name)) {
        return prev.filter((n) => n !== name);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, name];
    });
  };

  // 准备雷达图数据
  const radarData = selectedOracles.map((oracleName) => {
    const oracle = data.find((d) => d.name === oracleName);
    return {
      subject: oracleName,
      A: oracle?.tvs ? (oracle.tvs / Math.max(...data.map((d) => d.tvs))) * 100 : 0,
      B: oracle?.chains ? (oracle.chains / Math.max(...data.map((d) => d.chains))) * 100 : 0,
      C: oracle?.protocols ? (oracle.protocols / Math.max(...data.map((d) => d.protocols))) * 100 : 0,
      fullMark: 100,
    };
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent animate-spin" />
          <span className="text-gray-500 text-sm">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm">{t('noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Oracle Selection */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">{t('selectOracles')}</p>
        <div className="flex flex-wrap gap-2">
          {data.map((oracle) => (
            <button
              key={oracle.name}
              onClick={() => toggleOracle(oracle.name)}
              disabled={!selectedOracles.includes(oracle.name) && selectedOracles.length >= 4}
              className={`px-3 py-1.5 text-sm transition-colors ${
                selectedOracles.includes(oracle.name)
                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 disabled:opacity-50'
              }`}
            >
              {oracle.name}
            </button>
          ))}
        </div>
        {selectedOracles.length >= 4 && (
          <p className="text-xs text-gray-500 mt-1">{t('maxOracles')}</p>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setViewMode('bar')}
          className={`px-3 py-1.5 text-sm transition-colors ${
            viewMode === 'bar'
              ? 'bg-primary-100 text-primary-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Bar
        </button>
        <button
          onClick={() => setViewMode('radar')}
          disabled={selectedOracles.length < 2}
          className={`px-3 py-1.5 text-sm transition-colors ${
            viewMode === 'radar'
              ? 'bg-primary-100 text-primary-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'
          }`}
        >
          Radar
        </button>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {viewMode === 'bar' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fill: '#4b5563', fontSize: 12 }} stroke="#9ca3af" />
              <YAxis
                tickFormatter={(value) => formatTVS(value)}
                tick={{ fill: '#4b5563', fontSize: 12 }}
                stroke="#9ca3af"
              />
              <Tooltip
                formatter={(value: number) => [formatTVS(value), 'TVS']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="tvs" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          selectedOracles.length >= 2 && (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                {selectedOracles.map((oracle, index) => (
                  <Radar
                    key={oracle}
                    name={oracle}
                    dataKey="A"
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.3}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          )
        )}
      </div>
    </div>
  );
}
