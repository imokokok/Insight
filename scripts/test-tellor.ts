/**
 * Tellor 预言机数据获取测试脚本
 *
 * 使用方法:
 * npx ts-node scripts/test-tellor.ts
 */

import { tellorOnChainService } from '../src/lib/oracles/tellorOnChainService';
import { TellorClient } from '../src/lib/services/oracle/clients/tellor';
import { Blockchain } from '../src/types/oracle';

async function testTellorOnChainService() {
  console.log('=== 测试 Tellor OnChain Service ===\n');

  // 测试支持的币种
  console.log('支持的币种:', tellorOnChainService.getSupportedSymbols());

  // 测试以太坊主网价格获取
  console.log('\n--- 测试以太坊主网价格获取 ---');
  try {
    const ethPrice = await tellorOnChainService.getPrice('ETH', 1);
    console.log('ETH 价格 (Ethereum):', {
      symbol: ethPrice.symbol,
      price: ethPrice.price,
      decimals: ethPrice.decimals,
      timestamp: new Date(ethPrice.timestamp).toISOString(),
      queryId: ethPrice.queryId,
    });
  } catch (error) {
    console.error('获取 ETH 价格失败:', error instanceof Error ? error.message : error);
  }

  try {
    const btcPrice = await tellorOnChainService.getPrice('BTC', 1);
    console.log('BTC 价格 (Ethereum):', {
      symbol: btcPrice.symbol,
      price: btcPrice.price,
      decimals: btcPrice.decimals,
      timestamp: new Date(btcPrice.timestamp).toISOString(),
    });
  } catch (error) {
    console.error('获取 BTC 价格失败:', error instanceof Error ? error.message : error);
  }

  // 测试历史数据获取
  console.log('\n--- 测试历史数据获取 ---');
  try {
    const historicalData = await tellorOnChainService.getHistoricalValues('ETH', 1, 5);
    console.log(`获取到 ${historicalData.length} 条 ETH 历史数据:`);
    historicalData.forEach((data, index) => {
      console.log(`  [${index}] ${new Date(data.timestamp).toISOString()}: $${data.price}`);
    });
  } catch (error) {
    console.error('获取历史数据失败:', error instanceof Error ? error.message : error);
  }

  // 测试批量获取
  console.log('\n--- 测试批量价格获取 ---');
  try {
    const prices = await tellorOnChainService.getPrices(['ETH', 'BTC', 'LINK'], 1);
    console.log('批量获取结果:');
    prices.forEach((price) => {
      console.log(`  ${price.symbol}: $${price.price}`);
    });
  } catch (error) {
    console.error('批量获取失败:', error instanceof Error ? error.message : error);
  }
}

async function testTellorClient() {
  console.log('\n\n=== 测试 Tellor Client ===\n');

  const client = new TellorClient();

  // 测试币种支持检查
  console.log('支持的币种:', client.getSupportedSymbols());
  console.log('ETH 是否支持:', client.isSymbolSupported('ETH', Blockchain.ETHEREUM));
  console.log('BTC 是否支持:', client.isSymbolSupported('BTC', Blockchain.ETHEREUM));

  // 测试价格获取
  console.log('\n--- 测试 Client 价格获取 ---');
  try {
    const ethPrice = await client.getPrice('ETH', Blockchain.ETHEREUM);
    console.log('ETH 价格:', {
      provider: ethPrice.provider,
      symbol: ethPrice.symbol,
      price: ethPrice.price,
      timestamp: new Date(ethPrice.timestamp).toISOString(),
      source: ethPrice.source,
      confidence: ethPrice.confidence,
    });
  } catch (error) {
    console.error('Client 获取 ETH 价格失败:', error instanceof Error ? error.message : error);
  }

  try {
    const btcPrice = await client.getPrice('BTC', Blockchain.ETHEREUM);
    console.log('BTC 价格:', {
      provider: btcPrice.provider,
      symbol: btcPrice.symbol,
      price: btcPrice.price,
      source: btcPrice.source,
    });
  } catch (error) {
    console.error('Client 获取 BTC 价格失败:', error instanceof Error ? error.message : error);
  }

  // 测试历史价格
  console.log('\n--- 测试历史价格获取 ---');
  try {
    const historicalPrices = await client.getHistoricalPrices('ETH', Blockchain.ETHEREUM, 24);
    console.log(`获取到 ${historicalPrices.length} 条历史价格数据`);
    if (historicalPrices.length > 0) {
      console.log('最新历史数据:', {
        price: historicalPrices[historicalPrices.length - 1].price,
        timestamp: new Date(historicalPrices[historicalPrices.length - 1].timestamp).toISOString(),
        source: historicalPrices[historicalPrices.length - 1].source,
      });
    }
  } catch (error) {
    console.error('获取历史价格失败:', error instanceof Error ? error.message : error);
  }
}

async function main() {
  console.log('开始测试 Tellor 预言机数据获取...\n');
  console.log('注意: 现在只使用真实的链上数据，没有模拟数据回退\n');

  try {
    await testTellorOnChainService();
    await testTellorClient();

    console.log('\n\n=== 测试完成 ===');
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行测试
main();
