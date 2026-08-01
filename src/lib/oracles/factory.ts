import { FEATURE_FLAGS } from '@/lib/config/env';
import { OracleClientError, ValidationError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

import { BaseOracleClient } from './base';
import { API3Client } from './clients/api3';
import { ChainlinkClient } from './clients/chainlink';
import { DIAClient } from './clients/dia';
import { FlareClient } from './clients/flare';
import { PythClient } from './clients/PythClient';
import { RedStoneClient } from './clients/redstone';
import { ReflectorClient } from './clients/reflector';
import { SupraClient } from './clients/supra';
import { SwitchboardClient } from './clients/switchboard';
import { TWAPClient } from './clients/twap';
import { WINkLinkClient } from './clients/winklink';

import type { OracleClientConfig } from './base';
import type { IOracleClient, IOracleClientFactory } from './interfaces';

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

  destroy(): void {
    for (const client of this.instances.values()) {
      client.destroy();
    }
    this.instances.clear();
    this.mockFactory = null;
  }

  configure(config: Partial<OracleClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setMockFactory(factory: IOracleClientFactory): void {
    this.clearInstances();
    this.mockFactory = factory;
  }

  clearMockFactory(): void {
    this.mockFactory = null;
  }

  clearInstances(): void {
    for (const client of this.instances.values()) {
      client.destroy();
    }
    this.instances.clear();
    this.mockFactory?.clearInstances?.();
  }

  hasClient(provider: OracleProvider): boolean {
    if (this.mockFactory?.hasClient) {
      return this.mockFactory.hasClient(provider);
    }
    return this.instances.has(provider);
  }

  getClient(provider: OracleProvider): BaseOracleClient {
    this.validateProvider(provider);

    if (this.mockFactory) {
      try {
        const client = this.mockFactory.getClient(provider);
        if (client instanceof BaseOracleClient) {
          return client;
        }
        return this.adaptToBaseClient(client, provider);
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
    if (this.mockFactory) {
      const clients = this.mockFactory.getAllClients();
      const result = {} as Record<OracleProvider, BaseOracleClient>;
      for (const [provider, client] of Object.entries(clients)) {
        result[provider as OracleProvider] =
          client instanceof BaseOracleClient
            ? client
            : this.adaptToBaseClient(client, provider as OracleProvider);
      }
      return result;
    }

    const result = {} as Record<OracleProvider, BaseOracleClient>;
    for (const provider of Object.values(OracleProvider)) {
      result[provider as OracleProvider] = this.getClient(provider as OracleProvider);
    }
    return result;
  }

  getSupportedSymbols(provider: OracleProvider): string[] {
    try {
      const client = this.getClient(provider);
      return client.getSupportedSymbols();
    } catch (error) {
      logger.warn(`Failed to get supported symbols for ${provider}`, { error });
      return [];
    }
  }

  getAllSupportedSymbols(): Record<OracleProvider, string[]> {
    const result = {} as Record<OracleProvider, string[]>;
    for (const provider of Object.values(OracleProvider)) {
      result[provider as OracleProvider] = this.getSupportedSymbols(provider as OracleProvider);
    }
    return result;
  }

  isSymbolSupported(provider: OracleProvider, symbol: string, chain?: Blockchain): boolean {
    if (!symbol || !symbol.trim()) {
      return false;
    }
    try {
      const client = this.getClient(provider);
      return client.isSymbolSupported(symbol, chain);
    } catch (error) {
      logger.warn(`Failed to check symbol support for ${provider}`, { error });
      return false;
    }
  }

  getSupportedChainsForSymbol(provider: OracleProvider, symbol: string): Blockchain[] {
    if (!symbol || !symbol.trim()) {
      return [];
    }
    try {
      const client = this.getClient(provider);
      return client.getSupportedChainsForSymbol(symbol);
    } catch (error) {
      logger.warn(`Failed to get supported chains for ${provider}`, { error });
      return [];
    }
  }

  private validateProvider(provider: OracleProvider): void {
    if (!provider || typeof provider !== 'string') {
      throw new ValidationError(`Unknown oracle provider: ${provider}`, {
        value: provider,
      });
    }
    if (!Object.values(OracleProvider).includes(provider as OracleProvider)) {
      throw new ValidationError(`Unknown oracle provider: ${provider}`, {
        value: provider,
      });
    }
  }

  private adaptToBaseClient(client: IOracleClient, provider: OracleProvider): BaseOracleClient {
    return new BaseOracleClientAdapter(client, provider);
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
      case OracleProvider.SUPRA:
        return new SupraClient(this.config);
      case OracleProvider.TWAP:
        return new TWAPClient({ ...this.config, useRealData: FEATURE_FLAGS.useRealTwapData });
      case OracleProvider.REFLECTOR:
        return new ReflectorClient({
          ...this.config,
          useRealData: FEATURE_FLAGS.useRealReflectorData,
        });
      case OracleProvider.FLARE:
        return new FlareClient({
          ...this.config,
          useRealData: FEATURE_FLAGS.useRealFlareData,
        });
      case OracleProvider.SWITCHBOARD:
        return new SwitchboardClient(this.config);
      default:
        throw new ValidationError(`Unknown oracle provider: ${provider}`, {
          value: provider,
        });
    }
  }
}

class BaseOracleClientAdapter extends BaseOracleClient {
  name: OracleProvider;
  supportedChains: Blockchain[];

  constructor(
    private client: IOracleClient,
    provider: OracleProvider
  ) {
    super();
    this.name = provider;
    this.supportedChains = client.supportedChains;
  }

  getSupportedSymbols(): string[] {
    return this.client.getSupportedSymbols?.() ?? [];
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    return this.client.getPrice(symbol, chain);
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number
  ): Promise<PriceData[]> {
    return this.client.getHistoricalPrices(symbol, chain, period);
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

export function setMockOracleFactory(factory: IOracleClientFactory): void {
  getDefaultFactory().setMockFactory(factory);
}

export function clearMockOracleFactory(): void {
  getDefaultFactory().clearMockFactory();
}
