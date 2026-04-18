'use client';

import { useState } from 'react';

import Image from 'next/image';

import { Shield, ShieldCheck, ShieldAlert, ShieldX, Info } from 'lucide-react';

import { OracleProvider, type Blockchain } from '@/types/oracle';

export type CredibilityLevel = 'high' | 'medium' | 'low' | 'unverified';

export interface DataSourceInfo {
  provider: OracleProvider;
  chain?: Blockchain;
  source?: string;
  confidence?: number;
  lastUpdated?: number;
  credibilityLevel?: CredibilityLevel;
  verificationProof?: string;
}

interface DataSourceIndicatorProps {
  source: DataSourceInfo;
  showConfidence?: boolean;
  showChain?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'compact' | 'detailed' | 'minimal';
  className?: string;
}

const credibilityConfig: Record<
  CredibilityLevel,
  {
    icon: typeof ShieldCheck;
    color: string;
    bgColor: string;
    borderColor: string;
    labelKey: string;
    label: string;
  }
> = {
  high: {
    icon: ShieldCheck,
    color: 'text-success-600',
    bgColor: 'bg-success-50',
    borderColor: 'border-green-200',
    labelKey: 'High',
    label: 'High',
  },
  medium: {
    icon: Shield,
    color: 'text-primary-600',
    bgColor: 'bg-primary-50',
    borderColor: 'border-primary-200',
    labelKey: 'Medium',
    label: 'Medium',
  },
  low: {
    icon: ShieldAlert,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    labelKey: 'Low',
    label: 'Low',
  },
  unverified: {
    icon: ShieldX,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    labelKey: 'Unverified',
    label: 'Unverified',
  },
};

const providerDisplayNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.PYTH]: 'Pyth Network',
  [OracleProvider.API3]: 'API3',
  [OracleProvider.REDSTONE]: 'RedStone',
  [OracleProvider.DIA]: 'DIA',
  [OracleProvider.WINKLINK]: 'WINkLink',
  [OracleProvider.SUPRA]: 'Supra',
  [OracleProvider.TWAP]: 'TWAP',
  [OracleProvider.REFLECTOR]: 'Reflector',
  [OracleProvider.FLARE]: 'Flare',
};

const sizeConfig = {
  sm: {
    iconSize: 16,
    logoSize: 20,
    textSize: 'text-xs',
    padding: 'p-1.5',
    gap: 'gap-1.5',
  },
  md: {
    iconSize: 20,
    logoSize: 28,
    textSize: 'text-sm',
    padding: 'p-2',
    gap: 'gap-2',
  },
  lg: {
    iconSize: 24,
    logoSize: 36,
    textSize: 'text-base',
    padding: 'p-3',
    gap: 'gap-3',
  },
};

export function DataSourceIndicator({
  source,
  showConfidence = true,
  showChain = true,
  size = 'md',
  variant = 'compact',
  className = '',
}: DataSourceIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [imageError, setImageError] = useState(false);

  const credibility = source.credibilityLevel || 'medium';
  const config = credibilityConfig[credibility];
  const CredibilityIcon = config.icon;
  const sizes = sizeConfig[size];

  const providerName = providerDisplayNames[source.provider];
  const logoPath = `/logos/oracles/${source.provider}.svg`;

  const confidenceValue = source.confidence ?? 0;
  const confidencePercent = Math.round(confidenceValue * 100);

  if (variant === 'minimal') {
    return (
      <div
        className={`inline-flex items-center ${sizes.gap} ${className}`}
        title={`${providerName}${source.chain ? ` - ${source.chain}` : ''}`}
      >
        {!imageError ? (
          <Image
            src={logoPath}
            alt={providerName}
            width={sizes.logoSize}
            height={sizes.logoSize}
            className="rounded-full"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="rounded-full bg-gray-200 flex items-center justify-center"
            style={{ width: sizes.logoSize, height: sizes.logoSize }}
          >
            <span className="text-xs font-bold text-gray-500">{providerName.charAt(0)}</span>
          </div>
        )}
        <CredibilityIcon size={sizes.iconSize} className={config.color} />
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div
        className={`${config.bgColor} ${config.borderColor} border rounded-lg ${sizes.padding} ${className}`}
      >
        <div className={`flex items-start ${sizes.gap}`}>
          {/* Logo */}
          <div className="flex-shrink-0">
            {!imageError ? (
              <Image
                src={logoPath}
                alt={providerName}
                width={sizes.logoSize}
                height={sizes.logoSize}
                className="rounded-full"
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                className="rounded-full bg-gray-200 flex items-center justify-center"
                style={{ width: sizes.logoSize, height: sizes.logoSize }}
              >
                <span className="text-sm font-bold text-gray-500">{providerName.charAt(0)}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-semibold text-gray-900 ${sizes.textSize}`}>
                {providerName}
              </span>
              <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bgColor} ${config.borderColor} border`}
              >
                <CredibilityIcon size={12} className={config.color} />
                <span className={`${config.color} text-xs font-medium`}>{config.label}</span>
              </div>
            </div>

            {showChain && source.chain && (
              <p className="text-xs text-gray-500 mt-0.5">Chain: {source.chain}</p>
            )}

            {source.source && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">Source: {source.source}</p>
            )}

            {showConfidence && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">Confidence</span>
                  <span className="font-medium text-gray-900">{confidencePercent}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      confidencePercent >= 90
                        ? 'bg-success-500'
                        : confidencePercent >= 70
                          ? 'bg-primary-500'
                          : confidencePercent >= 50
                            ? 'bg-amber-500'
                            : 'bg-danger-500'
                    }`}
                    style={{ width: `${confidencePercent}%` }}
                  />
                </div>
              </div>
            )}

            {source.verificationProof && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <a
                  href={source.verificationProof}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                >
                  <Info size={12} />
                  View Proof
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Compact variant (default)
  return (
    <div
      className={`inline-flex items-center ${sizes.gap} ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Logo */}
      {!imageError ? (
        <Image
          src={logoPath}
          alt={providerName}
          width={sizes.logoSize}
          height={sizes.logoSize}
          className="rounded-full"
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          className="rounded-full bg-gray-200 flex items-center justify-center"
          style={{ width: sizes.logoSize, height: sizes.logoSize }}
        >
          <span className="text-xs font-bold text-gray-500">{providerName.charAt(0)}</span>
        </div>
      )}

      {/* Provider Name */}
      <span className={`font-medium text-gray-900 ${sizes.textSize}`}>{providerName}</span>

      {/* Credibility Badge */}
      <div
        className={`relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bgColor} ${config.borderColor} border`}
      >
        <CredibilityIcon size={12} className={config.color} />
        <span className={`${config.color} text-xs font-medium`}>{config.labelKey}</span>

        {/* Tooltip */}
        {showTooltip && showConfidence && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50">
            <div className="font-medium">Confidence: {confidencePercent}%</div>
            {source.chain && <div className="text-gray-300">{source.chain}</div>}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    </div>
  );
}

export default DataSourceIndicator;
