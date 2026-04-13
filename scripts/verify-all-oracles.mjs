#!/usr/bin/env node

/**
 * 全面验证所有预言机在各个链上的交易对数据获取
 * 测试 Chainlink, Pyth, API3, RedStone, DIA, WINkLink
 */

import { config } from 'dotenv';
config();

const RESULTS = {
  chainlink: { success: 0, failed: 0, errors: [] },
  pyth: { success: 0, failed: 0, errors: [] },
  api3: { success: 0, failed: 0, errors: [] },
  redstone: { success: 0, failed: 0, errors: [] },
  dia: { success: 0, failed: 0, errors: [] },
  winklink: { success: 0, failed: 0, errors: [] },
};

const CHAINS = {
  ethereum: { name: 'Ethereum', chainId: 1 },
  arbitrum: { name: 'Arbitrum', chainId: 42161 },
  optimism: { name: 'Optimism', chainId: 10 },
  polygon: { name: 'Polygon', chainId: 137 },
  avalanche: { name: 'Avalanche', chainId: 43114 },
  'bnb-chain': { name: 'BNB Chain', chainId: 56 },
  solana: { name: 'Solana', chainId: 0 },
  base: { name: 'Base', chainId: 8453 },
  fantom: { name: 'Fantom', chainId: 250 },
  aptos: { name: 'Aptos', chainId: 0 },
  sui: { name: 'Sui', chainId: 0 },
  tron: { name: 'TRON', chainId: 0 },
};

const SYMBOLS = [
  'BTC',
  'ETH',
  'SOL',
  'BNB',
  'XRP',
  'ADA',
  'DOGE',
  'TRX',
  'DOT',
  'MATIC',
  'LTC',
  'AVAX',
  'LINK',
  'ATOM',
  'UNI',
  'XLM',
  'ETC',
  'BCH',
  'FIL',
  'NEAR',
  'APT',
  'ARB',
  'OP',
  'INJ',
  'FTM',
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
  'FXS',
  'USDC',
  'USDT',
  'DAI',
  'FRAX',
  'WBTC',
  'WETH',
  'STETH',
  'RETH',
  'CBETH',
];

console.log('🔍 开始验证所有预言机数据获取...\n');
console.log('📊 测试配置:');
console.log(`   - 预言机数量: 6`);
console.log(`   - 链数量: ${Object.keys(CHAINS).length}`);
console.log(`   - 交易对数量: ${SYMBOLS.length}`);
console.log(`   - 总测试数: ~${6 * Object.keys(CHAINS).length * SYMBOLS.length}\n`);

