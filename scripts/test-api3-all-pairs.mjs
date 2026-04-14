#!/usr/bin/env node

/**
 * API3 预言机价格查询功能检测脚本
 *
 * 功能：检测前端显示可以查询的每个链上的每个交易对是否可以正确获取实际数据
 * 特点：
 * 1. 使用 Alchemy RPC（如果配置了环境变量）
 * 2. 一个一个查询，避免限速
 * 3. 检测所有支持的链和交易对
 * 4. 生成详细的检测报告
 */

import { computeCommunalApi3ReaderProxyV1Address } from '@api3/contracts';
import { encodeFunctionData } from 'viem';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 从 .env 文件读取 Alchemy RPC
const ALCHEMY_RPC = {
  ethereum: process.env.ALCHEMY_ETHEREUM_RPC || '',
  arbitrum: process.env.ALCHEMY_ARBITRUM_RPC || '',
  polygon: process.env.ALCHEMY_POLYGON_RPC || '',
  base: process.env.ALCHEMY_BASE_RPC || '',
  optimism: process.env.ALCHEMY_OPTIMISM_RPC || '',
};

// 链ID映射
const CHAIN_ID_MAP = {
  ethereum: 1,
  arbitrum: 42161,
  polygon: 137,
  avalanche: 43114,
  bnbchain: 56,
  base: 8453,
  optimism: 10,
  fantom: 250,
  gnosis: 100,
  moonbeam: 1284,
  kava: 2222,
  linea: 59144,
  scroll: 534352,
};

// RPC 端点配置（优先使用 Alchemy）
const RPC_ENDPOINTS = {
  1: ALCHEMY_RPC.ethereum
    ? [ALCHEMY_RPC.ethereum, 'https://eth.llamarpc.com', 'https://ethereum.publicnode.com']
    : ['https://eth.llamarpc.com', 'https://ethereum.publicnode.com'],
  42161: ALCHEMY_RPC.arbitrum
    ? [ALCHEMY_RPC.arbitrum, 'https://arb1.arbitrum.io/rpc', 'https://arbitrum.publicnode.com']
    : ['https://arb1.arbitrum.io/rpc', 'https://arbitrum.publicnode.com'],
  137: ALCHEMY_RPC.polygon
    ? [ALCHEMY_RPC.polygon, 'https://polygon-rpc.com', 'https://polygon.publicnode.com']
    : ['https://polygon-rpc.com', 'https://polygon.publicnode.com'],
  43114: ['https://api.avax.network/ext/bc/C/rpc', 'https://avalanche.publicnode.com'],
  56: ['https://bsc-dataseed.binance.org', 'https://bsc.publicnode.com'],
  8453: ALCHEMY_RPC.base
    ? [ALCHEMY_RPC.base, 'https://mainnet.base.org', 'https://base.publicnode.com']
    : ['https://mainnet.base.org', 'https://base.publicnode.com'],
  10: ALCHEMY_RPC.optimism
    ? [ALCHEMY_RPC.optimism, 'https://mainnet.optimism.io', 'https://optimism.publicnode.com']
    : ['https://mainnet.optimism.io', 'https://optimism.publicnode.com'],
  250: ['https://rpc.ftm.tools', 'https://fantom.publicnode.com'],
  100: ['https://rpc.gnosischain.com', 'https://gnosis.publicnode.com'],
  1284: ['https://rpc.api.moonbeam.network', 'https://moonbeam.publicnode.com'],
  2222: ['https://evm.kava.io', 'https://kava.publicnode.com'],
  59144: ['https://rpc.linea.build', 'https://linea.publicnode.com'],
  534352: ['https://rpc.scroll.io', 'https://scroll.publicnode.com'],
};

