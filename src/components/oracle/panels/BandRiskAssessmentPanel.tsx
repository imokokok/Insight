'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { BandProtocolClient } from '@/lib/oracles/bandProtocol';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface BandRiskAssessmentPanelProps {
  client: BandProtocolClient;
}

interface RiskMetrics {
  validatorConcentration: number;
  stakingConcentration: number;
  slashRisk: number;
  downtimeRisk: number;
  crossChainRisk: number;
}

export function BandRiskAssessmentPanel({ client }: BandRiskAssessmentPanelProps) {
  const { t } = useI18n();
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock risk metrics data
    const mockMetrics: RiskMetrics = {
      validatorConcentration: 35.2,
      stakingConcentration: 42.8,
      slashRisk: 2.1,
      downtimeRisk: 0.5,
      crossChainRisk: 15.3,
    };

    setMetrics(mockMetrics);
    setLoading(false);
  }, [client]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500 text-center">Failed to load risk assessment data</p>
        </CardContent>
      </Card>
    );
  }

  const getRiskLevel = (value: number, thresholds: { low: number; medium: number }) => {
    if (value <= thresholds.low) return { level: 'low', color: 'green', text: 'Low Risk' };
    if (value <= thresholds.medium) return { level: 'medium', color: 'yellow', text: 'Medium Risk' };
    return { level: 'high', color: 'red', text: 'High Risk' };
  };

  const validatorRisk = getRiskLevel(metrics.validatorConcentration, { low: 30, medium: 50 });
  const stakingRisk = getRiskLevel(metrics.stakingConcentration, { low: 40, medium: 60 });
  const slashRiskLevel = getRiskLevel(metrics.slashRisk, { low: 5, medium: 10 });
  const downtimeRiskLevel = getRiskLevel(metrics.downtimeRisk, { low: 1, medium: 3 });
  const crossChainRiskLevel = getRiskLevel(metrics.crossChainRisk, { low: 20, medium: 40 });

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('band.risk.validatorConcentration')}</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.validatorConcentration.toFixed(1)}%</p>
          <p className={`text-xs mt-1 ${validatorRisk.level === 'low' ? 'text-green-600' : validatorRisk.level === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
            {validatorRisk.text}
          </p>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('band.risk.stakingConcentration')}</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.stakingConcentration.toFixed(1)}%</p>
          <p className={`text-xs mt-1 ${stakingRisk.level === 'low' ? 'text-green-600' : stakingRisk.level === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
            {stakingRisk.text}
          </p>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('band.risk.slashRisk')}</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.slashRisk.toFixed(1)}%</p>
          <p className={`text-xs mt-1 ${slashRiskLevel.level === 'low' ? 'text-green-600' : slashRiskLevel.level === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
            {slashRiskLevel.text}
          </p>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('band.risk.downtimeRisk')}</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.downtimeRisk.toFixed(1)}%</p>
          <p className={`text-xs mt-1 ${downtimeRiskLevel.level === 'low' ? 'text-green-600' : downtimeRiskLevel.level === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
            {downtimeRiskLevel.text}
          </p>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('band.risk.crossChainRisk')}</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.crossChainRisk.toFixed(1)}%</p>
          <p className={`text-xs mt-1 ${crossChainRiskLevel.level === 'low' ? 'text-green-600' : crossChainRiskLevel.level === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
            {crossChainRiskLevel.text}
          </p>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('band.risk.overallRisk')}</p>
          <p className="text-2xl font-bold text-yellow-600">Medium</p>
          <p className="text-xs text-gray-500 mt-1">Based on current metrics</p>
        </div>
      </div>

      {/* Risk Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {t('band.risk.riskDetails')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Validator Concentration */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-900">
                  {t('band.risk.validatorConcentrationDetail')}
                </h4>
                <span className={`text-sm font-medium ${
                  validatorRisk.level === 'low' ? 'text-green-600' :
                  validatorRisk.level === 'medium' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {validatorRisk.text}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    validatorRisk.level === 'low' ? 'bg-green-500' :
                    validatorRisk.level === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(metrics.validatorConcentration, 100)}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Top 10 validators control {metrics.validatorConcentration.toFixed(1)}% of voting power
              </p>
            </div>

            {/* Staking Concentration */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-900">
                  {t('band.risk.stakingConcentrationDetail')}
                </h4>
                <span className={`text-sm font-medium ${
                  stakingRisk.level === 'low' ? 'text-green-600' :
                  stakingRisk.level === 'medium' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {stakingRisk.text}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    stakingRisk.level === 'low' ? 'bg-green-500' :
                    stakingRisk.level === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(metrics.stakingConcentration, 100)}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Top 5 delegators hold {metrics.stakingConcentration.toFixed(1)}% of staked tokens
              </p>
            </div>

            {/* Slash Risk */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-900">
                  {t('band.risk.slashRiskDetail')}
                </h4>
                <span className={`text-sm font-medium ${
                  slashRiskLevel.level === 'low' ? 'text-green-600' :
                  slashRiskLevel.level === 'medium' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {slashRiskLevel.text}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    slashRiskLevel.level === 'low' ? 'bg-green-500' :
                    slashRiskLevel.level === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(metrics.slashRisk * 10, 100)}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Historical slashing rate: {metrics.slashRisk.toFixed(1)}% of validators per year
              </p>
            </div>

            {/* Cross-Chain Risk */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-900">
                  {t('band.risk.crossChainRiskDetail')}
                </h4>
                <span className={`text-sm font-medium ${
                  crossChainRiskLevel.level === 'low' ? 'text-green-600' :
                  crossChainRiskLevel.level === 'medium' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {crossChainRiskLevel.text}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    crossChainRiskLevel.level === 'low' ? 'bg-green-500' :
                    crossChainRiskLevel.level === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(metrics.crossChainRisk * 2, 100)}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Risk from dependent chains and bridge operations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Mitigation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {t('band.risk.mitigationStrategies')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">
                {t('band.risk.decentralization')}
              </h4>
              <p className="text-sm text-green-700">
                70+ validators distributed globally with no single point of failure
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">
                {t('band.risk.slashProtection')}
              </h4>
              <p className="text-sm text-blue-700">
                Double-sign slashing (5%) and downtime slashing (0.01%) mechanisms
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">
                {t('band.risk.crossChainSecurity')}
              </h4>
              <p className="text-sm text-purple-700">
                IBC protocol ensures secure cross-chain communication with cryptographic proofs
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium text-orange-900 mb-2">
                {t('band.risk.emergencyResponse')}
              </h4>
              <p className="text-sm text-orange-700">
                On-chain governance enables quick response to security incidents
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
