'use client';

import { useState } from 'react';

import Image from 'next/image';

import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Info,
  ExternalLink,
  Globe,
  AlertTriangle,
} from 'lucide-react';

import { type CredibilityLevel } from '@/lib/oracles/utils/reputationUtils';
import { formatRelativeTime } from '@/lib/utils/format';
import { OracleProvider, type Blockchain } from '@/types/oracle';
import type { OnChainVerification } from '@/types/oracle/price';

export type { CredibilityLevel };

export interface DataSourceInfo {
  provider: OracleProvider;
  chain?: Blockchain;
  source?: string;
  confidence?: number;
  confidenceSource?: 'original' | 'estimated' | 'calculated';
  lastUpdated?: number;
  credibilityLevel?: CredibilityLevel;
  verificationProof?: string;
  verification?: OnChainVerification;
  metadataFallback?: boolean;
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
    label: string;
  }
> = {
  high: {
    icon: ShieldCheck,
    color: 'text-success-600',
    bgColor: 'bg-success-50',
    borderColor: 'border-green-200',
    label: 'High',
  },
  medium: {
    icon: Shield,
    color: 'text-primary-600',
    bgColor: 'bg-primary-50',
    borderColor: 'border-primary-200',
    label: 'Medium',
  },
  low: {
    icon: ShieldAlert,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    label: 'Low',
  },
  unverified: {
    icon: ShieldX,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    label: 'Unverified',
  },
};

const providerDisplayNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.PYTH]: 'Pyth',
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
              {source.metadataFallback && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                  <AlertTriangle size={12} className="text-amber-600" />
                  <span className="text-amber-600 text-xs font-medium">Fallback</span>
                </div>
              )}
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
                  <span className="font-medium text-gray-900">
                    {confidencePercent}%
                    {source.confidenceSource && (
                      <span
                        className={`ml-1.5 text-xs ${source.confidenceSource === 'estimated' ? 'text-amber-500' : 'text-success-600'}`}
                      >
                        {source.confidenceSource === 'estimated' ? 'Estimated' : 'Raw Data'}
                      </span>
                    )}
                  </span>
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

            {source.verification && (
              <div className="mt-2 pt-2 border-t border-gray-200 space-y-1.5">
                <div className="flex items-center gap-1 text-xs text-gray-600 font-medium">
                  {source.verification.type === 'api' ? (
                    <Globe size={12} className="text-blue-500" />
                  ) : (
                    <ShieldCheck size={12} className="text-success-600" />
                  )}
                  {source.verification.type === 'api' ? 'API Verified' : 'On-Chain Verification'}
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">
                      {source.verification.type === 'api' ? 'Source:' : 'Contract:'}
                    </span>
                    <code className="text-gray-600 text-[10px] break-all">
                      {source.verification.type === 'api'
                        ? source.verification.contractAddress
                        : `${source.verification.contractAddress.slice(0, 10)}...${source.verification.contractAddress.slice(-8)}`}
                    </code>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">Method:</span>
                    <code className="text-gray-600 text-[10px]">{source.verification.method}</code>
                  </div>
                </div>
                {source.verification.explorerUrl && (
                  <a
                    href={source.verification.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <ExternalLink size={12} />
                    {source.verification.type === 'api' ? 'View API Source' : 'Verify on Explorer'}
                  </a>
                )}
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

      {/* Chain Name */}
      {showChain && source.chain && <span className="text-xs text-gray-500">• {source.chain}</span>}

      {/* Credibility Badge */}
      <div
        className={`relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bgColor} ${config.borderColor} border`}
      >
        <CredibilityIcon size={12} className={config.color} />
        <span className={`${config.color} text-xs font-medium`}>{config.label}</span>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50">
            {showConfidence && source.confidence !== undefined && source.confidence !== null && (
              <div className="font-medium">
                Confidence: {confidencePercent}%
                {source.confidenceSource
                  ? ` (${source.confidenceSource === 'estimated' ? 'Estimated' : 'Raw Data'})`
                  : ''}
              </div>
            )}
            {source.lastUpdated && (
              <div className="text-gray-300">Updated: {formatRelativeTime(source.lastUpdated)}</div>
            )}
            {source.source && <div className="text-gray-300">Source: {source.source}</div>}
            {source.verification && (
              <div className="text-green-400 mt-1 pt-1 border-t border-gray-700">
                ✓ On-chain: {source.verification.method}
              </div>
            )}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    </div>
  );
}
