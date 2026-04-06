import type { PublisherData } from './types';

export function calculateTotalSubmissions(publishers: PublisherData[]): number {
  return publishers.reduce((sum, p) => sum + (p.totalSubmissions ?? 0), 0);
}

export function calculateAverageLatency(publishers: PublisherData[]): number {
  if (publishers.length === 0) return 0;
  const total = publishers.reduce((sum, p) => sum + (p.averageLatency ?? 0), 0);
  return Math.round(total / publishers.length);
}
