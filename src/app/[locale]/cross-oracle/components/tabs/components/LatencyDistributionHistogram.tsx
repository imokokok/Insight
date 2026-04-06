'use client';

interface LatencyDistributionHistogramProps {
  data: number[];
  oracleName: string;
}

export function LatencyDistributionHistogram({
  data: _data,
  oracleName,
}: LatencyDistributionHistogramProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <p className="text-sm text-gray-500">Latency Distribution for {oracleName} (Placeholder)</p>
    </div>
  );
}
