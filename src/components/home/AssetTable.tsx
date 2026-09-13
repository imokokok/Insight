'use client';

import { memo, useState, type CSSProperties } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { ArrowUpRight, Clock } from 'lucide-react';

import { providerNames } from '@/lib/constants';

import type { AssetConsensusData } from './types';

interface AssetTableProps {
  assets: AssetConsensusData[];
  isLoading: boolean;
  now: number;
}

function formatPrice(price: number, symbol: string): string {
  if (price === 0) return '—';
  if (symbol === 'USDT' || symbol === 'USDC') return `$${price.toFixed(4)}`;
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${price.toFixed(2)}`;
}

function formatSpread(percent: number): string {
  if (percent === 0) return '—';
  if (percent < 0.01) return '<0.01%';
  return `${percent.toFixed(2)}%`;
}

function formatRelativeTime(timestamp: number, now: number): string {
  if (!timestamp || timestamp <= 0) return '—';
  const seconds = Math.floor((now - timestamp) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function CryptoIcon({ symbol }: { symbol: string }) {
  const [hasError, setHasError] = useState(false);
  if (hasError) return <span className="asset-ledger-fallback">{symbol.slice(0, 2)}</span>;

  return (
    <span className="asset-ledger-coin">
      <Image
        src={`/logos/cryptos/${symbol.toLowerCase()}.svg`}
        alt=""
        width={28}
        height={28}
        onError={() => setHasError(true)}
      />
    </span>
  );
}

function getPosition(asset: AssetConsensusData, price: number): number {
  const span = asset.priceRange.max - asset.priceRange.min;
  if (span <= 0) return 50;
  return 6 + ((price - asset.priceRange.min) / span) * 88;
}

function AssetLedgerSkeleton() {
  return (
    <div className="asset-ledger-record is-loading" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function AssetTableComponent({ assets, isLoading, now }: AssetTableProps) {
  const showSkeleton = isLoading && assets.every((asset) => asset.consensusPrice === 0);

  return (
    <section className="asset-ledger home-view-reveal" aria-labelledby="asset-ledger-title">
      <header className="asset-ledger-header">
        <div>
          <p className="instrument-label">Evidence instrument 02 / live ledger</p>
          <h3 id="asset-ledger-title">Cross-oracle price evidence</h3>
        </div>
        <p>
          Four market records. Each line preserves the median, observed bounds, source positions,
          and sampling time.
        </p>
        <Link href="/price-insight">
          Open full ledger <ArrowUpRight aria-hidden="true" />
        </Link>
      </header>

      <div className="asset-ledger-sheet">
        <div className="asset-ledger-ruler" aria-hidden="true">
          <span>Record</span>
          <span>Consensus</span>
          <span>Source field / observed range</span>
          <span>Coverage</span>
        </div>

        {showSkeleton
          ? Array.from({ length: 4 }).map((_, index) => <AssetLedgerSkeleton key={index} />)
          : assets.map((asset, index) => {
              const consensusPosition = getPosition(asset, asset.consensusPrice);
              return (
                <article className="asset-ledger-record" key={asset.symbol}>
                  <div className="asset-ledger-identity">
                    <span className="asset-ledger-index">{String(index + 1).padStart(2, '0')}</span>
                    <CryptoIcon symbol={asset.symbol} />
                    <div>
                      <strong>{asset.symbol}</strong>
                      <span>USD reference</span>
                    </div>
                  </div>

                  <div className="asset-ledger-price">
                    <span>Consensus</span>
                    <strong>{formatPrice(asset.consensusPrice, asset.symbol)}</strong>
                    <small
                      className={`spread-${asset.priceRange.spreadPercent > 0.5 ? 'high' : 'low'}`}
                    >
                      {formatSpread(asset.priceRange.spreadPercent)} spread
                    </small>
                  </div>

                  <div className="asset-ledger-observation">
                    <div
                      className="asset-ledger-track"
                      role="img"
                      aria-label={`${asset.symbol} provider observations from ${formatPrice(asset.priceRange.min, asset.symbol)} to ${formatPrice(asset.priceRange.max, asset.symbol)}`}
                    >
                      <i
                        className="asset-ledger-consensus-mark"
                        style={{ '--mark-position': `${consensusPosition}%` } as CSSProperties}
                      />
                      {asset.sources.map((source) => (
                        <i
                          key={source.provider}
                          className="asset-ledger-source-mark"
                          title={`${providerNames[source.provider]}: ${formatPrice(source.price, asset.symbol)}`}
                          style={
                            {
                              '--mark-position': `${getPosition(asset, source.price)}%`,
                              '--mark-color': source.color,
                            } as CSSProperties
                          }
                        />
                      ))}
                    </div>
                    <div className="asset-ledger-bounds">
                      <span>{formatPrice(asset.priceRange.min, asset.symbol)}</span>
                      <span>{formatPrice(asset.priceRange.max, asset.symbol)}</span>
                    </div>
                  </div>

                  <div className="asset-ledger-coverage">
                    <div className="asset-ledger-sources" aria-label="Resolved providers">
                      {asset.sources.map((source) => (
                        <span key={source.provider} style={{ backgroundColor: source.color }}>
                          {providerNames[source.provider]?.[0]}
                        </span>
                      ))}
                    </div>
                    <strong>
                      {asset.providerCount}/{asset.totalProviders}
                    </strong>
                    <small>
                      <Clock aria-hidden="true" />
                      {formatRelativeTime(asset.lastUpdatedAt, now)}
                    </small>
                  </div>

                  <Link
                    className="asset-ledger-action"
                    href={`/price-insight?symbol=${asset.symbol}`}
                    aria-label={`Inspect ${asset.symbol} evidence`}
                  >
                    Inspect <ArrowUpRight aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
      </div>
    </section>
  );
}

export const AssetTable = memo(AssetTableComponent);
