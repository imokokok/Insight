#!/usr/bin/env node

/**
 * 测试修复后的 Pyth 配置
 */

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
  console.log('🔍 测试修复后的 Pyth 配置\n');
  console.log('═'.repeat(60));

  let success = 0;
  let failed = 0;

  for (const [pair, id] of Object.entries(PYTH_IDS)) {
    process.stdout.write(`   ${pair}: `);

    try {
      const response = await fetch(
        `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${id}`
      );

      if (!response.ok) {
        console.log(`❌ HTTP ${response.status}`);
        failed++;
        await new Promise((resolve) => setTimeout(resolve, 500));
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
        success++;
      } else {
        console.log(`❌ No price data`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${error.message}`);
      failed++;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 测试结果:\n`);
  const total = success + failed;
  const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : 0;
  console.log(`   成功: ${success}/${total} (${successRate}%)`);
  console.log(`   失败: ${failed}/${total}`);

  if (successRate === '100.0') {
    console.log('\n✅ 所有 Pyth Price Feed IDs 都正确！');
  } else if (parseFloat(successRate) >= 80) {
    console.log('\n⚠️  大部分 Pyth Price Feed IDs 正确');
  } else {
    console.log('\n❌ 需要检查 Pyth Price Feed IDs 配置');
  }
}

testPyth();
