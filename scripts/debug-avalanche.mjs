#!/usr/bin/env node

/**
 * 调试 Avalanche 链上的 Chainlink 聚合器
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const AVALANCHE_RPC = process.env.ALCHEMY_AVALANCHE_RPC;

const aggregators = {
  'BTC/USD': '0x2779D32d5196c3C70aFc7189d76Ca6f99B2B8e7D',
  'ETH/USD': '0x976b3d034e162d8bd72d6b9c989d545b839003b0',
  'AVAX/USD': '0x0FCAa9c899EC5A91eBc3D5Dd869De833b06fB046',
};

async function testAvalanche() {
  console.log('🔍 调试 Avalanche 链上的 Chainlink 聚合器\n');
  console.log('═'.repeat(60));
  console.log(`RPC: ${AVALANCHE_RPC}\n`);

  for (const [pair, address] of Object.entries(aggregators)) {
    console.log(`\n📊 测试 ${pair}`);
    console.log(`聚合器地址: ${address}`);

    try {
      const response = await fetch(AVALANCHE_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{ to: address, data: '0x50d25bcd' }, 'latest'],
          id: 1,
        }),
      });

      console.log(`响应状态: ${response.status}`);

      const data = await response.json();
      console.log(`响应数据:`, JSON.stringify(data, null, 2));

      if (data.result) {
        const price = parseInt(data.result, 16) / 1e8;
        console.log(`✅ 价格: $${price.toFixed(2)}`);
      } else if (data.error) {
        console.log(`❌ 错误: ${JSON.stringify(data.error)}`);
      }
    } catch (error) {
      console.log(`❌ 异常: ${error.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

testAvalanche();
