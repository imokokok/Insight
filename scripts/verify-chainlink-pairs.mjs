#!/usr/bin/env node

import { config } from 'dotenv';
config({ path: '.env.local' });

const DELAY_BETWEEN_TESTS = 500;

const CHAINLINK_AVAILABLE_PAIRS = {
  ethereum: [
    'BTC',
    'ETH',
    'LINK',
    'BNB',
    'SOL',
    'DOGE',
    'MATIC',
    'AVAX',
    'USDT',
    'USDC',
    'DAI',
    'AAVE',
    'MKR',
    'COMP',
    'APE',
    'LDO',
    'YFI',
    '1INCH',
    'FRAX',
    'WBTC',
    'STETH',
  ],
  arbitrum: [
    'BTC',
    'ETH',
    'LINK',
    'BNB',
    'SOL',
    'DOGE',
    'MATIC',
    'AVAX',
    'USDT',
    'USDC',
    'DAI',
    'AAVE',
    'MKR',
    'COMP',
    'APE',
    'LDO',
    'YFI',
    '1INCH',
    'FRAX',
    'WBTC',
    'STETH',
    'SHIB',
    'UNI',
    'NEAR',
    'APT',
    'ARB',
    'OP',
    'SNX',
    'CRV',
    'SUSHI',
    'GMX',
    'GRT',
    'AXS',
    'INJ',
    'SUI',
    'SEI',
    'TIA',
    'TON',
    'PEPE',
    'WIF',
    'LUSD',
    'MNT',
    'RPL',
    'CVX',
    'CAKE',
    'BONK',
  ],
  polygon: ['BTC', 'ETH', 'LINK', 'MATIC', 'USDT', 'USDC', 'DAI'],
  base: ['BTC', 'ETH', 'LINK', 'USDT', 'USDC', 'DAI'],
  avalanche: ['BTC', 'ETH', 'LINK', 'AVAX', 'USDT', 'USDC', 'DAI'],
  'bnb-chain': ['BTC', 'ETH', 'LINK', 'BNB', 'USDT', 'USDC', 'DAI'],
  optimism: ['BTC', 'ETH', 'LINK', 'OP', 'USDT', 'USDC', 'DAI'],
};

const CHAIN_IDS = {
  ethereum: 1,
  arbitrum: 42161,
  polygon: 137,
  base: 8453,
  avalanche: 43114,
  'bnb-chain': 56,
  optimism: 10,
};

