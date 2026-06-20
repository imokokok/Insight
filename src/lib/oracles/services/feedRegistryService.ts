import { encodeFunctionData } from 'viem';

import { createLogger } from '@/lib/utils/logger';

import { RpcClientWithFallback } from '../utils/rpcClientWithFallback';

import { CHAINLINK_AGGREGATOR_ABI, getChainlinkRPCConfig } from './chainlinkDataSources';

const logger = createLogger('FeedRegistryService');

// Chainlink Feed Registry contract on Ethereum Mainnet
// https://docs.chain.link/data-feeds/feed-registry
const FEED_REGISTRY_ADDRESS: `0x${string}` = '0x47Fb2585D2C56218820E33aF67D6d0066676e84f';

const FEED_REGISTRY_ABI = [
  {
    inputs: [
      { name: 'base', type: 'bytes32' },
      { name: 'quote', type: 'bytes32' },
    ],
    name: 'getFeed',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'base', type: 'bytes32' },
      { name: 'quote', type: 'bytes32' },
    ],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'base', type: 'bytes32' },
      { name: 'quote', type: 'bytes32' },
    ],
    name: 'description',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const USD_BYTES32 = symbolToBytes32('USD');

function symbolToBytes32(symbol: string): `0x${string}` {
  const hex = Buffer.from(symbol, 'utf8').toString('hex');
  return ('0x' + hex.padEnd(64, '0')) as `0x${string}`;
}

function decodeAddress(data: string): `0x${string}` | null {
  const clean = data.startsWith('0x') ? data.slice(2) : data;
  if (!clean || clean.length < 64) return null;
  // Address is in the last 20 bytes of the 32-byte word
  const addressHex = clean.slice(24, 64);
  if (addressHex === '0'.repeat(40)) return null; // zero address = no feed
  return ('0x' + addressHex) as `0x${string}`;
}

export interface DiscoveredFeed {
  symbol: string;
  chainId: number;
  address: `0x${string}`;
  decimals: number;
  description: string;
  category: string;
}

class FeedRegistryService {
  private rpcClient = new RpcClientWithFallback({ contextLabel: 'feed-registry' });

