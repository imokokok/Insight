export type StatusType = 'active' | 'inactive' | 'degraded' | 'excellent' | 'good' | 'warning' | 'error';

const statusColors: Record<StatusType, { text: string; bg: string; dot: string }> = {
  active: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    dot: 'bg-emerald-500',
  },
  inactive: {
    text: 'text-gray-500',
    bg: 'bg-gray-50',
    dot: 'bg-gray-400',
  },
  degraded: {
    text: 'text-yellow-600',
    bg: 'bg-yellow-50',
    dot: 'bg-yellow-500',
  },
  excellent: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    dot: 'bg-emerald-500',
  },
  good: {
    text: 'text-blue-600',
    bg: 'bg-blue-50',
    dot: 'bg-blue-500',
  },
  warning: {
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    dot: 'bg-amber-500',
  },
  error: {
    text: 'text-red-600',
    bg: 'bg-red-50',
    dot: 'bg-red-500',
  },
};

export function getStatusColor(status: StatusType): string {
  return statusColors[status]?.text ?? 'text-gray-500';
}

export function getStatusBgColor(status: StatusType): string {
  return statusColors[status]?.bg ?? 'bg-gray-50';
}

export function getStatusDotColor(status: StatusType): string {
  return statusColors[status]?.dot ?? 'bg-gray-400';
}

export function getReliabilityColor(reliability: number): string {
  if (reliability >= 99) return 'text-emerald-600';
  if (reliability >= 95) return 'text-blue-600';
  if (reliability >= 90) return 'text-yellow-600';
  if (reliability >= 80) return 'text-amber-600';
  return 'text-red-600';
}

export function getReliabilityBgColor(reliability: number): string {
  if (reliability >= 99) return 'bg-emerald-50';
  if (reliability >= 95) return 'bg-blue-50';
  if (reliability >= 90) return 'bg-yellow-50';
  if (reliability >= 80) return 'bg-amber-50';
  return 'bg-red-50';
}

export function getLatencyColor(latencyMs: number): string {
  if (latencyMs < 100) return 'text-emerald-600';
  if (latencyMs < 300) return 'text-blue-600';
  if (latencyMs < 500) return 'text-yellow-600';
  if (latencyMs < 1000) return 'text-amber-600';
  return 'text-red-600';
}

export function getUptimeColor(uptime: number): string {
  if (uptime >= 99.9) return 'text-emerald-600';
  if (uptime >= 99) return 'text-blue-600';
  if (uptime >= 95) return 'text-yellow-600';
  if (uptime >= 90) return 'text-amber-600';
  return 'text-red-600';
}
