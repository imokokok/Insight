/**
 * 测试修复后的ETH Query ID
 */

import {
  getTellorOracleAddress,
  getTellorPriceQuery,
  TELLOR_ORACLE_ABI,
} from '../src/lib/oracles/tellorDataSources';
import { encodeFunctionData } from 'viem';

const RPC_URL = 'https://eth.drpc.org';

async function testETHPrice() {
  console.log('=== 测试修复后的ETH Query ID ===\n');

  const chainId = 1;
  const symbol = 'ETH';

  const oracleAddress = getTellorOracleAddress(chainId);
  const priceQuery = getTellorPriceQuery(symbol);

  console.log('配置信息:');
  console.log(`  链ID: ${chainId}`);
  console.log(`  代币: ${symbol}`);
  console.log(`  预言机地址: ${oracleAddress}`);
  console.log(`  Query ID: ${priceQuery?.queryId}`);

  if (!oracleAddress || !priceQuery) {
    console.log('\n❌ 配置缺失');
    return;
  }

  const callData = encodeFunctionData({
    abi: TELLOR_ORACLE_ABI,
    functionName: 'getCurrentValue',
    args: [priceQuery.queryId as `0x${string}`],
  });

  try {
    console.log(`\n发送请求到 ${RPC_URL}...`);

    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: oracleAddress,
            data: callData,
          },
          'latest',
        ],
      }),
    });

    console.log(`HTTP状态: ${response.status}`);

    if (!response.ok) {
      console.log(`❌ HTTP错误: ${response.statusText}`);
      return;
    }

    const result = await response.json();

    if (result.error) {
      console.log(`❌ RPC错误: ${result.error.message}`);
      return;
    }

    const rawData = result.result as string;
    console.log(`\n原始返回数据: ${rawData}`);

    const cleanData = rawData.slice(2);
    const timestamp = BigInt('0x' + cleanData.slice(64, 128));

    console.log(`时间戳: ${timestamp.toString()}`);

    if (timestamp === BigInt(0)) {
      console.log('\n⚠️ 时间戳为0，表示该Query ID没有数据');
      return;
    }

    const offset = parseInt(cleanData.slice(0, 64), 16) * 2;
    const bytesLength = parseInt(cleanData.slice(offset, offset + 64), 16);
    const bytesData = cleanData.slice(offset + 64, offset + 64 + bytesLength * 2);
    const rawPrice = BigInt('0x' + bytesData.slice(0, 64));
    const price = Number(rawPrice) / 1e18;

    console.log(`\n✅ 成功获取ETH价格!`);
    console.log(`  价格: $${price.toLocaleString()}`);
    console.log(`  时间戳: ${new Date(Number(timestamp) * 1000).toISOString()}`);
  } catch (error) {
    console.log(`\n❌ 请求失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  await testETHPrice();
  console.log('\n=== 测试完成 ===');
}

main().catch(console.error);
