#!/usr/bin/env node

/**
 * 测试多个可能的 Avalanche 链上的 BTC 聚合器地址
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const AVALANCHE_RPC = process.env.ALCHEMY_AVALANCHE_RPC;

const possibleAddresses = [
  '0x2779D32d5196c3C70aFc7189d76Ca6f99B2B8e7D',
  '0x264c90337bFaC136F80E5b93Bbf8900289AD7a1b',
  '0x0A77230d17318075983913bC2145DB16C7366156',
  '0x1b8a25F73c9420dD507406C3A3816A276b62f56a',
  '0x31CF013A08c6Ac228C94551d535d5BAfE19c602a',
];

async function testAddress(address) {
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

    const data = await response.json();

    if (data.result && data.result !== '0x' && data.result.length > 2) {
      const price = parseInt(data.result, 16) / 1e8;
      if (price > 0 && price < 1000000) {
        return { success: true, price };
      }
    }

    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 测试 Avalanche 链上可能的 BTC 聚合器地址\n');
  console.log('═'.repeat(60));

  for (const address of possibleAddresses) {
    process.stdout.write(`   ${address}: `);

    const result = await testAddress(address);

    if (result.success) {
      console.log(`✅ $${result.price.toFixed(2)}`);
    } else {
      console.log(`❌ 无效`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

main();