// API3 支持的币种到 dAPI 名称的映射
const SYMBOL_TO_DAPI = {
  ETH: 'ETH/USD',
  BTC: 'BTC/USD',
  LINK: 'LINK/USD',
  API3: 'API3/USD',
  MATIC: 'MATIC/USD',
  AVAX: 'AVAX/USD',
  BNB: 'BNB/USD',
  ARB: 'ARB/USD',
  OP: 'OP/USD',
  UNI: 'UNI/USD',
  AAVE: 'AAVE/USD',
  PYTH: 'PYTH/USD',
  UMA: 'UMA/USD',
  DIA: 'DIA/USD',
  SOL: 'SOL/USD',
  DOGE: 'DOGE/USD',
  XRP: 'XRP/USD',
  ADA: 'ADA/USD',
  DOT: 'DOT/USD',
  LTC: 'LTC/USD',
  BCH: 'BCH/USD',
  ETC: 'ETC/USD',
  XLM: 'XLM/USD',
  TRX: 'TRX/USD',
  EOS: 'EOS/USD',
  ATOM: 'ATOM/USD',
  ALGO: 'ALGO/USD',
  VET: 'VET/USD',
  NEO: 'NEO/USD',
  QTUM: 'QTUM/USD',
  ZRX: 'ZRX/USD',
  BAT: 'BAT/USD',
  ENJ: 'ENJ/USD',
  MANA: 'MANA/USD',
  SAND: 'SAND/USD',
  CHZ: 'CHZ/USD',
  SHIB: 'SHIB/USD',
  FTM: 'FTM/USD',
  GRT: 'GRT/USD',
  SUSHI: 'SUSHI/USD',
  COMP: 'COMP/USD',
  MKR: 'MKR/USD',
  YFI: 'YFI/USD',
  CRV: 'CRV/USD',
  SNX: 'SNX/USD',
  ZEC: 'ZEC/USD',
  DASH: 'DASH/USD',
  THETA: 'THETA/USD',
  ONT: 'ONT/USD',
  ZIL: 'ZIL/USD',
  KNC: 'KNC/USD',
  LRC: 'LRC/USD',
  STORJ: 'STORJ/USD',
  KAVA: 'KAVA/USD',
  REN: 'REN/USD',
  BAL: 'BAL/USD',
  YFII: 'YFII/USD',
  ANKR: 'ANKR/USD',
  COTI: 'COTI/USD',
  HBAR: 'HBAR/USD',
  OMG: 'OMG/USD',
  NKN: 'NKN/USD',
  SC: 'SC/USD',
  IOST: 'IOST/USD',
  DGB: 'DGB/USD',
  WTC: 'WTC/USD',
  DOCK: 'DOCK/USD',
  WAN: 'WAN/USD',
  FUN: 'FUN/USD',
  CVC: 'CVC/USD',
  MTL: 'MTL/USD',
  BEAM: 'BEAM/USD',
  RVN: 'RVN/USD',
  USDC: 'USDC/USD',
  USDT: 'USDT/USD',
  DAI: 'DAI/USD',
  FRAX: 'FRAX/USD',
  WBTC: 'WBTC/USD',
  WETH: 'WETH/USD',
  STETH: 'STETH/USD',
  RETH: 'RETH/USD',
  CBETH: 'CBETH/USD',
};

// API3 可用的链-交易对映射（基于实际测试结果和官方文档）
const API3_AVAILABLE_PAIRS = {
  ethereum: [
    'ETH',
    'BTC',
    'LINK',
    'UNI',
    'AAVE',
    'SNX',
    'CRV',
    'MKR',
    'COMP',
    'YFI',
    'SUSHI',
    '1INCH',
    'BAL',
    'LDO',
    'GMX',
    'DYDX',
    'USDC',
    'USDT',
    'DAI',
    'FRAX',
    'WBTC',
    'WETH',
    'STETH',
  ],
  arbitrum: [
    'ETH',
    'BTC',
    'LINK',
    'UNI',
    'AAVE',
    'SNX',
    'CRV',
    'GMX',
    'DYDX',
    'ARB',
    'USDC',
    'USDT',
    'DAI',
    'FRAX',
    'WBTC',
    'WETH',
    'STETH',
  ],
  polygon: [
    'ETH',
    'BTC',
    'LINK',
    'UNI',
    'AAVE',
    'SNX',
    'CRV',
    'MATIC',
    'USDC',
    'USDT',
    'DAI',
    'FRAX',
    'WBTC',
    'WETH',
  ],
  base: ['ETH', 'BTC', 'LINK', 'UNI', 'USDC', 'USDT', 'DAI', 'FRAX', 'WBTC', 'WETH', 'CBETH'],
  optimism: [
    'ETH',
    'BTC',
    'LINK',
    'UNI',
    'SNX',
    'OP',
    'USDC',
    'USDT',
    'DAI',
    'FRAX',
    'WBTC',
    'WETH',
  ],
  avalanche: [
    'ETH',
    'BTC',
    'LINK',
    'UNI',
    'AAVE',
    'AVAX',
    'USDC',
    'USDT',
    'DAI',
    'FRAX',
    'WBTC',
    'WETH',
  ],
  bnbchain: ['ETH', 'BTC', 'LINK', 'UNI', 'BNB', 'USDC', 'USDT', 'DAI', 'FRAX', 'WBTC', 'WETH'],
  fantom: [
    'ETH',
    'BTC',
    'LINK',
    'UNI',
    'AAVE',
    'SNX',
    'CRV',
    'FTM',
    'USDC',
    'USDT',
    'DAI',
    'FRAX',
    'WBTC',
    'WETH',
  ],
};

