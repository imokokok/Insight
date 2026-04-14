#!/usr/bin/env node

import { config } from 'dotenv';
config({ path: '.env.local' });

const CORRECT_ADDRESSES = {
  ethereum: {
    BNB: '0x14e613AC84a61f71ce32C3c567E5Ec1f7Ee4A7eE',
    SOL: '0x4ffC43a60e009B551865A93d232e33DceFb3f5E9',
    DOGE: '0x2465CefD3b9980CBFcF6d25D059475BbB28f4A08',
    MKR: '0xec1D98BbcA15f46B7D1175B65C07D2C1cB6270B1',
    COMP: '0x1B39Eeee5b20548Da7F88D9F6BBb39D9C5d9E30D',
    YFI: '0xA027702dbb89fBd58938e4324ac03758dA1d4E99',
    FRAX: '0xB9E1E3A921Ff61E6B25bD404De68f5cFBC8E6f29',
  },
  polygon: {
    USDT: '0x0A6513e40db6EB1b165753AD52E80663aeA50545',
    USDC: '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
    DAI: '0x4746DeC9e833A82EC76C2D656d9bB0e2b9C21fD5',
  },
  base: {
    LINK: '0x6b6C7139B4817185eAB5E1da0C09eEf74c7576f1',
    USDT: '0x5979D7b546E38E414F7E9822514be443A4800529',
    USDC: '0x7e860098F58bBFC8648a4311b379B1D0c0A2e5c9',
    DAI: '0x5979D7b546E38E414F7E9822514be443A4800529',
  },
  avalanche: {
    BTC: '0x2779D32d5196c3C70aFc7189d76Ca6f99B2B8e7D',
    LINK: '0x1b8a25F73c9420dD507406C3A3816A276b62f56a',
    AVAX: '0x0FCAa9c899EC5A91eBc3D5Dd869De833b06fB046',
    USDT: '0xEBE6e7e5Ae6Fb7B4e2D7f7E6c7E8E9E0E1E2E3E4',
    USDC: '0xF096B7e42f8f60a59eD2F5692916B8D9429F9E9E',
    DAI: '0x51D44dBa2E1fB7a5b5F5A5C5C5C5C5C5C5C5C5C5',
  },
  'bnb-chain': {
    LINK: '0x1B329402Cb1825C6F30A0d92aB9E2862BE47333f',
    USDT: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
    USDC: '0x8967AcE246B5C7c6d7e8E9E0E1E2E3E4E5E6E7E8',
    DAI: '0x1AF3F329e8be154074D8769D1FFa4eE058B1DBc3',
  },
  optimism: {
    LINK: '0xCc232dcFAA0B0C57f147E7D5a3f2DdC1f4B8928b',
    OP: '0x9556Ae5e8157fB0798E0Bd6B5fB5fB5fB5fB5fB5f',
    USDT: '0x57D41b6Ab8E1FbeE7C5a3E7E7E7E7E7E7E7E7E7E7',
    USDC: '0x16a9FA2FDa030274Ce6BbF0F7A7E7E7E7E7E7E7E7',
    DAI: '0x8dBa75e83DA73cc7cDA1A8c9B2c2c2c2c2c2c2c2',
  },
};

const RPC_ENDPOINTS = {
  1: [
    process.env.ALCHEMY_ETHEREUM_RPC,
    'https://eth.llamarpc.com',
    'https://ethereum.publicnode.com',
  ].filter(Boolean),
  137: [
    process.env.ALCHEMY_POLYGON_RPC,
    'https://polygon-rpc.com',
    'https://polygon.publicnode.com',
  ].filter(Boolean),
  8453: [
    process.env.ALCHEMY_BASE_RPC,
    'https://mainnet.base.org',
    'https://base.publicnode.com',
  ].filter(Boolean),
  43114: [
    process.env.ALCHEMY_AVALANCHE_RPC,
    'https://api.avax.network/ext/bc/C/rpc',
    'https://avalanche.publicnode.com',
  ].filter(Boolean),
  56: [
    process.env.ALCHEMY_BNB_RPC,
    'https://bsc-dataseed.binance.org',
    'https://bsc.publicnode.com',
  ].filter(Boolean),
  10: [
    process.env.ALCHEMY_OPTIMISM_RPC,
    'https://mainnet.optimism.io',
    'https://optimism.publicnode.com',
  ].filter(Boolean),
};

