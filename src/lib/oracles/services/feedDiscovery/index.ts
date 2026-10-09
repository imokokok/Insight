import { createLogger, normalizeError } from '@/lib/utils/logger';

import {
  discoverAPI3Feeds,
  discoverBandFeeds,
  discoverChainlinkFeeds,
  discoverDIAFeeds,
  discoverFlareFeeds,
  discoverRedStoneFeeds,
  discoverReflectorFeeds,
  discoverSupraFeeds,
  discoverWINkLinkFeeds,
  verifyExistingFeeds,
} from './providerDiscoverers';

import type { DiscoveryResult } from './discoveryTypes';

const logger = createLogger('FeedDiscoveryService');

/** Provider order used by `discoverAll` when no single provider is requested. */
const DISCOVER_PROVIDER_ORDER = [
  'chainlink',
  'supra',
  'dia',
  'redstone',
  'api3',
  'flare',
  'band',
  'winklink',
  'twap',
  'twap-token',
  'reflector',
] as const;

class FeedDiscoveryService {
  async discoverChainlinkFeeds(): Promise<DiscoveryResult> {
    return discoverChainlinkFeeds();
  }

  async discoverSupraFeeds(): Promise<DiscoveryResult> {
    return discoverSupraFeeds();
  }

  async discoverDIAFeeds(): Promise<DiscoveryResult> {
    return discoverDIAFeeds();
  }

  async discoverRedStoneFeeds(): Promise<DiscoveryResult> {
    return discoverRedStoneFeeds();
  }

  async discoverAPI3Feeds(): Promise<DiscoveryResult> {
    return discoverAPI3Feeds();
  }

  async discoverFlareFeeds(): Promise<DiscoveryResult> {
    return discoverFlareFeeds();
  }

  async discoverBandFeeds(): Promise<DiscoveryResult> {
    return discoverBandFeeds();
  }

  async verifyExistingFeeds(provider: string): Promise<DiscoveryResult> {
    return verifyExistingFeeds(provider);
  }

  async discoverAll(provider?: string): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];

    if (provider) {
      results.push(await this.runDiscoverer(provider));
    } else {
      for (const name of DISCOVER_PROVIDER_ORDER) {
        try {
          results.push(await this.runDiscoverer(name));
        } catch (error) {
          logger.error(`Discovery failed for ${name}`, normalizeError(error));
          results.push({ provider: name, discovered: 0, feeds: [], errors: [String(error)] });
        }
      }
    }

    return results;
  }

  /**
   * Dispatch one named discoverer.
   *
   * `provider` can originate from a request, so it is matched by an exhaustive
   * `switch` instead of being used as a key that selects a callable. An explicit
   * switch keeps the reachable set of discoverer implementations statically
   * visible (CodeQL js/unvalidated-dynamic-method-call) and makes an unknown
   * provider a checked error rather than an `undefined` lookup.
   */
  private async runDiscoverer(provider: string): Promise<DiscoveryResult> {
    switch (provider) {
      case 'chainlink':
        return discoverChainlinkFeeds();
      case 'supra':
        return discoverSupraFeeds();
      case 'dia':
        return discoverDIAFeeds();
      case 'redstone':
        return discoverRedStoneFeeds();
      case 'api3':
        return discoverAPI3Feeds();
      case 'flare':
        return discoverFlareFeeds();
      case 'band':
        return discoverBandFeeds();
      // No public API — verify existing
      case 'winklink':
        return discoverWINkLinkFeeds();
      case 'twap':
        return verifyExistingFeeds('twap');
      case 'twap-token':
        return verifyExistingFeeds('twap-token');
      case 'reflector':
        return discoverReflectorFeeds();
      default:
        throw new Error(`Unsupported discovery provider: ${provider}`);
    }
  }
}

export const feedDiscoveryService = new FeedDiscoveryService();
