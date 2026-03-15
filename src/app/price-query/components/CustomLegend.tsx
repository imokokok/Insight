'use client';

interface CustomLegendProps {
  payload?: Array<{ value: string; color: string }>;
  onToggleSeries?: (seriesName: string) => void;
  hiddenSeries?: Set<string>;
}

export function CustomLegend({ payload, onToggleSeries, hiddenSeries }: CustomLegendProps) {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-4 pt-4 px-2">
      {payload.map((entry, index) => {
        const isHidden = hiddenSeries?.has(entry.value);
        // Truncate long legend text
        const displayValue =
          entry.value.length > 25 ? entry.value.substring(0, 22) + '...' : entry.value;

        return (
          <button
            key={index}
            onClick={() => onToggleSeries?.(entry.value)}
            className={`flex items-center gap-1.5 sm:gap-2 px-2 py-1 transition-opacity cursor-pointer hover:bg-gray-100 rounded ${
              isHidden ? 'opacity-40' : 'opacity-100'
            }`}
            title={entry.value}
          >
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[10px] sm:text-xs truncate max-w-[120px] sm:max-w-[180px]">
              {displayValue}
            </span>
          </button>
        );
      })}
    </div>
  );
}
