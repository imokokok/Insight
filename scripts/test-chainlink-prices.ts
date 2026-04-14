/**
 * Chainlink 预言机价格检测脚本
 * 检测前端显示的所有链和交易对是否可以正确获取数据
 * 为避免限速，采用串行查询方式
 */

import { CHAINLINK_AVAILABLE_PAIRS } from '../src/lib/oracles/supportedSymbols';
import {
  CHAINLINK_PRICE_FEEDS,
  CHAINLINK_RPC_CONFIG,
  CHAINLINK_AGGREGATOR_ABI,
  getChainlinkPriceFeed,
} from '../src/lib/oracles/chainlinkDataSources';
import { encodeFunctionData } from 'viem';

// 链名称映射
const CHAIN_NAME_MAP: Record<string, string> = {
  ethereum: 'Ethereum',
  arbitrum: 'Arbitrum',
  polygon: 'Polygon',
  base: 'Base',
  avalanche: 'Avalanche',
  'bnb-chain': 'BNB Chain',
  optimism: 'Optimism',
};

// 链ID映射
const CHAIN_ID_MAP: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  polygon: 137,
  base: 8453,
  avalanche: 43114,
  'bnb-chain': 56,
  optimism: 10,
};

interface TestResult {
  chain: string;
  symbol: string;
  status: 'success' | 'failed' | 'skipped';
  price?: number;
  decimals?: number;
  timestamp?: number;
  error?: string;
  feedAddress?: string;
  responseTime?: number;
}

interface ChainSummary {
  chain: string;
  total: number;
  success: number;
  failed: number;
  skipped: number;
  results: TestResult[];
}

// 从环境变量获取 Alchemy RPC
function getAlchemyRpc(chainId: number): string | null {
  const envMap: Record<number, string> = {
    1: process.env.ALCHEMY_ETHEREUM_RPC || '',
    42161: process.env.ALCHEMY_ARBITRUM_RPC || '',
    137: process.env.ALCHEMY_POLYGON_RPC || '',
    8453: process.env.ALCHEMY_BASE_RPC || '',
    43114: process.env.ALCHEMY_AVALANCHE_RPC || '',
    56: process.env.ALCHEMY_BNB_RPC || '',
    10: process.env.ALCHEMY_OPTIMISM_RPC || '',
  };
  return envMap[chainId] || null;
}

// 获取 RPC URL - 使用 CHAINLINK_RPC_CONFIG 中的配置顺序
function getRpcUrl(chainId: number): string {
  const config = CHAINLINK_RPC_CONFIG[chainId];
  if (config && config.endpoints.length > 0) {
    return config.endpoints[0];
  }

  throw new Error(`No RPC endpoint for chain ${chainId}`);
}

// 延迟函数
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// RPC 调用
async function rpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(rpcUrl, {
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
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  return data.result;
}

// 解码 latestRoundData
function decodeLatestRoundData(data: string): {
  roundId: bigint;
  answer: bigint;
  startedAt: bigint;
  updatedAt: bigint;
  answeredInRound: bigint;
} {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;

  return {
    roundId: BigInt('0x' + cleanData.slice(0, 64)),
    answer: BigInt('0x' + cleanData.slice(64, 128)),
    startedAt: BigInt('0x' + cleanData.slice(128, 192)),
    updatedAt: BigInt('0x' + cleanData.slice(192, 256)),
    answeredInRound: BigInt('0x' + cleanData.slice(256, 320)),
  };
}

// 解码 decimals
function decodeDecimals(data: string): number {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  return parseInt(cleanData, 16) || 8;
}

// 查询单个价格
async function queryPrice(chainKey: string, symbol: string, chainId: number): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    chain: chainKey,
    symbol,
    status: 'failed',
  };

  try {
    const feed = getChainlinkPriceFeed(symbol, chainId);

    if (!feed) {
      result.status = 'skipped';
      result.error = `No price feed config for ${symbol} on chain ${chainId}`;
      return result;
    }

    result.feedAddress = feed.address;

    const rpcUrl = getRpcUrl(chainId);

    // 编码函数调用
    const data = encodeFunctionData({
      abi: CHAINLINK_AGGREGATOR_ABI,
      functionName: 'latestRoundData',
    });

    // 调用合约
    const rawResult = await rpcCall(rpcUrl, 'eth_call', [{ to: feed.address, data }, 'latest']);

    const decoded = decodeLatestRoundData(rawResult as string);
    const decimals = feed.decimals;

    // 转换价格
    const rawStr = decoded.answer.toString();
    let price: number;
    if (rawStr.length > decimals) {
      const intPart = rawStr.slice(0, rawStr.length - decimals) || '0';
      const decPart = rawStr.slice(rawStr.length - decimals);
      price = parseFloat(`${intPart}.${decPart}`);
    } else {
      const paddedDec = rawStr.padStart(decimals, '0');
      price = parseFloat(`0.${paddedDec}`);
    }

    result.status = price > 0 ? 'success' : 'failed';
    result.price = price;
    result.decimals = decimals;
    result.timestamp = Number(decoded.updatedAt) * 1000;
    result.responseTime = Date.now() - startTime;

    if (price <= 0) {
      result.error = 'Price is zero or negative';
    }
  } catch (error) {
    result.status = 'failed';
    result.error = error instanceof Error ? error.message : String(error);
    result.responseTime = Date.now() - startTime;
  }

  return result;
}

