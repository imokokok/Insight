/**
 * Pyth 预言机价格查询检测脚本
 * 检测所有链上的所有交易对是否能正确获取和显示价格数据
 * 为了避免限速，采用串行查询方式
 */

import { HermesClient } from '@pythnetwork/hermes-client';

// Pyth 价格 Feed ID 配置
const PYTH_PRICE_FEED_IDS = {
  'BTC/USD': 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH/USD': 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'SOL/USD': 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'BNB/USD': '2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
  'XRP/USD': 'ec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8',
  'ADA/USD': '2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d',
  'DOGE/USD': 'dcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c',
  'DOT/USD': 'ca3eed9b267293f6595901c734c7525ce8ef49adafe8284606ceb307afa2ca5b',
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
  'STETH/USD': '846ae1bdb6300b817cee5fdee2a6da192775030db5615b94a465f53bd40850b5',
  'MATIC/USD': 'ffd11c5a1cfd42f80afb2df4d9f264c15f956d68153335374ec10722edd70472',
  'PYTH/USD': '0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff',
  'WBTC/USD': 'c9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33',
  'WETH/USD': '9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6',
  'RETH/USD': 'a0255134973f4fdf2f8f7808354274a3b1ebc6ee438be898d045e8b56ba1fe13',
  'CBETH/USD': '15ecddd26d49e1a8f1de9376ebebc03916ede873447c1255d2d5891b92ce5717',
  '1INCH/USD': '63f341689d98a12ef60a5cff1d7f85c70a9e17bf1575f0e7c0b2512d48b1c8b3',
  'AAVE/USD': '2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445',
  'APE/USD': '15add95022ae13563a11992e727c91bdb6b55bc183d9d747436c80a483d8c864',
  'APT/USD': '03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5',
  'AXS/USD': 'b7e3904c08ddd9c0c10c6d207d390fd19e87eb6aab96304f571ed94caebdefa0',
  'BAL/USD': '07ad7b4a7662d19a6bc675f6b467172d2f3947fa653ca97555a9b20236406628',
  'BCH/USD': '3dd2b63686a450ec7290df3a1e0b583c0481f651351edfa7636f39aed55cf8a3',
  'BLUR/USD': '856aac602516addee497edf6f50d39e8c95ae5fb0da1ed434a8c2ab9c3e877e9',
  'BONK/USD': '72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419',
  'CAKE/USD': '2356af9529a1064d41e32d617e2ce1dca5733afa901daba9e2b68dee5d53ecf9',
  'COMP/USD': '4a8e42861cabc5ecb50996f92e7cfa2bce3fd0a2423b0c44c9b423fb2bd25478',
  'CRV/USD': 'a19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8',
  'CVX/USD': '6aac625e125ada0d2a6b98316493256ca733a5808cd34ccef79b0e28c64d1e76',
  'DYDX/USD': '6489800bb8974169adfe35937bf6736507097d13c190d760c557108c7e93a81b',
  'ENS/USD': 'b98ab6023650bd2edc026b983fb7c2f8fa1020286f1ba6ecf3f4322cd83b72a6',
  'ETC/USD': '7f5cc8d963fc5b3d2ae41fe5685ada89fd4f14b435f8050f28c7fd409f40c2d8',
  'EZETH/USD': '06c217a791f5c4f988b36629af4cb88fad827b2485400a358f3b02886b54de92',
  'FIL/USD': '150ac9b959aee0051e4091f0ef5216d941f590e1c5e7f91cf7635b5c11628c0e',
  'FRAX/USD': '735f591e4fed988cd38df74d8fcedecf2fe8d9111664e0fd500db9aa78b316b1',
  'FRXETH/USD': '29240ee3a9024d107888eb1d4c527216f06bd64cee030c6b5575b1a8d77cb659',
  'GALA/USD': '0781209c28fda797616212b7f94d77af3a01f3e94a5d421760aef020cf2bcb51',
  'GMX/USD': 'b962539d0fcb272a494d65ea56f94851c2bcf8823935da05bd628916e2e9edbf',
  'GRT/USD': '4d1f8dae0d96236fb98e8f47471a366ec3b1732b47041781934ca3a9bb2f35e7',
  'IMX/USD': '941320a8989414874de5aa2fc340a75d5ed91fdff1613dd55f83844d52ea63a2',
  'INJ/USD': '7a5bc1d2b56ad029048cd63964b3ad2776eadf812edc1a43a31406cb54bff592',
  'KAVA/USD': 'a6e905d4e85ab66046def2ef0ce66a7ea2a60871e68ae54aed50ec2fd96d8584',
  'LDO/USD': 'c63e2a7f37a04e5e614c07238bedb25dcc38927fba8fe890597a593c0b2fa4ad',
  'LUSD/USD': 'c9dc99720306ef43fd301396a6f8522c8be89c6c77e8c27d87966918a943fd20',
  'MANA/USD': '1dfffdcbc958d732750f53ff7f06d24bb01364b3f62abea511a390c74b8d16a5',
  'MEME/USD': 'cd2cee36951a571e035db0dfad138e6ecdb06b517cc3373cd7db5d3609b7927c',
  'MNT/USD': '4e3037c822d852d79af3ac80e35eb420ee3b870dca49f9344a38ef4773fb0585',
  'NEAR/USD': 'c415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750',
  'PEPE/USD': 'd69731a2e74ac1ce884fc3890f7ee324b6deb66147055249568869ed700882e4',
  'RPL/USD': '24f94ac0fd8638e3fc41aab2e4df933e63f763351b640bf336a6ec70651c4503',
  'RUNE/USD': '5fcf71143bb70d41af4fa9aa1287e2efd3c5911cee59f909f915c9f61baacb1e',
  'SAND/USD': 'cb7a1d45139117f8d3da0a4b67264579aa905e3b124efede272634f094e1e9d1',
  'SEI/USD': '53614f1cb0c031d4af66c04cb9c756234adad0e1cee85303795091499a4084eb',
  'SHIB/USD': 'f0d57deca57b3da2fe63a493f4c25925fdfd8edf834b20f93e1f84dbd1504d4a',
  'SNX/USD': '39d020f60982ed892abbcd4a06a276a9f9b7bfbce003204c110b6e488f502da3',
  'SUI/USD': '23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744',
  'SUSHI/USD': '26e4f737fde0263a9eea10ae63ac36dcedab2aaf629261a994e1eeb6ee0afe53',
  'THETA/USD': 'ee70804471fe22d029ac2d2b00ea18bbf4fb062958d425e5830fd25bed430345',
  'TIA/USD': '09f7c1d7dfbb7df2b8fe3d3d87ee94a2259d212da4f30c1f0540d066dfa44723',
  'TON/USD': '8963217838ab4cf5cadc172203c1f0b763fbaa45f346d8ee50ba994bbcac3026',
  'TRX/USD': '67aed5a24fdad045475e7195c98a98aea119c763f272d4523f5bac93a4f33c2b',
  'TUSD/USD': '433faaa801ecdb6618e3897177a118b273a8e18cc3ff545aadfc207d58d028f7',
  'WEETH/USD': '9ee4e7c60b940440a261eb54b6d8149c23b580ed7da3139f7f08f4ea29dad395',
  'WIF/USD': '4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc',
  'WSTETH/USD': '6df640f3b8963d8f8358f791f352b8364513f6ab1cca5ed3f1f7b5448980e784',
  'XLM/USD': 'b7a8eba68a997cd0210c2e1e4ee811ad2d174b3611c22d9ebf16f4cb7e9ba850',
  'YFI/USD': '425f4b198ab2504936886c1e93511bb6720fbcf2045a4f3c0723bb213846022f',
};

