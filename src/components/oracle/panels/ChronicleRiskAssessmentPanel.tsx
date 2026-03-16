'use client';

import { useI18n } from '@/lib/i18n/provider';
import { DashboardCard } from '../common/DashboardCard';
import { ScuttlebuttData } from '@/lib/oracles/chronicle';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Activity,
  Lock,
  FileCheck,
  Clock,
} from 'lucide-react';

interface RiskMetric {
  name: string;
  score: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  description: string;
}

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

function getRiskLevel(score: number): {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
} {
  if (score >= 90) {
    return {
      label: 'Low Risk',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    };
  } else if (score >= 70) {
    return {
      label: 'Medium Risk',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
    };
  } else if (score >= 50) {
    return {
      label: 'High Risk',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
    };
  } else {
    return {
      label: 'Critical Risk',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
    };
  }
}

function RiskScoreCard({
  title,
  score,
  description,
  icon: Icon,
}: {
  title: string;
  score: number;
  description: string;
  icon: React.ElementType;
}) {
  const riskLevel = getRiskLevel(score);

  return (
    <div className="bg-white border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium ${riskLevel.bgColor} ${riskLevel.color}`}
        >
          {riskLevel.label}
        </span>
      </div>
      <div className="flex items-end gap-2 mb-2">
        <span className={`text-3xl font-bold ${riskLevel.color}`}>{score}</span>
        <span className="text-sm text-gray-500 mb-1">/100</span>
      </div>
      <div className="w-full bg-gray-200 h-2 mb-2">
        <div
          className={`h-2 transition-all duration-500 ${
            score >= 90
              ? 'bg-green-500'
              : score >= 70
                ? 'bg-yellow-500'
                : score >= 50
                  ? 'bg-orange-500'
                  : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

export function ChronicleRiskAssessmentPanel({
  data,
  scuttlebuttData,
}: ChronicleRiskAssessmentPanelProps) {
  const { t } = useI18n();

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

  const overallRisk = getRiskLevel(riskData.overallRiskScore);

  return (
    <div className="space-y-6">
      {/* Overall Risk Overview */}
      <div className="bg-white border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('chronicle.risk.overviewTitle')}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('chronicle.risk.overviewDescription')}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {t('chronicle.risk.overallRiskScore')}
              </span>
              <span
                className={`px-3 py-1 text-sm font-medium ${overallRisk.bgColor} ${overallRisk.color}`}
              >
                {overallRisk.label}
              </span>
            </div>
            <div className="flex items-end justify-end gap-1 mt-2">
              <span className={`text-4xl font-bold ${overallRisk.color}`}>
                {riskData.overallRiskScore}
              </span>
              <span className="text-lg text-gray-500 mb-1">/100</span>
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-200 h-3 mb-6">
          <div
            className={`h-3 transition-all duration-500 ${
              riskData.overallRiskScore >= 90
                ? 'bg-green-500'
                : riskData.overallRiskScore >= 70
                  ? 'bg-yellow-500'
                  : riskData.overallRiskScore >= 50
                    ? 'bg-orange-500'
                    : 'bg-red-500'
            }`}
            style={{ width: `${riskData.overallRiskScore}%` }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <RiskScoreCard
            title={t('chronicle.risk.dataQuality')}
            score={riskData.dataQualityScore}
            description={t('chronicle.risk.dataQualityDesc')}
            icon={Shield}
          />
          <RiskScoreCard
            title={t('chronicle.risk.validatorConcentration')}
            score={riskData.validatorConcentration}
            description={t('chronicle.risk.validatorConcentrationDesc')}
            icon={Lock}
          />
          <RiskScoreCard
            title={t('chronicle.risk.priceDeviation')}
            score={riskData.priceDeviation}
            description={t('chronicle.risk.priceDeviationDesc')}
            icon={TrendingDown}
          />
          <RiskScoreCard
            title={t('chronicle.risk.systemStability')}
            score={riskData.systemStability}
            description={t('chronicle.risk.systemStabilityDesc')}
            icon={Activity}
          />
          <RiskScoreCard
            title={t('chronicle.risk.auditScore')}
            score={auditScore}
            description={t('chronicle.risk.auditScoreDesc')}
            icon={CheckCircle}
          />
        </div>
      </div>

      {/* Scuttlebutt Security Integration */}
      <DashboardCard title={t('chronicle.risk.scuttlebuttIntegration')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className={`p-3 rounded-full ${securityLevel === 'high' ? 'bg-green-100' : securityLevel === 'medium' ? 'bg-yellow-100' : 'bg-red-100'}`}>
              <Shield className={`w-6 h-6 ${securityLevel === 'high' ? 'text-green-600' : securityLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t('chronicle.risk.securityLevel')}
              </p>
              <p className="text-xl font-bold text-gray-900 capitalize">
                {securityLevel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className={`p-3 rounded-full ${verificationStatus === 'verified' ? 'bg-green-100' : verificationStatus === 'pending' ? 'bg-yellow-100' : 'bg-red-100'}`}>
              <FileCheck className={`w-6 h-6 ${verificationStatus === 'verified' ? 'text-green-600' : verificationStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t('chronicle.risk.verificationStatus')}
              </p>
              <p className="text-xl font-bold text-gray-900 capitalize">
                {verificationStatus}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="p-3 bg-blue-100 rounded-full">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t('chronicle.risk.lastAudit')}
              </p>
              <p className="text-xl font-bold text-gray-900">
                {lastAuditTimestamp ? new Date(lastAuditTimestamp).toLocaleDateString() : '7 days ago'}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <span className="font-medium">{t('chronicle.risk.scuttlebuttNote')}</span>
            {t('chronicle.risk.scuttlebuttNoteDesc')}
          </p>
        </div>
      </DashboardCard>

      {/* Incident Summary */}
      <DashboardCard title={t('chronicle.risk.incidentSummary')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t('chronicle.risk.incidents30d')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {riskData.incidentCount30d}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="p-3 bg-blue-100 rounded-full">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t('chronicle.risk.lastIncident')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {riskData.lastIncident}
              </p>
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Risk Factors */}
      <DashboardCard title={t('chronicle.risk.riskFactors')}>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">
                {t('chronicle.risk.factor1Title')}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {t('chronicle.risk.factor1Desc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">
                {t('chronicle.risk.factor2Title')}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {t('chronicle.risk.factor2Desc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                {t('chronicle.risk.factor3Title')}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                {t('chronicle.risk.factor3Desc')}
              </p>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
