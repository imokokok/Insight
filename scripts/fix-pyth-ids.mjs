#!/usr/bin/env node

/**
 * 从 Pyth 官方 API 获取正确的 Price Feed IDs
 */

async function fetchCorrectPriceFeedIds() {
  console.log('🔍 从 Pyth 官方 API 获取正确的 Price Feed IDs...\n');

  const symbols = [
    'XRP',
    'ADA',
    'DOGE',
    'MATIC',
    'DOT',
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
    'STETH',
  ];

  const correctIds = {};

  try {
    const response = await fetch('https://hermes.pyth.network/v2/price_feeds?asset_type=crypto');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const feeds = await response.json();

    console.log(`✅ 获取到 ${feeds.length} 个价格源\n`);

    for (const symbol of symbols) {
      // 尝试多种匹配方式
      const feed = feeds.find((f) => {
        const attr = f.attributes;
        return (
          attr?.symbol === `${symbol}/USD` ||
          attr?.symbol === symbol ||
          attr?.base === symbol ||
          attr?.asset_type === symbol
        );
      });

      if (feed) {
        correctIds[symbol] = feed.id;
        console.log(`✅ ${symbol}/USD: ${feed.id}`);
      } else {
        console.log(`❌ ${symbol}/USD: 未找到`);
      }
    }

    console.log('\n\n📋 更新后的配置:\n');
    console.log('export const PYTH_PRICE_FEED_IDS: Record<string, string> = {');

    // 添加 BTC, ETH, SOL, BNB（已知的正确 IDs）
    console.log(`  'BTC/USD': 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',`);
    console.log(`  'ETH/USD': 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',`);
    console.log(`  'SOL/USD': 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',`);
    console.log(`  'BNB/USD': '2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',`);

    Object.entries(correctIds).forEach(([symbol, id]) => {
      console.log(`  '${symbol}/USD': '${id}',`);
    });

    console.log('};');

    return correctIds;
  } catch (error) {
    console.error('❌ 获取失败:', error.message);
  }
}

fetchCorrectPriceFeedIds();
