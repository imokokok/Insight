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

    const discoverers = new Map<string, () => Promise<DiscoveryResult>>([
      ['chainlink', () => discoverChainlinkFeeds()],
      ['supra', () => discoverSupraFeeds()],
      ['dia', () => discoverDIAFeeds()],
      ['redstone', () => discoverRedStoneFeeds()],
      ['api3', () => discoverAPI3Feeds()],
      ['flare', () => discoverFlareFeeds()],
      ['band', () => discoverBandFeeds()],
      // No public API — verify existing
      ['winklink', () => discoverWINkLinkFeeds()],
      ['twap', () => verifyExistingFeeds('twap')],
      ['twap-token', () => verifyExistingFeeds('twap-token')],
      ['reflector', () => discoverReflectorFeeds()],
    ]);

    if (provider) {
      const discoverer = discoverers.get(provider);
      if (!discoverer) {
        throw new Error(`Unsupported discovery provider: ${provider}`);
      }
      results.push(await discoverer());
    } else {
      for (const [name, discoverer] of discoverers) {
        try {
          results.push(await discoverer());
        } catch (error) {
          logger.error(`Discovery failed for ${name}`, normalizeError(error));
          results.push({ provider: name, discovered: 0, feeds: [], errors: [String(error)] });
        }
      }
    }

    return results;
  }
}

export const feedDiscoveryService = new FeedDiscoveryService();
