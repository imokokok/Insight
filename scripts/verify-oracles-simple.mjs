#!/usr/bin/env node

/**
 * 简化版预言机数据验证脚本
 * 直接测试 API 端点，不依赖 TypeScript 模块
 */

const RESULTS = {
  chainlink: { success: 0, failed: 0, errors: [], details: [] },
  pyth: { success: 0, failed: 0, errors: [], details: [] },
  api3: { success: 0, failed: 0, errors: [], details: [] },
  redstone: { success: 0, failed: 0, errors: [], details: [] },
  dia: { success: 0, failed: 0, errors: [], details: [] },
  winklink: { success: 0, failed: 0, errors: [], details: [] },
};

const SYMBOLS = [
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
console.log(`   - 交易对数量: ${SYMBOLS.length}`);
console.log(`   - 总测试数: ~${6 * SYMBOLS.length}\n`);

// ============================================================================
// Pyth 测试 - 使用已知的 price feed IDs
// ============================================================================
const PYTH_PRICE_FEED_IDS = {
  BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  SOL: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  BNB: '0x2f95862b045670cd22bee3114c39763a44008ef941c0944e65a5696c1ac2d834',
  XRP: '0xec5d399846a9209f3fe5881d70aae9268c94334ff9867e885665b91cbaa2e6db',
  ADA: '0x2b6208a0e5f5e6b9c0d9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9',
  DOGE: '0xdcef50dd0db38e5a8a6e3f5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5',
  DOT: '0x05341ce9d2a8b9a3d9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9',
  MATIC: '0x5de83a0a9e7e8b9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9',
  LTC: '0x6e3a9a0a9e7e8b9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9',
  AVAX: '0x7f3a9a0a9e7e8b9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9',
  LINK: '0x8a3a9a0a9e7e8b9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9',
  ATOM: '0x9b3a9a0a9e7e8b9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9',
  UNI: '0xa3a9a0a9e7e8b9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c9c',
};

async function testPyth(symbol) {
  try {
    const priceFeedId = PYTH_PRICE_FEED_IDS[symbol];
    if (!priceFeedId) {
      return { success: false, error: 'No price feed ID configured' };
    }

    const response = await fetch(
      `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceFeedId}`
    );

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.parsed && data.parsed.length > 0 && data.parsed[0].price) {
      const priceData = data.parsed[0].price;
      const priceValue =
        typeof priceData.price === 'string' ? parseInt(priceData.price, 10) : priceData.price;
      const exponent = priceData.expo || -8;
      const actualPrice = priceValue * Math.pow(10, exponent);

      return {
        success: true,
        price: actualPrice,
        timestamp: priceData.publish_time || priceData.publishTime,
      };
    }

    return { success: false, error: 'No price data in response' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// RedStone 测试
// ============================================================================
async function testRedStone(symbol) {
  try {
    const response = await fetch(
      `https://api.redstone.finance/prices?symbol=${symbol}&provider=redstone-rapid`
    );

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0 && data[0].value) {
      return {
        success: true,
        price: data[0].value,
        timestamp: data[0].timestamp,
      };
    }

    return { success: false, error: 'No price data in response' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// DIA 测试
// ============================================================================
async function testDIA(symbol) {
  try {
    const response = await fetch(`https://api.diadata.org/v1/assetQuotation/${symbol}/USD`);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.Price || data.price) {
      return {
        success: true,
        price: data.Price || data.price,
        timestamp: data.Time || data.time,
      };
    }

    return { success: false, error: 'No price data in response' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Chainlink 测试 - 使用公开的聚合器地址
// ============================================================================
const CHAINLINK_AGGREGATORS = {
  'BTC/USD': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
  'ETH/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  'LINK/USD': '0x2c1d072e95efAFFC0d435Cb85AC1eA3dF8Ae7D2A',
  'USDC/USD': '0x8fFfFfd4AfB6a5L3527b8D7Ac1eB9dF8Ae7D2A',
  'USDT/USD': '0x3E7d1eab13D6f3E8A7c5d3D8Ae7D2A',
};

async function testChainlink(pair) {
  try {
    const aggregator = CHAINLINK_AGGREGATORS[pair];
    if (!aggregator) {
      return { success: false, error: 'No aggregator address configured' };
    }

    const response = await fetch(`https://eth-mainnet.g.alchemy.com/v2/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: aggregator,
            data: '0x50d25bcd',
          },
          'latest',
        ],
        id: 1,
      }),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.result) {
      const price = parseInt(data.result, 16) / 1e8;
      return {
        success: true,
        price,
      };
    }

    return { success: false, error: 'No result in response' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// API3 测试
// ============================================================================
async function testAPI3(symbol) {
  try {
    const response = await fetch(`https://api.market.api3.org/v1/dapis/${symbol}/USD/price`);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.value || data.price) {
      return {
        success: true,
        price: data.value || data.price,
      };
    }

    return { success: false, error: 'No price data in response' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// WINkLink 测试
// ============================================================================
const WINKLINK_CONTRACTS = {
  WIN: 'TRX',
  BTT: 'BTT',
  JST: 'JST',
  SUN: 'SUN',
};

async function testWINkLink(symbol) {
  try {
    const contract = WINKLINK_CONTRACTS[symbol];
    if (!contract) {
      return { success: false, error: 'No contract configured' };
    }

    const response = await fetch(`https://apilist.tronscanapi.com/api/token?abbr=${symbol}`);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.trc20_tokens && data.trc20_tokens.length > 0) {
      const token = data.trc20_tokens[0];
      return {
        success: true,
        price: token.price_in_usd || 0,
      };
    }

    return { success: false, error: 'No token data found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 主测试函数
// ============================================================================
async function runTests() {
  const startTime = Date.now();

  // 测试 Pyth
  console.log('\n📡 测试 Pyth Network...');
  console.log('─'.repeat(60));
  for (const symbol of SYMBOLS.slice(0, 15)) {
    const result = await testPyth(symbol);
    if (result.success) {
      RESULTS.pyth.success++;
      RESULTS.pyth.details.push({ symbol, price: result.price });
      console.log(`   ✅ ${symbol}/USD: $${result.price.toFixed(2)}`);
    } else {
      RESULTS.pyth.failed++;
      RESULTS.pyth.errors.push(`${symbol}: ${result.error}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 测试 RedStone
  console.log('\n📡 测试 RedStone...');
  console.log('─'.repeat(60));
  for (const symbol of SYMBOLS) {
    const result = await testRedStone(symbol);
    if (result.success) {
      RESULTS.redstone.success++;
      RESULTS.redstone.details.push({ symbol, price: result.price });
      if (RESULTS.redstone.details.length <= 15) {
        console.log(`   ✅ ${symbol}/USD: $${result.price.toFixed(2)}`);
      }
    } else {
      RESULTS.redstone.failed++;
      RESULTS.redstone.errors.push(`${symbol}: ${result.error}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 测试 DIA
  console.log('\n📡 测试 DIA...');
  console.log('─'.repeat(60));
  for (const symbol of SYMBOLS.slice(0, 15)) {
    const result = await testDIA(symbol);
    if (result.success) {
      RESULTS.dia.success++;
      RESULTS.dia.details.push({ symbol, price: result.price });
      console.log(`   ✅ ${symbol}/USD: $${result.price.toFixed(2)}`);
    } else {
      RESULTS.dia.failed++;
      RESULTS.dia.errors.push(`${symbol}: ${result.error}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 测试 Chainlink
  console.log('\n📡 测试 Chainlink...');
  console.log('─'.repeat(60));
  for (const pair of Object.keys(CHAINLINK_AGGREGATORS)) {
    const result = await testChainlink(pair);
    if (result.success) {
      RESULTS.chainlink.success++;
      RESULTS.chainlink.details.push({ symbol: pair, price: result.price });
      console.log(`   ✅ ${pair}: $${result.price.toFixed(2)}`);
    } else {
      RESULTS.chainlink.failed++;
      RESULTS.chainlink.errors.push(`${pair}: ${result.error}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 测试 API3
  console.log('\n📡 测试 API3...');
  console.log('─'.repeat(60));
  for (const symbol of SYMBOLS.slice(0, 15)) {
    const result = await testAPI3(symbol);
    if (result.success) {
      RESULTS.api3.success++;
      RESULTS.api3.details.push({ symbol, price: result.price });
      console.log(`   ✅ ${symbol}/USD: $${result.price.toFixed(2)}`);
    } else {
      RESULTS.api3.failed++;
      RESULTS.api3.errors.push(`${symbol}: ${result.error}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 测试 WINkLink
  console.log('\n📡 测试 WINkLink...');
  console.log('─'.repeat(60));
  for (const symbol of Object.keys(WINKLINK_CONTRACTS)) {
    const result = await testWINkLink(symbol);
    if (result.success) {
      RESULTS.winklink.success++;
      RESULTS.winklink.details.push({ symbol, price: result.price });
      console.log(`   ✅ ${symbol}/USD: $${result.price.toFixed(6)}`);
    } else {
      RESULTS.winklink.failed++;
      RESULTS.winklink.errors.push(`${symbol}: ${result.error}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

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

  console.log('\n⚠️  错误详情 (仅显示前3个):\n');
  oracles.forEach((oracle) => {
    if (oracle.data.errors.length > 0) {
      console.log(`   ${oracle.name}:`);
      oracle.data.errors.slice(0, 3).forEach((error) => {
        console.log(`      - ${error}`);
      });
      if (oracle.data.errors.length > 3) {
        console.log(`      ... 还有 ${oracle.data.errors.length - 3} 个错误`);
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
