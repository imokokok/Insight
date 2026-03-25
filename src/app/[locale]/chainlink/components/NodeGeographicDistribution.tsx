'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from '@/i18n';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { cn } from '@/lib/utils';
import { Globe, MapPin, Clock, CheckCircle } from 'lucide-react';
import { chartColors, semanticColors } from '@/lib/config/colors';

type Region = 'all' | 'northAmerica' | 'europe' | 'asia' | 'others';

interface RegionData {
  id: Region;
  name: string;
  nodeCount: number;
  avgResponseTime: number;
  successRate: number;
  percentage: number;
  color: string;
}

interface NodeGeographicDistributionProps {
  className?: string;
}

const generateRegionData = (): RegionData[] => {
  const data: RegionData[] = [
    {
      id: 'northAmerica',
      name: 'North America',
      nodeCount: 684,
      avgResponseTime: 142,
      successRate: 99.94,
      percentage: 37,
      color: chartColors.region.northAmerica,
    },
    {
      id: 'europe',
      name: 'Europe',
      nodeCount: 516,
      avgResponseTime: 165,
      successRate: 99.91,
      percentage: 28,
      color: chartColors.region.europe,
    },
    {
      id: 'asia',
      name: 'Asia',
      nodeCount: 443,
      avgResponseTime: 198,
      successRate: 99.87,
      percentage: 24,
      color: chartColors.region.asia,
    },
    {
      id: 'others',
      name: 'Others',
      nodeCount: 204,
      avgResponseTime: 215,
      successRate: 99.82,
      percentage: 11,
      color: chartColors.region.other,
    },
  ];
  return data;
};

export function NodeGeographicDistribution({
  className,
}: NodeGeographicDistributionProps) {
  const t = useTranslations();
  const [selectedRegion, setSelectedRegion] = useState<Region>('all');

  const regionData = useMemo(() => generateRegionData(), []);

  const filteredData = useMemo(() => {
    if (selectedRegion === 'all') return regionData;
    return regionData.filter((r) => r.id === selectedRegion);
  }, [regionData, selectedRegion]);

  const totalNodes = useMemo(
    () => regionData.reduce((sum, r) => sum + r.nodeCount, 0),
    [regionData]
  );

  const avgResponseTime = useMemo(() => {
    const total = regionData.reduce(
      (sum, r) => sum + r.avgResponseTime * r.nodeCount,
      0
    );
    return Math.round(total / totalNodes);
  }, [regionData, totalNodes]);

  const avgSuccessRate = useMemo(() => {
    const total = regionData.reduce(
      (sum, r) => sum + r.successRate * r.nodeCount,
      0
    );
    return (total / totalNodes).toFixed(2);
  }, [regionData, totalNodes]);

  const regionButtons: { key: Region; label: string }[] = [
    { key: 'all', label: t('chainlink.network.allRegions') },
    { key: 'northAmerica', label: t('chainlink.network.northAmerica') },
    { key: 'europe', label: t('chainlink.network.europe') },
    { key: 'asia', label: t('chainlink.network.asia') },
    { key: 'others', label: t('chainlink.network.others') },
  ];

  return (
    <DashboardCard
      title={
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600" />
          <span>{t('chainlink.network.nodeGeographicDistribution')}</span>
        </div>
      }
      headerAction={
        <div className="flex items-center gap-1.5">
          {regionButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setSelectedRegion(btn.key)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200',
                selectedRegion === btn.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      }
      className={className}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600">
                {t('chainlink.network.totalNodes')}
              </span>
            </div>
            <p className="text-xl font-bold text-blue-700">
              {totalNodes.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-emerald-600">
                {t('chainlink.network.avgResponse')}
              </span>
            </div>
            <p className="text-xl font-bold text-emerald-700">
              {avgResponseTime}ms
            </p>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-purple-600">
                {t('chainlink.network.avgSuccessRate')}
              </span>
            </div>
            <p className="text-xl font-bold text-purple-700">{avgSuccessRate}%</p>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-600">
                {t('chainlink.network.regions')}
              </span>
            </div>
            <p className="text-xl font-bold text-amber-700">4</p>
          </div>
        </div>

        <div className="space-y-3">
          {filteredData.map((region) => (
            <div
              key={region.id}
              className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: region.color }}
                  />
                  <span className="font-medium text-gray-900">{region.name}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {region.percentage}%
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${region.percentage}%`,
                    backgroundColor: region.color,
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {t('chainlink.network.nodes')}
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {region.nodeCount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {t('chainlink.network.responseTime')}
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {region.avgResponseTime}ms
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {t('chainlink.network.successRate')}
                  </p>
                  <p
                    className="text-lg font-semibold"
                    style={{
                      color:
                        region.successRate >= 99.9
                          ? semanticColors.success.DEFAULT
                          : region.successRate >= 99.8
                            ? semanticColors.warning.DEFAULT
                            : semanticColors.danger.DEFAULT,
                    }}
                  >
                    {region.successRate}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{t('chainlink.network.lastUpdated')}: 2 min ago</span>
            <div className="flex items-center gap-4">
              {regionData.map((region) => (
                <div key={region.id} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: region.color }}
                  />
                  <span>{region.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
