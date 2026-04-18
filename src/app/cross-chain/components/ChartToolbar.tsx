'use client';

export interface ChartToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onPanLeft: () => void;
  onPanRight: () => void;
  onAddReferenceLine: (type: 'current' | 'avg' | 'median' | 'custom') => void;
  referenceLineCount: number;
  onClearAllReferenceLines: () => void;
  viewStartIndex: number;
  viewEndIndex: number;
  totalDataPoints: number;
}

export function ChartToolbar({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onPanLeft,
  onPanRight,
  onAddReferenceLine,
  referenceLineCount,
  onClearAllReferenceLines,
  viewStartIndex,
  viewEndIndex,
  totalDataPoints,
}: ChartToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Price Chart</h3>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-md">
          <button
            onClick={onZoomIn}
            className="p-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-all duration-200 hover:border-gray-400"
            title="Zoom In"
          >
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
          </button>
          <button
            onClick={onZoomOut}
            className="p-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-all duration-200 hover:border-gray-400"
            title="Zoom Out"
          >
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
              />
            </svg>
          </button>
          <button
            onClick={onResetZoom}
            className="p-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-all duration-200 hover:border-gray-400"
            title="Reset Zoom"
          >
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-md">
          <button
            onClick={onPanLeft}
            className="p-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-all duration-200 hover:border-gray-400"
            title="Pan Left"
          >
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={onPanRight}
            className="p-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-all duration-200 hover:border-gray-400"
            title="Pan Right"
          >
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddReferenceLine('current')}
            className="px-2 py-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded transition-all duration-200"
          >
            Current Price
          </button>
          <button
            onClick={() => onAddReferenceLine('avg')}
            className="px-2 py-1.5 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded transition-all duration-200"
          >
            Average Price
          </button>
          <button
            onClick={() => onAddReferenceLine('median')}
            className="px-2 py-1.5 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded transition-all duration-200"
          >
            Median Price
          </button>
          {referenceLineCount > 0 && (
            <button
              onClick={onClearAllReferenceLines}
              className="px-2 py-1.5 text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded transition-all duration-200"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="text-xs text-gray-500 px-2">
          {viewStartIndex + 1} - {viewEndIndex + 1} / {totalDataPoints}
        </div>
      </div>
    </div>
  );
}
