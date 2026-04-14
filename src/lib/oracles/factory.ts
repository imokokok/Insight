import { FEATURE_FLAGS } from '@/lib/config/env';
import { OracleClientError, ValidationError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';
import { type Blockchain, OracleProvider } from '@/types/oracle';

import { BaseOracleClient } from './base';
import { API3Client } from './clients/api3';
import { ChainlinkClient } from './clients/chainlink';
import { DIAClient } from './clients/dia';
import { PythClient } from './clients/PythClient';
import { RedStoneClient } from './clients/redstone';
import { WINkLinkClient } from './clients/winklink';

import type { OracleClientConfig } from './base';
import type { IOracleClientFactory } from './interfaces';

const logger = createLogger('OracleClientFactory');

const DEFAULT_CONFIG: OracleClientConfig = {
  useDatabase: true,
};

export class OracleClientFactory {
  private instances: Map<OracleProvider, BaseOracleClient> = new Map();
  private mockFactory: IOracleClientFactory | null = null;
  private config: OracleClientConfig;

  constructor(config?: Partial<OracleClientConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  configure(config: Partial<OracleClientConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Oracle client factory configured', { config: this.config });
  }

  getClient(provider: OracleProvider): BaseOracleClient {
    if (this.mockFactory) {
      try {
        const client = this.mockFactory.getClient(provider);
        if (client instanceof BaseOracleClient) {
          return client;
        }
      } catch (error) {
        if (!(error instanceof OracleClientError)) {
          throw error;
        }
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

  getAllClients(): Record<OracleProvider, BaseOracleClient> {
    const providers = [
      OracleProvider.CHAINLINK,
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

  clearInstances(): void {
    if (this.mockFactory) {
      this.mockFactory.clearInstances();
      return;
    }
    this.instances.clear();
    logger.info('Cleared all oracle client instances');
  }

  hasClient(provider: OracleProvider): boolean {
    if (this.mockFactory) {
      return this.mockFactory.hasClient(provider);
    }
    return this.instances.has(provider);
  }

  setMockFactory(factory: IOracleClientFactory): void {
    this.mockFactory = factory;
    logger.info('Mock oracle client factory set');
  }

  clearMockFactory(): void {
    this.mockFactory = null;
    logger.info('Mock oracle client factory cleared');
  }

  getSupportedSymbols(provider: OracleProvider): string[] {
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

  isSymbolSupported(provider: OracleProvider, symbol: string, chain?: Blockchain): boolean {
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

  getSupportedChainsForSymbol(provider: OracleProvider, symbol: string): Blockchain[] {
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

  getAllSupportedSymbols(): Record<OracleProvider, string[]> {
    const result: Partial<Record<OracleProvider, string[]>> = {};
    const providers = [
      OracleProvider.CHAINLINK,
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

  private createClient(provider: OracleProvider): BaseOracleClient {
    const useRealChainlinkData = FEATURE_FLAGS.useRealChainlinkData;
    const useRealAPI3Data = FEATURE_FLAGS.useRealApi3Data;

    switch (provider) {
      case OracleProvider.CHAINLINK:
        return new ChainlinkClient({ ...this.config, useRealData: useRealChainlinkData });
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

let defaultInstance: OracleClientFactory | null = null;

export function getDefaultFactory(): OracleClientFactory {
  if (!defaultInstance) {
    defaultInstance = new OracleClientFactory();
  }
  return defaultInstance;
}

export function getOracleClient(provider: OracleProvider): BaseOracleClient {
  return getDefaultFactory().getClient(provider);
}

export function getAllOracleClients(): Record<OracleProvider, BaseOracleClient> {
  return getDefaultFactory().getAllClients();
}

export function setMockOracleFactory(mockFactory: IOracleClientFactory): void {
  getDefaultFactory().setMockFactory(mockFactory);
}

export function clearMockOracleFactory(): void {
  getDefaultFactory().clearMockFactory();
}
