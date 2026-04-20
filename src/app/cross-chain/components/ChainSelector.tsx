'use client';

import { type Blockchain } from '@/types/oracle';

import { chainNames, chainColors } from '../constants';

interface ChainSelectorProps {
  supportedChains: Blockchain[];
  visibleChains: Blockchain[];
  onToggleChain: (chain: Blockchain) => void;
}

export function ChainSelector({
  supportedChains,
  visibleChains,
  onToggleChain,
}: ChainSelectorProps) {
  return (
    <div>
      <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
        Visible Chains
        <span className="ml-1 text-gray-400">
          ({visibleChains.length}/{supportedChains.length})
        </span>
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {supportedChains.map((chain) => {
          const isVisible = visibleChains.includes(chain);
          return (
            <button
              key={chain}
              onClick={() => onToggleChain(chain)}
              className={`px-2 py-1 text-xs font-medium transition-all duration-200 flex items-center gap-1.5 rounded-md ${
                isVisible
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: isVisible ? 'white' : chainColors[chain],
                }}
              />
              {chainNames[chain]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
