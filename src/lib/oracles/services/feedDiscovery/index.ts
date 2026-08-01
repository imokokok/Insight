import { createLogger } from '@/lib/utils/logger';

import {
  discoverAPI3Feeds,
  discoverChainlinkFeeds,
  discoverDIAFeeds,
  discoverFlareFeeds,
  discoverPythFeeds,
  discoverRedStoneFeeds,
  discoverSupraFeeds,
  discoverSwitchboardFeeds,
  verifyExistingFeeds,
} from './providerDiscoverers';

import type { DiscoveryResult } from './discoveryTypes';

const logger = createLogger('FeedDiscoveryService');

class FeedDiscoveryService {
  async discoverChainlinkFeeds(): Promise<DiscoveryResult> {
    return discoverChainlinkFeeds();
  }

  async discoverPythFeeds(): Promise<DiscoveryResult> {
    return discoverPythFeeds();
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

  async discoverSwitchboardFeeds(): Promise<DiscoveryResult> {
    return discoverSwitchboardFeeds();
  }

  async verifyExistingFeeds(provider: string): Promise<DiscoveryResult> {
    return verifyExistingFeeds(provider);
  }

  async discoverAll(provider?: string): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];

    const discoverers: Record<string, () => Promise<DiscoveryResult>> = {
      chainlink: () => discoverChainlinkFeeds(),
      pyth: () => discoverPythFeeds(),
      supra: () => discoverSupraFeeds(),
      dia: () => discoverDIAFeeds(),
      redstone: () => discoverRedStoneFeeds(),
      api3: () => discoverAPI3Feeds(),
      flare: () => discoverFlareFeeds(),
      switchboard: () => discoverSwitchboardFeeds(),
      // No public API — verify existing
      winklink: () => verifyExistingFeeds('winklink'),
      twap: () => verifyExistingFeeds('twap'),
      'twap-token': () => verifyExistingFeeds('twap-token'),
      reflector: () => verifyExistingFeeds('reflector'),
    };

    if (provider && discoverers[provider]) {
      results.push(await discoverers[provider]());
    } else if (!provider) {
      for (const [name, discoverer] of Object.entries(discoverers)) {
        try {
          results.push(await discoverer());
        } catch (error) {
          logger.error(
            `Discovery failed for ${name}`,
            error instanceof Error ? error : new Error(String(error))
          );
          results.push({ provider: name, discovered: 0, feeds: [], errors: [String(error)] });
        }
      }
    }

    return results;
  }
}

export const feedDiscoveryService = new FeedDiscoveryService();
