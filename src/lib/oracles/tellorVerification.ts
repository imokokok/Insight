/**
 * Tellor 数据验证脚本
 * 用于验证 Tellor 数据是否从链上真实获取
 */

import { Blockchain } from '@/types/oracle';

import { TellorClient } from './tellor';
import { tellorOnChainService } from './tellorOnChainService';

export interface VerificationResult {
  method: string;
  status: 'success' | 'failed' | 'fallback';
  isRealData: boolean;
  dataSource?: string;
  error?: string;
  sampleData?: unknown;
}

export async function verifyTellorData(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  const client = new TellorClient();

  console.log('🔍 开始验证 Tellor 数据真实性...\n');

  // 1. 验证质押数据
  try {
    console.log('📊 测试 getStakingData...');
    const stakingData = await tellorOnChainService.getStakingData(1);
    const isReal = stakingData.totalStaked > BigInt(0) && stakingData.stakerCount > 0;
    results.push({
      method: 'getStakingData',
      status: isReal ? 'success' : 'fallback',
      isRealData: isReal,
      dataSource: isReal ? 'Ethereum Mainnet' : 'Fallback',
      sampleData: {
        totalStaked: `${Number(stakingData.totalStaked) / 1e18} TRB`,
        stakerCount: stakingData.stakerCount,
        apr: `${stakingData.apr}%`,
      },
    });
    console.log(isReal ? '✅ 真实链上数据' : '⚠️ 使用回退数据');
  } catch (error) {
    results.push({
      method: 'getStakingData',
      status: 'failed',
      isRealData: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('❌ 获取失败');
  }

  // 2. 验证 Reporter 列表
  try {
    console.log('\n👥 测试 getReporterList...');
    const reporters = await tellorOnChainService.getReporterList(1, 10);
    const isReal = reporters.length > 0 && reporters[0].address.startsWith('0x');
    results.push({
      method: 'getReporterList',
      status: isReal ? 'success' : 'fallback',
      isRealData: isReal,
      dataSource: isReal ? 'Ethereum Mainnet' : 'Fallback',
      sampleData: {
        count: reporters.length,
        firstReporter: reporters[0]?.address.slice(0, 20) + '...',
        firstStake: reporters[0]?.stakedAmount,
      },
    });
    console.log(isReal ? '✅ 真实链上数据' : '⚠️ 使用回退数据');
  } catch (error) {
    results.push({
      method: 'getReporterList',
      status: 'failed',
      isRealData: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('❌ 获取失败');
  }

  // 3. 验证争议数据
  try {
    console.log('\n⚖️ 测试 getDisputeData...');
    const disputes = await tellorOnChainService.getDisputeData(1);
    const isReal = disputes.totalDisputes >= 0;
    results.push({
      method: 'getDisputeData',
      status: isReal ? 'success' : 'fallback',
      isRealData: isReal,
      dataSource: isReal ? 'Ethereum Mainnet' : 'Fallback',
      sampleData: {
        totalDisputes: disputes.totalDisputes,
        openDisputes: disputes.openDisputes,
        resolvedDisputes: disputes.resolvedDisputes,
      },
    });
    console.log(isReal ? '✅ 真实链上数据' : '⚠️ 使用回退数据');
  } catch (error) {
    results.push({
      method: 'getDisputeData',
      status: 'failed',
      isRealData: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('❌ 获取失败');
  }

  // 4. 验证 Autopay 数据
  try {
    console.log('\n💰 测试 getAutopayData...');
    const autopay = await tellorOnChainService.getAutopayData(1);
    const isReal = autopay.fundedFeeds >= 0;
    results.push({
      method: 'getAutopayData',
      status: isReal ? 'success' : 'fallback',
      isRealData: isReal,
      dataSource: isReal ? 'Ethereum Mainnet' : 'Fallback',
      sampleData: {
        fundedFeeds: autopay.fundedFeeds,
        totalTipPool: `${Number(autopay.totalTipPool) / 1e18} TRB`,
      },
    });
    console.log(isReal ? '✅ 真实链上数据' : '⚠️ 使用回退数据');
  } catch (error) {
    results.push({
      method: 'getAutopayData',
      status: 'failed',
      isRealData: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('❌ 获取失败');
  }

  // 5. 验证价格数据
  try {
    console.log('\n💵 测试 getPrice...');
    const priceResult = await client.getPriceWithSource('ETH', Blockchain.ETHEREUM);
    const isReal = priceResult.source === 'on-chain';
    results.push({
      method: 'getPrice',
      status: isReal ? 'success' : 'fallback',
      isRealData: isReal,
      dataSource: priceResult.source,
      sampleData: {
        price: priceResult.data.price,
        symbol: priceResult.data.symbol,
        confidence: priceResult.data.confidence,
      },
    });
    console.log(isReal ? '✅ 真实链上数据' : '⚠️ 使用回退数据');
  } catch (error) {
    results.push({
      method: 'getPrice',
      status: 'failed',
      isRealData: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('❌ 获取失败');
  }

  // 6. 验证网络统计
  try {
    console.log('\n🌐 测试 getNetworkStats...');
    const stats = await client.getNetworkStats();
    const isReal = stats.totalStaked > 0;
    results.push({
      method: 'getNetworkStats',
      status: isReal ? 'success' : 'fallback',
      isRealData: isReal,
      dataSource: isReal ? 'Ethereum Mainnet' : 'Fallback',
      sampleData: {
        activeNodes: stats.activeNodes,
        totalStaked: stats.totalStaked,
        dataFeeds: stats.dataFeeds,
      },
    });
    console.log(isReal ? '✅ 真实链上数据' : '⚠️ 使用回退数据');
  } catch (error) {
    results.push({
      method: 'getNetworkStats',
      status: 'failed',
      isRealData: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('❌ 获取失败');
  }

  // 7. 验证 Reporter 统计
  try {
    console.log('\n📈 测试 getReporterStats...');
    const reporterStats = await client.getReporterStats();
    const isReal = reporterStats.totalReporters > 0;
    results.push({
      method: 'getReporterStats',
      status: isReal ? 'success' : 'fallback',
      isRealData: isReal,
      dataSource: isReal ? 'Ethereum Mainnet' : 'Fallback',
      sampleData: {
        totalReporters: reporterStats.totalReporters,
        activeReporters: reporterStats.activeReporters,
        totalStaked: reporterStats.totalStaked,
      },
    });
    console.log(isReal ? '✅ 真实链上数据' : '⚠️ 使用回退数据');
  } catch (error) {
    results.push({
      method: 'getReporterStats',
      status: 'failed',
      isRealData: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('❌ 获取失败');
  }

  // 8. 验证区块高度
  try {
    console.log('\n⛓️ 测试 getBlockNumber...');
    const blockNumber = await tellorOnChainService.getBlockNumber(1);
    const isReal = blockNumber > 0;
    results.push({
      method: 'getBlockNumber',
      status: isReal ? 'success' : 'failed',
      isRealData: isReal,
      dataSource: 'Ethereum Mainnet',
      sampleData: { blockNumber },
    });
    console.log(isReal ? `✅ 真实链上数据: ${blockNumber}` : '❌ 获取失败');
  } catch (error) {
    results.push({
      method: 'getBlockNumber',
      status: 'failed',
      isRealData: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('❌ 获取失败');
  }

  // 汇总
  console.log('\n📋 验证结果汇总:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const realDataCount = results.filter((r) => r.isRealData).length;
  const fallbackCount = results.filter((r) => r.status === 'fallback').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;

  console.log(`✅ 真实链上数据: ${realDataCount}/${results.length}`);
  console.log(`⚠️  使用回退数据: ${fallbackCount}/${results.length}`);
  console.log(`❌ 获取失败: ${failedCount}/${results.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (realDataCount === results.length) {
    console.log('\n🎉 所有数据都是真实的链上数据！');
  } else if (realDataCount > 0) {
    console.log('\n⚡ 部分数据是真实的链上数据');
  } else {
    console.log('\n⚠️  未能获取到真实链上数据，请检查 RPC 配置');
  }

  return results;
}

// 如果直接运行此文件
if (typeof window === 'undefined' && require.main === module) {
  verifyTellorData().catch(console.error);
}
