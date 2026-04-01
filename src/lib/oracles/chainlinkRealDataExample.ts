/**
 * Chainlink 真实数据获取示例
 *
 * 这个文件展示了如何使用 ChainlinkOnChainService 获取真实的链上数据
 */

import {
  chainlinkOnChainService,
  ChainlinkOnChainService,
  type ChainlinkPriceData,
} from './chainlinkOnChainService';

// ============================================
// 示例 1: 获取单个代币价格
// ============================================
export async function exampleGetSinglePrice(): Promise<void> {
  try {
    // 获取 ETH/USD 价格 (Ethereum 主网)
    const ethPrice = await chainlinkOnChainService.getPrice('ETH', 1);
    console.log('ETH Price:', {
      symbol: ethPrice.symbol,
      price: `$${ethPrice.price.toFixed(2)}`,
      timestamp: new Date(ethPrice.timestamp).toLocaleString(),
      decimals: ethPrice.decimals,
    });

    // 获取 BTC/USD 价格 (Ethereum 主网)
    const btcPrice = await chainlinkOnChainService.getPrice('BTC', 1);
    console.log('BTC Price:', {
      symbol: btcPrice.symbol,
      price: `$${btcPrice.price.toFixed(2)}`,
      timestamp: new Date(btcPrice.timestamp).toLocaleString(),
    });

    // 获取 LINK/USD 价格 (Arbitrum 网络)
    const linkPriceArb = await chainlinkOnChainService.getPrice('LINK', 42161);
    console.log('LINK Price (Arbitrum):', {
      symbol: linkPriceArb.symbol,
      price: `$${linkPriceArb.price.toFixed(4)}`,
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
  }
}

// ============================================
// 示例 2: 批量获取多个代币价格
// ============================================
export async function exampleGetMultiplePrices(): Promise<void> {
  try {
    const symbols = ['ETH', 'BTC', 'LINK', 'USDC', 'USDT'];
    const prices = await chainlinkOnChainService.getPrices(symbols, 1);

    console.log('Multiple Prices:');
    prices.forEach((price) => {
      console.log(
        `  ${price.symbol}: $${price.price.toFixed(price.symbol === 'USDC' || price.symbol === 'USDT' ? 4 : 2)}`
      );
    });
  } catch (error) {
    console.error('Error fetching multiple prices:', error);
  }
}

// ============================================
// 示例 3: 获取 LINK 代币信息
// ============================================
export async function exampleGetTokenData(): Promise<void> {
  try {
    const tokenData = await chainlinkOnChainService.getTokenData(1);
    console.log('LINK Token Data:', {
      name: tokenData.name,
      symbol: tokenData.symbol,
      totalSupply: `${(Number(tokenData.totalSupply) / 1e18).toLocaleString()} ${tokenData.symbol}`,
    });
  } catch (error) {
    console.error('Error fetching token data:', error);
  }
}

// ============================================
// 示例 4: 获取 Feed 元数据
// ============================================
export async function exampleGetFeedMetadata(): Promise<void> {
  try {
    const metadata = await chainlinkOnChainService.getFeedMetadata('ETH', 1);
    console.log('ETH/USD Feed Metadata:', {
      description: metadata.description,
      decimals: metadata.decimals,
      version: metadata.version.toString(),
    });
  } catch (error) {
    console.error('Error fetching feed metadata:', error);
  }
}

// ============================================
// 示例 5: 检查支持的代币和链
// ============================================
export function exampleCheckSupported(): void {
  // 获取所有支持的代币
  const supportedSymbols = chainlinkOnChainService.getSupportedSymbols();
  console.log('Supported Symbols:', supportedSymbols);

  // 获取 ETH 支持的所有链
  const ethChainIds = chainlinkOnChainService.getSupportedChainIds('ETH');
  console.log('ETH Supported Chain IDs:', ethChainIds);

  // 检查特定代币和链是否支持
  const isSupported = chainlinkOnChainService.isPriceFeedSupported('BTC', 1);
  console.log('Is BTC/USD supported on Ethereum?', isSupported);
}

// ============================================
// 示例 6: 使用自定义配置创建服务实例
// ============================================
export function exampleCreateCustomService(): ChainlinkOnChainService {
  // 创建新的服务实例（使用默认配置）
  const customService = new ChainlinkOnChainService();

  // 可以在这里添加自定义配置
  // 例如：修改缓存时间、添加自定义 RPC 端点等

  return customService;
}

// ============================================
// 示例 7: 在 React Hook 中使用
// ============================================
/*
import { useEffect, useState } from 'react';
import { chainlinkOnChainService, type ChainlinkPriceData } from '@/lib/oracles';

function useChainlinkPrice(symbol: string, chainId: number = 1) {
  const [price, setPrice] = useState<ChainlinkPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setLoading(true);
        const data = await chainlinkOnChainService.getPrice(symbol, chainId);
        setPrice(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    
    // 每 30 秒刷新一次
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, [symbol, chainId]);

  return { price, loading, error };
}

// 使用示例
function PriceDisplay() {
  const { price, loading, error } = useChainlinkPrice('ETH', 1);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!price) return <div>No data</div>;
  
  return (
    <div>
      <h2>{price.symbol}/USD</h2>
      <p>Price: ${price.price.toFixed(2)}</p>
      <p>Last Updated: {new Date(price.timestamp).toLocaleString()}</p>
    </div>
  );
}
*/

// ============================================
// 示例 8: 错误处理和降级策略
// ============================================
export async function exampleWithFallback(): Promise<void> {
  try {
    // 尝试获取真实数据
    const price = await chainlinkOnChainService.getPrice('ETH', 1);
    console.log('Real price:', price);
  } catch (error) {
    console.warn('Failed to fetch real data, using fallback:', error);

    // 降级到模拟数据或其他数据源
    // 这里可以调用模拟数据生成函数
  }
}

// ============================================
// 运行所有示例
// ============================================
export async function runAllExamples(): Promise<void> {
  console.log('=== Chainlink Real Data Examples ===\n');

  console.log('--- Example 1: Single Price ---');
  await exampleGetSinglePrice();

  console.log('\n--- Example 2: Multiple Prices ---');
  await exampleGetMultiplePrices();

  console.log('\n--- Example 3: Token Data ---');
  await exampleGetTokenData();

  console.log('\n--- Example 4: Feed Metadata ---');
  await exampleGetFeedMetadata();

  console.log('\n--- Example 5: Check Supported ---');
  exampleCheckSupported();

  console.log('\n=== Examples Completed ===');
}

// 如果在 Node.js 环境中运行，可以取消下面的注释
// runAllExamples().catch(console.error);
