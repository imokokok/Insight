type StatRating = 'excellent' | 'good' | 'attention' | 'danger';

interface StatRatingResult {
  rating: StatRating;
  label: string;
  color: string;
  bgColor: string;
}

const ratingConfig: Record<StatRating, Omit<StatRatingResult, 'rating'>> = {
  excellent: { label: '优秀', color: '#059669', bgColor: '#d1fae5' },
  good: { label: '良好', color: '#2563eb', bgColor: '#dbeafe' },
  attention: { label: '需关注', color: '#d97706', bgColor: '#fef3c7' },
  danger: { label: '危险', color: '#dc2626', bgColor: '#fee2e2' },
};

export function getStatRating(metricType: string, value: number): StatRatingResult | null {
  const absValue = Math.abs(value);

  switch (metricType) {
    case 'stddev':
    case 'standardDeviation':
    case 'stdDev':
    case 'std_dev':
      if (absValue < 0.1) return { rating: 'excellent', ...ratingConfig.excellent };
      if (absValue < 0.5) return { rating: 'good', ...ratingConfig.good };
      if (absValue < 1) return { rating: 'attention', ...ratingConfig.attention };
      return { rating: 'danger', ...ratingConfig.danger };

    case 'deviation':
    case 'priceDeviation':
      if (absValue < 0.5) return { rating: 'excellent', ...ratingConfig.excellent };
      if (absValue < 2) return { rating: 'good', ...ratingConfig.good };
      if (absValue < 5) return { rating: 'attention', ...ratingConfig.attention };
      return { rating: 'danger', ...ratingConfig.danger };

    case 'consistency':
    case 'agreement':
      if (value >= 99) return { rating: 'excellent', ...ratingConfig.excellent };
      if (value >= 95) return { rating: 'good', ...ratingConfig.good };
      if (value >= 90) return { rating: 'attention', ...ratingConfig.attention };
      return { rating: 'danger', ...ratingConfig.danger };

    case 'latency':
    case 'delay':
      if (absValue < 100) return { rating: 'excellent', ...ratingConfig.excellent };
      if (absValue < 500) return { rating: 'good', ...ratingConfig.good };
      if (absValue < 1000) return { rating: 'attention', ...ratingConfig.attention };
      return { rating: 'danger', ...ratingConfig.danger };

    default:
      return null;
  }
}