const CHAINLINK_PRICE_FEEDS = {
  ETH: {
    1: { address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', decimals: 8 },
    42161: { address: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612', decimals: 8 },
    137: { address: '0xF9680D99D6C9589e2a93a78A04A279e509205945', decimals: 8 },
    8453: { address: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70', decimals: 8 },
    43114: { address: '0x976b3d034e162d8bd72d6b9c989d545b839003b0', decimals: 8 },
    56: { address: '0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e', decimals: 8 },
    10: { address: '0x13e3Ee699D1909E989722E753853AE30b17e08c5', decimals: 8 },
  },
  BTC: {
    1: { address: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c', decimals: 8 },
    42161: { address: '0x6ce185860a4963106506C203335A2910413708e9', decimals: 8 },
    137: { address: '0xc907e116054ad103354f2d350fd2514433d57f6f', decimals: 8 },
    8453: { address: '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848f', decimals: 8 },
    43114: { address: '0x2779D32d5196c3C70aFc7189d76Ca6f99B2B8e7D', decimals: 8 },
    56: { address: '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf', decimals: 8 },
    10: { address: '0xD702DD976Fb76Fffc2D3963D037dfDae5b04E593', decimals: 8 },
  },
  LINK: {
    1: { address: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c', decimals: 8 },
    42161: { address: '0x86E53CF1B870786351Da77A57575e79CB55812CB', decimals: 8 },
    137: { address: '0xd9FFdb71EbE7496cC440152d43986Aae0AB76665', decimals: 8 },
    8453: { address: '0x6b6C7139B4817185eAB5E1da0C09eEf74c7576f1', decimals: 8 },
    43114: { address: '0x1b8a25F73c9420dD507406C3A3816A276b62f56a', decimals: 8 },
    56: { address: '0x1B329402Cb1825C6F30A0d92aB9E2862BE47333f', decimals: 8 },
    10: { address: '0xCc232dcFAA0B0C57f147E7D5a3f2DdC1f4B8928b', decimals: 8 },
  },
  USDC: {
    1: { address: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6', decimals: 8 },
    42161: { address: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3', decimals: 8 },
  },
  USDT: {
    1: { address: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D', decimals: 8 },
    42161: { address: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7', decimals: 8 },
  },
  DAI: {
    1: { address: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9', decimals: 8 },
    42161: { address: '0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB', decimals: 8 },
  },
  MATIC: {
    137: { address: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0', decimals: 8 },
    1: { address: '0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676', decimals: 8 },
  },
  AVAX: {
    43114: { address: '0x0FCAa9c899EC5A91eBc3D5Dd869De833b06fB046', decimals: 8 },
    1: { address: '0xFF3EEb22B5E3dE6e705b44749C2559d704923FD7', decimals: 8 },
  },
  BNB: {
    56: { address: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE', decimals: 8 },
    1: { address: '0x14e613AC84a61f71ce32C3c567E5Ec1f7Ee4A7eE', decimals: 8 },
  },
  SOL: {
    1: { address: '0x4ffC43a60e009B551865A93d232e33DceFb3f5E9', decimals: 8 },
    42161: { address: '0x24ceA4b8ce57cdA5058b924B9B9987992450590c', decimals: 8 },
  },
  DOGE: {
    1: { address: '0x2465CefD3b9980CBFcF6d25D059475BbB28f4A08', decimals: 8 },
    42161: { address: '0x9A7FB1b3950837a8D9b40517626E11D4127C098C', decimals: 8 },
  },
  AAVE: {
    1: { address: '0x547a514d5e3769680Ce22B2361c10Ea13619e8a9', decimals: 8 },
    42161: { address: '0xaD1d5344AaDE45F43E596773Bcc4c423EAbdD034', decimals: 8 },
  },
  MKR: {
    1: { address: '0xec1D98BbcA15f46B7D1175B65C07D2C1cB6270B1', decimals: 8 },
    42161: { address: '0xdE9f0894670c4EFcacF370426F10C3AD2Cdf147e', decimals: 8 },
  },
  COMP: {
    1: { address: '0x1B39Eeee5b20548Da7F88D9F6BBb39D9C5d9E30D', decimals: 8 },
    42161: { address: '0xe7C53FFd03Eb6ceF7d208bC4C13446c76d1E5884', decimals: 8 },
  },
  APE: {
    1: { address: '0xD10aBbC76679a20055E167BB80A24ac851b37056', decimals: 8 },
    42161: { address: '0x221912ce795669f628c51c69b7d0873eDA9C03bB', decimals: 8 },
  },
  LDO: {
    1: { address: '0x4e844125952D32AcdF339BE976c98E22F6F318dB', decimals: 8 },
    42161: { address: '0xA43A34030088E6510FecCFb77E88ee5e7ed0fE64', decimals: 8 },
  },
  YFI: {
    1: { address: '0xA027702dbb89fBd58938e4324ac03758dA1d4E99', decimals: 8 },
    42161: { address: '0x745Ab5b69E01E2BE1104Ca84937Bb71f96f5fB21', decimals: 8 },
  },
  '1INCH': {
    1: { address: '0xc929ad75B72593967DE83E7F7Cda0493458261D9', decimals: 8 },
    42161: { address: '0x4bC735Ef24bf286983024CAd5D03f0738865Aaef', decimals: 8 },
  },
  FRAX: {
    1: { address: '0xB9E1E3A921Ff61E6B25bD404De68f5cFBC8E6f29', decimals: 8 },
    42161: { address: '0x0809E3d38d1B4214958faf06D8b1B1a2b73f2ab8', decimals: 8 },
  },
  WBTC: {
    1: { address: '0xfdFD9C85aD200c506Cf9e21F1FD8dd01932FBB23', decimals: 8 },
    42161: { address: '0xd0C7101eACbB49F3deCcCc166d238410D6D46d57', decimals: 8 },
  },
  STETH: {
    1: { address: '0xCfE54B5cD566aB89272946F602D76Ea879CAb4a8', decimals: 8 },
    42161: { address: '0x07C5b924399cc23c24a95c8743DE4006a32b7f2a', decimals: 8 },
  },
  SHIB: {
    42161: { address: '0x0E278D14B4bf6429dDB0a1B353e2Ae8A4e128C93', decimals: 8 },
  },
  UNI: {
    42161: { address: '0x9C917083fDb403ab5ADbEC26Ee294f6EcAda2720', decimals: 8 },
  },
  NEAR: {
    42161: { address: '0xBF5C3fB2633e924598A46B9D07a174a9DBcF57C0', decimals: 8 },
  },
  APT: {
    42161: { address: '0xdc49F292ad1bb3DAb6C11363d74ED06F38b9bd9C', decimals: 8 },
  },
  ARB: {
    42161: { address: '0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6', decimals: 8 },
  },
  OP: {
    42161: { address: '0x205aaD468a11fd5D34fA7211bC6Bad5b3deB9b98', decimals: 8 },
  },
  SNX: {
    42161: { address: '0x054296f0D036b95531B4E14aFB578B80CFb41252', decimals: 8 },
  },
  CRV: {
    42161: { address: '0xaebDA2c976cfd1eE1977Eac079B4382acb849325', decimals: 8 },
  },
  SUSHI: {
    42161: { address: '0xb2A8BA74cbca38508BA1632761b56C897060147C', decimals: 8 },
  },
  GMX: {
    42161: { address: '0xDB98056FecFff59D032aB628337A4887110df3dB', decimals: 8 },
  },
  GRT: {
    42161: { address: '0x0F38D86FceF4955B705F35c9e41d1A16e0637c73', decimals: 8 },
  },
  AXS: {
    42161: { address: '0x5B58aA6E0651Ae311864876A55411F481aD86080', decimals: 8 },
  },
  INJ: {
    42161: { address: '0x6aCcBB82aF71B8a576B4C05D4aF92A83A035B991', decimals: 8 },
  },
  SUI: {
    42161: { address: '0x4a85B128EBDaFC24d5CB611e161376ffDECeB289', decimals: 8 },
  },
  SEI: {
    42161: { address: '0xCc9742d77622eE9abBF1Df03530594f9097bDcB3', decimals: 8 },
  },
  TIA: {
    42161: { address: '0x4096b9bfB4c34497B7a3939D4f629cf65EBf5634', decimals: 8 },
  },
  TON: {
    42161: { address: '0x0301e5D0A8f7490444ebd1921E3d0f0fe7722786', decimals: 8 },
  },
  PEPE: {
    42161: { address: '0x02DEd5a7EDDA750E3Eb240b54437a54d57b74dBE', decimals: 8 },
  },
  WIF: {
    42161: { address: '0xF7Ee427318d2Bd0EEd3c63382D0d52Ad8A68f90D', decimals: 8 },
  },
  LUSD: {
    42161: { address: '0x0411D28c94d85A36bC72Cb0f875dfA8371D8fFfF', decimals: 8 },
  },
  MNT: {
    42161: { address: '0x37DDEE84dE03d039e1Bf809b7a01EDd2c4665771', decimals: 8 },
  },
  RPL: {
    42161: { address: '0xF0b7159BbFc341Cc41E7Cb182216F62c6d40533D', decimals: 8 },
  },
  CVX: {
    42161: { address: '0x851175a919f36c8e30197c09a9A49dA932c2CC00', decimals: 8 },
  },
  CAKE: {
    42161: { address: '0x256654437f1ADA8057684b18d742eFD14034C400', decimals: 8 },
  },
  BONK: {
    42161: { address: '0x3d9145b5804E13Bc14d19c3DDbd3DA8fD02b5034', decimals: 8 },
  },
};

const RPC_ENDPOINTS = {
  1: [
    process.env.ALCHEMY_ETHEREUM_RPC,
    'https://eth.llamarpc.com',
    'https://ethereum.publicnode.com',
  ].filter(Boolean),
  42161: [
    process.env.ALCHEMY_ARBITRUM_RPC,
    'https://arb1.arbitrum.io/rpc',
    'https://arbitrum.publicnode.com',
  ].filter(Boolean),
  137: [
    process.env.ALCHEMY_POLYGON_RPC,
    'https://polygon-rpc.com',
    'https://polygon.publicnode.com',
  ].filter(Boolean),
  8453: [
    process.env.ALCHEMY_BASE_RPC,
    'https://mainnet.base.org',
    'https://base.publicnode.com',
  ].filter(Boolean),
  43114: [
    process.env.ALCHEMY_AVALANCHE_RPC,
    'https://api.avax.network/ext/bc/C/rpc',
    'https://avalanche.publicnode.com',
  ].filter(Boolean),
  56: [
    process.env.ALCHEMY_BNB_RPC,
    'https://bsc-dataseed.binance.org',
    'https://bsc.publicnode.com',
  ].filter(Boolean),
  10: [
    process.env.ALCHEMY_OPTIMISM_RPC,
    'https://mainnet.optimism.io',
    'https://optimism.publicnode.com',
  ].filter(Boolean),
};

let requestId = 0;

async function rpcCall(chainId, method, params) {
  const endpoints = RPC_ENDPOINTS[chainId];
  if (!endpoints || endpoints.length === 0) {
    throw new Error(`No RPC endpoints for chain ${chainId}`);
  }

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: ++requestId,
          method,
          params,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        continue;
      }

      const data = await response.json();

      if (data.error) {
        continue;
      }

      return data.result;
    } catch (error) {
      continue;
    }
  }

  throw new Error(`All RPC endpoints failed for chain ${chainId}`);
}

async function getChainlinkPrice(symbol, chainId) {
  const feed = CHAINLINK_PRICE_FEEDS[symbol]?.[chainId];
  if (!feed) {
    return { success: false, error: 'No price feed found' };
  }

  try {
    const roundData = await rpcCall(chainId, 'eth_call', [
      {
        to: feed.address,
        data: '0xfeaf968c',
      },
      'latest',
    ]);

    if (!roundData || roundData === '0x') {
      return { success: false, error: 'Empty response' };
    }

    const cleanData = roundData.startsWith('0x') ? roundData.slice(2) : roundData;

    if (cleanData.length < 320) {
      return { success: false, error: 'Invalid data length' };
    }

    const answer = BigInt('0x' + cleanData.slice(64, 128));
    const updatedAt = BigInt('0x' + cleanData.slice(192, 256));

    const rawStr = answer.toString();
    let price;
    if (rawStr.length > feed.decimals) {
      const intPart = rawStr.slice(0, rawStr.length - feed.decimals) || '0';
      const decPart = rawStr.slice(rawStr.length - feed.decimals);
      price = parseFloat(`${intPart}.${decPart}`);
    } else {
      const paddedDec = rawStr.padStart(feed.decimals, '0');
      price = parseFloat(`0.${paddedDec}`);
    }

    if (price <= 0) {
      return { success: false, error: 'Invalid price (0 or negative)' };
    }

    const timestamp = Number(updatedAt) * 1000;
    const now = Date.now();
    const age = Math.floor((now - timestamp) / 1000 / 60);

    return {
      success: true,
      price,
      timestamp,
      age,
      decimals: feed.decimals,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 开始验证 Chainlink 预言机所有支持的交易对...\n');
  console.log('📊 测试配置:');
  console.log(`   - 支持的链数量: ${Object.keys(CHAINLINK_AVAILABLE_PAIRS).length}`);
  console.log(`   - 延迟间隔: ${DELAY_BETWEEN_TESTS}ms\n`);

  const results = {
    total: 0,
    success: 0,
    failed: 0,
    byChain: {},
    errors: [],
    prices: [],
  };

  const startTime = Date.now();

  for (const [chainName, symbols] of Object.entries(CHAINLINK_AVAILABLE_PAIRS)) {
    const chainId = CHAIN_IDS[chainName];
    results.byChain[chainName] = {
      total: symbols.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    console.log(`\n🔗 ${chainName.toUpperCase()} (Chain ID: ${chainId})`);
    console.log('─'.repeat(60));

    for (const symbol of symbols) {
      results.total++;
      process.stdout.write(`   ${symbol.padEnd(8)}: `);

      const result = await getChainlinkPrice(symbol, chainId);

      if (result.success) {
        results.success++;
        results.byChain[chainName].success++;
        results.prices.push({
          chain: chainName,
          symbol,
          price: result.price,
          age: result.age,
        });

        const ageStr =
          result.age < 60 ? `${result.age}分钟前` : `${Math.floor(result.age / 60)}小时前`;
        console.log(`✅ $${result.price.toFixed(result.price < 1 ? 6 : 2)} (${ageStr})`);
      } else {
        results.failed++;
        results.byChain[chainName].failed++;
        results.byChain[chainName].errors.push({ symbol, error: result.error });
        results.errors.push({ chain: chainName, symbol, error: result.error });
        console.log(`❌ ${result.error}`);
      }

      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_TESTS));
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('  验证结果汇总');
  console.log('='.repeat(60));

  console.log('\n📊 各链数据获取成功率:\n');
  for (const [chainName, chainData] of Object.entries(results.byChain)) {
    const total = chainData.success + chainData.failed;
    const successRate = total > 0 ? ((chainData.success / total) * 100).toFixed(1) : 0;
    const bar =
      '█'.repeat(Math.floor(successRate / 5)) + '░'.repeat(20 - Math.floor(successRate / 5));
    console.log(
      `   ${chainName.padEnd(12)} [${bar}] ${successRate}% (${chainData.success}/${total})`
    );
  }

  const overallSuccessRate =
    results.total > 0 ? ((results.success / results.total) * 100).toFixed(1) : 0;
  const bar =
    '█'.repeat(Math.floor(overallSuccessRate / 5)) +
    '░'.repeat(20 - Math.floor(overallSuccessRate / 5));

  console.log('\n📈 总体统计:\n');
  console.log(`   总测试数: ${results.total}`);
  console.log(`   成功: ${results.success} ✅`);
  console.log(`   失败: ${results.failed} ❌`);
  console.log(`   成功率: [${bar}] ${overallSuccessRate}%`);
  console.log(`   耗时: ${totalTime}秒`);

  if (results.errors.length > 0) {
    console.log('\n⚠️  失败的交易对详情:\n');
    for (const [chainName, chainData] of Object.entries(results.byChain)) {
      if (chainData.errors.length > 0) {
        console.log(`   ${chainName}:`);
        chainData.errors.forEach(({ symbol, error }) => {
          console.log(`      - ${symbol}: ${error}`);
        });
      }
    }
  }

  console.log('\n✅ 成功获取的价格示例 (前10个):\n');
  results.prices.slice(0, 10).forEach(({ chain, symbol, price, age }) => {
    const ageStr = age < 60 ? `${age}分钟前` : `${Math.floor(age / 60)}小时前`;
    console.log(`   ${chain}/${symbol}: $${price.toFixed(price < 1 ? 6 : 2)} (${ageStr})`);
  });

  console.log('\n💡 建议:\n');
  if (overallSuccessRate >= 95) {
    console.log('   ✅ Chainlink 数据获取功能优秀，几乎所有交易对都能正常获取数据');
  } else if (overallSuccessRate >= 80) {
    console.log('   ⚠️  大部分交易对可以正常获取数据，但有少量失败');
    console.log('   建议检查失败的交易对是否真的在链上不可用');
  } else {
    console.log('   ❌ 大量交易对数据获取失败，需要检查:');
    console.log('   1. RPC 端点配置是否正确');
    console.log('   2. 合约地址是否正确');
    console.log('   3. 网络连接是否正常');
  }

  console.log('\n📝 结论:\n');
  console.log(
    `   Chainlink 在 ${Object.keys(CHAINLINK_AVAILABLE_PAIRS).length} 条链上支持 ${results.total} 个交易对`
  );
  console.log(`   成功获取 ${results.success} 个交易对的价格数据 (${overallSuccessRate}%)`);
  console.log(`   失败 ${results.failed} 个交易对\n`);

  if (results.failed > 0) {
    console.log('   失败的交易对可能原因:');
    console.log('   1. 该交易对在指定链上确实没有 Chainlink 价格源');
    console.log('   2. 合约地址配置错误');
    console.log('   3. RPC 节点暂时不可用\n');
  }
}

main().catch((error) => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
