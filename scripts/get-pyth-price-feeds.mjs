#!/usr/bin/env node

/**
 * 获取 Pyth 官方支持的所有 Price Feed IDs
 */

const PYTH_API_URL = 'https://hermes.pyth.network/v2/price_feeds';

async function fetchPriceFeeds() {
  console.log('🔍 获取 Pyth 支持的所有价格源...\n');

  try {
    // 获取加密货币价格源
    const response = await fetch(`${PYTH_API_URL}?asset_type=crypto`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const feeds = await response.json();

    console.log(`✅ 获取到 ${feeds.length} 个加密货币价格源\n`);
    console.log('═'.repeat(80));

    const priceFeedIds = {};

    feeds.forEach((feed, index) => {
      const symbol = feed.attributes?.symbol;
      const base = feed.attributes?.base;
      const quote = feed.attributes?.quote;
      const id = feed.id;

      if (symbol) {
        priceFeedIds[symbol] = id;
      }

      if (index < 30) {
        console.log(`${symbol || base}/USD: ${id}`);
      }
    });

    if (feeds.length > 30) {
      console.log(`... 还有 ${feeds.length - 30} 个价格源`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`\n📋 TypeScript 格式的 Price Feed IDs:\n`);
    console.log('export const PYTH_PRICE_FEED_IDS: Record<string, string> = {');

    Object.entries(priceFeedIds).forEach(([symbol, id]) => {
      console.log(`  '${symbol}': '${id}',`);
    });

    console.log('};');

    return priceFeedIds;
  } catch (error) {
    console.error('❌ 获取价格源失败:', error.message);
  }
}

async function verifyPriceFeeds() {
  console.log('\n\n🔍 验证可用的价格源...\n');
  console.log('═'.repeat(60));

  const testFeeds = [
    { symbol: 'BTC/USD', id: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43' },
    { symbol: 'ETH/USD', id: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace' },
    { symbol: 'SOL/USD', id: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d' },
    { symbol: 'BNB/USD', id: '0x2f95862b045670cd22bee3114c39763a44008ef941c0944e65a5696c1ac2d834' },
    { symbol: 'XRP/USD', id: '0x9d5d52d3848ad68d8d40c2c9911e5be8cd1a24b9e3f3c8e50e2e9e3e5a1f3c2' },
    { symbol: 'ADA/USD', id: '0x1d2a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f' },
    { symbol: 'DOGE/USD', id: '0x2e3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3' },
    { symbol: 'DOT/USD', id: '0x3f4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4' },
    { symbol: 'MATIC/USD', id: '0x4a5d6e7f8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4' },
    { symbol: 'LTC/USD', id: '0x5b6e7f8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5' },
  ];

  for (const feed of testFeeds) {
    process.stdout.write(`   ${feed.symbol}: `);

    try {
      const response = await fetch(
        `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feed.id}`
      );

      if (!response.ok) {
        console.log(`❌ HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.parsed && data.parsed.length > 0 && data.parsed[0].price) {
        const priceData = data.parsed[0].price;
        const priceValue =
          typeof priceData.price === 'string' ? parseInt(priceData.price, 10) : priceData.price;
        const exponent = priceData.expo || -8;
        const actualPrice = priceValue * Math.pow(10, exponent);

        console.log(`✅ $${actualPrice.toFixed(2)}`);
      } else {
        console.log(`❌ No price data`);
      }
    } catch (error) {
      console.log(`❌ ${error.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

async function main() {
  await fetchPriceFeeds();
  await verifyPriceFeeds();
}

main().catch(console.error);
