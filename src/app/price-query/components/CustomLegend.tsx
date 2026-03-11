'use client';

interface CustomLegendProps {
  payload?: Array<{ value: string; color: string }>;
  onToggleSeries?: (seriesName: string) => void;
  hiddenSeries?: Set<string>;
}

export function CustomLegend({ payload, onToggleSeries, hiddenSeries }: CustomLegendProps) {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 pt-4">
      {payload.map((entry, index) => {
        const isHidden = hiddenSeries?.has(entry.value);
        return (
          <button
            key={index}
            onClick={() => onToggleSeries?.(entry.value)}
            className={`flex items-center gap-2 px-2 py-1 transition-opacity cursor-pointer ${
              isHidden ? 'opacity-40' : 'opacity-100'
            }`}
          >
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-xs">{entry.value}</span>
          </button>
        );
      })}
    </div>
  );
}
