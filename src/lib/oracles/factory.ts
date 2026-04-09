import { FEATURE_FLAGS } from '@/lib/config/serverEnv';
import { container, SERVICE_TOKENS } from '@/lib/di';
import { OracleClientError, ValidationError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';
import { type Blockchain, OracleProvider } from '@/types/oracle';

import { API3Client } from './api3';
import { BaseOracleClient } from './base';
import { ChainlinkClient } from './chainlink';
import { DIAClient } from './dia';
import { PythClient } from './pythNetwork';
import { RedStoneClient } from './redstone';
import { UMAClient } from './uma';
import { WINkLinkClient } from './winklink';

import type { OracleClientConfig } from './base';
import type { IOracleClient, IOracleClientFactory } from './interfaces';

const logger = createLogger('OracleClientFactory');

export class OracleClientFactory {
  private static instances: Map<OracleProvider, BaseOracleClient> = new Map();
  private static config: OracleClientConfig = {
    useDatabase: true,
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
    const client = this.instances.get(provider);
    if (!client) {
      throw new OracleClientError(`Failed to create oracle client for provider: ${provider}`, {
        provider,
      });
    }
    return client;
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
      OracleProvider.UMA,
      OracleProvider.PYTH,
      OracleProvider.API3,
      OracleProvider.REDSTONE,
      OracleProvider.DIA,
      OracleProvider.WINKLINK,
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

  static getSupportedSymbols(provider: OracleProvider): string[] {
    try {
      const client = this.getClient(provider);
      return client.getSupportedSymbols();
    } catch (error) {
      logger.error(
        `Failed to get supported symbols for provider ${provider}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  static isSymbolSupported(provider: OracleProvider, symbol: string, chain?: Blockchain): boolean {
    if (!symbol || symbol.trim() === '') {
      return false;
    }

    try {
      const client = this.getClient(provider);
      return client.isSymbolSupported(symbol, chain);
    } catch (error) {
      logger.error(
        `Failed to check symbol support for ${symbol} on provider ${provider}`,
        error instanceof Error ? error : new Error(String(error)),
        { symbol, chain }
      );
      return false;
    }
  }

  static getSupportedChainsForSymbol(provider: OracleProvider, symbol: string): Blockchain[] {
    if (!symbol || symbol.trim() === '') {
      return [];
    }

    try {
      const client = this.getClient(provider);
      return client.getSupportedChainsForSymbol(symbol);
    } catch (error) {
      logger.error(
        `Failed to get supported chains for symbol ${symbol} on provider ${provider}`,
        error instanceof Error ? error : new Error(String(error)),
        { symbol }
      );
      return [];
    }
  }

  static getAllSupportedSymbols(): Record<OracleProvider, string[]> {
    const result: Partial<Record<OracleProvider, string[]>> = {};
    const providers = [
      OracleProvider.CHAINLINK,
      OracleProvider.UMA,
      OracleProvider.PYTH,
      OracleProvider.API3,
      OracleProvider.REDSTONE,
      OracleProvider.DIA,
      OracleProvider.WINKLINK,
    ];

    for (const provider of providers) {
      try {
        result[provider] = this.getSupportedSymbols(provider);
      } catch (error) {
        logger.error(
          `Failed to get supported symbols for provider ${provider}`,
          error instanceof Error ? error : new Error(String(error))
        );
        result[provider] = [];
      }
    }

    return result as Record<OracleProvider, string[]>;
  }

  private static createClient(provider: OracleProvider): BaseOracleClient {
    const useRealChainlinkData = FEATURE_FLAGS.useRealChainlinkData ?? true;
    const useRealUMData = FEATURE_FLAGS.useRealUmaData ?? true;
    const useRealAPI3Data = FEATURE_FLAGS.useRealApi3Data ?? true;

    switch (provider) {
      case OracleProvider.CHAINLINK:
        return new ChainlinkClient({ ...this.config, useRealData: useRealChainlinkData });
      case OracleProvider.UMA:
        return new UMAClient({ ...this.config, useRealData: useRealUMData });
      case OracleProvider.PYTH:
        return new PythClient(this.config);
      case OracleProvider.API3:
        return new API3Client({ ...this.config, useRealData: useRealAPI3Data });
      case OracleProvider.REDSTONE:
        return new RedStoneClient(this.config);
      case OracleProvider.DIA:
        return new DIAClient(this.config);
      case OracleProvider.WINKLINK:
        return new WINkLinkClient(this.config);
      default:
        throw new ValidationError(`Unknown oracle provider: ${provider}`, {
          value: provider,
        });
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
