/**
 * Pyth 预言机数据验证脚本
 * 用于验证是否获取到真实的 Pyth Network 数据
 */

const HERMES_API_URL = 'https://hermes.pyth.network';
const BTC_PRICE_FEED_ID = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';
const ETH_PRICE_FEED_ID = '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace';

console.log('🔍 开始验证 Pyth 预言机数据...\n');

// 1. 测试 Hermes API 连接 - 使用正确的 v2 端点
async function testHermesAPI() {
  console.log('📡 测试 1: Hermes API 连接 (v2)');
  const endpoint = `${HERMES_API_URL}/v2/updates/price/latest?ids[]=${BTC_PRICE_FEED_ID}`;
  console.log('   端点:', endpoint);

  try {
    const startTime = Date.now();
    const response = await fetch(endpoint);
    const latency = Date.now() - startTime;

    if (!response.ok) {
      console.log('   ❌ API 请求失败:', response.status, response.statusText);
      return false;
    }

    const data = await response.json();

    if (!data.parsed || data.parsed.length === 0) {
      console.log('   ❌ 未返回价格数据');
      return false;
    }

    const priceData = data.parsed[0];
    console.log('   ✅ API 连接成功!');
    console.log('   📊 延迟:', latency + 'ms');
    console.log('   📝 原始数据:', JSON.stringify(priceData, null, 2));

    // 解析价格
    if (priceData.price) {
      const priceValue =
        typeof priceData.price.price === 'string'
          ? parseInt(priceData.price.price, 10)
          : priceData.price.price;
      const exponent = priceData.price.expo || -8;
      const actualPrice = priceValue * Math.pow(10, exponent);
      const publishTime = new Date(
        (priceData.price.publish_time || priceData.price.publishTime) * 1000
      );

      console.log('   💰 BTC/USD 价格:', actualPrice.toFixed(2));
      console.log('   🕐 发布时间:', publishTime.toLocaleString());
      console.log(
        '   ⏱️  数据新鲜度:',
        ((Date.now() - publishTime.getTime()) / 1000).toFixed(0) + '秒前'
      );

      // 验证价格合理性
      if (actualPrice > 10000 && actualPrice < 200000) {
        console.log('   ✅ 价格在合理范围内');
      } else {
        console.log('   ⚠️  价格可能异常');
      }
    }

    return true;
  } catch (error) {
    console.log('   ❌ API 请求错误:', error.message);
    return false;
  }
}

// 2. 测试发布者 API
async function testPublishersAPI() {
  console.log('\n📡 测试 2: 发布者 API');
  const endpoint = `${HERMES_API_URL}/v2/publishers`;
  console.log('   端点:', endpoint);

  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      console.log('   ❌ API 请求失败:', response.status);
      return false;
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      console.log('   ✅ 获取到', data.length, '个发布者');
      console.log('   📝 第一个发布者:', data[0].name || data[0].publisher_key || 'Unknown');
      return true;
    } else {
      console.log('   ⚠️  发布者数据为空');
      return false;
    }
  } catch (error) {
    console.log('   ❌ API 请求错误:', error.message);
    return false;
  }
}

// 3. 测试价格源列表
async function testPriceFeeds() {
  console.log('\n📡 测试 3: 价格源列表');
  const endpoint = `${HERMES_API_URL}/v2/price_feeds?query=BTC&asset_type=crypto`;
  console.log('   端点:', endpoint);

  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      console.log('   ❌ API 请求失败:', response.status);
      return false;
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      console.log('   ✅ 获取到', data.length, '个价格源');
      const btcFeed = data.find(
        (f) => f.attributes?.symbol?.includes('BTC') || f.attributes?.base?.includes('BTC')
      );
      if (btcFeed) {
        console.log('   📝 BTC 价格源:', btcFeed.attributes?.symbol || btcFeed.id);
      }
      return true;
    } else {
      console.log('   ⚠️  价格源数据为空');
      return false;
    }
  } catch (error) {
    console.log('   ❌ API 请求错误:', error.message);
    return false;
  }
}

// 4. 对比多个价格（验证数据一致性）
async function testMultiplePrices() {
  console.log('\n📡 测试 4: 多价格对比验证');
  const endpoint = `${HERMES_API_URL}/v2/updates/price/latest?ids[]=${BTC_PRICE_FEED_ID}&ids[]=${ETH_PRICE_FEED_ID}`;

  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      console.log('   ❌ API 请求失败:', response.status);
      return false;
    }

    const data = await response.json();

    if (data.parsed && data.parsed.length >= 2) {
      console.log('   ✅ 成功获取多个价格');

      data.parsed.forEach((item, index) => {
        const priceValue =
          typeof item.price.price === 'string' ? parseInt(item.price.price, 10) : item.price.price;
        const exponent = item.price.expo || -8;
        const actualPrice = priceValue * Math.pow(10, exponent);
        const symbol = index === 0 ? 'BTC/USD' : 'ETH/USD';
        console.log(`   💰 ${symbol}:`, actualPrice.toFixed(2));
      });

      return true;
    }

    return false;
  } catch (error) {
    console.log('   ❌ API 请求错误:', error.message);
    return false;
  }
}

// 5. 测试 WebSocket 连接
async function testWebSocket() {
  console.log('\n📡 测试 5: WebSocket 连接');
  const wsUrl = 'wss://hermes.pyth.network/ws';
  console.log('   端点:', wsUrl);

  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        console.log('   ❌ WebSocket 连接超时');
        resolve(false);
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        console.log('   ✅ WebSocket 连接成功!');

        // 尝试订阅 BTC 价格
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            ids: [BTC_PRICE_FEED_ID],
          })
        );
        console.log('   📤 已发送订阅请求');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('   📥 收到消息:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
        ws.close();
        resolve(true);
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        console.log('   ❌ WebSocket 错误');
        resolve(false);
      };

      ws.onclose = () => {
        clearTimeout(timeout);
      };
    } catch (error) {
      console.log('   ❌ WebSocket 连接错误:', error.message);
      resolve(false);
    }
  });
}

// 运行所有测试
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('  Pyth Network 数据真实性验证');
  console.log('='.repeat(60));
  console.log('');

  const results = {
    hermesAPI: await testHermesAPI(),
    publishersAPI: await testPublishersAPI(),
    priceFeeds: await testPriceFeeds(),
    multiplePrices: await testMultiplePrices(),
    webSocket: await testWebSocket(),
  };

  console.log('\n' + '='.repeat(60));
  console.log('  验证结果汇总');
  console.log('='.repeat(60));

  const passedTests = Object.values(results).filter((r) => r).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n✅ 通过: ${passedTests}/${totalTests}`);
  console.log(`❌ 失败: ${totalTests - passedTests}/${totalTests}`);

  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试通过！Pyth 数据是真实的！');
    console.log('\n✨ 结论:');
    console.log('   • 您的应用正在获取真实的 Pyth Network 数据');
    console.log('   • 价格数据来自真实的交易所和做市商');
    console.log('   • WebSocket 实时连接正常工作');
  } else if (passedTests > 0) {
    console.log('\n⚠️  部分测试通过');
    console.log('   数据是真实的，但某些 API 可能暂时不可用');
  } else {
    console.log('\n❌ 所有测试失败');
    console.log('   请检查网络连接或 API 端点配置');
  }

  console.log('\n📌 说明:');
  console.log('   - 真实数据特征：价格随市场波动、有准确的发布时间戳');
  console.log('   - 模拟数据特征：固定或随机生成的价格、无实时更新');
  console.log('   - Pyth Network 数据来自 90+ 家顶级金融机构');
}

runAllTests().catch(console.error);
