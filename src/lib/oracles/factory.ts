import { FEATURE_FLAGS } from '@/lib/config/env';
import { OracleClientError, ValidationError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider } from '@/types/oracle';

import { API3Client } from './clients/api3';
import { ChainlinkClient } from './clients/chainlink';
import { DIAClient } from './clients/dia';
import { FlareClient } from './clients/flare';
import { RedStoneClient } from './clients/redstone';
import { ReflectorClient } from './clients/reflector';
import { SupraClient } from './clients/supra';
import { SwitchboardClient } from './clients/switchboard';
import { TWAPClient } from './clients/twap';
import { WINkLinkClient } from './clients/winklink';

import type { BaseOracleClient } from './base';

const logger = createLogger('OracleClientFactory');

class OracleClientFactory {
  private instances = new Map<OracleProvider, BaseOracleClient>();

  getClient(provider: OracleProvider): BaseOracleClient {
    this.validateProvider(provider);

    if (!this.instances.has(provider)) {
      this.instances.set(provider, this.createClient(provider));
      logger.info(`Created new oracle client instance for ${provider}`);
    }

    const client = this.instances.get(provider);
    if (!client) {
      throw new OracleClientError(`Failed to create oracle client for provider: ${provider}`, {
        provider,
      });
    }
    return client;
  }

  private validateProvider(provider: OracleProvider): void {
    if (!provider || typeof provider !== 'string') {
      throw new ValidationError(`Unknown oracle provider: ${provider}`, { value: provider });
    }
    if (!Object.values(OracleProvider).includes(provider)) {
      throw new ValidationError(`Unknown oracle provider: ${provider}`, { value: provider });
    }
  }

  private createClient(provider: OracleProvider): BaseOracleClient {
    switch (provider) {
      case OracleProvider.CHAINLINK:
        return new ChainlinkClient({ useRealData: FEATURE_FLAGS.useRealChainlinkData });
      case OracleProvider.API3:
        return new API3Client();
      case OracleProvider.REDSTONE:
        return new RedStoneClient();
      case OracleProvider.DIA:
        return new DIAClient();
      case OracleProvider.WINKLINK:
        return new WINkLinkClient();
      case OracleProvider.SUPRA:
        return new SupraClient();
      case OracleProvider.TWAP:
        return new TWAPClient();
      case OracleProvider.REFLECTOR:
        return new ReflectorClient();
      case OracleProvider.FLARE:
        return new FlareClient();
      case OracleProvider.SWITCHBOARD:
        return new SwitchboardClient();
      default:
        throw new ValidationError(`Unknown oracle provider: ${provider}`, { value: provider });
    }
  }
}

let defaultInstance: OracleClientFactory | null = null;

export function getDefaultFactory(): OracleClientFactory {
  if (!defaultInstance) {
    defaultInstance = new OracleClientFactory();
  }
  return defaultInstance;
}
