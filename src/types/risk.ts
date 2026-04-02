export interface RiskMetric {
  name: string;
  value: number;
  maxValue: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  weight?: number;
}

export interface RiskEvent {
  date: string;
  type: 'upgrade' | 'vulnerability' | 'response' | 'maintenance';
  title: string;
  description: string;
  status: 'resolved' | 'monitoring';
}

export interface MitigationMeasure {
  name: string;
  type: 'technical' | 'governance' | 'operational';
  status: 'active' | 'inactive';
  effectiveness: number;
}

export interface CrossChainRisk {
  chain: string;
  availability: number;
  latency: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskAssessmentData {
  overallScore: number;
  overallLevel: RiskLevel;
  dimensions: {
    decentralization: RiskMetric;
    security: RiskMetric;
    stability: RiskMetric;
    dataQuality: RiskMetric;
  };
  metrics: Record<string, number | string>;
  events: RiskEvent[];
  crossChainRisks: CrossChainRisk[];
  mitigationMeasures: MitigationMeasure[];
  lastUpdated: Date;
}

export interface RiskTrendPoint {
  timestamp: number;
  riskScore: number;
  anomalyCount: number;
  event?: string;
}

export interface RiskRecommendation {
  id: string;
  priority: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  action?: string;
  relatedOracle?: string;
}

export interface RiskHeatmapData {
  oracle: string;
  riskLevel: 'high' | 'medium' | 'low' | 'normal';
  deviation: number;
  timestamp: number;
}

export interface RiskIndicator {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  threshold: { warning: number; critical: number };
}