const HERMES_API_URL = 'https://hermes.pyth.network';

// Pyth 支持的币种列表
const pythSymbols = [
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
  'SUI',
  'SEI',
  'AAVE',
  'SNX',
  'CRV',
  'COMP',
  'YFI',
  'SUSHI',
  '1INCH',
  'BAL',
  'LDO',
  'GMX',
  'DYDX',
  'RPL',
  'ENS',
  'GRT',
  'BLUR',
  'APE',
  'SAND',
  'MANA',
  'AXS',
  'GALA',
  'IMX',
  'THETA',
  'KAVA',
  'RUNE',
  'CAKE',
  'CVX',
  'SHIB',
  'USDC',
  'USDT',
  'DAI',
  'FRAX',
  'LUSD',
  'TUSD',
  'WBTC',
  'WETH',
  'STETH',
  'RETH',
  'CBETH',
  'WSTETH',
  'FRXETH',
  'WEETH',
  'EZETH',
  'PYTH',
  'PEPE',
  'BONK',
  'WIF',
  'MEME',
  'TIA',
  'TON',
  'MNT',
];

// Pyth 可用的链-交易对映射
const PYTH_AVAILABLE_PAIRS = {
  ethereum: [...pythSymbols],
  arbitrum: [...pythSymbols],
  optimism: [...pythSymbols],
  polygon: [...pythSymbols],
  solana: [...pythSymbols],
  avalanche: [...pythSymbols],
  'bnb-chain': [...pythSymbols],
  aptos: [...pythSymbols],
  sui: [...pythSymbols],
  base: [...pythSymbols],
  scroll: [...pythSymbols],
  zksync: [...pythSymbols],
  linea: [...pythSymbols],
  mantle: [...pythSymbols],
  blast: [...pythSymbols],
};

// 延迟函数
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 创建 Hermes 客户端
const hermesClient = new HermesClient(HERMES_API_URL);

