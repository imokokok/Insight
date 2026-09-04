'use client';

import { motion } from 'framer-motion';
import { Coins, DollarSign, Bitcoin, Hexagon, CircleDollarSign, Gem } from 'lucide-react';

import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, typeof Coins> = {
  ETH: Hexagon,
  WBTC: Bitcoin,
  USDC: CircleDollarSign,
  USDT: DollarSign,
  LINK: Gem,
  ARB: Hexagon,
};

interface AssetSelectorProps {
  assets: Array<{ symbol: string; category: string }>;
  selected: string;
  onSelect: (symbol: string) => void;
  label: string;
  disabled?: boolean;
  compact?: boolean;
}

export function AssetSelector({
  assets,
  selected,
  onSelect,
  label,
  disabled,
  compact,
}: AssetSelectorProps) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <div className="flex flex-wrap border-l border-t border-slate-300">
        {assets.map((asset, i) => {
          const Icon = ICON_MAP[asset.symbol] ?? Coins;
          const isSelected = selected === asset.symbol;

          return (
            <motion.button
              key={asset.symbol}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => !disabled && onSelect(asset.symbol)}
              disabled={disabled}
              type="button"
              className={cn(
                'relative flex items-center gap-1.5 border-b border-r border-slate-300 px-3 py-2 text-sm font-medium transition-colors duration-200',
                compact && 'px-2 py-1.5 text-xs',
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-700'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', isSelected ? 'text-white' : 'text-gray-400')} />
              {asset.symbol}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
