import { RiskLevel } from '@/types/risk';

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  }
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffDays < 30) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  return date.toLocaleDateString();
}

export function isDataStale(lastUpdated: Date, thresholdMinutes: number = 5): boolean {
  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffMins = Math.floor(diffMs / 1000 / 60);
  return diffMins > thresholdMinutes;
}

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
}

export function getScoreBg(score: number): string {
  if (score >= 90) return 'bg-green-100';
  if (score >= 70) return 'bg-yellow-100';
  return 'bg-red-100';
}

export function getScoreBarColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function getEventTypeColor(type: string): string {
  switch (type) {
    case 'upgrade':
      return 'bg-blue-100 text-blue-700';
    case 'vulnerability':
      return 'bg-red-100 text-red-700';
    case 'response':
      return 'bg-green-100 text-green-700';
    case 'maintenance':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 90) return 'low';
  if (score >= 70) return 'medium';
  return 'high';
}

export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'bg-green-100 text-green-700';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700';
    case 'high':
      return 'bg-red-100 text-red-700';
  }
}

export function getStatusColor(status: 'resolved' | 'monitoring'): string {
  return status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
}

export function getMeasureStatusColor(status: 'active' | 'inactive'): string {
  return status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';
}

export function formatLatency(latency: number): string {
  return latency < 1000 ? `${latency}ms` : `${(latency / 1000).toFixed(1)}s`;
}

export function calculateOverallScore(metrics: { value: number }[]): number {
  return Math.round(metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length);
}
