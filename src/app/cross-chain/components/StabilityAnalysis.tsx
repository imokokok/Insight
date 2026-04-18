'use client';

import { baseColors, semanticColors } from '@/lib/config/colors';
import { type Blockchain } from '@/types/oracle';

import { chainNames, chainColors, getIntegrityColor, getStabilityRating } from '../utils';

export interface StabilityAnalysisProps {
  filteredChains: Blockchain[];
  chainVolatility: Record<string, number>;
  dataIntegrity: Record<string, number>;
  priceJumpFrequency: Record<string, number>;
  priceDifferences: Array<{ chain: string; diff: number }>;
}

export function StabilityAnalysis({
  filteredChains,
  chainVolatility,
  dataIntegrity,
  priceJumpFrequency,
  priceDifferences,
}: StabilityAnalysisProps) {
  return (
    <div
      id="stability"
      className="mb-8 pb-8 border-b"
      style={{ borderColor: baseColors.gray[100] }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: baseColors.gray[900] }}>
        Stability Analysis
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr style={{ borderBottom: `1px solid ${baseColors.gray[100]}` }}>
              <th
                className="px-3 py-2.5 text-xs font-medium"
                style={{ color: baseColors.gray[500] }}
              >
                Blockchain
              </th>
              <th
                className="px-3 py-2.5 text-xs font-medium"
                style={{ color: baseColors.gray[500] }}
              >
                Data Integrity
              </th>
              <th
                className="px-3 py-2.5 text-xs font-medium"
                style={{ color: baseColors.gray[500] }}
              >
                Absolute Price Diff
              </th>
              <th
                className="px-3 py-2.5 text-xs font-medium"
                style={{ color: baseColors.gray[500] }}
              >
                Price Jump Frequency
              </th>
              <th
                className="px-3 py-2.5 text-xs font-medium text-right"
                style={{ color: baseColors.gray[500] }}
              >
                Stability Rating
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredChains.map((chain) => {
              const volatility = chainVolatility[chain] ?? 0;
              const stabilityRating = getStabilityRating(volatility);
              const integrity = dataIntegrity[chain] ?? 0;
              const jumpCount = priceJumpFrequency[chain] ?? 0;
              const priceDiff = priceDifferences.find((p) => p.chain === chain);
              const absoluteDiff = priceDiff?.diff ?? 0;
              return (
                <tr
                  key={chain}
                  className="hover:bg-gray-50"
                  style={{
                    borderBottom: `1px solid ${baseColors.gray[100]}`,
                    backgroundColor: 'transparent',
                  }}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 mr-2"
                        style={{ backgroundColor: chainColors[chain] }}
                      />
                      <span className="text-sm font-medium">{chainNames[chain]}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${integrity}%`,
                          backgroundColor: getIntegrityColor(integrity),
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 mt-1">{integrity.toFixed(1)}%</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`font-mono text-sm ${
                        Math.abs(absoluteDiff) > 1 ? 'font-semibold text-red-600' : 'text-gray-700'
                      }`}
                    >
                      {absoluteDiff > 0 ? '+' : ''}${absoluteDiff.toFixed(4)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {jumpCount > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        {jumpCount} jumps
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className="text-sm font-medium"
                      style={{
                        color:
                          stabilityRating === 'stable'
                            ? semanticColors.success.main
                            : stabilityRating === 'moderate'
                              ? semanticColors.warning.main
                              : semanticColors.danger.main,
                      }}
                    >
                      {volatility > 0 ? stabilityRating : '-'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
