#!/usr/bin/env node

/**
 * 测试单个 Chainlink 价格源，查看实际响应格式
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const ALCHEMY_ETHEREUM_RPC = process.env.ALCHEMY_ETHEREUM_RPC;

// Chainlink ETH/USD aggregator on Ethereum mainnet
const ETH_USD_AGGREGATOR = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419';

async function testChainlinkResponse() {
  console.log('🔍 测试 Chainlink ETH/USD 价格源');
  console.log('═'.repeat(60));
  console.log(`Aggregator: ${ETH_USD_AGGREGATOR}`);
  console.log(`RPC: ${ALCHEMY_ETHEREUM_RPC}\n`);

  // 测试 latestRoundData()
  console.log('📡 调用 latestRoundData()...');
  const response1 = await fetch(ALCHEMY_ETHEREUM_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: ETH_USD_AGGREGATOR,
          data: '0x50d25bcd', // latestRoundData()
        },
        'latest',
      ],
      id: 1,
    }),
  });

  const data1 = await response1.json();
  console.log('\n📝 原始响应:');
  console.log(JSON.stringify(data1, null, 2));

  if (data1.result) {
    const result = data1.result;
    console.log(`\n📊 结果长度: ${result.length} 字符`);
    console.log(`📊 结果: ${result}`);

    // latestRoundData() 返回 5 个 uint256 值
    // roundId (32 bytes) + answer (32 bytes) + startedAt (32 bytes) + updatedAt (32 bytes) + answeredInRound (32 bytes)
    // 总共 160 bytes = 320 hex chars + 2 chars for '0x'

    if (result.length === 322) {
      console.log('\n✅ 响应格式正确 (5 个 uint256)');

      // 解析各个字段
      const roundId = parseInt(result.slice(0, 66), 16);
      const answer = parseInt(result.slice(66, 130), 16);
      const startedAt = parseInt(result.slice(130, 194), 16);
      const updatedAt = parseInt(result.slice(194, 258), 16);
      const answeredInRound = parseInt(result.slice(258, 322), 16);

      console.log('\n📈 解析结果:');
      console.log(`   Round ID: ${roundId}`);
      console.log(`   Answer (raw): ${answer}`);
      console.log(`   Price: $${(answer / 1e8).toFixed(2)}`);
      console.log(`   Started At: ${new Date(startedAt * 1000).toISOString()}`);
      console.log(`   Updated At: ${new Date(updatedAt * 1000).toISOString()}`);
      console.log(`   Answered In Round: ${answeredInRound}`);
    } else {
      console.log(`\n⚠️  响应长度不符合预期 (期望 322，实际 ${result.length})`);
    }
  }

  // 测试 decimals()
  console.log('\n\n📡 调用 decimals()...');
  const response2 = await fetch(ALCHEMY_ETHEREUM_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: ETH_USD_AGGREGATOR,
          data: '0x313ce567', // decimals()
        },
        'latest',
      ],
      id: 2,
    }),
  });

  const data2 = await response2.json();
  console.log('\n📝 原始响应:');
  console.log(JSON.stringify(data2, null, 2));

  if (data2.result) {
    const decimals = parseInt(data2.result, 16);
    console.log(`\n✅ Decimals: ${decimals}`);
  }

  // 测试 description()
  console.log('\n\n📡 调用 description()...');
  const response3 = await fetch(ALCHEMY_ETHEREUM_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: ETH_USD_AGGREGATOR,
          data: '0x7284e416', // description()
        },
        'latest',
      ],
      id: 3,
    }),
  });

  const data3 = await response3.json();
  console.log('\n📝 原始响应:');
  console.log(JSON.stringify(data3, null, 2));

  if (data3.result) {
    // 解析字符串
    const hex = data3.result;
    // 跳过前 64 字节的偏移量和 64 字节的长度
    const dataStart = 128;
    const hexData = hex.slice(dataStart);
    const description = Buffer.from(hexData.replace(/00+$/, ''), 'hex').toString('utf8');
    console.log(`\n✅ Description: ${description}`);
  }
}

testChainlinkResponse().catch(console.error);