// 测试单个链的所有交易对
async function testChain(
  chainKey: string,
  symbols: string[],
  delayMs: number = 500
): Promise<ChainSummary> {
  const chainId = CHAIN_ID_MAP[chainKey];

  console.log(`\n🔄 测试链: ${CHAIN_NAME_MAP[chainKey]} (Chain ID: ${chainId})`);
  console.log(`   交易对数量: ${symbols.length}`);
  console.log(`   RPC: ${getRpcUrl(chainId).replace(/\/\/.*@/, '//***@')}`);
  console.log('');

  const summary: ChainSummary = {
    chain: chainKey,
    total: symbols.length,
    success: 0,
    failed: 0,
    skipped: 0,
    results: [],
  };

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const progress = `[${i + 1}/${symbols.length}]`;

    process.stdout.write(`   ${progress} 测试 ${symbol}... `);

    const result = await queryPrice(chainKey, symbol, chainId);
    summary.results.push(result);

    if (result.status === 'success') {
      summary.success++;
      console.log(`✅ $${result.price?.toFixed(2)} (${result.responseTime}ms)`);
    } else if (result.status === 'skipped') {
      summary.skipped++;
      console.log(`⏭️  ${result.error}`);
    } else {
      summary.failed++;
      console.log(`❌ ${result.error}`);
    }

    // 延迟以避免限速
    if (i < symbols.length - 1 && delayMs > 0) {
      await delay(delayMs);
    }
  }

  return summary;
}

// 打印汇总报告
function printSummary(summaries: ChainSummary[]) {
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('                        Chainlink 价格检测汇总报告');
  console.log('═'.repeat(80));

  let totalPairs = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const summary of summaries) {
    totalPairs += summary.total;
    totalSuccess += summary.success;
    totalFailed += summary.failed;
    totalSkipped += summary.skipped;

    const successRate = ((summary.success / summary.total) * 100).toFixed(1);
    const chainName = CHAIN_NAME_MAP[summary.chain];

    console.log(`\n📊 ${chainName}`);
    console.log(
      `   总计: ${summary.total} | ✅ 成功: ${summary.success} | ❌ 失败: ${summary.failed} | ⏭️  跳过: ${summary.skipped}`
    );
    console.log(`   成功率: ${successRate}%`);

    // 显示失败的详情
    const failedResults = summary.results.filter((r) => r.status === 'failed');
    if (failedResults.length > 0) {
      console.log(`   失败的交易对:`);
      for (const result of failedResults) {
        console.log(`     - ${result.symbol}: ${result.error}`);
      }
    }

    // 显示跳过的详情
    const skippedResults = summary.results.filter((r) => r.status === 'skipped');
    if (skippedResults.length > 0) {
      console.log(`   跳过的交易对 (配置缺失):`);
      for (const result of skippedResults) {
        console.log(`     - ${result.symbol}`);
      }
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('                        总体统计');
  console.log('═'.repeat(80));
  console.log(`   总交易对数: ${totalPairs}`);
  console.log(`   ✅ 成功: ${totalSuccess}`);
  console.log(`   ❌ 失败: ${totalFailed}`);
  console.log(`   ⏭️  跳过: ${totalSkipped}`);
  console.log(`   整体成功率: ${((totalSuccess / totalPairs) * 100).toFixed(1)}%`);
  console.log('═'.repeat(80));

  // 返回失败的交易对列表供修复
  if (totalFailed > 0 || totalSkipped > 0) {
    console.log('\n⚠️  需要修复的交易对:');
    for (const summary of summaries) {
      const issues = summary.results.filter((r) => r.status === 'failed' || r.status === 'skipped');
      if (issues.length > 0) {
        console.log(`\n   ${CHAIN_NAME_MAP[summary.chain]}:`);
        for (const issue of issues) {
          console.log(`     - ${issue.symbol}: ${issue.error || '配置缺失'}`);
        }
      }
    }
  }
}

// 主函数
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           Chainlink 预言机价格检测脚本                                       ║');
  console.log('║           检测前端显示的所有链和交易对数据获取情况                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  // 检查环境变量
  const requiredEnvVars = [
    'ALCHEMY_ETHEREUM_RPC',
    'ALCHEMY_ARBITRUM_RPC',
    'ALCHEMY_POLYGON_RPC',
    'ALCHEMY_BASE_RPC',
    'ALCHEMY_AVALANCHE_RPC',
    'ALCHEMY_BNB_RPC',
    'ALCHEMY_OPTIMISM_RPC',
  ];

  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingEnvVars.length > 0) {
    console.warn('\n⚠️  警告: 以下环境变量未设置，将使用 fallback RPC:');
    for (const v of missingEnvVars) {
      console.warn(`   - ${v}`);
    }
    console.log('');
  } else {
    console.log('\n✅ 所有 Alchemy RPC 环境变量已设置\n');
  }

  const summaries: ChainSummary[] = [];

  // 串行测试每个链
  for (const [chainKey, symbols] of Object.entries(CHAINLINK_AVAILABLE_PAIRS)) {
    const summary = await testChain(chainKey, symbols, 500);
    summaries.push(summary);

    // 链之间延迟
    if (
      Object.keys(CHAINLINK_AVAILABLE_PAIRS).indexOf(chainKey) <
      Object.keys(CHAINLINK_AVAILABLE_PAIRS).length - 1
    ) {
      console.log('\n   等待 2 秒后继续下一个链...');
      await delay(2000);
    }
  }

  // 打印汇总
  printSummary(summaries);

  // 退出码
  const hasFailures = summaries.some((s) => s.failed > 0);
  const hasSkips = summaries.some((s) => s.skipped > 0);

  if (hasFailures || hasSkips) {
    console.log('\n❌ 检测完成，发现需要修复的问题\n');
    process.exit(1);
  } else {
    console.log('\n✅ 检测完成，所有交易对数据获取正常\n');
    process.exit(0);
  }
}

// 运行
main().catch((error) => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
