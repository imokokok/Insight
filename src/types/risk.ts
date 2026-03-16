export interface RiskMetric {
  name: string;
  value: number;
  maxValue: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
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
