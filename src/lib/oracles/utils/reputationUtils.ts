import { semanticColors } from '@/lib/config/colors';

export function getScoreColor(score: number): string {
  if (score >= 90) return semanticColors.success.DEFAULT;
  if (score >= 75) return semanticColors.info.DEFAULT;
  if (score >= 60) return semanticColors.warning.DEFAULT;
  if (score >= 40) return '#f97316';
  return semanticColors.danger.DEFAULT;
}

export function getScoreBadge(score: number): {
  label: string;
  bgClass: string;
  textClass: string;
} {
  if (score >= 90)
    return { label: 'Excellent', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' };
  if (score >= 75) return { label: 'Good', bgClass: 'bg-blue-50', textClass: 'text-blue-700' };
  if (score >= 60) return { label: 'Fair', bgClass: 'bg-amber-50', textClass: 'text-amber-700' };
  if (score >= 40) return { label: 'Poor', bgClass: 'bg-orange-50', textClass: 'text-orange-700' };
  return { label: 'Unrated', bgClass: 'bg-gray-50', textClass: 'text-gray-500' };
}

export function getScoreGradient(score: number): string {
  if (score >= 90) return 'from-emerald-500 to-teal-400';
  if (score >= 75) return 'from-blue-500 to-cyan-400';
  if (score >= 60) return 'from-amber-500 to-yellow-400';
  if (score >= 40) return 'from-orange-500 to-amber-400';
  return 'from-gray-400 to-gray-300';
}

export function formatTimeAgo(isoString: string | null): { text: string; color: string } | null {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return { text: 'just now', color: 'text-emerald-600' };
  if (minutes < 60) return { text: `${minutes}m ago`, color: 'text-emerald-600' };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { text: `${hours}h ago`, color: 'text-gray-500' };
  const days = Math.floor(hours / 24);
  return { text: `${days}d ago`, color: 'text-gray-400' };
}

export const SCORE_WEIGHTS = [
  { key: 'accuracy', label: 'Accuracy', weight: 25, color: '#3b82f6' },
  { key: 'uptime', label: 'Uptime', weight: 20, color: '#10b981' },
  { key: 'reliability', label: 'Reliability', weight: 20, color: '#8b5cf6' },
  { key: 'freshness', label: 'Freshness', weight: 15, color: '#f59e0b' },
  { key: 'latency', label: 'Latency', weight: 10, color: '#06b6d4' },
  { key: 'deviation', label: 'Deviation', weight: 10, color: '#f43f5e' },
] as const;
