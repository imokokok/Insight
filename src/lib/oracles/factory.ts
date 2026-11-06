import { FEATURE_FLAGS } from '@/lib/config/env';
import { OracleClientError, ValidationError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider } from '@/types/oracle';

import { API3Client } from './clients/api3';
import { BandClient } from './clients/band';
import { ChainlinkClient } from './clients/chainlink';
import { ChronicleMonadClient } from './clients/chronicleMonad';
import { DIAClient } from './clients/dia';
import { FlareClient } from './clients/flare';
import { PythClient } from './clients/pyth';
import { RedStoneClient } from './clients/redstone';
import { ReflectorClient } from './clients/reflector';
import { StorkMonadClient } from './clients/storkMonad';
import { SupraClient } from './clients/supra';
import { TWAPClient } from './clients/twap';
import { WINkLinkClient } from './clients/winklink';

import type { BaseOracleClient } from './base';

const logger = createLogger('OracleClientFactory');

/**
 * Client constructors keyed by static enum member. Keys must stay static
 * (never request-derived) — see the CodeQL js/unvalidated-dynamic-method-call
 * constraint noted in feedDiscovery's dispatcher for the same pattern.
 */
const ORACLE_CLIENT_CONSTRUCTORS: Record<OracleProvider, () => BaseOracleClient> = {
  [OracleProvider.CHAINLINK]: () =>
    new ChainlinkClient({ useRealData: FEATURE_FLAGS.useRealChainlinkData }),
  [OracleProvider.PYTH]: () => new PythClient(),
  [OracleProvider.STORK]: () => new StorkMonadClient(),
  [OracleProvider.CHRONICLE]: () => new ChronicleMonadClient(),
  [OracleProvider.API3]: () => new API3Client(),
  [OracleProvider.REDSTONE]: () => new RedStoneClient(),
  [OracleProvider.DIA]: () => new DIAClient(),
  [OracleProvider.WINKLINK]: () => new WINkLinkClient(),
  [OracleProvider.SUPRA]: () => new SupraClient(),
  [OracleProvider.TWAP]: () => new TWAPClient(),
  [OracleProvider.REFLECTOR]: () => new ReflectorClient(),
  [OracleProvider.FLARE]: () => new FlareClient(),
  [OracleProvider.BAND]: () => new BandClient(),
};

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
    const construct = ORACLE_CLIENT_CONSTRUCTORS[provider];
    if (!construct) {
      throw new ValidationError(`Unknown oracle provider: ${provider}`, { value: provider });
    }
    return construct();
  }
}

let defaultInstance: OracleClientFactory | null = null;

export function getDefaultFactory(): OracleClientFactory {
  if (!defaultInstance) {
    defaultInstance = new OracleClientFactory();
  }
  return defaultInstance;
}
