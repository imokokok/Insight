'use client';

interface ConfidenceBadgeProps {
  score?: number;
}

export function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  if (score === undefined) {
    return <span className="text-gray-400">-</span>;
  }

  // Normalize score to 0-100 range
  const normalizedScore = Math.min(100, Math.max(0, score * 100));

  const getRating = (s: number): { label: string; color: string } => {
    if (s >= 90) return { label: '高', color: 'bg-success-100 text-success-700' };
    if (s >= 70) return { label: '中', color: 'bg-primary-100 text-primary-700' };
    return { label: '低', color: 'bg-warning-100 text-orange-700' };
  };

  const rating = getRating(normalizedScore);

  return (
    <div className="flex items-center justify-end gap-2">
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            normalizedScore >= 90
              ? 'bg-success-500'
              : normalizedScore >= 70
                ? 'bg-primary-500'
                : 'bg-warning-500'
          }`}
          style={{ width: `${normalizedScore}%` }}
        />
      </div>
      <span className={`text-xs px-2 py-0.5 rounded ${rating.color}`}>{rating.label}</span>
    </div>
  );
}
