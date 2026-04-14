#!/usr/bin/env node

/**
 * 验证更新后的 API3 配置
 * 测试所有配置的交易对是否可以正确获取数据
 */

import { computeCommunalApi3ReaderProxyV1Address } from '@api3/contracts';
import { encodeFunctionData } from 'viem';
import dotenv from 'dotenv';

dotenv.config();

// 从检测结果更新的配置
const API3_AVAILABLE_PAIRS = {
  ethereum: ['ETH', 'BTC', 'COMP', 'BAL', 'USDC'],
  arbitrum: ['ETH', 'BTC', 'ARB', 'USDC', 'USDT', 'DAI', 'WBTC'],
  polygon: ['ETH', 'BTC', 'USDC', 'WBTC'],
  base: ['ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'WBTC'],
  optimism: ['ETH', 'USDC', 'WBTC'],
  avalanche: ['ETH', 'AVAX', 'USDT'],
  bnbchain: ['ETH', 'BTC', 'BNB', 'USDC', 'USDT', 'WBTC'],
};

const CHAIN_ID_MAP = {
  ethereum: 1,
  arbitrum: 42161,
  polygon: 137,
  avalanche: 43114,
  bnbchain: 56,
  base: 8453,
  optimism: 10,
};

const SYMBOL_TO_DAPI = {
  ETH: 'ETH/USD',
  BTC: 'BTC/USD',
  COMP: 'COMP/USD',
  BAL: 'BAL/USD',
  USDC: 'USDC/USD',
  ARB: 'ARB/USD',
  USDT: 'USDT/USD',
  DAI: 'DAI/USD',
  WBTC: 'WBTC/USD',
  AVAX: 'AVAX/USD',
  BNB: 'BNB/USD',
};

const DAPI_PROXY_ABI = [
  {
    inputs: [],
    name: 'read',
    outputs: [
      { internalType: 'int224', name: 'value', type: 'int224' },
      { internalType: 'uint32', name: 'timestamp', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

const RPC_ENDPOINTS = {
  1: ['https://eth.llamarpc.com', 'https://ethereum.publicnode.com'],
  42161: ['https://arb1.arbitrum.io/rpc', 'https://arbitrum.publicnode.com'],
  137: ['https://polygon-rpc.com', 'https://polygon.publicnode.com'],
  43114: ['https://api.avax.network/ext/bc/C/rpc', 'https://avalanche.publicnode.com'],
  56: ['https://bsc-dataseed.binance.org', 'https://bsc.publicnode.com'],
  8453: ['https://mainnet.base.org', 'https://base.publicnode.com'],
  10: ['https://mainnet.optimism.io', 'https://optimism.publicnode.com'],
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeInt224(data) {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  if (!cleanData || cleanData.length < 64) return BigInt(0);
  const value = BigInt('0x' + cleanData.slice(0, 64));
  const maxInt224 = (BigInt(1) << BigInt(223)) - BigInt(1);
  if (value > maxInt224) return value - (BigInt(1) << BigInt(224));
  return value;
}

function decodeUint32(data) {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  if (!cleanData || cleanData.length < 64) return 0;
  return parseInt(cleanData.slice(64, 128), 16);
}

async function rpcCall(chainId, method, params) {
  const endpoints = RPC_ENDPOINTS[chainId];
  if (!endpoints) throw new Error(`No RPC for chain ${chainId}`);

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error.message);
      return result.result;
    } catch (e) {
      continue;
    }
  }
  throw new Error('All RPCs failed');
}

async function readDAPIPrice(proxyAddress, chainId) {
  try {
    const data = encodeFunctionData({ abi: DAPI_PROXY_ABI, functionName: 'read' });
    const result = await rpcCall(chainId, 'eth_call', [{ to: proxyAddress, data }, 'latest']);
    if (typeof result !== 'string') return null;

    const rawValue = decodeInt224(result);
    const timestamp = decodeUint32(result);
    const decimals = 18;
    const isNegative = rawValue < BigInt(0);
    const absValue = isNegative ? -rawValue : rawValue;
    const rawStr = absValue.toString();
    let value;
    if (rawStr.length > decimals) {
      const intPart = rawStr.slice(0, rawStr.length - decimals) || '0';
      const decPart = rawStr.slice(rawStr.length - decimals);
      value = parseFloat(`${intPart}.${decPart}`);
    } else {
      value = parseFloat(`0.${rawStr.padStart(decimals, '0')}`);
    }
    return { value: isNegative ? -value : value, timestamp: timestamp * 1000 };
  } catch (e) {
    return null;
  }
}

async function testPair(chain, symbol, chainId) {
  const dapiName = SYMBOL_TO_DAPI[symbol];
  if (!dapiName) return { success: false, error: 'No dAPI mapping' };

  try {
    const proxyAddress = computeCommunalApi3ReaderProxyV1Address(chainId, dapiName);
    const reading = await readDAPIPrice(proxyAddress, chainId);
    if (!reading) return { success: false, error: 'Failed to read' };
    if (reading.value <= 0) return { success: false, error: 'Invalid price' };
    return { success: true, price: reading.value };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function runVerification() {
  console.log('\n✅ 验证更新后的 API3 配置');
  console.log('='.repeat(60));

  let total = 0;
  let success = 0;
  const results = [];

  for (const [chain, symbols] of Object.entries(API3_AVAILABLE_PAIRS)) {
    const chainId = CHAIN_ID_MAP[chain];
    console.log(`\n🔗 ${chain.toUpperCase()}:`);

    for (const symbol of symbols) {
      total++;
      const result = await testPair(chain, symbol, chainId);
      results.push({ chain, symbol, ...result });

      if (result.success) {
        success++;
        console.log(`   ✅ ${symbol}: $${result.price.toFixed(2)}`);
      } else {
        console.log(`   ❌ ${symbol}: ${result.error}`);
      }
      await delay(300);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 验证结果:');
  console.log(`   总测试: ${total}`);
  console.log(`   成功: ${success} ✅`);
  console.log(`   失败: ${total - success} ❌`);
  console.log(`   成功率: ${((success / total) * 100).toFixed(1)}%`);

  if (success === total) {
    console.log('\n🎉 所有配置的交易对都可以正确获取数据！');
  } else {
    console.log('\n⚠️  部分交易对获取失败，建议进一步检查');
  }

  return { total, success, results };
}

runVerification().catch(console.error);
