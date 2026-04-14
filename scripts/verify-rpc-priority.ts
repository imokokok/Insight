/**
 * 验证 RPC 优先级配置
 * 检查 Alchemy 是否被优先使用
 */

import { CHAINLINK_RPC_CONFIG } from '../src/lib/oracles/chainlinkDataSources';
import { ALCHEMY_RPC } from '../src/lib/config/serverEnv';

const CHAIN_NAME_MAP: Record<number, string> = {
  1: 'Ethereum',
  42161: 'Arbitrum',
  137: 'Polygon',
  8453: 'Base',
  43114: 'Avalanche',
  56: 'BNB Chain',
  10: 'Optimism',
};

const ALCHEMY_ENV_MAP: Record<number, string> = {
  1: 'ALCHEMY_ETHEREUM_RPC',
  42161: 'ALCHEMY_ARBITRUM_RPC',
  137: 'ALCHEMY_POLYGON_RPC',
  8453: 'ALCHEMY_BASE_RPC',
  43114: 'ALCHEMY_AVALANCHE_RPC',
  56: 'ALCHEMY_BNB_RPC',
  10: 'ALCHEMY_OPTIMISM_RPC',
};

function maskRpcUrl(url: string): string {
  return url.replace(/(\/\/)(.*)(@)/, '$1***$3');
}

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║           RPC 优先级配置验证                                                 ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

console.log('📋 Alchemy 环境变量状态:');
console.log('-'.repeat(60));

const envStatus: Record<number, boolean> = {};

for (const [chainId, envVar] of Object.entries(ALCHEMY_ENV_MAP)) {
  const id = parseInt(chainId);
  const value =
    ALCHEMY_RPC[envVar.replace('ALCHEMY_', '').toLowerCase() as keyof typeof ALCHEMY_RPC];
  const isSet = value && value.length > 0;
  envStatus[id] = isSet;

  console.log(
    `   ${CHAIN_NAME_MAP[id].padEnd(12)} (${envVar}): ${isSet ? '✅ 已设置' : '❌ 未设置'}`
  );
}

console.log('\n📋 RPC 端点优先级配置:');
console.log('-'.repeat(60));

for (const [chainIdStr, config] of Object.entries(CHAINLINK_RPC_CONFIG)) {
  const chainId = parseInt(chainIdStr);
  const chainName = CHAIN_NAME_MAP[chainId];
  const hasAlchemy = envStatus[chainId];

  console.log(`\n   🔗 ${chainName} (Chain ID: ${chainId})`);

  if (config.endpoints.length === 0) {
    console.log('      ⚠️  警告: 没有配置任何 RPC 端点');
    continue;
  }

  // 检查第一个端点是否是 Alchemy
  const firstEndpoint = config.endpoints[0];
  const isFirstAlchemy = firstEndpoint.includes('alchemy');

  if (hasAlchemy && isFirstAlchemy) {
    console.log('      ✅ Alchemy 优先配置正确');
  } else if (hasAlchemy && !isFirstAlchemy) {
    console.log('      ⚠️  警告: Alchemy 已设置但未优先使用');
  } else if (!hasAlchemy) {
    console.log('      ℹ️  Alchemy 未设置，使用公共节点');
  }

  console.log('      端点列表 (按优先级):');
  config.endpoints.forEach((endpoint, index) => {
    const isAlchemy = endpoint.includes('alchemy');
    const marker = isAlchemy ? '🟢' : '⚪';
    const priority = index === 0 ? '(主)' : '(备)';
    console.log(`        ${index + 1}. ${marker} ${maskRpcUrl(endpoint)} ${priority}`);
  });
}

console.log('\n' + '═'.repeat(60));
console.log('                        配置总结');
console.log('═'.repeat(60));

const configuredChains = Object.keys(CHAINLINK_RPC_CONFIG).length;
const alchemyConfigured = Object.values(envStatus).filter(Boolean).length;

console.log(`\n   总链数: ${configuredChains}`);
console.log(`   Alchemy 已配置: ${alchemyConfigured}/${configuredChains} 条链`);

if (alchemyConfigured < configuredChains) {
  console.log('\n   ⚠️  未配置 Alchemy 的链:');
  for (const [chainId, isSet] of Object.entries(envStatus)) {
    if (!isSet) {
      const id = parseInt(chainId);
      console.log(`      - ${CHAIN_NAME_MAP[id]} (${ALCHEMY_ENV_MAP[id]})`);
    }
  }
  console.log('\n   💡 建议: 设置上述环境变量以获得最佳性能和稳定性');
} else {
  console.log('\n   ✅ 所有链都配置了 Alchemy RPC');
}

console.log('\n' + '═'.repeat(60) + '\n');
