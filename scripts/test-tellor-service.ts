/**
 * 测试TellorOnChainService（修复后）
 */

import { tellorOnChainService } from '../src/lib/oracles/tellorOnChainService';

async function testTellorService() {
  console.log('=== 测试TellorOnChainService（修复后）===\n');

  // 重置端点健康状态
  tellorOnChainService.resetEndpointHealth();

  console.log('测试BTC价格获取...');
  try {
    const btcPrice = await tellorOnChainService.getPrice('BTC', 1);
    console.log('✅ BTC价格获取成功:');
    console.log(`  价格: $${btcPrice.price.toLocaleString()}`);
    console.log(`  时间戳: ${new Date(btcPrice.timestamp).toISOString()}`);
    console.log(`  Query ID: ${btcPrice.queryId}`);
  } catch (error) {
    console.log('❌ BTC价格获取失败:');
    console.log(`  错误: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log('\n测试ETH价格获取...');
  try {
    const ethPrice = await tellorOnChainService.getPrice('ETH', 1);
    console.log('✅ ETH价格获取成功:');
    console.log(`  价格: $${ethPrice.price.toLocaleString()}`);
    console.log(`  时间戳: ${new Date(ethPrice.timestamp).toISOString()}`);
    console.log(`  Query ID: ${ethPrice.queryId}`);
  } catch (error) {
    console.log('❌ ETH价格获取失败:');
    console.log(`  错误: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log('\n测试LINK价格获取...');
  try {
    const linkPrice = await tellorOnChainService.getPrice('LINK', 1);
    console.log('✅ LINK价格获取成功:');
    console.log(`  价格: $${linkPrice.price.toLocaleString()}`);
    console.log(`  时间戳: ${new Date(linkPrice.timestamp).toISOString()}`);
    console.log(`  Query ID: ${linkPrice.queryId}`);
  } catch (error) {
    console.log('❌ LINK价格获取失败:');
    console.log(`  错误: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  await testTellorService();
  console.log('\n=== 测试完成 ===');
}

main().catch(console.error);
