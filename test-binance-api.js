// Binance API 连接测试脚本
// 使用方法：在浏览器控制台运行此代码，或在 Node.js 环境中运行

async function testBinanceAPI() {
  const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

  console.log('🔍 开始测试 Binance API 连接...\n');

  try {
    // 测试 1: 检查基本连接
    console.log('📡 测试 1: 检查 API 基本连接...');
    const testUrl = `${BINANCE_API_BASE}/time`;
    const timeResponse = await fetch(testUrl);

    if (!timeResponse.ok) {
      throw new Error(`连接失败：HTTP ${timeResponse.status}`);
    }

    const timeData = await timeResponse.json();
    console.log('✅ 连接成功！服务器时间:', new Date(timeData.serverTime));

    // 测试 2: 获取 LINK/USDT 价格
    console.log('\n📊 测试 2: 获取 LINK/USDT 市场数据...');
    const symbol = 'LINKUSDT';
    const priceUrl = `${BINANCE_API_BASE}/ticker/price?symbol=${symbol}`;
    const priceResponse = await fetch(priceUrl);

    if (!priceResponse.ok) {
      throw new Error(`获取价格失败：HTTP ${priceResponse.status}`);
    }

    const priceData = await priceResponse.json();
    console.log('✅ LINK/USDT 价格:', priceData.price);

    // 测试 3: 获取 24 小时统计数据
    console.log('\n📈 测试 3: 获取 24 小时统计数据...');
    const tickerUrl = `${BINANCE_API_BASE}/ticker/24hr?symbol=${symbol}`;
    const tickerResponse = await fetch(tickerUrl);

    if (!tickerResponse.ok) {
      throw new Error(`获取统计数据失败：HTTP ${tickerResponse.status}`);
    }

    const tickerData = await tickerResponse.json();
    console.log('✅ 24 小时统计:');
    console.log('   - 最高价:', tickerData.highPrice);
    console.log('   - 最低价:', tickerData.lowPrice);
    console.log('   - 涨跌幅:', tickerData.priceChangePercent + '%');
    console.log('   - 成交量:', tickerData.volume);

    // 测试 4: 获取 K 线数据
    console.log('\n📉 测试 4: 获取 K 线数据...');
    const klineUrl = `${BINANCE_API_BASE}/klines?symbol=${symbol}&interval=1h&limit=5`;
    const klineResponse = await fetch(klineUrl);

    if (!klineResponse.ok) {
      throw new Error(`获取 K 线数据失败：HTTP ${klineResponse.status}`);
    }

    const klineData = await klineResponse.json();
    console.log('✅ 最近 5 条 K 线数据:');
    klineData.forEach((kline, index) => {
      const time = new Date(kline[0]).toLocaleString();
      const open = kline[1];
      const close = kline[4];
      console.log(`   ${index + 1}. ${time} - 开盘：${open}, 收盘：${close}`);
    });

    console.log('\n🎉 所有测试通过！Binance API 连接正常。');
    console.log('\n💡 如果此测试通过但项目仍然报错，请检查:');
    console.log('   1. 项目的错误日志（浏览器控制台或服务器日志）');
    console.log('   2. 是否有 CORS 跨域问题');
    console.log('   3. 代码中的错误处理逻辑');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('\n💡 可能的原因:');
    console.error('   1. 网络连接问题（Binance API 可能被防火墙阻止）');
    console.error('   2. 需要配置代理服务器');
    console.error('   3. API 临时限流（请稍后再试）');
    console.error('\n💡 解决方案:');
    console.error('   - 使用代理服务器访问 Binance API');
    console.error('   - 检查网络防火墙设置');
    console.error('   - 稍后再试，避免频繁请求');
  }
}

// 运行测试
testBinanceAPI();