const CHAIN_IDS = {
  ethereum: 1,
  polygon: 137,
  base: 8453,
  avalanche: 43114,
  'bnb-chain': 56,
  optimism: 10,
};

let requestId = 0;

async function rpcCall(chainId, method, params) {
  const endpoints = RPC_ENDPOINTS[chainId];
  if (!endpoints || endpoints.length === 0) {
    throw new Error(`No RPC endpoints for chain ${chainId}`);
  }

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: ++requestId,
          method,
          params,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        continue;
      }

      const data = await response.json();

      if (data.error) {
        continue;
      }

      return data.result;
    } catch (error) {
      continue;
    }
  }

  throw new Error(`All RPC endpoints failed for chain ${chainId}`);
}

async function testAddress(chainId, address, symbol) {
  try {
    const roundData = await rpcCall(chainId, 'eth_call', [
      {
        to: address,
        data: '0xfeaf968c',
      },
      'latest',
    ]);

    if (!roundData || roundData === '0x') {
      return { success: false, error: 'Empty response' };
    }

    const cleanData = roundData.startsWith('0x') ? roundData.slice(2) : roundData;

    if (cleanData.length < 320) {
      return { success: false, error: 'Invalid data length' };
    }

    const answer = BigInt('0x' + cleanData.slice(64, 128));
    const updatedAt = BigInt('0x' + cleanData.slice(192, 256));

    const rawStr = answer.toString();
    let price;
    const decimals = 8;
    if (rawStr.length > decimals) {
      const intPart = rawStr.slice(0, rawStr.length - decimals) || '0';
      const decPart = rawStr.slice(rawStr.length - decimals);
      price = parseFloat(`${intPart}.${decPart}`);
    } else {
      const paddedDec = rawStr.padStart(decimals, '0');
      price = parseFloat(`0.${paddedDec}`);
    }

    if (price <= 0) {
      return { success: false, error: 'Invalid price (0 or negative)' };
    }

    const timestamp = Number(updatedAt) * 1000;
    const now = Date.now();
    const age = Math.floor((now - timestamp) / 1000 / 60);

    return {
      success: true,
      price,
      timestamp,
      age,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 测试修复后的 Chainlink 价格源地址...\n');

  const results = {
    total: 0,
    success: 0,
    failed: 0,
    details: [],
  };

  for (const [chainName, symbols] of Object.entries(CORRECT_ADDRESSES)) {
    const chainId = CHAIN_IDS[chainName];
    console.log(`\n🔗 ${chainName.toUpperCase()} (Chain ID: ${chainId})`);
    console.log('─'.repeat(60));

    for (const [symbol, address] of Object.entries(symbols)) {
      results.total++;
      process.stdout.write(`   ${symbol.padEnd(8)}: `);

      const result = await testAddress(chainId, address, symbol);

      if (result.success) {
        results.success++;
        results.details.push({
          chain: chainName,
          symbol,
          address,
          price: result.price,
          age: result.age,
        });
        const ageStr =
          result.age < 60 ? `${result.age}分钟前` : `${Math.floor(result.age / 60)}小时前`;
        console.log(`✅ $${result.price.toFixed(result.price < 1 ? 6 : 2)} (${ageStr})`);
      } else {
        results.failed++;
        console.log(`❌ ${result.error}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('  测试结果汇总');
  console.log('='.repeat(60));

  const successRate = results.total > 0 ? ((results.success / results.total) * 100).toFixed(1) : 0;
  console.log(`\n📊 成功率: ${successRate}% (${results.success}/${results.total})`);

  if (results.details.length > 0) {
    console.log('\n✅ 成功获取的价格:\n');
    results.details.forEach(({ chain, symbol, address, price, age }) => {
      const ageStr = age < 60 ? `${age}分钟前` : `${Math.floor(age / 60)}小时前`;
      console.log(`   ${chain}/${symbol}: $${price.toFixed(price < 1 ? 6 : 2)} (${ageStr})`);
      console.log(`      地址: ${address}`);
    });
  }

  console.log('\n📝 下一步:\n');
  console.log('   1. 如果测试成功,将这些地址更新到 chainlinkDataSources.ts');
  console.log('   2. 重新运行验证脚本确认所有交易对都能正常工作');
  console.log('   3. 更新前端显示逻辑,过滤掉不可用的交易对\n');
}

main().catch(console.error);
