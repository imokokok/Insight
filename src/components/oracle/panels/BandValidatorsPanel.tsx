'use client';

import { useState, useEffect } from 'react';

import { Globe, Percent, Clock, MapPin, Shield, Users, Award } from 'lucide-react';

import { DashboardCard, MetricCard } from '@/components/oracle/data-display/DashboardCard';
import { Card, CardContent, CardHeader, CardTitle, SegmentedControl } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { type BandProtocolClient, type ValidatorInfo } from '@/lib/oracles/bandProtocol';
import { logger } from '@/lib/utils/logger';

interface BandValidatorsPanelProps {
  client: BandProtocolClient;
}

interface ValidatorStats {
  totalValidators: number;
  activeValidators: number;
  jailedValidators: number;
  avgCommission: number;
  avgUptime: number;
  topRegion: string;
}

interface RegionDistribution {
  region: string;
  count: number;
  percentage: number;
}

export function BandValidatorsPanel({ client }: BandValidatorsPanelProps) {
  const t = useTranslations();
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [stats, setStats] = useState<ValidatorStats | null>(null);
  const [regions, setRegions] = useState<RegionDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'rank' | 'stake' | 'uptime' | 'commission'>('rank');

  useEffect(() => {
    const fetchValidators = async () => {
      try {
        const validatorData = await client.getValidators(50);

        const activeCount = validatorData.filter((v) => !v.jailed).length;
        const jailedCount = validatorData.filter((v) => v.jailed).length;
        const avgComm =
          validatorData.reduce((sum, v) => sum + v.commissionRate, 0) / validatorData.length;
        const avgUp = validatorData.reduce((sum, v) => sum + v.uptime, 0) / validatorData.length;

        const mockStats: ValidatorStats = {
          totalValidators: validatorData.length,
          activeValidators: activeCount,
          jailedValidators: jailedCount,
          avgCommission: avgComm * 100,
          avgUptime: avgUp,
          topRegion: 'Asia',
        };

        const regionData: RegionDistribution[] = [
          { region: 'Asia', count: 28, percentage: 56 },
          { region: 'Europe', count: 12, percentage: 24 },
          { region: 'North America', count: 8, percentage: 16 },
          { region: 'Others', count: 2, percentage: 4 },
        ];

        setValidators(validatorData);
        setStats(mockStats);
        setRegions(regionData);
      } catch (error) {
        logger.error(
          'Failed to fetch validators:',
          error instanceof Error ? error : new Error(String(error))
        );
      } finally {
        setLoading(false);
      }
    };

    fetchValidators();
  }, [client]);

  const sortedValidators = [...validators].sort((a, b) => {
    switch (sortBy) {
      case 'stake':
        return b.tokens - a.tokens;
      case 'uptime':
        return b.uptime - a.uptime;
      case 'commission':
        return a.commissionRate - b.commissionRate;
      default:
        return a.rank - b.rank;
    }
  });

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (!stats) {
    return (
      <DashboardCard>
        <p className="text-gray-500 text-center">Failed to load validator data</p>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Validator Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={t('band.validators.totalValidators')}
          value={stats.totalValidators.toString()}
          subValue={`${stats.activeValidators} ${t('band.validators.active')}`}
          icon={<Users className="w-4 h-4" />}
        />
        <MetricCard
          label={t('band.validators.avgCommission')}
          value={`${stats.avgCommission.toFixed(2)}%`}
          subValue={t('band.validators.networkAverage')}
          icon={<Percent className="w-4 h-4" />}
        />
        <MetricCard
          label={t('band.validators.avgUptime')}
          value={`${stats.avgUptime.toFixed(2)}%`}
          subValue={t('band.validators.last30Days')}
          icon={<Clock className="w-4 h-4" />}
        />
        <MetricCard
          label={t('band.validators.topRegion')}
          value={stats.topRegion}
          subValue={`${regions[0]?.percentage}% ${t('band.validators.ofNetwork')}`}
          icon={<MapPin className="w-4 h-4" />}
        />
      </div>

      {/* Geographic Distribution */}
      <DashboardCard title={t('band.validators.geographicDistribution')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {regions.map((region) => (
            <div key={region.region} className="bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-700">{region.region}</span>
                <span className="text-sm text-gray-500">
                  {region.count} {t('band.validators.validators')}
                </span>
              </div>
              <div className="w-full bg-gray-200 h-2 mb-2">
                <div className="bg-purple-500 h-2" style={{ width: `${region.percentage}%` }} />
              </div>
              <p className="text-xs text-gray-500">
                {region.percentage}% {t('band.validators.ofNetwork')}
              </p>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Validators Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-semibold">
              {t('band.validators.validatorList')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{t('band.validators.sortBy')}:</span>
              <SegmentedControl
                options={[
                  { value: 'rank', label: t('band.validators.rank') },
                  { value: 'stake', label: t('band.validators.stake') },
                  { value: 'uptime', label: t('band.validators.uptime') },
                  { value: 'commission', label: t('band.validators.commission') },
                ]}
                value={sortBy}
                onChange={(value) => setSortBy(value as 'rank' | 'stake' | 'uptime' | 'commission')}
                size="sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.validators.rank')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.validators.validator')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.validators.stakedTokens')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.validators.commission')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.validators.uptime')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    {t('band.validators.status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedValidators.slice(0, 20).map((validator, index) => (
                  <tr
                    key={validator.operatorAddress}
                    className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium ${
                          validator.rank <= 3
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {validator.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{validator.moniker}</p>
                        <p className="text-xs text-gray-500 font-mono">
                          {validator.operatorAddress.slice(0, 20)}...
                        </p>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <p className="text-sm font-medium text-gray-900">
                        {formatNumber(validator.tokens)} BAND
                      </p>
                      <p className="text-xs text-gray-500">
                        {(
                          (validator.tokens / validators.reduce((sum, v) => sum + v.tokens, 0)) *
                          100
                        ).toFixed(2)}
                        %
                      </p>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {(validator.commissionRate * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span
                        className={`text-sm font-medium ${
                          validator.uptime >= 99
                            ? 'text-success-600'
                            : validator.uptime >= 95
                              ? 'text-warning-600'
                              : 'text-danger-600'
                        }`}
                      >
                        {validator.uptime.toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium ${
                          validator.jailed
                            ? 'bg-danger-100 text-danger-700'
                            : 'bg-success-100 text-success-700'
                        }`}
                      >
                        {validator.jailed
                          ? t('band.validators.jailed')
                          : t('band.validators.active')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Validator Info */}
      <DashboardCard title={t('band.validators.validatorInfo')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-purple-700" />
              <h4 className="font-medium text-purple-900">{t('band.validators.minStake')}</h4>
            </div>
            <p className="text-2xl font-bold text-purple-700">1 BAND</p>
            <p className="text-sm text-purple-600 mt-1">{t('band.validators.minStakeDesc')}</p>
          </div>
          <div className="p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-purple-700" />
              <h4 className="font-medium text-purple-900">{t('band.validators.slashing')}</h4>
            </div>
            <p className="text-2xl font-bold text-purple-700">5%</p>
            <p className="text-sm text-purple-600 mt-1">{t('band.validators.slashingDesc')}</p>
          </div>
          <div className="p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-purple-700" />
              <h4 className="font-medium text-purple-900">{t('band.validators.maxValidators')}</h4>
            </div>
            <p className="text-2xl font-bold text-purple-700">100</p>
            <p className="text-sm text-purple-600 mt-1">{t('band.validators.maxValidatorsDesc')}</p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
