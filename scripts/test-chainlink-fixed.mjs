#!/usr/bin/env node

/**
 * 修复后的 Chainlink 测试脚本
 * 使用 latestAnswer() 函数获取价格
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const DELAY_BETWEEN_TESTS = 2000;

// Chainlink 聚合器地址（使用 latestAnswer() 函数）
const CHAINLINK_AGGREGATORS = {
  ethereum: {
    'BTC/USD': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
    'ETH/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    'LINK/USD': '0x2c1d072e95efAFFC0d435Cb85AC1eA3dF8Ae7D2A',
    'USDC/USD': '0x8fFfFfd4AfB6a5L3527b8D7Ac1eB9dF8Ae7D2A',
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

async function getChainlinkPrice(rpcUrl, aggregatorAddress) {
  // 使用 latestAnswer() 函数获取价格
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: aggregatorAddress,
          data: '0x50d25bcd', // latestAnswer()
        },
        'latest',
      ],
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }

  if (data.result) {
    const price = parseInt(data.result, 16);

    // 获取 decimals
    const decimalsResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: aggregatorAddress,
            data: '0x313ce567', // decimals()
          },
          'latest',
        ],
        id: 2,
      }),
    });

    const decimalsData = await decimalsResponse.json();
    const decimals = decimalsData.result ? parseInt(decimalsData.result, 16) : 8;

    const actualPrice = price / Math.pow(10, decimals);

    return {
      price: actualPrice,
      decimals,
    };
  }

  throw new Error('No result in response');
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

      const rpcUrl = ALCHEMY_RPCS[chain];

      if (!rpcUrl) {
        results.failed++;
        console.log(`❌ No RPC configured`);
        continue;
      }

      try {
        const result = await getChainlinkPrice(rpcUrl, address);
        results.success++;
        results.details.push({ chain, pair, price: result.price });
        console.log(`✅ $${result.price.toFixed(2)} (decimals: ${result.decimals})`);
      } catch (error) {
        results.failed++;
        console.log(`❌ ${error.message}`);
      }

      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_TESTS));
    }
  }

  return results;
}

async function main() {
  console.log('🔍 开始测试 Chainlink 数据获取...\n');
  console.log('📊 测试配置:');
  console.log(`   - 延迟间隔: ${DELAY_BETWEEN_TESTS}ms`);
  console.log(`   - Alchemy RPC: ${Object.keys(ALCHEMY_RPCS).length} 个链\n`);

  const startTime = Date.now();

  const results = await testChainlink();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // 打印汇总报告
  console.log('\n' + '═'.repeat(60));
  console.log('  验证结果汇总');
  console.log('═'.repeat(60));

  const total = results.success + results.failed;
  const successRate = total > 0 ? ((results.success / total) * 100).toFixed(1) : 0;
  const bar =
    '█'.repeat(Math.floor(successRate / 5)) + '░'.repeat(20 - Math.floor(successRate / 5));

  console.log(`\n📊 Chainlink 数据获取成功率:\n`);
  console.log(`   [${bar}] ${successRate}% (${results.success}/${total})`);

  console.log('\n📈 统计:\n');
  console.log(`   总测试数: ${total}`);
  console.log(`   成功: ${results.success} ✅`);
  console.log(`   失败: ${results.failed} ❌`);
  console.log(`   成功率: ${successRate}%`);
  console.log(`   耗时: ${totalTime}秒`);

  console.log('\n✅ 成功获取的价格:\n');
  results.details.forEach(({ chain, pair, price }) => {
    console.log(`   ${chain}/${pair}: $${price.toFixed(2)}`);
  });
}

main().catch(console.error);
