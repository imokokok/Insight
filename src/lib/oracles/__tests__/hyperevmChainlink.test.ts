import {
  getFeedFromCatalog,
  getFeedHeartbeatFromCatalog,
  getCatalogNetworkChainIds,
} from '@/lib/oracles/constants/chainlinkCatalogLoader';
import {
  BLOCKCHAIN_TO_CHAIN_ID,
  getBlockchainByChainId,
} from '@/lib/oracles/constants/chainMapping';
import { sanitizeChain } from '@/lib/security/inputSanitizer';
import { SafeChainSchema } from '@/lib/security/validation';
import { Blockchain } from '@/types/oracle';
import { buildSignalVector } from '@/types/oracle/signals';

describe('HyperEVM (999) Chainlink coverage', () => {
  it('maps the chain id both ways and passes sanitizeChain / SafeChainSchema', () => {
    expect(BLOCKCHAIN_TO_CHAIN_ID[Blockchain.HYPEREVM]).toBe(999);
    expect(getBlockchainByChainId(999)).toBe(Blockchain.HYPEREVM);
    expect(sanitizeChain('hyperevm')).toBe('hyperevm');
    expect(SafeChainSchema.parse('hyperevm')).toBe('hyperevm');
  });

  it('publishes the catalog network and the verified standard proxies', () => {
    expect(getCatalogNetworkChainIds()).toContain(999);
    expect(getFeedFromCatalog('BTC', 999)?.address).toBe(
      '0x71A2017296De30F4597B36FBD90b7e8Ec6E97A82'
    );
    expect(getFeedFromCatalog('ETH', 999)?.address).toBe(
      '0x017151e74fB3a393673B5B5149F53578c0Fa55B0'
    );
    expect(getFeedFromCatalog('HYPE', 999)?.address).toBe(
      '0xa5a72eF19F82A579431186402425593a559ed352'
    );
  });

  it('keeps mixed decimals and per-feed heartbeats instead of assuming 8 / 1h', () => {
    expect(getFeedFromCatalog('KHYPE', 999)?.decimals).toBe(18);
    expect(getFeedFromCatalog('BTC', 999)?.decimals).toBe(8);
    expect(getFeedHeartbeatFromCatalog('ETH', 999)).toBe(86400);
    expect(getFeedHeartbeatFromCatalog('BTC', 999)).toBe(86400);
  });

  it('does not register pairs that have no Standard Proxy USD feed', () => {
    // uSOL only ships an SVR/OEV proxy in the official directory; long-tail
    // assets have no aggregator at all. Both must resolve to "unsupported".
    expect(getFeedFromCatalog('USOL', 999)).toBeNull();
    expect(getFeedFromCatalog('ARB', 999)).toBeNull();
    expect(getFeedFromCatalog('DOGE', 999)).toBeNull();
    // Exchange-rate feeds are not USD prices and must not be served as such.
    expect(getFeedFromCatalog('BEHYPE', 999)).toBeNull();
    expect(getFeedFromCatalog('WSTHYPE', 999)).toBeNull();
  });

  it('does not mark a 6h-old BTC feed stale under its 86400s heartbeat', () => {
    const params = {
      dataAgeSeconds: 6 * 3600,
      isOnChain: true,
      hasVerification: true,
      providerUptime: 95,
      hasConfidence: true,
      hasTimestamp: true,
      hasDecimals: true,
      hasSource: true,
    };

    // The legacy global 300s bound would zero this healthy feed.
    expect(buildSignalVector(params).freshness).toBe(0);
    expect(
      buildSignalVector({ ...params, staleThresholdSeconds: 86400 * 2 }).freshness
    ).toBeGreaterThan(0.8);
  });

  it('does not mark a 21h-old 24h-heartbeat feed as stale', () => {
    const params = {
      dataAgeSeconds: 21 * 3600,
      isOnChain: true,
      hasVerification: true,
      providerUptime: 95,
      hasConfidence: true,
      hasTimestamp: true,
      hasDecimals: true,
      hasSource: true,
    };

    expect(buildSignalVector(params).freshness).toBe(0);
    expect(
      buildSignalVector({ ...params, staleThresholdSeconds: 86400 * 2 }).freshness
    ).toBeGreaterThan(0.5);
  });
});
