/**
 * Optimism 链诊断脚本
 * 分析 403 错误原因
 */

import {
  CHAINLINK_RPC_CONFIG,
  CHAINLINK_AGGREGATOR_ABI,
  getChainlinkPriceFeed,
} from '../src/lib/oracles/chainlinkDataSources';
import { encodeFunctionData } from 'viem';

const ALCHEMY_OPTIMISM_RPC = process.env.ALCHEMY_OPTIMISM_RPC || '';

async function testRpc(rpcUrl: string, name: string) {
  console.log(`\n测试 ${name}...`);
  console.log(`URL: ${rpcUrl.replace(/\/\/.*@/, '//***@')}`);

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_chainId',
        params: [],
      }),
    });

    console.log(`状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const text = await response.text();
      console.log(`错误响应: ${text.slice(0, 200)}`);
      return false;
    }

    const data = await response.json();
    console.log(`链ID: ${data.result}`);
    return true;
  } catch (error) {
    console.log(`错误: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function testPriceFeed(symbol: string, rpcUrl: string) {
  const feed = getChainlinkPriceFeed(symbol, 10);
  if (!feed) {
    console.log(`  ${symbol}: 未找到配置`);
    return;
  }

  console.log(`\n  测试 ${symbol}:`);
  console.log(`  Feed地址: ${feed.address}`);

  const data = encodeFunctionData({
    abi: CHAINLINK_AGGREGATOR_ABI,
    functionName: 'latestRoundData',
  });

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'eth_call',
        params: [{ to: feed.address, data }, 'latest'],
      }),
    });

    console.log(`  状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const text = await response.text();
      console.log(`  错误: ${text.slice(0, 300)}`);
      return;
    }

    const result = await response.json();
    if (result.error) {
      console.log(`  RPC错误: ${result.error.message}`);
    } else {
      console.log(`  成功! 数据: ${result.result?.slice(0, 50)}...`);
    }
  } catch (error) {
    console.log(`  错误: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           Optimism 链诊断                                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  console.log('环境变量 ALCHEMY_OPTIMISM_RPC:', ALCHEMY_OPTIMISM_RPC ? '✅ 已设置' : '❌ 未设置');

  // 测试所有 Optimism RPC
  const config = CHAINLINK_RPC_CONFIG[10];
  if (!config) {
    console.log('错误: 未找到 Optimism 配置');
    return;
  }

  console.log('\n配置中的 RPC 端点:');
  for (const endpoint of config.endpoints) {
    const name = endpoint.includes('alchemy')
      ? 'Alchemy'
      : endpoint.includes('optimism.io')
        ? 'Optimism官方'
        : endpoint.includes('publicnode')
          ? 'PublicNode'
          : '其他';
    await testRpc(endpoint, name);
  }

  // 测试价格获取
  console.log('\n\n测试价格获取:');
  for (const symbol of ['BTC', 'ETH']) {
    await testPriceFeed(symbol, config.endpoints[0]);
  }

  console.log('\n诊断完成!\n');
}

main().catch(console.error);
