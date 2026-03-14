import { OracleProvider } from '@/types/oracle';
import { BaseOracleClient } from './base';
import { ChainlinkClient } from './chainlink';
import { BandProtocolClient } from './bandProtocol';
import { UMAClient } from './uma';
import { PythClient } from './pythNetwork';
import { API3Client } from './api3';
import { RedStoneClient } from './redstone';
import { DIAClient } from './dia';
import { TellarClient } from './tellar';
import { OracleClientConfig } from './base';
import { createLogger } from '@/lib/utils/logger';
import { container, SERVICE_TOKENS } from '@/lib/di';
import { IOracleClient, IOracleClientFactory } from './interfaces';

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
    if (container.has(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY)) {
      const factory = container.resolve<IOracleClientFactory>(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
      const client = factory.getClient(provider);
      if (client instanceof BaseOracleClient) {
        return client;
      }
    }

    if (!this.instances.has(provider)) {
      this.instances.set(provider, this.createClient(provider));
      logger.info(`Created new oracle client instance for ${provider}`);
    }
    return this.instances.get(provider)!;
  }

  static getClientFromDI(provider: OracleProvider): IOracleClient | null {
    if (container.has(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY)) {
      const factory = container.resolve<IOracleClientFactory>(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
      return factory.getClient(provider);
    }
    return null;
  }

  static getAllClients(): Record<OracleProvider, BaseOracleClient> {
    if (container.has(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY)) {
      const factory = container.resolve<IOracleClientFactory>(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
      const clients = factory.getAllClients();
      const result: Partial<Record<OracleProvider, BaseOracleClient>> = {};
      for (const [key, client] of Object.entries(clients)) {
        if (client instanceof BaseOracleClient) {
          result[key as OracleProvider] = client;
        }
      }
      return result as Record<OracleProvider, BaseOracleClient>;
    }

    const providers = [
      OracleProvider.CHAINLINK,
      OracleProvider.BAND_PROTOCOL,
      OracleProvider.UMA,
      OracleProvider.PYTH,
      OracleProvider.API3,
      OracleProvider.REDSTONE,
      OracleProvider.DIA,
      OracleProvider.TELLAR,
    ];

    const clients: Partial<Record<OracleProvider, BaseOracleClient>> = {};
    providers.forEach((provider) => {
      clients[provider] = this.getClient(provider);
    });

    return clients as Record<OracleProvider, BaseOracleClient>;
  }

  static clearInstances(): void {
    if (container.has(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY)) {
      const factory = container.resolve<IOracleClientFactory>(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
      factory.clearInstances();
    }
    this.instances.clear();
    logger.info('Cleared all oracle client instances');
  }

  static hasClient(provider: OracleProvider): boolean {
    if (container.has(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY)) {
      const factory = container.resolve<IOracleClientFactory>(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
      return factory.hasClient(provider);
    }
    return this.instances.has(provider);
  }

  static registerMockFactory(mockFactory: IOracleClientFactory): void {
    container.register<IOracleClientFactory>(
      SERVICE_TOKENS.ORACLE_CLIENT_FACTORY,
      () => mockFactory,
      true
    );
    logger.info('Mock oracle client factory registered');
  }

  static unregisterMockFactory(): void {
    container.unregister(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
    logger.info('Mock oracle client factory unregistered');
  }

  static isUsingDI(): boolean {
    return container.has(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
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
      case OracleProvider.REDSTONE:
        return new RedStoneClient(this.config);
      case OracleProvider.DIA:
        return new DIAClient(this.config);
      case OracleProvider.TELLAR:
        return new TellarClient(this.config);
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

export function getOracleClientFromDI(provider: OracleProvider): IOracleClient | null {
  return OracleClientFactory.getClientFromDI(provider);
}

export function registerMockOracleFactory(mockFactory: IOracleClientFactory): void {
  OracleClientFactory.registerMockFactory(mockFactory);
}

export function unregisterMockOracleFactory(): void {
  OracleClientFactory.unregisterMockFactory();
}
