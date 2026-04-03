/**
 * 验证 Chainlink 真实数据获取
 * 运行: node verify-real-data.mjs
 */

// 直接通过 RPC 调用验证 Chainlink 价格喂价合约
const CHAINLINK_PRICE_FEEDS = {
  ETH: {
    1: { address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', name: 'ETH / USD', decimals: 8 }
  },
  BTC: {
    1: { address: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c', name: 'BTC / USD', decimals: 8 }
  },
  LINK: {
    1: { address: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c', name: 'LINK / USD', decimals: 8 }
  }
};

// Alchemy RPC 端点
const RPC_ENDPOINT = 'https://eth-mainnet.g.alchemy.com/v2/8Ju5GRJhZ2OSXby33tDIW';

// Chainlink Aggregator ABI (latestRoundData function)
const LATEST_ROUND_DATA_SELECTOR = '0xfeaf968c';

async function makeRPCCall(to, data) {
  const response = await fetch(RPC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to, data }, 'latest']
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC call failed: ${response.status}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(`RPC error: ${result.error.message}`);
  }

  return result.result;
}

function decodeLatestRoundData(data) {
  const cleanData = data.slice(2); // Remove 0x prefix

  const roundId = BigInt('0x' + cleanData.slice(0, 64));
  const answer = BigInt('0x' + cleanData.slice(64, 128));
  const startedAt = BigInt('0x' + cleanData.slice(128, 192));
  const updatedAt = BigInt('0x' + cleanData.slice(192, 256));
  const answeredInRound = BigInt('0x' + cleanData.slice(256, 320));

  return {
    roundId,
    answer,
    startedAt,
    updatedAt,
    answeredInRound
  };
}

async function verifyRealData() {
  console.log('=== 验证 Chainlink 真实数据获取 ===\n');
  console.log('RPC 端点:', RPC_ENDPOINT.slice(0, 50) + '...');
  console.log('时间:', new Date().toLocaleString());
  console.log('');

  const results = [];

  for (const [symbol, feeds] of Object.entries(CHAINLINK_PRICE_FEEDS)) {
    const feed = feeds[1]; // Ethereum mainnet
    console.log(`正在获取 ${symbol}/USD 价格...`);
    console.log(`  合约地址: ${feed.address}`);

    try {
      const startTime = Date.now();
      const rawData = await makeRPCCall(feed.address, LATEST_ROUND_DATA_SELECTOR);
      const latency = Date.now() - startTime;

      const decoded = decodeLatestRoundData(rawData);
      const price = Number(decoded.answer) / Math.pow(10, feed.decimals);
      const updateTime = new Date(Number(decoded.updatedAt) * 1000);

      console.log(`  ✅ 成功获取!`);
      console.log(`  💰 价格: $${price.toLocaleString()}`);
      console.log(`  ⏱️  链上更新时间: ${updateTime.toLocaleString()}`);
      console.log(`  🔄 Round ID: ${decoded.roundId.toString()}`);
      console.log(`  📡 请求延迟: ${latency}ms`);
      console.log('');

      results.push({
        symbol,
        price,
        updateTime,
        roundId: decoded.roundId.toString(),
        latency,
        success: true
      });
    } catch (error) {
      console.log(`  ❌ 失败: ${error.message}\n`);
      results.push({ symbol, success: false, error: error.message });
    }
  }

  // 总结
  console.log('=== 验证结果总结 ===');
  console.log('');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ 成功: ${successful.length}/${results.length}`);
  console.log(`❌ 失败: ${failed.length}/${results.length}`);
  console.log('');

  if (successful.length > 0) {
    console.log('获取到的真实价格数据:');
    console.log('┌─────────┬─────────────────┬─────────────────────────┬──────────┐');
    console.log('│ 代币    │ 价格 (USD)      │ 链上更新时间            │ 延迟(ms) │');
    console.log('├─────────┼─────────────────┼─────────────────────────┼──────────┤');

    for (const r of successful) {
      const priceStr = r.price < 100
        ? r.price.toFixed(4)
        : r.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
      console.log(`│ ${r.symbol.padEnd(7)} │ $${priceStr.padStart(15)} │ ${r.updateTime.toLocaleString().padEnd(23)} │ ${r.latency.toString().padStart(8)} │`);
    }

    console.log('└─────────┴─────────────────┴─────────────────────────┴──────────┘');
    console.log('');

    // 验证数据新鲜度
    const now = Date.now();
    const maxAge = 3600 * 1000; // 1小时

    console.log('数据新鲜度检查:');
    for (const r of successful) {
      const age = now - r.updateTime.getTime();
      const ageMinutes = Math.floor(age / 60000);
      const isFresh = age < maxAge;

      if (isFresh) {
        console.log(`  ✅ ${r.symbol}: ${ageMinutes} 分钟前更新 (新鲜)`);
      } else {
        console.log(`  ⚠️  ${r.symbol}: ${ageMinutes} 分钟前更新 (较旧)`);
      }
    }
  }

  console.log('');
  console.log('=== 结论 ===');
  if (successful.length === results.length) {
    console.log('✅ 所有测试通过！您的应用正在获取真实的 Chainlink 链上数据。');
  } else if (successful.length > 0) {
    console.log('⚠️  部分测试通过。部分代币可能暂时无法获取数据。');
  } else {
    console.log('❌ 所有测试失败。请检查 RPC 配置和网络连接。');
  }
}

// 运行验证
verifyRealData().catch(error => {
  console.error('验证过程出错:', error);
  process.exit(1);
});
