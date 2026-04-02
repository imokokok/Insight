'use client';

import { ExternalLink, Database, Clock, Box, Link2 } from 'lucide-react';

import { useTranslations } from '@/i18n';
import {
  type DataVerificationInfo,
  type ChainId,
  formatTxHash,
  formatAddress,
  formatBlockHeight,
  generateVerificationLinks,
  getChainName,
} from '@/lib/oracles/tellorDataVerification';

export interface DataSourceIndicatorProps {
  info: DataVerificationInfo;
  className?: string;
  compact?: boolean;
  showLabels?: boolean;
}

function getSourceColor(source: DataVerificationInfo['source']): string {
  const colors = {
    'on-chain': 'text-emerald-600 bg-emerald-50',
    cache: 'text-blue-600 bg-blue-50',
    fallback: 'text-amber-600 bg-amber-50',
  };
  return colors[source];
}

function getSourceDotColor(source: DataVerificationInfo['source']): string {
  const colors = {
    'on-chain': 'bg-emerald-500',
    cache: 'bg-blue-500',
    fallback: 'bg-amber-500',
  };
  return colors[source];
}

export function DataSourceIndicator({
  info,
  className = '',
  compact = false,
  showLabels = true,
}: DataSourceIndicatorProps) {
  const t = useTranslations();
  const links = generateVerificationLinks(info);
  const chainName = info.chainId ? getChainName(info.chainId) : '';

  const getSourceLabel = (source: DataVerificationInfo['source']): string => {
    const labels = {
      'on-chain': t('tellor.reporters.dataSourceOnChain'),
      cache: t('tellor.reporters.dataSourceCache'),
      fallback: t('tellor.reporters.dataSourceFallback'),
    };
    return labels[source];
  };

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) {
      return t('common.time.justNow');
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return t('common.time.minutesAgo', { minutes });
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return t('common.time.hoursAgo', { hours });
    } else {
      const days = Math.floor(diff / 86400000);
      return t('common.time.daysAgo', { days });
    }
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getSourceColor(info.source)}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${getSourceDotColor(info.source)}`} />
          {getSourceLabel(info.source)}
        </div>
        {info.blockHeight && (
          <span className="text-xs text-gray-500">#{formatBlockHeight(info.blockHeight)}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">{t('tellor.dataSource')}</span>
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getSourceColor(info.source)}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${getSourceDotColor(info.source)}`} />
          {getSourceLabel(info.source)}
        </div>
      </div>

      <div className="space-y-2">
        {info.blockHeight && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-gray-500">
              <Box className="w-3.5 h-3.5" />
              {showLabels && <span>{t('tellor.tellorLayer.overview.blockHeight')}</span>}
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium text-gray-900">
                #{formatBlockHeight(info.blockHeight)}
              </span>
              {links.blockUrl && (
                <a
                  href={links.blockUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 hover:text-cyan-700 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {info.txHash && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-gray-500">
              <Link2 className="w-3.5 h-3.5" />
              {showLabels && <span>{t('tellor.disputes.transaction')}</span>}
            </div>
            <div className="flex items-center gap-1">
              <code className="text-xs font-mono text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">
                {formatTxHash(info.txHash)}
              </code>
              {links.txUrl && (
                <a
                  href={links.txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 hover:text-cyan-700 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {info.reporterAddress && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-gray-500">
              <Database className="w-3.5 h-3.5" />
              {showLabels && <span>{t('tellor.reporters.address')}</span>}
            </div>
            <div className="flex items-center gap-1">
              <code className="text-xs font-mono text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">
                {formatAddress(info.reporterAddress)}
              </code>
              {links.reporterUrl && (
                <a
                  href={links.reporterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 hover:text-cyan-700 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {info.timestamp && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              {showLabels && <span>{t('tellor.reporters.lastUpdated')}</span>}
            </div>
            <span className="text-gray-900">{formatTimestamp(info.timestamp)}</span>
          </div>
        )}

        {chainName && (
          <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-100">
            <span className="text-gray-500">{t('tellor.multiChain.chain')}</span>
            <span className="font-medium text-gray-900">{chainName}</span>
          </div>
        )}

        {links.tellorScanUrl && (
          <div className="pt-2 border-t border-gray-100">
            <a
              href={links.tellorScanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-sm text-cyan-600 hover:text-cyan-700 transition-colors"
            >
              <span>{t('tellor.reporters.viewOnEtherscan')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export interface VerificationBadgeProps {
  txHash?: string;
  blockHeight?: number;
  chainId?: ChainId;
  className?: string;
}

export function VerificationBadge({
  txHash,
  blockHeight,
  chainId = 1,
  className = '',
}: VerificationBadgeProps) {
  const t = useTranslations();

  if (!txHash && !blockHeight) return null;

  const info: DataVerificationInfo = {
    source: 'on-chain',
    txHash,
    blockHeight,
    chainId,
  };
  const links = generateVerificationLinks(info);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {txHash && links.txUrl && (
        <a
          href={links.txUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-cyan-600 hover:text-cyan-700 text-xs transition-colors"
          title={t('tellor.reporters.viewOnEtherscan')}
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

export default DataSourceIndicator;
