/**
 * 测试 Chainlink 真实数据获取
 *
 * 运行: npx ts-node test-chainlink-real-data.ts
 */

import { chainlinkOnChainService } from './src/lib/oracles/chainlinkOnChainService';

async function testRealData() {
  console.log('=== 测试 Chainlink 真实数据获取 ===\n');

  try {
    // 测试 1: 获取 ETH/USD 价格
    console.log('1. 获取 ETH/USD 价格...');
    const ethPrice = await chainlinkOnChainService.getPrice('ETH', 1);
    console.log('✅ ETH 价格:', `$${ethPrice.price.toFixed(2)}`);
    console.log('   时间戳:', new Date(ethPrice.timestamp).toLocaleString());
    console.log('   精度:', ethPrice.decimals);
    console.log('   链 ID:', ethPrice.chainId);
    console.log();

    // 测试 2: 获取 BTC/USD 价格
    console.log('2. 获取 BTC/USD 价格...');
    const btcPrice = await chainlinkOnChainService.getPrice('BTC', 1);
    console.log('✅ BTC 价格:', `$${btcPrice.price.toFixed(2)}`);
    console.log();

    // 测试 3: 获取 LINK/USD 价格（Arbitrum）
    console.log('3. 获取 LINK/USD 价格（Arbitrum）...');
    const linkPrice = await chainlinkOnChainService.getPrice('LINK', 42161);
    console.log('✅ LINK 价格 (Arbitrum):', `$${linkPrice.price.toFixed(4)}`);
    console.log();

    // 测试 4: 批量获取价格
    console.log('4. 批量获取价格...');
    const prices = await chainlinkOnChainService.getPrices(['ETH', 'BTC', 'LINK'], 1);
    console.log('✅ 批量价格:');
    prices.forEach((p) => {
      console.log(`   ${p.symbol}: $${p.price.toFixed(p.symbol === 'LINK' ? 4 : 2)}`);
    });
    console.log();

    // 测试 5: 获取 LINK 代币信息
    console.log('5. 获取 LINK 代币信息...');
    const tokenData = await chainlinkOnChainService.getTokenData(1);
    console.log('✅ LINK 代币:');
    console.log('   名称:', tokenData.name);
    console.log('   符号:', tokenData.symbol);
    console.log(
      '   总供应量:',
      `${(Number(tokenData.totalSupply) / 1e18).toLocaleString()} ${tokenData.symbol}`
    );
    console.log();

    // 测试 6: 获取 Feed 元数据
    console.log('6. 获取 ETH/USD Feed 元数据...');
    const metadata = await chainlinkOnChainService.getFeedMetadata('ETH', 1);
    console.log('✅ Feed 元数据:');
    console.log('   描述:', metadata.description);
    console.log('   精度:', metadata.decimals);
    console.log('   版本:', metadata.version.toString());
    console.log();

    console.log('=== 所有测试通过! Chainlink 真实数据获取正常工作 ===');
  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

// 运行测试
testRealData();
