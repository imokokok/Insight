/**
 * RedStone API reference adapter used by decision-input assessment.
 *
 * The existing RedStone client owns the HTTP endpoint, timeout, retry policy,
 * response parsing, and symbol-match validation. This adapter narrows its
 * untrusted result to a USD reference with explicit provenance and timestamp.
 */

import { getDefaultFactory } from '@/lib/oracles/factory';
import { OracleProvider } from '@/types/oracle';

export interface RedStoneMarketReference {
  provider: 'redstone-api';
  symbol: string;
  quote: 'USD';
  price: number;
  source: string | null;
  updatedAt: string;
}

export interface FetchRedStoneMarketReferenceOptions {
  symbol: string;
  signal?: AbortSignal;
}

/**
 * Read a provider's current USD reference and validate the values again at
 * the decision-input boundary. Freshness is evaluated by the policy combiner.
 */
export async function fetchRedStoneMarketReference(
  options: FetchRedStoneMarketReferenceOptions
): Promise<RedStoneMarketReference> {
  const symbol = options.symbol.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,15}$/.test(symbol)) {
    throw new Error(`Invalid RedStone reference symbol: ${options.symbol}`);
  }

  const priceData = await getDefaultFactory()
    .getClient(OracleProvider.REDSTONE)
    .getPrice(symbol, undefined, { signal: options.signal });
  const updatedAtMs = priceData.timestamp;
  if (
    priceData.provider !== OracleProvider.REDSTONE ||
    priceData.symbol.toUpperCase() !== symbol ||
    !Number.isFinite(priceData.price) ||
    priceData.price <= 0 ||
    !Number.isSafeInteger(updatedAtMs) ||
    updatedAtMs <= 0 ||
    updatedAtMs > Date.now()
  ) {
    throw new Error(`RedStone returned invalid ${symbol}/USD reference data`);
  }

  return {
    provider: 'redstone-api',
    symbol,
    quote: 'USD',
    price: priceData.price,
    source:
      typeof priceData.source === 'string' && priceData.source.length > 0 ? priceData.source : null,
    updatedAt: new Date(updatedAtMs).toISOString(),
  };
}
