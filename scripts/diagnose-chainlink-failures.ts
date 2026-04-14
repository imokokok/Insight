/**
 * Chainlink 预言机失败交易对诊断脚本
 * 深入分析失败的具体原因
 */

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

// 上次测试失败的交易对
const FAILED_PAIRS: Record<string, string[]> = {
  ethereum: ['BTC', 'MATIC', 'AAVE', '1INCH', 'STETH'],
  polygon: ['BTC', 'ETH', 'LINK', 'MATIC'],
};

interface DiagnosticResult {
  chain: string;
  symbol: string;
  chainId: number;
  feedAddress?: string;
  rpcUrl: string;
  status: 'success' | 'failed' | 'config_missing';
  stage?: 'config' | 'rpc_connect' | 'contract_call' | 'decode' | 'validation';
  error?: string;
  errorDetails?: string;
  rawResponse?: string;
  price?: number;
  responseTime: number;
  rpcProvider: string;
}

// 延迟函数
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 测试单个 RPC 端点的连通性
async function testRpcConnectivity(rpcUrl: string): Promise<{
  reachable: boolean;
  latency: number;
  error?: string;
  chainId?: number;
}> {
  const startTime = Date.now();
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

    const latency = Date.now() - startTime;

    if (!response.ok) {
      return {
        reachable: false,
        latency,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();

    if (data.error) {
      return {
        reachable: false,
        latency,
        error: `RPC Error: ${data.error.message}`,
      };
    }

    const chainId = parseInt(data.result, 16);
    return { reachable: true, latency, chainId };
  } catch (error) {
    return {
      reachable: false,
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// RPC 调用
async function rpcCall(
  rpcUrl: string,
  method: string,
  params: unknown[],
  timeout: number = 30000
): Promise<{ success: boolean; result?: unknown; error?: string; raw?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        raw: text.slice(0, 500),
      };
    }

    try {
      const data = JSON.parse(text);

      if (data.error) {
        return {
          success: false,
          error: `RPC Error [${data.error.code}]: ${data.error.message}`,
          raw: text.slice(0, 500),
        };
      }

      return { success: true, result: data.result };
    } catch {
      return {
        success: false,
        error: 'Invalid JSON response',
        raw: text.slice(0, 500),
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: `Request timeout after ${timeout}ms` };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// 解码 latestRoundData
function decodeLatestRoundData(data: string): {
  roundId: bigint;
  answer: bigint;
  startedAt: bigint;
  updatedAt: bigint;
  answeredInRound: bigint;
  success: boolean;
  error?: string;
} {
  try {
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;

    if (!cleanData || cleanData.length < 320) {
      return {
        roundId: BigInt(0),
        answer: BigInt(0),
        startedAt: BigInt(0),
        updatedAt: BigInt(0),
        answeredInRound: BigInt(0),
        success: false,
        error: `Data too short: ${cleanData?.length || 0} chars, expected 320`,
      };
    }

    return {
      roundId: BigInt('0x' + cleanData.slice(0, 64)),
      answer: BigInt('0x' + cleanData.slice(64, 128)),
      startedAt: BigInt('0x' + cleanData.slice(128, 192)),
      updatedAt: BigInt('0x' + cleanData.slice(192, 256)),
      answeredInRound: BigInt('0x' + cleanData.slice(256, 320)),
      success: true,
    };
  } catch (error) {
    return {
      roundId: BigInt(0),
      answer: BigInt(0),
      startedAt: BigInt(0),
      updatedAt: BigInt(0),
      answeredInRound: BigInt(0),
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// 诊断单个交易对
async function diagnosePair(
  chainKey: string,
  symbol: string,
  chainId: number,
  rpcUrl: string,
  rpcProvider: string
): Promise<DiagnosticResult> {
  const startTime = Date.now();
  const result: DiagnosticResult = {
    chain: chainKey,
    symbol,
    chainId,
    rpcUrl: rpcUrl.replace(/\/\/.*@/, '//***@'),
    status: 'failed',
    responseTime: 0,
    rpcProvider,
  };

  // Stage 1: 检查配置
  const feed = getChainlinkPriceFeed(symbol, chainId);
  if (!feed) {
    result.status = 'config_missing';
    result.stage = 'config';
    result.error = `Price feed not found in CHAINLINK_PRICE_FEEDS for ${symbol} on chain ${chainId}`;
    result.responseTime = Date.now() - startTime;
    return result;
  }

  result.feedAddress = feed.address;

  // Stage 2: 测试 RPC 连通性
  const connectivity = await testRpcConnectivity(rpcUrl);
  if (!connectivity.reachable) {
    result.stage = 'rpc_connect';
    result.error = `RPC connection failed: ${connectivity.error}`;
    result.errorDetails = `Latency: ${connectivity.latency}ms`;
    result.responseTime = Date.now() - startTime;
    return result;
  }

  // Stage 3: 调用合约
  const data = encodeFunctionData({
    abi: CHAINLINK_AGGREGATOR_ABI,
    functionName: 'latestRoundData',
  });

  const callResult = await rpcCall(rpcUrl, 'eth_call', [{ to: feed.address, data }, 'latest']);

  if (!callResult.success) {
    result.stage = 'contract_call';
    result.error = `Contract call failed: ${callResult.error}`;
    result.errorDetails = callResult.raw;
    result.responseTime = Date.now() - startTime;
    return result;
  }

  // Stage 4: 解码数据
  const rawResponse = callResult.result as string;
  result.rawResponse = rawResponse.slice(0, 100) + '...';

  const decoded = decodeLatestRoundData(rawResponse);
  if (!decoded.success) {
    result.stage = 'decode';
    result.error = `Failed to decode response: ${decoded.error}`;
    result.responseTime = Date.now() - startTime;
    return result;
  }

  // Stage 5: 验证价格
  const decimals = feed.decimals;
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

  if (price <= 0) {
    result.stage = 'validation';
    result.error = `Invalid price: ${price}`;
    result.errorDetails = `Raw answer: ${decoded.answer.toString()}, Decimals: ${decimals}`;
    result.responseTime = Date.now() - startTime;
    return result;
  }

  // Success
  result.status = 'success';
  result.stage = 'validation';
  result.price = price;
  result.responseTime = Date.now() - startTime;
  return result;
}

// 测试多个 RPC 端点
async function testMultipleRpcs(
  chainKey: string,
  symbol: string,
  chainId: number
): Promise<DiagnosticResult[]> {
  const config = CHAINLINK_RPC_CONFIG[chainId];
  const results: DiagnosticResult[] = [];

  // 测试配置中的所有 RPC
  const rpcsToTest: { url: string; provider: string }[] = [];

  if (config) {
    for (const endpoint of config.endpoints) {
      rpcsToTest.push({
        url: endpoint,
        provider: endpoint.includes('alchemy')
          ? 'Alchemy'
          : endpoint.includes('llamarpc')
            ? 'LlamaRPC'
            : endpoint.includes('publicnode')
              ? 'PublicNode'
              : 'Other',
      });
    }
  }

  console.log(`   将测试 ${rpcsToTest.length} 个 RPC 端点:\n`);

  for (let i = 0; i < rpcsToTest.length; i++) {
    const { url, provider } = rpcsToTest[i];
    console.log(`   [RPC ${i + 1}/${rpcsToTest.length}] 测试 ${provider}...`);

    const result = await diagnosePair(chainKey, symbol, chainId, url, provider);
    results.push(result);

    if (result.status === 'success') {
      console.log(
        `   ✅ ${provider} 成功! 价格: $${result.price?.toFixed(2)} (${result.responseTime}ms)\n`
      );
    } else {
      console.log(`   ❌ ${provider} 失败`);
      console.log(`      阶段: ${result.stage}`);
      console.log(`      错误: ${result.error}`);
      if (result.errorDetails) {
        console.log(`      详情: ${result.errorDetails.slice(0, 100)}`);
      }
      console.log('');
    }

    if (i < rpcsToTest.length - 1) {
      await delay(1000);
    }
  }

  return results;
}

// 打印诊断报告
function printDiagnosticReport(allResults: DiagnosticResult[]) {
  console.log('\n' + '═'.repeat(80));
  console.log('                        详细诊断报告');
  console.log('═'.repeat(80));

  // 按链分组
  const byChain: Record<string, DiagnosticResult[]> = {};
  for (const result of allResults) {
    if (!byChain[result.chain]) byChain[result.chain] = [];
    byChain[result.chain].push(result);
  }

  for (const [chain, results] of Object.entries(byChain)) {
    console.log(`\n📍 ${CHAIN_NAME_MAP[chain]} (Chain ID: ${results[0]?.chainId})`);
    console.log('-'.repeat(60));

    // 按交易对分组
    const bySymbol: Record<string, DiagnosticResult[]> = {};
    for (const result of results) {
      if (!bySymbol[result.symbol]) bySymbol[result.symbol] = [];
      bySymbol[result.symbol].push(result);
    }

    for (const [symbol, symbolResults] of Object.entries(bySymbol)) {
      console.log(`\n   💱 ${symbol}:`);

      const successResult = symbolResults.find((r) => r.status === 'success');
      if (successResult) {
        console.log(`      ✅ 有 RPC 成功: ${successResult.rpcProvider}`);
        console.log(`         价格: $${successResult.price?.toFixed(2)}`);
        console.log(`         Feed地址: ${successResult.feedAddress}`);
      } else {
        console.log(`      ❌ 所有 RPC 都失败`);

        // 分析失败原因
        const stages = symbolResults.map((r) => r.stage);
        const uniqueStages = [...new Set(stages)];

        console.log(`         失败阶段: ${uniqueStages.join(', ')}`);

        // 显示每个 RPC 的失败原因
        for (const result of symbolResults) {
          console.log(`         - ${result.rpcProvider}: ${result.error?.slice(0, 60)}`);
        }
      }
    }
  }

  // 总结和建议
  console.log('\n' + '═'.repeat(80));
  console.log('                        问题分析和建议');
  console.log('═'.repeat(80));

  const failedResults = allResults.filter((r) => r.status !== 'success');
  const rpcConnectFailures = failedResults.filter((r) => r.stage === 'rpc_connect');
  const contractCallFailures = failedResults.filter((r) => r.stage === 'contract_call');
  const configMissing = failedResults.filter((r) => r.status === 'config_missing');

  if (configMissing.length > 0) {
    console.log('\n⚠️  配置缺失问题:');
    const missingConfigs = [...new Set(configMissing.map((r) => `${r.chain}:${r.symbol}`))];
    for (const config of missingConfigs) {
      console.log(`   - ${config}`);
    }
    console.log('   建议: 在 chainlinkDataSources.ts 中添加对应的 Price Feed 配置');
  }

  if (rpcConnectFailures.length > 0) {
    console.log('\n⚠️  RPC 连接问题:');
    const failedRpcs = [...new Set(rpcConnectFailures.map((r) => r.rpcProvider))];
    for (const rpc of failedRpcs) {
      const count = rpcConnectFailures.filter((r) => r.rpcProvider === rpc).length;
      console.log(`   - ${rpc}: ${count} 次连接失败`);
    }
    console.log('   建议:');
    console.log('   1. 配置 Alchemy RPC 以获得更稳定的连接');
    console.log('   2. 增加请求间隔时间，避免限流');
    console.log('   3. 使用多个 RPC 端点进行 fallback');
  }

  if (contractCallFailures.length > 0) {
    console.log('\n⚠️  合约调用问题:');
    const errors = [...new Set(contractCallFailures.map((r) => r.error))];
    for (const error of errors.slice(0, 5)) {
      console.log(`   - ${error?.slice(0, 80)}`);
    }
    console.log('   建议: 检查合约地址是否正确，或者该 Feed 是否已被弃用');
  }

  // 成功的 RPC 统计
  const successByRpc: Record<string, number> = {};
  for (const result of allResults) {
    if (result.status === 'success') {
      successByRpc[result.rpcProvider] = (successByRpc[result.rpcProvider] || 0) + 1;
    }
  }

  console.log('\n✅ RPC 成功率统计:');
  for (const [provider, count] of Object.entries(successByRpc)) {
    console.log(`   - ${provider}: ${count} 次成功`);
  }
}

// 主函数
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           Chainlink 失败交易对详细诊断                                       ║');
  console.log('║           深入分析失败原因                                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  const allResults: DiagnosticResult[] = [];

  for (const [chainKey, symbols] of Object.entries(FAILED_PAIRS)) {
    const chainId = CHAIN_ID_MAP[chainKey];

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🔍 诊断链: ${CHAIN_NAME_MAP[chainKey]} (Chain ID: ${chainId})`);
    console.log(`${'─'.repeat(60)}`);

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      console.log(`\n💱 [${i + 1}/${symbols.length}] 诊断交易对: ${symbol}`);
      console.log(`   Feed地址: ${getChainlinkPriceFeed(symbol, chainId)?.address || '未配置'}`);
      console.log('');

      const results = await testMultipleRpcs(chainKey, symbol, chainId);
      allResults.push(...results);

      if (i < symbols.length - 1) {
        console.log('   等待 2 秒后继续下一个交易对...\n');
        await delay(2000);
      }
    }

    if (Object.keys(FAILED_PAIRS).indexOf(chainKey) < Object.keys(FAILED_PAIRS).length - 1) {
      console.log('\n   等待 3 秒后继续下一个链...');
      await delay(3000);
    }
  }

  // 打印诊断报告
  printDiagnosticReport(allResults);

  console.log('\n' + '═'.repeat(80));
  console.log('                        诊断完成');
  console.log('═'.repeat(80) + '\n');
}

// 运行
main().catch((error) => {
  console.error('诊断脚本执行失败:', error);
  process.exit(1);
});