// dAPI Proxy 合约 ABI
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

// 请求间隔（毫秒）- 避免限速
const REQUEST_DELAY_MS = 500;

// RPC 超时时间
const RPC_TIMEOUT_MS = 15000;

// 检测结果存储
const results = {
  totalTests: 0,
  success: 0,
  failed: 0,
  details: [],
  chainStats: {},
};

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 解码 int224 值
 */
function decodeInt224(data) {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  if (!cleanData || cleanData.length < 64) {
    return BigInt(0);
  }
  const value = BigInt('0x' + cleanData.slice(0, 64));
  const maxInt224 = (BigInt(1) << BigInt(223)) - BigInt(1);
  if (value > maxInt224) {
    return value - (BigInt(1) << BigInt(224));
  }
  return value;
}

/**
 * 解码 uint32 值
 */
function decodeUint32(data) {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  if (!cleanData || cleanData.length < 64) {
    return 0;
  }
  return parseInt(cleanData.slice(64, 128), 16);
}

/**
 * 执行 RPC 调用
 */
async function rpcCall(chainId, method, params) {
  const endpoints = RPC_ENDPOINTS[chainId];
  if (!endpoints || endpoints.length === 0) {
    throw new Error(`No RPC endpoints for chain ${chainId}`);
  }

  let lastError = null;

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`RPC error: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(`RPC error: ${result.error.message}`);
      }

      return result.result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        lastError = new Error(`RPC request timed out after ${RPC_TIMEOUT_MS}ms`);
      } else {
        lastError = error;
      }
    }
  }

  throw lastError || new Error(`All RPC endpoints failed for chain ${chainId}`);
}

/**
 * 计算 dAPI 代理地址
 */
function computeProxyAddress(dapiName, chainId) {
  try {
    const address = computeCommunalApi3ReaderProxyV1Address(chainId, dapiName);
    return address;
  } catch (error) {
    return null;
  }
}

/**
 * 从 dAPI Proxy 合约读取价格
 */
async function readDAPIPrice(proxyAddress, chainId) {
  try {
    const data = encodeFunctionData({
      abi: DAPI_PROXY_ABI,
      functionName: 'read',
    });

    const result = await rpcCall(chainId, 'eth_call', [
      {
        to: proxyAddress,
        data,
      },
      'latest',
    ]);

    if (typeof result !== 'string') {
      throw new Error('Invalid RPC response');
    }

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
      const paddedDec = rawStr.padStart(decimals, '0');
      value = parseFloat(`0.${paddedDec}`);
    }

    if (isNegative) {
      value = -value;
    }

    return {
      value,
      timestamp: timestamp * 1000,
      rawValue,
    };
  } catch (error) {
    return null;
  }
}

/**
 * 测试单个交易对
 */
async function testPair(chain, symbol, chainId) {
  const dapiName = SYMBOL_TO_DAPI[symbol];
  if (!dapiName) {
    return {
      success: false,
      error: `Symbol ${symbol} not mapped to dAPI name`,
      price: null,
      timestamp: null,
    };
  }

  const proxyAddress = computeProxyAddress(dapiName, chainId);
  if (!proxyAddress) {
    return {
      success: false,
      error: `Failed to compute proxy address for ${dapiName}`,
      price: null,
      timestamp: null,
    };
  }

  const reading = await readDAPIPrice(proxyAddress, chainId);

  if (!reading) {
    return {
      success: false,
      error: 'Failed to read price from dAPI proxy (dAPI may not be activated)',
      price: null,
      timestamp: null,
      proxyAddress,
    };
  }

  if (reading.value <= 0) {
    return {
      success: false,
      error: `Invalid price value: ${reading.value}`,
      price: reading.value,
      timestamp: reading.timestamp,
      proxyAddress,
    };
  }

  return {
    success: true,
    error: null,
    price: reading.value,
    timestamp: reading.timestamp,
    proxyAddress,
  };
}

/**
 * 格式化价格显示
 */
function formatPrice(price) {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toFixed(6)}`;
  }
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return '刚刚';
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`;
  } else {
    return `${Math.floor(diffMins / 60)}小时前`;
  }
}

/**
 * 主检测函数
 */
async function runDetection() {
  console.log('\n🔍 API3 预言机价格查询功能检测');
  console.log('='.repeat(80));

  // 显示 Alchemy RPC 配置状态
  console.log('\n📡 RPC 配置状态:');
  const rpcStatus = [
    { name: 'Ethereum', url: ALCHEMY_RPC.ethereum },
    { name: 'Arbitrum', url: ALCHEMY_RPC.arbitrum },
    { name: 'Polygon', url: ALCHEMY_RPC.polygon },
    { name: 'Base', url: ALCHEMY_RPC.base },
    { name: 'Optimism', url: ALCHEMY_RPC.optimism },
  ];

  rpcStatus.forEach(({ name, url }) => {
    const status = url ? '✅ 已配置' : '⚠️  使用公共节点';
    console.log(`   ${name.padEnd(12)} ${status}`);
  });

  console.log('\n⏱️  请求间隔:', `${REQUEST_DELAY_MS}ms`);
  console.log('⏱️  RPC 超时:', `${RPC_TIMEOUT_MS}ms`);

  // 统计总测试数
  let totalTests = 0;
  for (const [chain, symbols] of Object.entries(API3_AVAILABLE_PAIRS)) {
    totalTests += symbols.length;
    results.chainStats[chain] = { total: symbols.length, success: 0, failed: 0, pairs: [] };
  }

  console.log('\n📊 测试计划:');
  console.log(`   - 支持链数: ${Object.keys(API3_AVAILABLE_PAIRS).length}`);
  console.log(`   - 总测试对: ${totalTests}`);
  console.log(
    `   - 预计耗时: ~${Math.ceil((totalTests * (REQUEST_DELAY_MS + 1000)) / 60000)} 分钟`
  );

  console.log('\n' + '='.repeat(80));
  console.log('开始检测...\n');

  const startTime = Date.now();
  let currentTest = 0;

  // 逐个链检测
  for (const [chain, symbols] of Object.entries(API3_AVAILABLE_PAIRS)) {
    const chainId = CHAIN_ID_MAP[chain];

    console.log(`\n🔗 检测链: ${chain.toUpperCase()} (Chain ID: ${chainId})`);
    console.log('-'.repeat(80));

    for (const symbol of symbols) {
      currentTest++;
      const progress = `[${currentTest}/${totalTests}]`.padStart(8);

      process.stdout.write(`${progress} ${chain.padEnd(12)} ${symbol.padEnd(8)} ... `);

      const result = await testPair(chain, symbol, chainId);

      results.totalTests++;

      const testResult = {
        chain,
        symbol,
        chainId,
        ...result,
      };

      results.chainStats[chain].pairs.push(testResult);

      if (result.success) {
        results.success++;
        results.chainStats[chain].success++;
        console.log(`✅ ${formatPrice(result.price)} (${formatTimestamp(result.timestamp)})`);
      } else {
        results.failed++;
        results.chainStats[chain].failed++;
        console.log(`❌ ${result.error}`);
      }

      // 请求间隔，避免限速
      if (currentTest < totalTests) {
        await delay(REQUEST_DELAY_MS);
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // 生成报告
  console.log('\n' + '='.repeat(80));
  console.log('📋 检测结果报告');
  console.log('='.repeat(80));

  // 总体统计
  const successRate = ((results.success / results.totalTests) * 100).toFixed(1);
  console.log('\n📈 总体统计:');
  console.log(`   总测试数: ${results.totalTests}`);
  console.log(`   成功: ${results.success} ✅`);
  console.log(`   失败: ${results.failed} ❌`);
  console.log(`   成功率: ${successRate}%`);
  console.log(`   耗时: ${totalTime}秒`);

  // 各链统计
  console.log('\n📊 各链成功率:');
  for (const [chain, stats] of Object.entries(results.chainStats)) {
    const chainSuccessRate = ((stats.success / stats.total) * 100).toFixed(1);
    const bar =
      '█'.repeat(Math.floor(chainSuccessRate / 5)) +
      '░'.repeat(20 - Math.floor(chainSuccessRate / 5));
    console.log(
      `   ${chain.padEnd(12)} [${bar}] ${chainSuccessRate}% (${stats.success}/${stats.total})`
    );
  }

  // 失败详情
  if (results.failed > 0) {
    console.log('\n❌ 失败详情:');
    for (const [chain, stats] of Object.entries(results.chainStats)) {
      const failedPairs = stats.pairs.filter((p) => !p.success);
      if (failedPairs.length > 0) {
        console.log(`\n   ${chain.toUpperCase()}:`);
        failedPairs.forEach((pair) => {
          console.log(`      • ${pair.symbol}: ${pair.error}`);
        });
      }
    }
  }

  // 成功示例
  console.log('\n✅ 成功获取数据示例:');
  let exampleCount = 0;
  for (const [chain, stats] of Object.entries(results.chainStats)) {
    const successPairs = stats.pairs.filter((p) => p.success);
    if (successPairs.length > 0 && exampleCount < 10) {
      const pair = successPairs[0];
      console.log(`   ${chain.padEnd(12)} ${pair.symbol.padEnd(8)} ${formatPrice(pair.price)}`);
      exampleCount++;
    }
  }

  // 建议
  console.log('\n💡 建议:');
  if (successRate >= 90) {
    console.log('   ✅ API3 预言机数据获取功能良好，大部分交易对可以正常获取数据');
    console.log('   ✅ 前端显示配置与实际数据获取能力匹配');
  } else if (successRate >= 70) {
    console.log('   ⚠️  部分交易对数据获取失败，建议检查以下方面:');
    console.log('      • 确认 dAPI 是否已在对应链上激活');
    console.log('      • 检查 RPC 连接稳定性');
    console.log('      • 考虑在前端标记不可用的交易对');
  } else {
    console.log('   ❌ 大量交易对数据获取失败，需要检查:');
    console.log('      • Alchemy RPC 配置是否正确');
    console.log('      • 网络连接是否正常');
    console.log('      • API3 dAPI 合约地址是否正确');
    console.log('      • 对应链上的 dAPI 是否已部署');
  }

  // 保存详细报告到文件
  const reportPath = './api3-detection-report.json';
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.totalTests,
      success: results.success,
      failed: results.failed,
      successRate: `${successRate}%`,
      duration: `${totalTime}秒`,
    },
    chainStats: results.chainStats,
    rpcConfig: {
      ethereum: ALCHEMY_RPC.ethereum ? 'configured' : 'using public node',
      arbitrum: ALCHEMY_RPC.arbitrum ? 'configured' : 'using public node',
      polygon: ALCHEMY_RPC.polygon ? 'configured' : 'using public node',
      base: ALCHEMY_RPC.base ? 'configured' : 'using public node',
      optimism: ALCHEMY_RPC.optimism ? 'configured' : 'using public node',
    },
  };

  try {
    const fs = await import('fs');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n📝 详细报告已保存到: ${reportPath}`);
  } catch (e) {
    console.log('\n⚠️  保存报告失败:', e.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('检测完成！\n');

  // 返回结果供其他脚本使用
  return results;
}

// 运行检测
runDetection().catch((error) => {
  console.error('❌ 检测失败:', error);
  process.exit(1);
});
