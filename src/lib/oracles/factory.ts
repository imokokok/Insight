import { OracleProvider } from '@/lib/types/oracle';
import { BaseOracleClient } from './base';
import { ChainlinkClient } from './chainlink';
import { BandProtocolClient } from './bandProtocol';
import { UMAClient } from './uma';
import { PythClient } from './pythNetwork';
import { API3Client } from './api3';
import { OracleClientConfig } from './base';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('OracleClientFactory');

export class OracleClientFactory {
  private static instances: Map<OracleProvider, BaseOracleClient> = new Map();
  private static config: OracleClientConfig = {
    useDatabase: true,
    fallbackToMock: true,
  };

  static configure(config: Partial<OracleClientConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Oracle client factory configured', { config: this.config });
  }

  static getClient(provider: OracleProvider): BaseOracleClient {
    if (!this.instances.has(provider)) {
      this.instances.set(provider, this.createClient(provider));
      logger.info(`Created new oracle client instance for ${provider}`);
    }
    return this.instances.get(provider)!;
  }

  static getAllClients(): Record<OracleProvider, BaseOracleClient> {
    const providers = [
      OracleProvider.CHAINLINK,
      OracleProvider.BAND_PROTOCOL,
      OracleProvider.UMA,
      OracleProvider.PYTH,
      OracleProvider.API3,
    ];

    const clients: Partial<Record<OracleProvider, BaseOracleClient>> = {};
    providers.forEach((provider) => {
      clients[provider] = this.getClient(provider);
    });

    return clients as Record<OracleProvider, BaseOracleClient>;
  }

  static clearInstances(): void {
    this.instances.clear();
    logger.info('Cleared all oracle client instances');
  }

  static hasClient(provider: OracleProvider): boolean {
    return this.instances.has(provider);
  }

  private static createClient(provider: OracleProvider): BaseOracleClient {
    switch (provider) {
      case OracleProvider.CHAINLINK:
        return new ChainlinkClient(this.config);
      case OracleProvider.BAND_PROTOCOL:
        return new BandProtocolClient(this.config);
      case OracleProvider.UMA:
        return new UMAClient(this.config);
      case OracleProvider.PYTH:
        return new PythClient(this.config);
      case OracleProvider.API3:
        return new API3Client(this.config);
      default:
        throw new Error(`Unknown oracle provider: ${provider}`);
    }
  }
}

export function getOracleClient(provider: OracleProvider): BaseOracleClient {
  return OracleClientFactory.getClient(provider);
}

export function getAllOracleClients(): Record<OracleProvider, BaseOracleClient> {
  return OracleClientFactory.getAllClients();
}
