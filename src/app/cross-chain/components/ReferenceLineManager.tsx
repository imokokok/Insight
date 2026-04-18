'use client';

export interface ReferenceLineConfig {
  id: string;
  y: number;
  label: string;
  color: string;
  strokeDasharray?: string;
}

export interface ReferenceLineListProps {
  referenceLines: ReferenceLineConfig[];
  onRemove: (id: string) => void;
}

export function ReferenceLineList({ referenceLines, onRemove }: ReferenceLineListProps) {
  if (referenceLines.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mb-2 flex-wrap">
      <span className="text-xs text-gray-500">Reference Lines:</span>
      {referenceLines.map((line) => (
        <div
          key={line.id}
          className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs"
        >
          <span className="w-2 h-0.5 rounded-full" style={{ backgroundColor: line.color }} />
          <span className="text-gray-600">{line.label}:</span>
          <span className="font-mono text-gray-800">${line.y.toFixed(4)}</span>
          <button
            onClick={() => onRemove(line.id)}
            className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
