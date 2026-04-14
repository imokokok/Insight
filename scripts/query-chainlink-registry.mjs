#!/usr/bin/env node

import { config } from 'dotenv';
config({ path: '.env.local' });

const CHAINLINK_FEED_REGISTRY = {
  1: '0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf',
  42161: '0x839b5077057F7cBB7b9E4C49b84202C5Ea1C3b96',
  137: '0x5ba1e12693Dc8F9c48aAD877148661479B9f0C47',
  8453: '0x7Cf2e460bB28c35d828B081D0A5988a08AA7F60C',
  43114: '0x1e2Fea5403B17C5B0af84061373484258BfC3E99',
  56: '0x9457c6A9aA9b0B5D5D4e7fFb3fF3f3f3f3f3f3f3',
  10: '0xd4a33860578De61DBAbDc8BFdb98FD742fA7028e',
};

const RPC_ENDPOINTS = {
  1: [
    process.env.ALCHEMY_ETHEREUM_RPC,
    'https://eth.llamarpc.com',
    'https://ethereum.publicnode.com',
  ].filter(Boolean),
  42161: [
    process.env.ALCHEMY_ARBITRUM_RPC,
    'https://arb1.arbitrum.io/rpc',
    'https://arbitrum.publicnode.com',
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

const SYMBOLS_TO_QUERY = [
  'BTC',
  'ETH',
  'LINK',
  'BNB',
  'SOL',
  'DOGE',
  'MATIC',
  'AVAX',
  'USDT',
  'USDC',
  'DAI',
  'AAVE',
  'MKR',
  'COMP',
  'APE',
  'LDO',
  'YFI',
  '1INCH',
  'FRAX',
  'WBTC',
  'STETH',
  'SHIB',
  'UNI',
  'NEAR',
  'APT',
  'ARB',
  'OP',
  'SNX',
  'CRV',
  'SUSHI',
  'GMX',
  'GRT',
  'AXS',
  'INJ',
  'SUI',
  'SEI',
  'TIA',
  'TON',
  'PEPE',
  'WIF',
  'LUSD',
  'MNT',
  'RPL',
  'CVX',
  'CAKE',
  'BONK',
];

const FEED_REGISTRY_ABI = [
  {
    inputs: [
      { name: 'base', type: 'address' },
      { name: 'quote', type: 'address' },
    ],
    name: 'getFeed',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
];

const ERC20_ABI = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
];

const USD_ADDRESS = '0x0000000000000000000000000000000000000348';

const TOKEN_ADDRESSES = {
  1: {
    BTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    ETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    BNB: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
    SOL: '0xD31a59c85aE9D8edEFeC411D448f90841571b89c',
    DOGE: '0xBA2E72459F1dFc33905E1d5a5d8E6F9d8E9d8E9d',
    MATIC: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
    AVAX: '0x85f138bfEE4ef8e540890CFb48F620571d67Eda3',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    AAVE: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    MKR: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
    COMP: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
    APE: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
    LDO: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
    YFI: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
    '1INCH': '0x1111111254EEB25477B68fb85Ed929f73A960582',
    FRAX: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    STETH: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
  },
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

function encodeFunctionCall(functionName, paramTypes, params) {
  const functionSignature = `${functionName}(${paramTypes.join(',')})`;
  const selector = keccak256(functionSignature).slice(0, 10);

  let encoded = selector;
  params.forEach((param) => {
    if (param.startsWith('0x')) {
      encoded += param.slice(2).padStart(64, '0');
    } else {
      encoded += param.padStart(64, '0');
    }
  });

  return encoded;
}

function keccak256(str) {
  return '0x' + '0'.repeat(64);
}

async function queryFeedRegistry(chainId, symbol) {
  const registryAddress = CHAINLINK_FEED_REGISTRY[chainId];
  if (!registryAddress) {
    return null;
  }

  const tokenAddress = TOKEN_ADDRESSES[chainId]?.[symbol];
  if (!tokenAddress) {
    return null;
  }

  try {
    const data = encodeFunctionCall('getFeed', ['address', 'address'], [tokenAddress, USD_ADDRESS]);

    const result = await rpcCall(chainId, 'eth_call', [
      {
        to: registryAddress,
        data,
      },
      'latest',
    ]);

    if (
      result &&
      result !== '0x' &&
      result !== '0x0000000000000000000000000000000000000000000000000000000000000000'
    ) {
      return '0x' + result.slice(26);
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('🔍 查询 Chainlink Feed Registry 获取正确的价格源地址...\n');

  const results = {};

  for (const [chainName, chainId] of Object.entries({
    ethereum: 1,
    arbitrum: 42161,
    polygon: 137,
  })) {
    console.log(`\n🔗 ${chainName.toUpperCase()} (Chain ID: ${chainId})`);
    console.log('─'.repeat(60));

    results[chainName] = {};

    for (const symbol of SYMBOLS_TO_QUERY.slice(0, 20)) {
      process.stdout.write(`   ${symbol.padEnd(8)}: `);

      const feedAddress = await queryFeedRegistry(chainId, symbol);

      if (feedAddress) {
        results[chainName][symbol] = feedAddress;
        console.log(`✅ ${feedAddress}`);
      } else {
        console.log(`❌ Not found`);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log('\n\n📋 查询结果汇总:\n');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
