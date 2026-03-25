'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from '@/i18n';
import {
  DashboardCard,
  DataFreshnessIndicator,
  RiskScoreCard,
  MitigationMeasuresGrid,
} from '@/components/oracle/common';
import { ScuttlebuttData } from '@/lib/oracles/chronicle';
import type { MitigationMeasure } from '@/types/risk';
import { Shield } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { CheckCircle } from 'lucide-react';
import { TrendingDown } from 'lucide-react';
import { Activity } from 'lucide-react';
import { Lock } from 'lucide-react';
import { FileCheck } from 'lucide-react';
import { Clock } from 'lucide-react';

interface ChronicleRiskData {
  overallRiskScore: number;
  dataQualityScore: number;
  validatorConcentration: number;
  priceDeviation: number;
  systemStability: number;
  lastIncident: string;
  incidentCount30d: number;
}

interface ChronicleRiskAssessmentPanelProps {
  data?: ChronicleRiskData;
  scuttlebuttData?: ScuttlebuttData;
}

// 示例缓解措施
const chronicleMitigationMeasures: MitigationMeasure[] = [
  {
    name: 'chronicle.risk.mitigationMeasures.scuttlebuttVerification',
    type: 'technical',
    status: 'active',
    effectiveness: 96,
  },
  {
    name: 'chronicle.risk.mitigationMeasures.validatorRotation',
    type: 'technical',
    status: 'active',
    effectiveness: 92,
  },
  {
    name: 'chronicle.risk.mitigationMeasures.multiChainValidation',
    type: 'technical',
    status: 'active',
    effectiveness: 89,
  },
  {
    name: 'chronicle.risk.mitigationMeasures.thresholdSignature',
    type: 'technical',
    status: 'active',
    effectiveness: 94,
  },
  {
    name: 'chronicle.risk.mitigationMeasures.decentralizedGovernance',
    type: 'governance',
    status: 'active',
    effectiveness: 87,
  },
  {
    name: 'chronicle.risk.mitigationMeasures.monitoring',
    type: 'operational',
    status: 'active',
    effectiveness: 93,
  },
];

