/**
 * 检查所有API3 dAPI交易对的可用性
 */

import { api3NetworkService } from '../src/lib/services/oracle/api3NetworkService';
import { Blockchain } from '../src/types/oracle';
import * as fs from 'fs';
import * as path from 'path';

// 要测试的链
const TEST_CHAINS = [
  Blockchain.ETHEREUM,
  Blockchain.ARBITRUM,
  Blockchain.POLYGON,
  Blockchain.BASE,
  Blockchain.OPTIMISM,
];

// 获取所有支持的代币
const symbols = api3NetworkService.getSupportedSymbols();

interface TestResult {
  symbol: string;
  dapiName: string;
  chain: Blockchain;
  available: boolean;
  hasRealPrice: boolean;
  price: number;
  proxyAddress: string;
}

async function testDAPI(symbol: string, chain: Blockchain): Promise<TestResult> {
  const dapiMap: Record<string, string> = {
    ETH: 'ETH/USD',
    BTC: 'BTC/USD',
    LINK: 'LINK/USD',
    API3: 'API3/USD',
    MATIC: 'MATIC/USD',
    AVAX: 'AVAX/USD',
    BNB: 'BNB/USD',
    ARB: 'ARB/USD',
    OP: 'OP/USD',
    UNI: 'UNI/USD',
    AAVE: 'AAVE/USD',
    BAND: 'BAND/USD',
    PYTH: 'PYTH/USD',
    UMA: 'UMA/USD',
    TRB: 'TRB/USD',
    DIA: 'DIA/USD',
    SOL: 'SOL/USD',
    DOGE: 'DOGE/USD',
    XRP: 'XRP/USD',
    ADA: 'ADA/USD',
    DOT: 'DOT/USD',
    LTC: 'LTC/USD',
    BCH: 'BCH/USD',
    ETC: 'ETC/USD',
    XLM: 'XLM/USD',
    TRX: 'TRX/USD',
    EOS: 'EOS/USD',
    ATOM: 'ATOM/USD',
    ALGO: 'ALGO/USD',
    VET: 'VET/USD',
    NEO: 'NEO/USD',
    QTUM: 'QTUM/USD',
    ZRX: 'ZRX/USD',
    BAT: 'BAT/USD',
    ENJ: 'ENJ/USD',
    MANA: 'MANA/USD',
    SAND: 'SAND/USD',
    CHZ: 'CHZ/USD',
    SHIB: 'SHIB/USD',
    FTM: 'FTM/USD',
    GRT: 'GRT/USD',
    SUSHI: 'SUSHI/USD',
    COMP: 'COMP/USD',
    MKR: 'MKR/USD',
    YFI: 'YFI/USD',
    CRV: 'CRV/USD',
    SNX: 'SNX/USD',
    ZEC: 'ZEC/USD',
    DASH: 'DASH/USD',
    THETA: 'THETA/USD',
    ONT: 'ONT/USD',
    ZIL: 'ZIL/USD',
    KNC: 'KNC/USD',
    LRC: 'LRC/USD',
    STORJ: 'STORJ/USD',
    KAVA: 'KAVA/USD',
    REN: 'REN/USD',
    BAL: 'BAL/USD',
    YFII: 'YFII/USD',
    ANKR: 'ANKR/USD',
    COTI: 'COTI/USD',
    HBAR: 'HBAR/USD',
    OMG: 'OMG/USD',
    NKN: 'NKN/USD',
    SC: 'SC/USD',
    IOST: 'IOST/USD',
    DGB: 'DGB/USD',
    WTC: 'WTC/USD',
    DOCK: 'DOCK/USD',
    WAN: 'WAN/USD',
    FUN: 'FUN/USD',
    CVC: 'CVC/USD',
    MTL: 'MTL/USD',
    BEAM: 'BEAM/USD',
    RVN: 'RVN/USD',
    USDC: 'USDC/USD',
    USDT: 'USDT/USD',
    DAI: 'DAI/USD',
  };

  const dapiName = dapiMap[symbol] || `${symbol}/USD`;

  try {
    const result = await api3NetworkService.getPrice(symbol, chain);

    if (result && result.price > 0) {
      return {
        symbol,
        dapiName,
        chain,
        available: true,
        hasRealPrice: true,
        price: result.price,
        proxyAddress: '',
      };
    } else {
      return {
        symbol,
        dapiName,
        chain,
        available: result !== null,
        hasRealPrice: false,
        price: 0,
        proxyAddress: '',
      };
    }
  } catch (error) {
    return {
      symbol,
      dapiName,
      chain,
      available: false,
      hasRealPrice: false,
      price: 0,
      proxyAddress: '',
    };
  }
}

