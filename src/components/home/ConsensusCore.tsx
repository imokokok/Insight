'use client';

import { useMemo, useState } from 'react';

import { providerNames } from '@/lib/constants';

import type { AssetConsensusData } from './types';

function formatPrice(price: number, symbol: string): string {
  if (!price) return '—';
  if (symbol === 'USDT' || symbol === 'USDC') return `$${price.toFixed(4)}`;
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  return `$${price.toFixed(2)}`;
}

export function ConsensusCore({ assets }: { assets: AssetConsensusData[] }) {
  const firstAvailable =
    assets.find((asset) => asset.sources.length > 0)?.symbol ?? assets[0]?.symbol;
  const [selectedSymbol, setSelectedSymbol] = useState(firstAvailable);
  const selected =
    assets.find((asset) => asset.symbol === selectedSymbol) ??
    assets.find((asset) => asset.sources.length > 0) ??
    assets[0];

  const plot = useMemo(() => {
    if (!selected || selected.sources.length === 0) return null;
    const spread = selected.priceRange.max - selected.priceRange.min;
    const padding = spread > 0 ? spread * 0.35 : Math.max(selected.consensusPrice * 0.001, 0.001);
    const domainMin = selected.priceRange.min - padding;
    const domainMax = selected.priceRange.max + padding;
    const position = (price: number) => {
      const raw = ((price - domainMin) / (domainMax - domainMin)) * 100;
      return Math.min(96, Math.max(4, raw));
    };

    return {
      consensus: position(selected.consensusPrice),
      rangeStart: position(selected.priceRange.min),
      rangeEnd: position(selected.priceRange.max),
      sources: selected.sources.map((source) => ({
        ...source,
        position: position(source.price),
      })),
    };
  }, [selected]);

  if (!selected) return null;

  return (
    <section className="consensus-core" aria-labelledby="consensus-core-title">
      <div className="consensus-core-head">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700">
            Evidence instrument 01
          </p>
          <h3 id="consensus-core-title" className="mt-2 text-2xl font-semibold text-slate-950">
            Consensus core
          </h3>
        </div>
        <div className="consensus-core-tabs" aria-label="Select an asset">
          {assets.map((asset) => (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => setSelectedSymbol(asset.symbol)}
              className={asset.symbol === selected.symbol ? 'is-active' : ''}
              aria-pressed={asset.symbol === selected.symbol}
            >
              {asset.symbol}
            </button>
          ))}
        </div>
      </div>

      <div className="consensus-core-body">
        <div className="consensus-core-summary">
          <div>
            <span>Consensus</span>
            <strong>{formatPrice(selected.consensusPrice, selected.symbol)}</strong>
          </div>
          <dl>
            <div>
              <dt>Observed range</dt>
              <dd>
                {formatPrice(selected.priceRange.min, selected.symbol)} —{' '}
                {formatPrice(selected.priceRange.max, selected.symbol)}
              </dd>
            </div>
            <div>
              <dt>Source spread</dt>
              <dd>{selected.priceRange.spreadPercent.toFixed(3)}%</dd>
            </div>
            <div>
              <dt>Resolved feeds</dt>
              <dd>
                {selected.providerCount}/{selected.totalProviders}
              </dd>
            </div>
          </dl>
          <p>
            Each mark is a live provider observation. The cobalt axis is the median used as the
            inspectable consensus.
          </p>
        </div>

        <div
          className="consensus-core-plot"
          role="img"
          aria-label={`${selected.symbol} source prices positioned around a consensus of ${formatPrice(selected.consensusPrice, selected.symbol)}`}
        >
          <div className="consensus-core-grid" />
          {plot ? (
            <>
              <div
                className="consensus-core-range"
                style={{
                  left: `${plot.rangeStart}%`,
                  width: `${plot.rangeEnd - plot.rangeStart}%`,
                }}
              />
              <div className="consensus-core-axis" style={{ left: `${plot.consensus}%` }}>
                <span>Median</span>
              </div>
              <div className="consensus-core-sources">
                {plot.sources.map((source, index) => (
                  <div key={source.provider} className="consensus-core-source">
                    <span>{providerNames[source.provider] ?? source.provider}</span>
                    <i />
                    <b
                      style={{ left: `${source.position}%`, backgroundColor: source.color }}
                      title={`${providerNames[source.provider] ?? source.provider}: ${formatPrice(source.price, selected.symbol)}`}
                    >
                      <em>{formatPrice(source.price, selected.symbol)}</em>
                    </b>
                    <small>{String(index + 1).padStart(2, '0')}</small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="consensus-core-empty">Awaiting independent source observations</div>
          )}
          <div className="consensus-core-depth">
            <span>Lower bound</span>
            <span>Consensus field</span>
            <span>Upper bound</span>
          </div>
        </div>
      </div>
    </section>
  );
}
