/**
 * 检查API3实际可用的dAPI交易对
 * 遍历所有配置的交易对，测试哪些可以成功获取价格
 */

import { api3NetworkService } from '../src/lib/services/oracle/api3NetworkService';
import { Blockchain } from '../src/types/oracle';

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

console.log(`\n========== API3 dAPI 可用性检查 ==========\n`);
console.log(`总共配置了 ${symbols.length} 个交易对`);
console.log(`测试链: ${TEST_CHAINS.join(', ')}\n`);

interface TestResult {
  symbol: string;
  dapiName: string;
  chain: string;
  available: boolean;
  price?: number;
  error?: string;
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

  try {
    const result = await api3NetworkService.getPrice(symbol, chain);

    if (result) {
      return {
        symbol,
        dapiName: dapiMap[symbol] || `${symbol}/USD`,
        chain,
        available: true,
        price: result.price,
      };
    } else {
      return {
        symbol,
        dapiName: dapiMap[symbol] || `${symbol}/USD`,
        chain,
        available: false,
        error: 'No data returned',
      };
    }
  } catch (error) {
    return {
      symbol,
      dapiName: dapiMap[symbol] || `${symbol}/USD`,
      chain,
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const results: TestResult[] = [];

  // 只测试前10个代币以节省时间
  const testSymbols = symbols.slice(0, 10);

  console.log(`正在测试 ${testSymbols.length} 个代币...\n`);

  for (const symbol of testSymbols) {
    for (const chain of TEST_CHAINS) {
      process.stdout.write(`测试 ${symbol}/${chain}... `);
      const result = await testDAPI(symbol, chain);
      results.push(result);

      if (result.available) {
        console.log(`✅ $${result.price?.toFixed(2)}`);
      } else {
        console.log(`❌ ${result.error}`);
      }

      // 添加小延迟避免请求过快
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // 统计结果
  console.log(`\n========== 测试结果统计 ==========\n`);

  const availableResults = results.filter((r) => r.available);
  const unavailableResults = results.filter((r) => !r.available);

  console.log(`总计测试: ${results.length} 个组合`);
  console.log(`✅ 可用: ${availableResults.length}`);
  console.log(`❌ 不可用: ${unavailableResults.length}\n`);

  // 按链统计
  console.log('按链统计:');
  for (const chain of TEST_CHAINS) {
    const chainResults = results.filter((r) => r.chain === chain);
    const chainAvailable = chainResults.filter((r) => r.available).length;
    console.log(`  ${chain}: ${chainAvailable}/${chainResults.length} 可用`);
  }

  console.log('\n可用的交易对:');
  availableResults.forEach((r) => {
    console.log(`  ✅ ${r.dapiName} on ${r.chain}: $${r.price?.toFixed(2)}`);
  });

  if (unavailableResults.length > 0) {
    console.log('\n不可用的交易对 (前10个):');
    unavailableResults.slice(0, 10).forEach((r) => {
      console.log(`  ❌ ${r.dapiName} on ${r.chain}: ${r.error}`);
    });
  }
}

main().catch(console.error);
