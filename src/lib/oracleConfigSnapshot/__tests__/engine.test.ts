import {
  buildChecks,
  buildPayload,
  canonicalJson,
  computeConfigHash,
  computePayloadHash,
  deriveGateResult,
  sha256Hex,
} from '../engine';
import type { OracleConfigSnapshotInput, OracleConfigSources } from '../types';

const input: OracleConfigSnapshotInput = {
  chainId: 8453,
  protocolId: 'moonwell-iv2-base',
  assetSymbol: 'USDC',
};

const sources: OracleConfigSources = {
  providers: ['chainlink', 'pyth', 'redstone'],
  nonDerivedGroups: 3,
  feed: {
    address: '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B',
    name: 'USDC / USD',
    symbol: 'USDC',
    decimals: 8,
  },
  profile: { profileId: 'moonwell-base', status: 'ACTIVE', activityStatus: 'LIVE' },
  feedRegistryErrored: false,
  registryPin: 'a'.repeat(64),
};

describe('oracle config snapshot engine', () => {
  it('canonicalJson is key-order independent', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(
      canonicalJson({ a: { c: 3, d: 2 }, b: 1 })
    );
  });

  it('configHash is deterministic and changes with the observable config', () => {
    const hash = computeConfigHash(input, sources);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(computeConfigHash({ ...input }, { ...sources }));
    expect(hash).not.toBe(computeConfigHash({ ...input, chainId: 1 }, sources));
  });

  it('produces exactly six advisory checks and never a safety verdict', () => {
    const checks = buildChecks(input, sources);
    expect(checks.map((item) => item.id)).toEqual(['D1', 'D2', 'D3', 'D4', 'D5', 'D6']);
    expect(checks.every((item) => item.advisory === true)).toBe(true);
    expect(checks.some((item) => (item.status as string) === 'BLOCK')).toBe(false);
  });

  it('fails closed to UNAVAILABLE when the feed registry cannot be read', () => {
    const checks = buildChecks(input, { ...sources, feedRegistryErrored: true, providers: [] });
    expect(checks.find((item) => item.id === 'D1')?.status).toBe('UNAVAILABLE');
    expect(checks.find((item) => item.id === 'D2')?.status).toBe('UNAVAILABLE');
    expect(deriveGateResult(checks)).toBe('INPUT_UNAVAILABLE');
  });

  it('matches a maintained incident pattern only for a known protocol', () => {
    const matched = buildChecks(input, sources).find((item) => item.id === 'D5');
    expect(matched?.status).toBe('WARN');
    expect(matched?.reference).toContain('moonwell');
    const unknown = buildChecks({ ...input, protocolId: 'unlisted-protocol' }, sources).find(
      (item) => item.id === 'D5'
    );
    expect(unknown?.status).toBe('DISCLOSED');
  });

  it('a bucket is byte-identical and payloadHash recomputes from canonical bytes', () => {
    const bucket = 1_800_000_000_000;
    const first = buildPayload(input, sources, bucket, bucket);
    const second = buildPayload(input, sources, bucket, bucket);
    expect(canonicalJson(first)).toBe(canonicalJson(second));
    expect(computePayloadHash(first)).toBe(sha256Hex(canonicalJson(first)));
    expect(first.advisory).toBe(true);
  });
});