  /**
   * Discover Chainlink feeds on Ethereum Mainnet via the Feed Registry contract.
   * For each known symbol, queries getFeed(symbol, USD) to find the aggregator address,
   * then reads decimals and description from the aggregator.
   */
  async discoverFeedsOnEthereum(symbols: string[]): Promise<DiscoveredFeed[]> {
    const chainId = 1;
    const config = getChainlinkRPCConfig(chainId);
    if (!config) {
      logger.error('No RPC config for Ethereum Mainnet');
      return [];
    }

    const feeds: DiscoveredFeed[] = [];

    // Process in batches to avoid RPC rate limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((symbol) => this.discoverSingleFeed(symbol, chainId, config.endpoints))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === 'fulfilled' && result.value) {
          feeds.push(result.value);
        }
      }

      // Small delay between batches
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    logger.info(`Discovered ${feeds.length}/${symbols.length} feeds on Ethereum Mainnet`);
    return feeds;
  }

  private async discoverSingleFeed(
    symbol: string,
    chainId: number,
    endpoints: string[]
  ): Promise<DiscoveredFeed | null> {
    try {
      const baseBytes32 = symbolToBytes32(symbol);

      // Step 1: Query Feed Registry for the aggregator address
      const getFeedData = encodeFunctionData({
        abi: FEED_REGISTRY_ABI,
        functionName: 'getFeed',
        args: [baseBytes32, USD_BYTES32],
      });

      const addressResult = await this.rpcClient.ethCall(
        String(chainId),
        endpoints,
        FEED_REGISTRY_ADDRESS,
        getFeedData
      );

      const feedAddress = decodeAddress(addressResult);
      if (!feedAddress) {
        logger.debug(`No feed found for ${symbol}/USD on Ethereum`, { symbol });
        return null;
      }

      // Step 2: Read decimals and description from the aggregator
      const [decimalsData, descriptionData] = await Promise.all([
        this.rpcClient.ethCall(
          String(chainId),
          endpoints,
          feedAddress,
          encodeFunctionData({ abi: CHAINLINK_AGGREGATOR_ABI, functionName: 'decimals' })
        ),
        this.rpcClient.ethCall(
          String(chainId),
          endpoints,
          feedAddress,
          encodeFunctionData({ abi: CHAINLINK_AGGREGATOR_ABI, functionName: 'description' })
        ),
      ]);

      // Decode decimals
      const cleanDecimals = decimalsData.startsWith('0x') ? decimalsData.slice(2) : decimalsData;
      const decimals = parseInt(cleanDecimals, 16) || 8;

      // Decode description
      const description = this.decodeString(descriptionData);

      return {
        symbol,
        chainId,
        address: feedAddress,
        decimals,
        description: description || `${symbol} / USD`,
        category: this.inferCategory(symbol),
      };
    } catch (error) {
      logger.debug(`Failed to discover feed for ${symbol}`, {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * For chains without a Feed Registry, discover feeds by trying known aggregator
   * addresses from the hardcoded map and verifying they still respond.
   * This can also detect new feeds if addresses are provided externally.
   */
  async verifyFeedOnChain(
    symbol: string,
    chainId: number,
    address: `0x${string}`
  ): Promise<DiscoveredFeed | null> {
    const config = getChainlinkRPCConfig(chainId);
    if (!config) return null;

    try {
      const [decimalsData, descriptionData] = await Promise.all([
        this.rpcClient.ethCall(
          String(chainId),
          config.endpoints,
          address,
          encodeFunctionData({ abi: CHAINLINK_AGGREGATOR_ABI, functionName: 'decimals' })
        ),
        this.rpcClient.ethCall(
          String(chainId),
          config.endpoints,
          address,
          encodeFunctionData({ abi: CHAINLINK_AGGREGATOR_ABI, functionName: 'description' })
        ),
      ]);

      const cleanDecimals = decimalsData.startsWith('0x') ? decimalsData.slice(2) : decimalsData;
      const decimals = parseInt(cleanDecimals, 16) || 8;
      const description = this.decodeString(descriptionData);

      return {
        symbol,
        chainId,
        address,
        decimals,
        description: description || `${symbol} / USD`,
        category: this.inferCategory(symbol),
      };
    } catch {
      return null;
    }
  }

  private decodeString(data: string): string {
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    if (!cleanData || cleanData.length < 128) return '';
    const length = parseInt(cleanData.slice(64, 128), 16);
    const stringData = cleanData.slice(128, 128 + length * 2);

    let result = '';
    for (let i = 0; i < stringData.length; i += 2) {
      const charCode = parseInt(stringData.slice(i, i + 2), 16);
      if (charCode === 0) break;
      result += String.fromCharCode(charCode);
    }
    return result;
  }

  private inferCategory(symbol: string): string {
    const forex = [
      'EUR',
      'GBP',
      'JPY',
      'CHF',
      'AUD',
      'CAD',
      'NZD',
      'SGD',
      'HKD',
      'KRW',
      'INR',
      'MXN',
      'BRL',
      'SEK',
      'NOK',
      'TRY',
      'ZAR',
      'PHP',
      'IDR',
      'CNY',
    ];
    const commodity = ['XAU', 'XAG', 'XPT', 'XPD'];
    const equity = ['AAPL', 'AMZN', 'TSLA', 'GOOGL', 'MSFT', 'META', 'NVDA', 'COIN'];

    if (forex.includes(symbol)) return 'fiat';
    if (commodity.includes(symbol)) return 'commodity';
    if (equity.includes(symbol)) return 'index';
    return 'crypto';
  }
}

export const feedRegistryService = new FeedRegistryService();
