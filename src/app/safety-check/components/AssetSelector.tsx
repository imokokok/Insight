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
      <div className={cn('flex flex-wrap gap-2', compact && 'gap-1.5')}>
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
                'relative flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200',
                compact && 'px-2 py-1.5 text-xs',
                isSelected
                  ? 'bg-primary-50 border-primary-300 text-primary-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <Icon
                className={cn('w-3.5 h-3.5', isSelected ? 'text-primary-600' : 'text-gray-400')}
              />
              {asset.symbol}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