export function ChronicleRiskAssessmentPanel({
  data,
  scuttlebuttData,
}: ChronicleRiskAssessmentPanelProps) {
  const t = useTranslations();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Default mock data if no data provided
  const riskData: ChronicleRiskData = data || {
    overallRiskScore: 88,
    dataQualityScore: 92,
    validatorConcentration: 85,
    priceDeviation: 90,
    systemStability: 87,
    lastIncident: '15 days ago',
    incidentCount30d: 0,
  };

  // Get audit score from scuttlebutt data if available
  const auditScore = scuttlebuttData?.auditScore ?? 98;
  const securityLevel = scuttlebuttData?.securityLevel ?? 'high';
  const verificationStatus = scuttlebuttData?.verificationStatus ?? 'verified';
  const lastAuditTimestamp = scuttlebuttData?.lastAuditTimestamp;

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    refreshTimerRef.current = setTimeout(() => {
      setLastUpdated(new Date());
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* 数据新鲜度指示器 */}
      <DataFreshnessIndicator
        lastUpdated={lastUpdated}
        thresholdMinutes={5}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* Overall Risk Overview */}
      <DashboardCard title={t('chronicle.risk.overviewTitle')}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500 mt-1">{t('chronicle.risk.overviewDescription')}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{t('chronicle.risk.overallRiskScore')}</span>
              <span
                className={`px-3 py-1 text-sm font-medium border ${
                  riskData.overallRiskScore >= 90
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : riskData.overallRiskScore >= 70
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : riskData.overallRiskScore >= 50
                        ? 'bg-warning-50 text-orange-700 border-orange-200'
                        : 'bg-danger-50 text-danger-700 border-danger-200'
                }`}
              >
                {riskData.overallRiskScore >= 90
                  ? t('chronicle.risk.lowRisk')
                  : riskData.overallRiskScore >= 70
                    ? t('chronicle.risk.mediumRisk')
                    : riskData.overallRiskScore >= 50
                      ? t('chronicle.risk.highRisk')
                      : t('chronicle.risk.criticalRisk')}
              </span>
            </div>
            <div className="flex items-end justify-end gap-1 mt-2">
              <span
                className={`text-4xl font-bold ${
                  riskData.overallRiskScore >= 90
                    ? 'text-emerald-600'
                    : riskData.overallRiskScore >= 70
                      ? 'text-amber-600'
                      : riskData.overallRiskScore >= 50
                        ? 'text-warning-600'
                        : 'text-danger-600'
                }`}
              >
                {riskData.overallRiskScore}
              </span>
              <span className="text-lg text-gray-500 mb-1">/100</span>
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-200 h-3">
          <div
            className={`h-3 transition-all duration-500 ${
              riskData.overallRiskScore >= 90
                ? 'bg-emerald-500'
                : riskData.overallRiskScore >= 70
                  ? 'bg-amber-500'
                  : riskData.overallRiskScore >= 50
                    ? 'bg-warning-500'
                    : 'bg-danger-500'
            }`}
            style={{ width: `${riskData.overallRiskScore}%` }}
          />
        </div>
      </DashboardCard>

      {/* 四维度评分卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RiskScoreCard
          title={t('chronicle.risk.dataQuality')}
          score={riskData.dataQualityScore}
          description={t('chronicle.risk.dataQualityDesc')}
          trend="up"
          trendValue="+2.5%"
        />
        <RiskScoreCard
          title={t('chronicle.risk.validatorConcentration')}
          score={riskData.validatorConcentration}
          description={t('chronicle.risk.validatorConcentrationDesc')}
          trend="neutral"
          trendValue="0%"
        />
        <RiskScoreCard
          title={t('chronicle.risk.priceDeviation')}
          score={riskData.priceDeviation}
          description={t('chronicle.risk.priceDeviationDesc')}
          trend="up"
          trendValue="+1.2%"
        />
        <RiskScoreCard
          title={t('chronicle.risk.systemStability')}
          score={riskData.systemStability}
          description={t('chronicle.risk.systemStabilityDesc')}
          trend="down"
          trendValue="-0.5%"
        />
      </div>

      {/* 缓解措施网格 */}
      <MitigationMeasuresGrid measures={chronicleMitigationMeasures} />

      {/* Scuttlebutt Security Integration */}
      <DashboardCard title={t('chronicle.risk.scuttlebuttIntegration')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div
              className={`p-3 rounded-full ${securityLevel === 'high' ? 'bg-success-100' : securityLevel === 'medium' ? 'bg-warning-100' : 'bg-danger-100'}`}
            >
              <Shield
                className={`w-6 h-6 ${securityLevel === 'high' ? 'text-success-600' : securityLevel === 'medium' ? 'text-warning-600' : 'text-danger-600'}`}
              />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('chronicle.risk.securityLevel')}</p>
              <p className="text-xl font-bold text-gray-900 capitalize">{securityLevel}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div
              className={`p-3 rounded-full ${verificationStatus === 'verified' ? 'bg-success-100' : verificationStatus === 'pending' ? 'bg-warning-100' : 'bg-danger-100'}`}
            >
              <FileCheck
                className={`w-6 h-6 ${verificationStatus === 'verified' ? 'text-success-600' : verificationStatus === 'pending' ? 'text-warning-600' : 'text-danger-600'}`}
              />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('chronicle.risk.verificationStatus')}</p>
              <p className="text-xl font-bold text-gray-900 capitalize">{verificationStatus}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="p-3 bg-primary-100 rounded-full">
              <Clock className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('chronicle.risk.lastAudit')}</p>
              <p className="text-xl font-bold text-gray-900">
                {lastAuditTimestamp
                  ? new Date(lastAuditTimestamp).toLocaleDateString()
                  : t('chronicle.risk.daysAgo', { days: 7 })}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            <span className="font-medium">{t('chronicle.risk.scuttlebuttNote')}</span>
            {t('chronicle.risk.scuttlebuttNoteDesc')}
          </p>
        </div>
      </DashboardCard>

      {/* Audit Score Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RiskScoreCard
          title={t('chronicle.risk.auditScore')}
          score={auditScore}
          description={t('chronicle.risk.auditScoreDesc')}
          trend="up"
          trendValue="+1.5%"
        />
        <DashboardCard title={t('chronicle.risk.incidentSummary')}>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="p-3 bg-success-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-success-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('chronicle.risk.incidents30d')}</p>
                <p className="text-2xl font-bold text-gray-900">{riskData.incidentCount30d}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="p-3 bg-primary-100 rounded-full">
                <Activity className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('chronicle.risk.lastIncident')}</p>
                <p className="text-2xl font-bold text-gray-900">{riskData.lastIncident}</p>
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Risk Factors */}
      <DashboardCard title={t('chronicle.risk.riskFactors')}>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-success-50 border border-green-200">
            <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">
                {t('chronicle.risk.factor1Title')}
              </p>
              <p className="text-xs text-success-600 mt-1">{t('chronicle.risk.factor1Desc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-success-50 border border-green-200">
            <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">
                {t('chronicle.risk.factor2Title')}
              </p>
              <p className="text-xs text-success-600 mt-1">{t('chronicle.risk.factor2Desc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-warning-50 border border-yellow-200">
            <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                {t('chronicle.risk.factor3Title')}
              </p>
              <p className="text-xs text-warning-600 mt-1">{t('chronicle.risk.factor3Desc')}</p>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
