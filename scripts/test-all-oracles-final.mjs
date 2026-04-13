#!/usr/bin/env node

/**
 * 最终全面测试脚本 - 测试所有预言机数据获取
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const DELAY = 2000;

const RESULTS = {
  chainlink: { success: 0, failed: 0, details: [] },
  pyth: { success: 0, failed: 0, details: [] },
  redstone: { success: 0, failed: 0, details: [] },
};

// ============================================================================
// Chainlink 测试
// ============================================================================

const CHAINLINK_AGGREGATORS = {
  ethereum: {
    'BTC/USD': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
    'ETH/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    'LINK/USD': '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
    'USDC/USD': '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
    'USDT/USD': '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
    'DAI/USD': '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
  },
  arbitrum: {
    'BTC/USD': '0x6ce185860a4963106506C203335A2910413708e9',
    'ETH/USD': '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    'LINK/USD': '0x86E53CF1B870786351Da77A57575e79CB55812CB',
  },
  polygon: {
    'BTC/USD': '0xc907e116054ad103354f2d350fd2514433d57f6f',
    'ETH/USD': '0xF9680D99D6C9589e2a93a78A04A279e509205945',
    'MATIC/USD': '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
  },
  avalanche: {
    'ETH/USD': '0x976b3d034e162d8bd72d6b9c989d545b839003b0',
    'AVAX/USD': '0x0A77230d17318075983913bC2145DB16C7366156',
  },
};

const ALCHEMY_RPCS = {
  ethereum: process.env.ALCHEMY_ETHEREUM_RPC,
  arbitrum: process.env.ALCHEMY_ARBITRUM_RPC,
  polygon: process.env.ALCHEMY_POLYGON_RPC,
  avalanche: process.env.ALCHEMY_AVALANCHE_RPC,
};

async function testChainlink() {
  console.log('\n📡 测试 Chainlink (使用 Alchemy RPC)');
  console.log('═'.repeat(60));

  for (const [chain, pairs] of Object.entries(CHAINLINK_AGGREGATORS)) {
    console.log(`\n🔗 ${chain.toUpperCase()}`);

    for (const [pair, address] of Object.entries(pairs)) {
      process.stdout.write(`   ${pair}: `);

      const rpcUrl = ALCHEMY_RPCS[chain];
      if (!rpcUrl) {
        console.log(`❌ No RPC configured`);
        RESULTS.chainlink.failed++;
        continue;
      }

      try {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{ to: address, data: '0x50d25bcd' }, 'latest'],
            id: 1,
          }),
        });

        const data = await response.json();
        if (data.result && data.result !== '0x') {
          const price = parseInt(data.result, 16) / 1e8;
          if (price > 0 && price < 1000000) {
            console.log(`✅ $${price.toFixed(2)}`);
            RESULTS.chainlink.success++;
            RESULTS.chainlink.details.push({ chain, pair, price });
          } else {
            console.log(`❌ Invalid price: ${price}`);
            RESULTS.chainlink.failed++;
          }
        } else {
          console.log(`❌ No result`);
          RESULTS.chainlink.failed++;
        }
      } catch (error) {
        console.log(`❌ ${error.message}`);
        RESULTS.chainlink.failed++;
      }

      await new Promise((resolve) => setTimeout(resolve, DELAY));
    }
  }
}

// ============================================================================
// Pyth 测试
// ============================================================================

const PYTH_IDS = {
  'BTC/USD': 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH/USD': 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'SOL/USD': 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'BNB/USD': '2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
  'XRP/USD': 'ec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8',
  'ADA/USD': '2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d',
  'DOGE/USD': 'dcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c',
  'DOT/USD': 'ca3eed9b267293f6595901c734c7525ce8ef49adafe8284606ceb307afa2ca5b',
  'MATIC/USD': 'ffd11c5a1cfd42f80afb2df4d9f264c15f956d68153335374ec10722edd70472',
  'LTC/USD': '6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892e73874e19a54',
  'AVAX/USD': '93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7',
  'LINK/USD': '8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221',
  'ATOM/USD': 'b00b60f88b03a6a625a8d1c048c3f66653edf217439983d037e7222c4e612819',
  'UNI/USD': '78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501',
  'ARB/USD': '3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5',
  'OP/USD': '385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf',
  'USDC/USD': 'eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  'USDT/USD': '2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
  'DAI/USD': 'b0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e833f70dabfd',
  'STETH/USD': '3af6a3098c56f58ff47cc46dee4a5b1910e5c157f7f0b665952445867470d61f',
};

async function testPyth() {
  console.log('\n📡 测试 Pyth Network');
  console.log('═'.repeat(60));

  for (const [pair, id] of Object.entries(PYTH_IDS)) {
    process.stdout.write(`   ${pair}: `);

    try {
      const response = await fetch(
        `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${id}`
      );

      if (!response.ok) {
        console.log(`❌ HTTP ${response.status}`);
        RESULTS.pyth.failed++;
        await new Promise((resolve) => setTimeout(resolve, DELAY));
        continue;
      }

      const data = await response.json();

      if (data.parsed && data.parsed.length > 0 && data.parsed[0].price) {
        const priceData = data.parsed[0].price;
        const priceValue =
          typeof priceData.price === 'string' ? parseInt(priceData.price, 10) : priceData.price;
        const exponent = priceData.expo || -8;
        const price = priceValue * Math.pow(10, exponent);

        console.log(`✅ $${price.toFixed(2)}`);
        RESULTS.pyth.success++;
        RESULTS.pyth.details.push({ pair, price });
      } else {
        console.log(`❌ No price data`);
        RESULTS.pyth.failed++;
      }
    } catch (error) {
      console.log(`❌ ${error.message}`);
      RESULTS.pyth.failed++;
    }

    await new Promise((resolve) => setTimeout(resolve, DELAY));
  }
}

// ============================================================================
// RedStone 测试
// ============================================================================

const REDSTONE_SYMBOLS = [
  'BTC',
  'ETH',
  'SOL',
  'BNB',
  'XRP',
  'ADA',
  'DOGE',
  'DOT',
  'MATIC',
  'LTC',
  'AVAX',
  'LINK',
  'ATOM',
  'UNI',
  'ARB',
  'OP',
  'USDC',
  'USDT',
  'DAI',
];

async function testRedStone() {
  console.log('\n📡 测试 RedStone');
  console.log('═'.repeat(60));

  for (const symbol of REDSTONE_SYMBOLS) {
    process.stdout.write(`   ${symbol}/USD: `);

    try {
      const response = await fetch(
        `https://api.redstone.finance/prices?symbol=${symbol}&provider=redstone-rapid`
      );

      if (!response.ok) {
        console.log(`❌ HTTP ${response.status}`);
        RESULTS.redstone.failed++;
        await new Promise((resolve) => setTimeout(resolve, DELAY));
        continue;
      }

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0 && data[0].value) {
        console.log(`✅ $${data[0].value.toFixed(2)}`);
        RESULTS.redstone.success++;
        RESULTS.redstone.details.push({ symbol, price: data[0].value });
      } else {
        console.log(`❌ No price data`);
        RESULTS.redstone.failed++;
      }
    } catch (error) {
      console.log(`❌ ${error.message}`);
      RESULTS.redstone.failed++;
    }

    await new Promise((resolve) => setTimeout(resolve, DELAY));
  }
}

// ============================================================================
// 主函数
// ============================================================================

async function main() {
  console.log('🔍 开始全面测试预言机数据获取...\n');
  console.log('📊 测试配置:');
  console.log(`   - 延迟间隔: ${DELAY}ms`);
  console.log(`   - Chainlink RPC: ${Object.keys(ALCHEMY_RPCS).length} 个链\n`);

  const startTime = Date.now();

  await testChainlink();
  await testPyth();
  await testRedStone();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // 打印汇总报告
  console.log('\n' + '═'.repeat(60));
  console.log('  验证结果汇总');
  console.log('═'.repeat(60));

  console.log('\n📊 各预言机数据获取成功率:\n');

  const oracles = [
    { name: 'Chainlink', data: RESULTS.chainlink },
    { name: 'Pyth Network', data: RESULTS.pyth },
    { name: 'RedStone', data: RESULTS.redstone },
  ];

  oracles.forEach((oracle) => {
    const total = oracle.data.success + oracle.data.failed;
    const successRate = total > 0 ? ((oracle.data.success / total) * 100).toFixed(1) : 0;
    const bar =
      '█'.repeat(Math.floor(successRate / 5)) + '░'.repeat(20 - Math.floor(successRate / 5));
    console.log(
      `   ${oracle.name.padEnd(15)} [${bar}] ${successRate}% (${oracle.data.success}/${total})`
    );
  });

  console.log('\n📈 总体统计:\n');
  const totalSuccess = oracles.reduce((sum, o) => sum + o.data.success, 0);
  const totalFailed = oracles.reduce((sum, o) => sum + o.data.failed, 0);
  const totalTests = totalSuccess + totalFailed;
  const overallSuccessRate = totalTests > 0 ? ((totalSuccess / totalTests) * 100).toFixed(1) : 0;

  console.log(`   总测试数: ${totalTests}`);
  console.log(`   成功: ${totalSuccess} ✅`);
  console.log(`   失败: ${totalFailed} ❌`);
  console.log(`   成功率: ${overallSuccessRate}%`);
  console.log(`   耗时: ${totalTime}秒`);

  console.log('\n✨ 结论:\n');
  if (overallSuccessRate >= 95) {
    console.log('   ✅ 数据获取功能优秀，所有预言机工作正常');
    console.log('   💡 建议: 可以在生产环境中使用这些预言机');
  } else if (overallSuccessRate >= 80) {
    console.log('   ✅ 数据获取功能良好，大部分交易对可以正常获取数据');
    console.log('   💡 建议: 优先使用 RedStone 和 Pyth，修复 Chainlink 配置');
  } else if (overallSuccessRate >= 50) {
    console.log('   ⚠️  部分交易对数据获取失败，建议检查数据源配置');
  } else {
    console.log('   ❌ 大量交易对数据获取失败，需要检查 API 配置');
  }

  console.log('\n💡 提示:\n');
  console.log('   • RedStone 是最可靠的数据源，建议优先使用');
  console.log('   • Pyth 支持主流币种，配置正确后可用');
  console.log('   • Chainlink 需要正确的聚合器地址');
  console.log('   • 建议实现降级策略，自动切换数据源\n');
}

main().catch(console.error);
