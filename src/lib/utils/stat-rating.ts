type StatRating = 'excellent' | 'good' | 'attention' | 'danger';

interface StatRatingResult {
  rating: StatRating;
  label: string;
  color: string;
  bgColor: string;
}

const ratingConfig: Record<StatRating, Omit<StatRatingResult, 'rating'>> = {
  excellent: { label: 'Excellent', color: '#059669', bgColor: '#d1fae5' },
  good: { label: 'Good', color: '#2563eb', bgColor: '#dbeafe' },
  attention: { label: 'Attention', color: '#d97706', bgColor: '#fef3c7' },
  danger: { label: 'Danger', color: '#dc2626', bgColor: '#fee2e2' },
};

// Aliases collapse onto a canonical metric key so the threshold table below
// stays single-source-of-truth instead of repeating bands per synonym.
const METRIC_ALIASES: Record<string, string> = {
  stddev: 'stdDev',
  standardDeviation: 'stdDev',
  stdDev: 'stdDev',
  std_dev: 'stdDev',
  priceDeviation: 'deviation',
  deviation: 'deviation',
  agreement: 'consistency',
  consistency: 'consistency',
  confidence: 'confidence',
  delay: 'latency',
  latency: 'latency',
};

interface MetricScale {
  // Whether to rate against the absolute magnitude (`true`) or the raw value (`false`).
  useAbs: boolean;
  // `lt` bands are upper bounds (value < excellent → excellent); `ge` bands are
  // lower bounds (value >= excellent → excellent). The two families differ on purpose.
  direction: 'lt' | 'ge';
  excellent: number;
  good: number;
  attention: number;
}

const METRIC_SCALES: Record<string, MetricScale> = {
  stdDev: { useAbs: true, direction: 'lt', excellent: 0.1, good: 0.5, attention: 1 },
  deviation: { useAbs: true, direction: 'lt', excellent: 0.5, good: 2, attention: 5 },
  consistency: { useAbs: false, direction: 'ge', excellent: 99, good: 95, attention: 90 },
  confidence: { useAbs: false, direction: 'ge', excellent: 0.99, good: 0.95, attention: 0.9 },
  latency: { useAbs: true, direction: 'lt', excellent: 100, good: 500, attention: 1000 },
};

export function getStatRating(metricType: string, value: number): StatRatingResult | null {
  const scale = METRIC_SCALES[METRIC_ALIASES[metricType]];
  if (!scale) return null;

  const v = scale.useAbs ? Math.abs(value) : value;
  const { excellent, good, attention } = scale;

  let rating: StatRating;
  if (scale.direction === 'lt') {
    if (v < excellent) rating = 'excellent';
    else if (v < good) rating = 'good';
    else if (v < attention) rating = 'attention';
    else rating = 'danger';
  } else {
    if (v >= excellent) rating = 'excellent';
    else if (v >= good) rating = 'good';
    else if (v >= attention) rating = 'attention';
    else rating = 'danger';
  }

  return { rating, ...ratingConfig[rating] };
}