// 查询单个价格
async function testSinglePrice(symbol, priceId) {
  const startTime = Date.now();

  try {
    const priceUpdates = await hermesClient.getLatestPriceUpdates([priceId]);

    if (!priceUpdates.parsed || priceUpdates.parsed.length === 0) {
      return {
        symbol,
        priceId,
        success: false,
        latency: Date.now() - startTime,
        error: 'No price data returned',
      };
    }

    const parsed = priceUpdates.parsed[0];

    if (!parsed?.price) {
      return {
        symbol,
        priceId,
        success: false,
        latency: Date.now() - startTime,
        error: 'Invalid price data format',
      };
    }

    const priceValue =
      typeof parsed.price.price === 'string'
        ? parseInt(parsed.price.price, 10)
        : parsed.price.price;
    const exponent = parsed.price.expo ?? -8;
    const price = priceValue * Math.pow(10, exponent);

    const confValue =
      typeof parsed.price.conf === 'string' ? parseInt(parsed.price.conf, 10) : parsed.price.conf;
    const confidence = confValue * Math.pow(10, exponent);

    return {
      symbol,
      priceId,
      success: true,
      price,
      confidence,
      publishTime: new Date((parsed.price.publish_time ?? Date.now() / 1000) * 1000),
      latency: Date.now() - startTime,
    };
  } catch (error) {
    return {
      symbol,
      priceId,
      success: false,
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// 主测试函数
async function runTests() {
  console.log('='.repeat(80));
  console.log('Pyth 预言机价格查询功能检测');
  console.log('='.repeat(80));
  console.log(`\n开始时间: ${new Date().toLocaleString()}`);
  console.log(`Hermes API: ${HERMES_API_URL}`);
  console.log(`\n`);

  const results = [];
  const stats = {
    total: 0,
    success: 0,
    failed: 0,
    byChain: {},
  };

  // 获取所有交易对
  const allSymbols = Object.keys(PYTH_PRICE_FEED_IDS);
  console.log(`总共需要检测 ${allSymbols.length} 个交易对`);
  console.log(`支持 ${Object.keys(PYTH_AVAILABLE_PAIRS).length} 条链`);
  console.log('\n');

  // 对每个交易对进行测试
  for (let i = 0; i < allSymbols.length; i++) {
    const symbol = allSymbols[i];
    const priceId = PYTH_PRICE_FEED_IDS[symbol];

    console.log(`[${i + 1}/${allSymbols.length}] 检测 ${symbol}...`);

    const result = await testSinglePrice(symbol, priceId);
    results.push(result);

    if (result.success) {
      console.log(`  ✓ 成功 - 价格: $${result.price?.toFixed(4)}, 延迟: ${result.latency}ms`);
      stats.success++;
    } else {
      console.log(`  ✗ 失败 - 错误: ${result.error}, 延迟: ${result.latency}ms`);
      stats.failed++;
    }

    stats.total++;

    // 添加延迟以避免限速
    if (i < allSymbols.length - 1) {
      await sleep(500); // 500ms 延迟
    }
  }

  // 按链统计
  console.log('\n' + '='.repeat(80));
  console.log('按链统计结果');
  console.log('='.repeat(80));

  for (const [chain, symbols] of Object.entries(PYTH_AVAILABLE_PAIRS)) {
    const chainResults = results.filter((r) => symbols.some((s) => `${s}/USD` === r.symbol));
    const chainSuccess = chainResults.filter((r) => r.success).length;
    const chainTotal = chainResults.length;

    stats.byChain[chain] = {
      total: chainTotal,
      success: chainSuccess,
      failed: chainTotal - chainSuccess,
    };

    const percentage = chainTotal > 0 ? ((chainSuccess / chainTotal) * 100).toFixed(1) : '0.0';
    console.log(`${chain.padEnd(12)}: ${chainSuccess}/${chainTotal} (${percentage}%)`);
  }

  // 总体统计
  console.log('\n' + '='.repeat(80));
  console.log('总体统计');
  console.log('='.repeat(80));
  console.log(`总交易对数: ${stats.total}`);
  console.log(`成功: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(1)}%)`);
  console.log(`失败: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);

  // 显示失败详情
  if (stats.failed > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('失败的交易对详情');
    console.log('='.repeat(80));

    const failedResults = results.filter((r) => !r.success);
    for (const result of failedResults) {
      console.log(`- ${result.symbol}: ${result.error}`);
    }
  }

  // 显示成功样本
  console.log('\n' + '='.repeat(80));
  console.log('成功样本 (前10个)');
  console.log('='.repeat(80));

  const successResults = results.filter((r) => r.success).slice(0, 10);
  for (const result of successResults) {
    console.log(
      `- ${result.symbol}: $${result.price?.toFixed(4)} ` +
        `(置信区间: ±$${result.confidence?.toFixed(4)}, ` +
        `发布时间: ${result.publishTime?.toLocaleString()})`
    );
  }

  console.log('\n' + '='.repeat(80));
  console.log(`检测完成时间: ${new Date().toLocaleString()}`);
  console.log('='.repeat(80));

  // 返回结果供进一步处理
  return { results, stats };
}

// 运行测试
runTests()
  .then(({ stats }) => {
    process.exit(stats.failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