async function main() {
  const results: TestResult[] = [];
  const totalTests = symbols.length * TEST_CHAINS.length;
  let completed = 0;

  console.log(`\n========== API3 dAPI 完整可用性检查 ==========\n`);
  console.log(
    `总共需要测试: ${symbols.length} 个代币 × ${TEST_CHAINS.length} 条链 = ${totalTests} 个组合\n`
  );

  for (const symbol of symbols) {
    for (const chain of TEST_CHAINS) {
      completed++;
      process.stdout.write(
        `\r进度: ${completed}/${totalTests} (${((completed / totalTests) * 100).toFixed(1)}%) - 测试 ${symbol}/${chain}...`
      );

      const result = await testDAPI(symbol, chain);
      results.push(result);

      // 添加小延迟避免请求过快
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  console.log('\n\n========== 测试结果统计 ==========\n');

  // 统计有实际价格的数据
  const realPriceResults = results.filter((r) => r.hasRealPrice);
  const availableButZero = results.filter((r) => r.available && !r.hasRealPrice);
  const unavailableResults = results.filter((r) => !r.available);

  console.log(`总计测试: ${results.length} 个组合`);
  console.log(`✅ 有实际价格: ${realPriceResults.length}`);
  console.log(`⚠️  可用但价格为0 (未激活): ${availableButZero.length}`);
  console.log(`❌ 不可用: ${unavailableResults.length}\n`);

  // 按链统计有实际价格的
  console.log('按链统计 (有实际价格的):');
  for (const chain of TEST_CHAINS) {
    const chainResults = realPriceResults.filter((r) => r.chain === chain);
    console.log(`  ${chain}: ${chainResults.length} 个活跃dAPI`);
  }

  // 生成可用的链-交易对映射
  const availableByChain: Record<string, string[]> = {};
  for (const chain of TEST_CHAINS) {
    availableByChain[chain] = realPriceResults
      .filter((r) => r.chain === chain)
      .map((r) => r.symbol);
  }

  console.log('\n\n可用的链-交易对组合:\n');
  for (const chain of TEST_CHAINS) {
    const symbols = availableByChain[chain];
    if (symbols.length > 0) {
      console.log(`${chain}:`);
      symbols.forEach((symbol) => {
        const result = realPriceResults.find((r) => r.chain === chain && r.symbol === symbol);
        console.log(`  ✅ ${symbol}/USD: $${result?.price.toFixed(2)}`);
      });
      console.log('');
    }
  }

  // 保存结果到文件
  const outputPath = path.join(__dirname, 'api3-available-dapis.json');
  const output = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      withRealPrice: realPriceResults.length,
      availableButZero: availableButZero.length,
      unavailable: unavailableResults.length,
    },
    availableByChain,
    details: realPriceResults.map((r) => ({
      symbol: r.symbol,
      chain: r.chain,
      price: r.price,
    })),
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n结果已保存到: ${outputPath}`);

  // 生成前端配置
  console.log('\n\n========== 前端配置 ==========\n');
  console.log('const AVAILABLE_API3_PAIRS = ' + JSON.stringify(availableByChain, null, 2) + ';');
}

main().catch(console.error);
