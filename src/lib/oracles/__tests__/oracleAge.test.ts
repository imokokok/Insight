import {
  resolveOracleAgeSeconds,
  ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS,
} from '@/lib/oracles/oracleAge';
import { OracleProvider } from '@/types/oracle/enums';
import type { PriceData } from '@/types/oracle/price';

const NOW = 1_700_000_000_000; // fixed clock for deterministic assertions

function makePrice(
  partial: Partial<PriceData> & Pick<PriceData, 'symbol' | 'price' | 'timestamp'>
): PriceData {
  return {
    provider: OracleProvider.CHAINLINK,
    ...partial,
  } as PriceData;
}

describe('ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS', () => {
  it('treats on-chain oracles as trusted timestamp sources', () => {
    expect(ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS.has(OracleProvider.CHAINLINK)).toBe(true);
    expect(ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS.has(OracleProvider.API3)).toBe(true);
    expect(ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS.has(OracleProvider.SUPRA)).toBe(true);
    expect(ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS.has(OracleProvider.TWAP)).toBe(true);
    expect(ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS.has(OracleProvider.FLARE)).toBe(true);
    expect(ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS.has(OracleProvider.SWITCHBOARD)).toBe(true);
    expect(ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS.has(OracleProvider.WINKLINK)).toBe(true);
  });

  it('does NOT trust off-chain aggregators whose timestamp is a source publish time', () => {
    expect(ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS.has(OracleProvider.REDSTONE)).toBe(false);
    expect(ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS.has(OracleProvider.DIA)).toBe(false);
    expect(ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS.has(OracleProvider.REFLECTOR)).toBe(false);
  });
});

describe('resolveOracleAgeSeconds', () => {
  it('trusts an explicit per-oracle dataAge over the timestamp (API3 pattern)', () => {
    const p = makePrice({
      provider: OracleProvider.API3,
      timestamp: NOW - 10_000, // publish time 10s ago
      dataAge: 120, // oracle computed this as 120s old from on-chain dAPI updatedAt
    });
    expect(resolveOracleAgeSeconds(p, NOW)).toBe(120);
  });

  it('resolves on-chain age as now - timestamp (Chainlink block time)', () => {
    const p = makePrice({
      provider: OracleProvider.CHAINLINK,
      timestamp: NOW - 9_000, // block time 9s ago
    });
    expect(resolveOracleAgeSeconds(p, NOW)).toBe(9);
  });

  it('resolves off-chain age from timestamp (permissive — cadence baseline is the strict gate)', () => {
    // Off-chain aggregators (REDSTONE/DIA/REFLECTOR) report a SOURCE publish
    // time as `timestamp`. At the runtime layer we still treat that as the
    // oracle's reported age (byte-identical to the pre-fix behaviour) so the
    // snapshot / consensus / pre-trade hot path is unaffected. The STRICT
    // classification (these providers' ages are not trustworthy enough to
    // build a cadence p90) lives in computeFeedStalenessBaseline, which
    // returns null for any provider not in ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS.
    const redstone = makePrice({
      provider: OracleProvider.REDSTONE,
      timestamp: NOW - 5_000,
    });
    expect(resolveOracleAgeSeconds(redstone, NOW)).toBe(5);

    const dia = makePrice({
      provider: OracleProvider.DIA,
      timestamp: NOW - 5_000,
    });
    expect(resolveOracleAgeSeconds(dia, NOW)).toBe(5);

    const reflector = makePrice({
      provider: OracleProvider.REFLECTOR,
      timestamp: NOW - 5_000,
    });
    expect(resolveOracleAgeSeconds(reflector, NOW)).toBe(5);
  });

  it('uses explicit dataAge for off-chain providers when they supply one', () => {
    const p = makePrice({
      provider: OracleProvider.REDSTONE,
      timestamp: NOW - 5_000,
      dataAge: 42,
    });
    expect(resolveOracleAgeSeconds(p, NOW)).toBe(42);
  });

  it('never returns a negative age (clamps now < timestamp to 0)', () => {
    const p = makePrice({
      provider: OracleProvider.CHAINLINK,
      timestamp: NOW + 30_000, // clock skew: reported future
    });
    expect(resolveOracleAgeSeconds(p, NOW)).toBe(0);
  });

  it('returns null when an on-chain provider has no usable timestamp (0 / missing)', () => {
    const zero = makePrice({
      provider: OracleProvider.CHAINLINK,
      timestamp: 0,
    });
    expect(resolveOracleAgeSeconds(zero, NOW)).toBeNull();

    const missing = makePrice({
      provider: OracleProvider.CHAINLINK,
      // @ts-expect-error intentionally testing missing numeric timestamp
      timestamp: undefined,
    });
    expect(resolveOracleAgeSeconds(missing, NOW)).toBeNull();
  });

  it("uses timestamp when provider is missing (classification is not the resolver's job)", () => {
    // Permissive resolver: a missing `provider` does not block age resolution.
    // Provider classification for cadence-strictness lives in
    // computeFeedStalenessBaseline, not here.
    const p = makePrice({
      // @ts-expect-error provider intentionally omitted
      provider: undefined,
      timestamp: NOW - 5_000,
    });
    expect(resolveOracleAgeSeconds(p, NOW)).toBe(5);
  });

  it('falls through to timestamp path when dataAge is negative', () => {
    const p = makePrice({
      provider: OracleProvider.CHAINLINK,
      timestamp: NOW - 7_000,
      dataAge: -1, // invalid sentinel -> ignore, use trusted timestamp
    });
    expect(resolveOracleAgeSeconds(p, NOW)).toBe(7);
  });
});