// ============================================================================
// Chainlink 测试
// ============================================================================
async function testChainlink(chain, symbol) {
  try {
    const chainlinkDataSources = await import('../src/lib/oracles/chainlinkDataSources.ts');
    const dataSource = chainlinkDataSources.getChainlinkDataSource(chain, `${symbol}/USD`);

    if (!dataSource) {
      return { success: false, error: 'No data source found' };
    }

    const response = await fetch(dataSource.apiUrl, {
      headers: dataSource.headers || {},
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.answer || data.result || data.price) {
      return { success: true, data };
    }

    return { success: false, error: 'No price data in response' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Pyth 测试
// ============================================================================
async function testPyth(chain, symbol) {
  try {
    const pythConstants = await import('../src/lib/oracles/pythConstants.ts');
    const priceFeedId = pythConstants.PYTH_PRICE_FEED_IDS[symbol];

    if (!priceFeedId) {
      return { success: false, error: 'No price feed ID' };
    }

    const response = await fetch(
      `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceFeedId}`
    );

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.parsed && data.parsed.length > 0) {
      return { success: true, data: data.parsed[0] };
    }

    return { success: false, error: 'No parsed data' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// API3 测试
// ============================================================================
async function testAPI3(chain, symbol) {
  try {
    const api3DataSources = await import('../src/lib/oracles/api3DataSources.ts');
    const dataSource = api3DataSources.getAPI3DataSource(chain, symbol);

    if (!dataSource) {
      return { success: false, error: 'No data source found' };
    }

    const response = await fetch(dataSource.apiUrl, {
      headers: dataSource.headers || {},
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.value || data.price || data.answer) {
      return { success: true, data };
    }

    return { success: false, error: 'No price data in response' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// RedStone 测试
// ============================================================================
async function testRedStone(chain, symbol) {
  try {
    const response = await fetch(
      `https://api.redstone.finance/prices?symbol=${symbol}&provider=redstone-rapid`
    );

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0 && data[0].value) {
      return { success: true, data: data[0] };
    }

    return { success: false, error: 'No price data in response' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// DIA 测试
// ============================================================================
async function testDIA(chain, symbol) {
  try {
    const response = await fetch(`https://api.diadata.org/v1/assetQuotation/${symbol}/USD`);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.Price || data.price) {
      return { success: true, data };
    }

    return { success: false, error: 'No price data in response' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// WINkLink 测试
// ============================================================================
async function testWINkLink(chain, symbol) {
  try {
    const winklink = await import('../src/lib/oracles/winklink.ts');
    const address = winklink.WINKLINK_ADDRESSES[symbol];

    if (!address) {
      return { success: false, error: 'No contract address' };
    }

    const response = await fetch(`https://api.trongrid.io/wallet/triggerconstantcontract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_address: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
        contract_address: address,
        function_selector: 'latestRoundData()',
        parameter: '',
      }),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.constant_result && data.constant_result.length > 0) {
      return { success: true, data };
    }

    return { success: false, error: 'No price data in response' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 主测试函数
// ============================================================================
async function runTests() {
  const startTime = Date.now();

  // 测试 Chainlink
  console.log('\n📡 测试 Chainlink...');
  console.log('─'.repeat(60));
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (chainKey === 'solana' || chainKey === 'aptos' || chainKey === 'sui' || chainKey === 'tron')
      continue;

    process.stdout.write(`   ${chain.name}: `);
    let chainSuccess = 0;
    let chainFailed = 0;

    for (const symbol of SYMBOLS.slice(0, 10)) {
      const result = await testChainlink(chainKey, symbol);
      if (result.success) {
        chainSuccess++;
        RESULTS.chainlink.success++;
      } else {
        chainFailed++;
        RESULTS.chainlink.failed++;
        if (result.error !== 'No data source found') {
          RESULTS.chainlink.errors.push(`${chain.name}/${symbol}: ${result.error}`);
        }
      }
    }
    console.log(`✅ ${chainSuccess} / ❌ ${chainFailed}`);
  }

  // 测试 Pyth
  console.log('\n📡 测试 Pyth Network...');
  console.log('─'.repeat(60));
  process.stdout.write(`   所有链: `);
  let pythSuccess = 0;
  let pythFailed = 0;

  for (const symbol of SYMBOLS) {
    const result = await testPyth('ethereum', symbol);
    if (result.success) {
      pythSuccess++;
      RESULTS.pyth.success++;
    } else {
      pythFailed++;
      RESULTS.pyth.failed++;
      RESULTS.pyth.errors.push(`${symbol}: ${result.error}`);
    }
  }
  console.log(`✅ ${pythSuccess} / ❌ ${pythFailed}`);

  // 测试 API3
  console.log('\n📡 测试 API3...');
  console.log('─'.repeat(60));
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (chainKey === 'solana' || chainKey === 'aptos' || chainKey === 'sui' || chainKey === 'tron')
      continue;

    process.stdout.write(`   ${chain.name}: `);
    let chainSuccess = 0;
    let chainFailed = 0;

    for (const symbol of SYMBOLS.slice(0, 10)) {
      const result = await testAPI3(chainKey, symbol);
      if (result.success) {
        chainSuccess++;
        RESULTS.api3.success++;
      } else {
        chainFailed++;
        RESULTS.api3.failed++;
        if (result.error !== 'No data source found') {
          RESULTS.api3.errors.push(`${chain.name}/${symbol}: ${result.error}`);
        }
      }
    }
    console.log(`✅ ${chainSuccess} / ❌ ${chainFailed}`);
  }

  // 测试 RedStone
  console.log('\n📡 测试 RedStone...');
  console.log('─'.repeat(60));
  process.stdout.write(`   所有链: `);
  let redstoneSuccess = 0;
  let redstoneFailed = 0;

  for (const symbol of SYMBOLS) {
    const result = await testRedStone('ethereum', symbol);
    if (result.success) {
      redstoneSuccess++;
      RESULTS.redstone.success++;
    } else {
      redstoneFailed++;
      RESULTS.redstone.failed++;
      RESULTS.redstone.errors.push(`${symbol}: ${result.error}`);
    }
  }
  console.log(`✅ ${redstoneSuccess} / ❌ ${redstoneFailed}`);

  // 测试 DIA
  console.log('\n📡 测试 DIA...');
  console.log('─'.repeat(60));
  process.stdout.write(`   所有链: `);
  let diaSuccess = 0;
  let diaFailed = 0;

  for (const symbol of SYMBOLS) {
    const result = await testDIA('ethereum', symbol);
    if (result.success) {
      diaSuccess++;
      RESULTS.dia.success++;
    } else {
      diaFailed++;
      RESULTS.dia.failed++;
      RESULTS.dia.errors.push(`${symbol}: ${result.error}`);
    }
  }
  console.log(`✅ ${diaSuccess} / ❌ ${diaFailed}`);

  // 测试 WINkLink
  console.log('\n📡 测试 WINkLink...');
  console.log('─'.repeat(60));
  process.stdout.write(`   TRON: `);
  let winklinkSuccess = 0;
  let winklinkFailed = 0;

  const winklinkSymbols = ['BTC', 'ETH', 'TRX', 'WIN', 'BTT', 'JST', 'SUN', 'USDD', 'USDT'];
  for (const symbol of winklinkSymbols) {
    const result = await testWINkLink('tron', symbol);
    if (result.success) {
      winklinkSuccess++;
      RESULTS.winklink.success++;
    } else {
      winklinkFailed++;
      RESULTS.winklink.failed++;
      RESULTS.winklink.errors.push(`${symbol}: ${result.error}`);
    }
  }
  console.log(`✅ ${winklinkSuccess} / ❌ ${winklinkFailed}`);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // 打印汇总报告
  console.log('\n' + '='.repeat(60));
  console.log('  验证结果汇总');
  console.log('='.repeat(60));

  console.log('\n📊 各预言机数据获取成功率:\n');
  const oracles = [
    { name: 'Chainlink', data: RESULTS.chainlink },
    { name: 'Pyth Network', data: RESULTS.pyth },
    { name: 'API3', data: RESULTS.api3 },
    { name: 'RedStone', data: RESULTS.redstone },
    { name: 'DIA', data: RESULTS.dia },
    { name: 'WINkLink', data: RESULTS.winklink },
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

  console.log('\n⚠️  错误详情 (仅显示前5个):\n');
  oracles.forEach((oracle) => {
    if (oracle.data.errors.length > 0) {
      console.log(`   ${oracle.name}:`);
      oracle.data.errors.slice(0, 5).forEach((error) => {
        console.log(`      - ${error}`);
      });
      if (oracle.data.errors.length > 5) {
        console.log(`      ... 还有 ${oracle.data.errors.length - 5} 个错误`);
      }
    }
  });

  console.log('\n📈 总体统计:\n');
  const totalSuccess = Object.values(RESULTS).reduce((sum, r) => sum + r.success, 0);
  const totalFailed = Object.values(RESULTS).reduce((sum, r) => sum + r.failed, 0);
  const totalTests = totalSuccess + totalFailed;
  const overallSuccessRate = totalTests > 0 ? ((totalSuccess / totalTests) * 100).toFixed(1) : 0;

  console.log(`   总测试数: ${totalTests}`);
  console.log(`   成功: ${totalSuccess} ✅`);
  console.log(`   失败: ${totalFailed} ❌`);
  console.log(`   成功率: ${overallSuccessRate}%`);
  console.log(`   耗时: ${totalTime}秒`);

  console.log('\n✨ 建议:\n');
  if (overallSuccessRate >= 80) {
    console.log('   ✅ 数据获取功能良好，大部分交易对可以正常获取数据');
  } else if (overallSuccessRate >= 50) {
    console.log('   ⚠️  部分交易对数据获取失败，建议检查数据源配置');
  } else {
    console.log('   ❌ 大量交易对数据获取失败，需要检查 API 配置和网络连接');
  }

  console.log('\n💡 提示:\n');
  console.log('   • 不同预言机支持的交易对不同，这是正常现象');
  console.log('   • 某些交易对可能在特定链上不可用');
  console.log('   • 建议定期运行此脚本监控数据源健康状态');
  console.log('   • 对于失败的交易对，可以在前端隐藏或标记为不可用\n');
}

runTests().catch((error) => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
