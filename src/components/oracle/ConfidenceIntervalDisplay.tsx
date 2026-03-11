'use client';

import { ConfidenceInterval } from '@/lib/types/oracle';

interface ConfidenceIntervalDisplayProps {
  confidenceInterval: ConfidenceInterval;
  price: number;
  warningThreshold?: number;
}

export function ConfidenceIntervalDisplay({
  confidenceInterval,
  price,
  warningThreshold = 0.5,
}: ConfidenceIntervalDisplayProps) {
  const { bid, ask, widthPercentage } = confidenceInterval;
  const spread = ask - bid;
  const midPrice = (bid + ask) / 2;
  const isWarning = widthPercentage > warningThreshold;

  const bidOffset = ((price - bid) / (ask - bid)) * 100;
  const askOffset = ((ask - price) / (ask - bid)) * 100;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span className="text-sm font-medium text-gray-700">Confidence Interval</span>
        </div>
        {isWarning && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg">
            <svg
              className="w-3.5 h-3.5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-xs font-medium text-amber-700">Wide Spread</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-gray-500">Bid: </span>
              <span className="font-medium text-green-600">${bid.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-gray-500">Ask: </span>
              <span className="font-medium text-red-600">${ask.toFixed(4)}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-gray-500">Spread: </span>
            <span className={`font-medium ${isWarning ? 'text-amber-600' : 'text-gray-700'}`}>
              ${spread.toFixed(4)}
            </span>
          </div>
        </div>

        <div className="relative h-8 bg-gray-200 rounded-lg overflow-hidden">
          <div className="absolute inset-0 flex">
            <div
              className="bg-gradient-to-r from-green-100 to-green-50 border-r border-green-200"
              style={{ width: `${bidOffset}%` }}
            />
            <div
              className="bg-gradient-to-r from-blue-100 to-blue-50 flex items-center justify-center"
              style={{ width: `${100 - bidOffset - askOffset}%` }}
            >
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-3 bg-blue-400 rounded-full" />
                <span className="text-[10px] text-blue-600 font-medium mt-0.5">
                  ${midPrice.toFixed(2)}
                </span>
              </div>
            </div>
            <div
              className="bg-gradient-to-r from-red-50 to-red-100 border-l border-red-200"
              style={{ width: `${askOffset}%` }}
            />
          </div>

          <div className="absolute inset-0 flex items-center justify-between px-2">
            <span className="text-[10px] text-green-700 font-medium">BID</span>
            <span className="text-[10px] text-red-700 font-medium">ASK</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-gray-300 rounded-full" />
            <span className="text-xs text-gray-500">
              Width:{' '}
              <span className={`font-medium ${isWarning ? 'text-amber-600' : 'text-gray-700'}`}>
                {widthPercentage.toFixed(4)}%
              </span>
            </span>
          </div>
          <div className="text-xs text-gray-400">Threshold: {warningThreshold}%</div>
        </div>
      </div>
    </div>
  );
}
