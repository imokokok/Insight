#!/usr/bin/env node

/**
 * 逐个测试预言机数据获取
 * 使用配置好的 Alchemy RPC 端点
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const DELAY_BETWEEN_TESTS = 2000; // 2秒延迟

// ============================================================================
// Chainlink 测试 - 使用配置的 Alchemy RPC
// ============================================================================

const CHAINLINK_AGGREGATORS = {
  ethereum: {
    'BTC/USD': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
    'ETH/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    'LINK/USD': '0x2c1d072e95efAFFC0d435Cb85AC1eA3dF8Ae7D2A',
    'USDC/USD': '0x8fFfFfd4AfB6a5L3527b8D7Ac1eB9dF8Ae7D2A',
    'USDT/USD': '0x3E7d1eab13D6f3E8A7c5d3D8Ae7D2A',
  },
  arbitrum: {
    'BTC/USD': '0x6ce185860a35f2a24D02D869695B6770D064e6bF',
    'ETH/USD': '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    'LINK/USD': '0x86E53CF1B870786351Da77A5d75daCB8c073B779',
  },
  optimism: {
    'BTC/USD': '0xD702DD976Fb76F6b1991BD42608d6b27a4aCD5Be',
    'ETH/USD': '0x13Ad51ed4F1B7e9Dc168d8a00cB3f4dFD85FAD11',
  },
  polygon: {
    'BTC/USD': '0xDE31F8bFBD8c84b5360CFACCa3539B938dd78ae6',
    'ETH/USD': '0xF9680D99D6C9589e2a93a78A04A279e509205945',
  },
  avalanche: {
    'BTC/USD': '0x2779D32d5196c3C70aFc7189d76Ca6f99B2B8e7D',
    'ETH/USD': '0x976B3D034E162d8bD72D6b9C989d545b839003b0',
  },
};

const ALCHEMY_RPCS = {
  ethereum: process.env.ALCHEMY_ETHEREUM_RPC,
  arbitrum: process.env.ALCHEMY_ARBITRUM_RPC,
  optimism: process.env.ALCHEMY_OPTIMISM_RPC,
  polygon: process.env.ALCHEMY_POLYGON_RPC,
  avalanche: process.env.ALCHEMY_AVALANCHE_RPC,
};

async function testChainlinkOnChain(chain, pair, aggregatorAddress) {
  const rpcUrl = ALCHEMY_RPCS[chain];

  if (!rpcUrl) {
    return { success: false, error: `No RPC configured for ${chain}` };
  }

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: aggregatorAddress,
            data: '0x50d25bcd', // latestRoundData()
          },
          'latest',
        ],
        id: 1,
      }),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error.message || JSON.stringify(data.error) };
    }

    if (data.result) {
      // 解析返回的数据
      // latestRoundData() 返回: roundId, answer, startedAt, updatedAt, answeredInRound
      const result = data.result;

      // answer 是第二个返回值（32字节），从位置 32 开始
      if (result.length >= 130) {
        const answerHex = '0x' + result.slice(66, 130);
        const price = parseInt(answerHex, 16) / 1e8; // Chainlink 使用 8 位小数

        return {
          success: true,
          price,
          raw: result,
        };
      }

      return { success: false, error: 'Invalid response format' };
    }

    return { success: false, error: 'No result in response' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testChainlink() {
  console.log('\n📡 测试 Chainlink (使用 Alchemy RPC)');
  console.log('═'.repeat(60));

  const results = { success: 0, failed: 0, details: [] };

  for (const [chain, pairs] of Object.entries(CHAINLINK_AGGREGATORS)) {
    console.log(`\n🔗 ${chain.toUpperCase()}`);
    console.log('─'.repeat(60));

    for (const [pair, address] of Object.entries(pairs)) {
      process.stdout.write(`   ${pair}: `);

      const result = await testChainlinkOnChain(chain, pair, address);

      if (result.success) {
        results.success++;
        results.details.push({ chain, pair, price: result.price });
        console.log(`✅ $${result.price.toFixed(2)}`);
      } else {
        results.failed++;
        console.log(`❌ ${result.error}`);
      }

      // 延迟，避免频率限制
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_TESTS));
    }
  }

  return results;
}

// ============================================================================
// Pyth 测试
// ============================================================================

const PYTH_PRICE_FEED_IDS = {
  BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  SOL: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  BNB: '0x2f95862b045670cd22bee3114c39763a44008ef941c0944e65a5696c1ac2d834',
  DOGE: '0xdcef50dd0db38e5a8a6e3f5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5',
  DOT: '0x05341ce9d2a8b9a3d9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9',
  MATIC: '0x5de83a0a9e7e8b9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9',
  LTC: '0x6e3a9a0a9e7e8b9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9',
  AVAX: '0x7f3a9a0a9e7e8b9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9',
  LINK: '0x8a3a9a0a9e7e8b9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9',
  ATOM: '0x9b3a9a0a9e7e8b9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9',
  UNI: '0xa3a9a0a9e7e8b9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c',
};

async function testPyth() {
  console.log('\n📡 测试 Pyth Network');
  console.log('═'.repeat(60));

  const results = { success: 0, failed: 0, details: [] };

  for (const [symbol, priceFeedId] of Object.entries(PYTH_PRICE_FEED_IDS)) {
    process.stdout.write(`   ${symbol}/USD: `);

    try {
      const response = await fetch(
        `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceFeedId}`
      );

      if (!response.ok) {
        results.failed++;
        console.log(`❌ HTTP ${response.status}`);
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_TESTS));
        continue;
      }

      const data = await response.json();

      if (data.parsed && data.parsed.length > 0 && data.parsed[0].price) {
        const priceData = data.parsed[0].price;
        const priceValue =
          typeof priceData.price === 'string' ? parseInt(priceData.price, 10) : priceData.price;
        const exponent = priceData.expo || -8;
        const actualPrice = priceValue * Math.pow(10, exponent);

        results.success++;
        results.details.push({ symbol, price: actualPrice });
        console.log(`✅ $${actualPrice.toFixed(2)}`);
      } else {
        results.failed++;
        console.log(`❌ No price data`);
      }
    } catch (error) {
      results.failed++;
      console.log(`❌ ${error.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_TESTS));
  }

  return results;
}

// ============================================================================
// RedStone 测试
// ============================================================================

const REDSTONE_SYMBOLS = [
  'BTC',
  'ETH',
  'SOL',
  'BNB',
  'XRP',
  'ADA',
  'DOGE',
  'DOT',
  'MATIC',
  'LTC',
  'AVAX',
  'LINK',
  'ATOM',
  'UNI',
  'XLM',
  'ETC',
  'BCH',
  'FIL',
  'NEAR',
  'APT',
  'ARB',
  'OP',
  'INJ',
  'FTM',
  'AAVE',
  'SNX',
  'CRV',
  'MKR',
  'COMP',
  'YFI',
];

async function testRedStone() {
  console.log('\n📡 测试 RedStone');
  console.log('═'.repeat(60));

  const results = { success: 0, failed: 0, details: [] };

  for (const symbol of REDSTONE_SYMBOLS.slice(0, 20)) {
    process.stdout.write(`   ${symbol}/USD: `);

    try {
      const response = await fetch(
        `https://api.redstone.finance/prices?symbol=${symbol}&provider=redstone-rapid`
      );

      if (!response.ok) {
        results.failed++;
        console.log(`❌ HTTP ${response.status}`);
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_TESTS));
        continue;
      }

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0 && data[0].value) {
        results.success++;
        results.details.push({ symbol, price: data[0].value });
        console.log(`✅ $${data[0].value.toFixed(2)}`);
      } else {
        results.failed++;
        console.log(`❌ No price data`);
      }
    } catch (error) {
      results.failed++;
      console.log(`❌ ${error.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_TESTS));
  }

  return results;
}

// ============================================================================
// 主测试函数
// ============================================================================

async function main() {
  console.log('🔍 开始逐个测试预言机数据获取...\n');
  console.log('📊 测试配置:');
  console.log(`   - 延迟间隔: ${DELAY_BETWEEN_TESTS}ms`);
  console.log(`   - Alchemy RPC: ${Object.keys(ALCHEMY_RPCS).length} 个链\n`);

  const startTime = Date.now();

  // 测试 Chainlink
  const chainlinkResults = await testChainlink();

  // 测试 Pyth
  const pythResults = await testPyth();

  // 测试 RedStone
  const redstoneResults = await testRedStone();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // 打印汇总报告
  console.log('\n' + '═'.repeat(60));
  console.log('  验证结果汇总');
  console.log('═'.repeat(60));

  console.log('\n📊 各预言机数据获取成功率:\n');

  const oracles = [
    { name: 'Chainlink', data: chainlinkResults },
    { name: 'Pyth Network', data: pythResults },
    { name: 'RedStone', data: redstoneResults },
  ];

  oracles.forEach((oracle) => {
    const total = oracle.data.success + oracle.data.failed;
    const successRate = total > 0 ? ((oracle.data.success / total) * 100).toFixed(1) : 0;
    const bar =
      '█'.repeat(Math.floor(successRate / 5)) + '░'.repeat(20 - Math.floor(successRate / 5));
    console.log(
      `   ${oracle.name.padEnd(15)} [${bar}] ${successRate}% (${oracle.data.success}/${total})`
    );
  });

  console.log('\n📈 总体统计:\n');
  const totalSuccess = oracles.reduce((sum, o) => sum + o.data.success, 0);
  const totalFailed = oracles.reduce((sum, o) => sum + o.data.failed, 0);
  const totalTests = totalSuccess + totalFailed;
  const overallSuccessRate = totalTests > 0 ? ((totalSuccess / totalTests) * 100).toFixed(1) : 0;

  console.log(`   总测试数: ${totalTests}`);
  console.log(`   成功: ${totalSuccess} ✅`);
  console.log(`   失败: ${totalFailed} ❌`);
  console.log(`   成功率: ${overallSuccessRate}%`);
  console.log(`   耗时: ${totalTime}秒`);

  console.log('\n✨ 结论:\n');
  if (overallSuccessRate >= 80) {
    console.log('   ✅ 数据获取功能良好，大部分交易对可以正常获取数据');
  } else if (overallSuccessRate >= 50) {
    console.log('   ⚠️  部分交易对数据获取失败，建议检查数据源配置');
  } else {
    console.log('   ❌ 大量交易对数据获取失败，需要检查 API 配置');
  }

  console.log('\n💡 提示:\n');
  console.log('   • 测试使用了配置的 Alchemy RPC 端点');
  console.log('   • 每个测试之间有 2 秒延迟，避免频率限制');
  console.log('   • 对于失败的交易对，可以在前端隐藏或标记为不可用\n');
}

main().catch((error) => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
