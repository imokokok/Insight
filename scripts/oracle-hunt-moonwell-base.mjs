/* eslint-disable no-console */
/**
 * Oracle config flaw hunt — Moonwell (Base) passive scan, v1.
 *
 * 被动读链（零交易、零状态修改），对 Moonwell Base 市场全部 mToken 执行四项检查：
 *   ① 协议实际引用的 feed 地址（从 Chainlink Oracle 合约注册表读取）
 *   ② feed 健康度：最新轮时间戳陈旧度 + 心跳间隔估计
 *   ③ 操纵成本杠杆：存入/cap 价值 ÷ DEX 池流动性深度
 *   ④ feed 币对/精度与 token 合理性（description 与 symbol 匹配、decimals 校验）
 *
 * Run:
 *   node --env-file=.env.local scripts/oracle-hunt-moonwell-base.mjs
 *
 * Output: stdout table + /tmp/oracle-hunt-moonwell-base.json (raw data)
 */
import {
  createPublicClient,
  http,
  getAddress,
  encodeFunctionData,
  decodeFunctionResult,
} from 'viem';
import { base } from 'viem/chains';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import fs from 'node:fs';

// DexScreener 需走 ClashX 代理
if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  setGlobalDispatcher(new ProxyAgent(process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY));
}

const RPC = process.env.ALCHEMY_BASE_RPC;
if (!RPC) throw new Error('ALCHEMY_BASE_RPC missing');

const COMPTROLLER = getAddress('0xfBb21d0380beE3312B33c4353c8936a0F13EF26C');
const ORACLE = getAddress('0xEC942bE8A8114bFD0396A5052c36027f2cA6a9d0');

const client = createPublicClient({ chain: base, transport: http(RPC, { timeout: 20_000 }) });

const RETRIES = 4;
async function ethCall(address, abi, fn, args = []) {
  let lastErr;
  for (let i = 0; i < RETRIES; i++) {
    try {
      const data = encodeFunctionData({ abi, functionName: fn, args });
      const res = await client.call({ to: address, data });
      return decodeFunctionResult({ abi, functionName: fn, args, data: res.data });
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message ?? err);
      if (msg.includes('revert') || msg.includes('execution reverted')) throw err; // 不重试 revert
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastErr;
}

const abiCall = (sig) => {
  const abis = {
    getAllMarkets: {
      name: 'getAllMarkets',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'address[]' }],
    },
    markets2: {
      name: 'markets',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'address' }],
      outputs: [
        { type: 'bool', name: 'isListed' },
        { type: 'uint256', name: 'collateralFactorMantissa' },
      ],
    },
    markets3: {
      name: 'markets',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'address' }],
      outputs: [
        { type: 'bool', name: 'isListed' },
        { type: 'uint256', name: 'collateralFactorMantissa' },
        { type: 'bool', name: 'isComped' },
      ],
    },
    supplyCaps: {
      name: 'supplyCaps',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'address' }],
      outputs: [{ type: 'uint256' }],
    },
    marketSupplyCaps: {
      name: 'marketSupplyCaps',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'address' }],
      outputs: [{ type: 'uint256' }],
    },
    underlying: {
      name: 'underlying',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'address' }],
    },
    symbol: {
      name: 'symbol',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'string' }],
    },
    decimals: {
      name: 'decimals',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint8' }],
    },
    totalSupply: {
      name: 'totalSupply',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint256' }],
    },
    exchangeRateStored: {
      name: 'exchangeRateStored',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint256' }],
    },
    getUnderlyingPrice: {
      name: 'getUnderlyingPrice',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'address' }],
      outputs: [{ type: 'uint256' }],
    },
    // feed 注册表候选（Sourcify 验证 ABI 确认：getFeed(string)）
    getFeed_str: {
      name: 'getFeed',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'string' }],
      outputs: [{ type: 'address' }],
    },
    priceFeeds_str: {
      name: 'priceFeeds',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'string' }],
      outputs: [{ type: 'address' }],
    },
    feeds_str: {
      name: 'feeds',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'string' }],
      outputs: [{ type: 'address' }],
    },
    mintGuardianPaused: {
      name: 'mintGuardianPaused',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'address' }],
      outputs: [{ type: 'bool' }],
    },
    latestRoundData: {
      name: 'latestRoundData',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [
        { type: 'uint80', name: 'roundId' },
        { type: 'int256', name: 'answer' },
        { type: 'uint256', name: 'startedAt' },
        { type: 'uint256', name: 'updatedAt' },
        { type: 'uint80', name: 'answeredInRound' },
      ],
    },
    getRoundData: {
      name: 'getRoundData',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'uint80' }],
      outputs: [
        { type: 'uint80', name: 'roundId' },
        { type: 'int256', name: 'answer' },
        { type: 'uint256', name: 'startedAt' },
        { type: 'uint256', name: 'updatedAt' },
        { type: 'uint80', name: 'answeredInRound' },
      ],
    },
    description: {
      name: 'description',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'string' }],
    },
  };
  return [abis[sig]];
};

const ZERO = '0x0000000000000000000000000000000000000000';

const blockNumber = await client.getBlockNumber();
const blockTime = (await client.getBlock({ blockNumber })).timestamp;
console.log(
  `[scan] block=${blockNumber} ts=${blockTime} (${new Date(Number(blockTime) * 1000).toISOString()})`
);

const mTokens = await ethCall(COMPTROLLER, abiCall('getAllMarkets'), 'getAllMarkets');
console.log(`[scan] markets=${mTokens.length}`);

// ---- 市场元数据先采一轮（探测 feed 注册表需要 symbol）----
const baseInfo = new Map();
for (const mt of mTokens) {
  const info = { mToken: mt };
  try {
    info.underlying = await ethCall(mt, abiCall('underlying'), 'underlying');
  } catch {
    info.underlying = null;
  }
  try {
    info.mtSymbol = await ethCall(mt, abiCall('symbol'), 'symbol');
  } catch {
    info.mtSymbol = null;
  }
  if (info.underlying) {
    try {
      info.tokSymbol = await ethCall(info.underlying, abiCall('symbol'), 'symbol');
    } catch {
      info.tokSymbol = null;
    }
    try {
      info.tokDecimals = Number(await ethCall(info.underlying, abiCall('decimals'), 'decimals'));
    } catch {
      info.tokDecimals = null;
    }
  }
  baseInfo.set(mt, info);
}

// ---- 探测 feed 注册表 getter ----
const MAMO_MTOKEN = getAddress('0x2F90Bb22eB3979f5FfAd31EA6C3F0792ca66dA32');
const mamTok = baseInfo.get(MAMO_MTOKEN) ?? {};

async function tryFeed(sigAbi, sigName, keyKind, key) {
  try {
    const feed = await ethCall(ORACLE, sigAbi, sigName, [key]);
    return feed && getAddress(feed) !== ZERO ? getAddress(feed) : null;
  } catch {
    return null;
  }
}

// ---- 探测 feed 注册表：getFeed(string) + oracle 价格一致性验证 ----
// （不要求等于事故旧地址——协议可换 feed；验证标准是 getFeed 结果与 oracle 报价一致）
let feedGetter = null;
{
  const feed = await tryFeed(
    abiCall('getFeed_str'),
    'getFeed',
    'probe',
    mamTok.tokSymbol ?? 'MAMO'
  );
  if (feed) {
    try {
      const [p, dec, latest] = await Promise.all([
        ethCall(ORACLE, abiCall('getUnderlyingPrice'), 'getUnderlyingPrice', [MAMO_MTOKEN]),
        ethCall(feed, abiCall('decimals'), 'decimals'),
        ethCall(feed, abiCall('latestRoundData'), 'latestRoundData'),
      ]);
      const oraclePrice = Number(p) / 10 ** (36 - (mamTok.tokDecimals ?? 18));
      const feedPrice = Number(latest[1]) / 10 ** Number(dec);
      const rel = Math.abs(feedPrice - oraclePrice) / oraclePrice;
      const desc = await ethCall(feed, abiCall('description'), 'description').catch(() => 'N/A');
      console.log(
        `[probe] getFeed("${mamTok.tokSymbol}") → ${feed} desc="${desc}" oracle=${oraclePrice} feed=${feedPrice} relDiff=${(rel * 100).toFixed(3)}% ${rel < 0.2 ? '✅ 一致，接受 getFeed 作为注册表' : '⚠️ 不一致，放弃'}`
      );
      if (rel < 0.2)
        feedGetter = { sig: 'getFeed', abiSig: 'getFeed_str', keyKind: 'str:tokSymbol' };
    } catch (e) {
      console.log('[probe] getFeed validation failed:', String(e.message).slice(0, 100));
    }
  } else {
    console.log('[probe] getFeed("MAMO") returned nothing');
  }
}
if (!feedGetter)
  console.log('[probe] no registry getter validated — falling back to price-only checks');

// ---- 逐市场采集 ----
const rows = [];
for (const mt of mTokens) {
  const info = baseInfo.get(mt);
  const row = { mToken: mt, ...info, flags: [] };

  // markets(): 实现合约 ABI 为 2 输出 (isListed, collateralFactorMantissa)
  // viem decodeFunctionResult 对多输出返回数组，命名取值不可靠——做数组/对象双兼容
  let marketInfo = null;
  try {
    marketInfo = await ethCall(COMPTROLLER, abiCall('markets2'), 'markets', [mt]);
  } catch {
    try {
      marketInfo = await ethCall(COMPTROLLER, abiCall('markets3'), 'markets', [mt]);
    } catch {
      row.flags.push('MARKETS_FAIL');
    }
  }
  if (marketInfo) {
    const arr = Array.isArray(marketInfo);
    row.isListed = arr ? marketInfo[0] : marketInfo.isListed;
    const cfm = arr ? marketInfo[1] : marketInfo.collateralFactorMantissa;
    row.collateralFactor = cfm != null ? Number(cfm) / 1e18 : null;
  }
  try {
    row.mintPaused = await ethCall(
      COMPTROLLER,
      abiCall('mintGuardianPaused'),
      'mintGuardianPaused',
      [mt]
    );
  } catch {
    row.mintPaused = null;
  }

  // supply cap 候选；失败则退回实际存入价值
  row.supplyCapRaw = null;
  for (const capFn of ['supplyCaps', 'marketSupplyCaps']) {
    try {
      row.supplyCapRaw = (await ethCall(COMPTROLLER, abiCall(capFn), capFn, [mt])).toString();
      break;
    } catch {
      /* next */
    }
  }

  // oracle 报价（mantissa = 36 - underlyingDecimals，已用 USDC/cbBTC/wstETH/MAMO 验证）——供后续交叉验证与杠杆计算
  try {
    const p = await ethCall(ORACLE, abiCall('getUnderlyingPrice'), 'getUnderlyingPrice', [mt]);
    row.oraclePriceRaw = p.toString();
    row.price = Number(p) / 10 ** (36 - (row.tokDecimals ?? 18));
  } catch {
    row.flags.push('ORACLE_PRICE_FAIL');
  }

  // ① feed 地址（getFeed(string)，symbol 候选：underlying / mToken / m+underlying）
  if (feedGetter) {
    const candidates = [
      ...new Set(
        [row.tokSymbol, row.mtSymbol, row.tokSymbol ? `m${row.tokSymbol}` : null].filter(Boolean)
      ),
    ];
    for (const key of candidates) {
      row.feed = await tryFeed(abiCall(feedGetter.abiSig), feedGetter.sig, feedGetter.keyKind, key);
      if (row.feed) {
        row.feedKey = key;
        break;
      }
    }
    if (!row.feed) row.flags.push('NO_FEED_REGISTERED');
  }

  // ②④ feed 健康度与币对合理性
  if (row.feed) {
    row.feedDecimals = await ethCall(row.feed, abiCall('decimals'), 'decimals').catch(() => null);
    const descRes = await ethCall(row.feed, abiCall('description'), 'description').catch(
      () => null
    );
    row.feedDescription = descRes ?? 'N/A';
    if (descRes === null) row.flags.push('CUSTOM_FEED(description revert)');
    try {
      const latest = await ethCall(row.feed, abiCall('latestRoundData'), 'latestRoundData');
      // viem 多输出返回数组：[roundId, answer, startedAt, updatedAt, answeredInRound]
      const roundId = latest[0];
      const answer = latest[1];
      const updatedAt = latest[3];
      row.latestPriceRaw = answer.toString();
      row.latestUpdatedAt = Number(updatedAt);
      row.ageSec = Number(blockTime) - row.latestUpdatedAt;
      if (updatedAt === 0n) row.flags.push('ZERO_ROUND(updatedAt=0)');
      else if (row.ageSec > 86400) row.flags.push(`STALE(${Math.round(row.ageSec / 3600)}h)`);
      else if (row.ageSec > 7200) row.flags.push(`AGING(${Math.round(row.ageSec / 60)}min)`);
      if (roundId > 0n) {
        try {
          const prev = await ethCall(row.feed, abiCall('getRoundData'), 'getRoundData', [
            roundId - 1n,
          ]);
          if (prev[3] > 0n && updatedAt > prev[3]) {
            row.heartbeatSec = row.latestUpdatedAt - Number(prev[3]);
          }
        } catch {
          /* 旧 phase 零轮忽略 */
        }
      }
      // feed 报价 vs oracle 报价交叉验证
      if (row.price != null && row.feedDecimals != null && Number(answer) !== 0) {
        const feedPrice = Number(answer) / 10 ** Number(row.feedDecimals);
        const rel = Math.abs(feedPrice - row.price) / row.price;
        row.feedVsOracleRelDiff = rel;
        if (rel > 0.2)
          row.flags.push(
            `FEED_PRICE_MISMATCH(feed=${feedPrice.toPrecision(6)} vs oracle=${row.price.toPrecision(6)}, ${(rel * 100).toFixed(1)}%)`
          );
      }
    } catch (e) {
      row.flags.push(`LATEST_ROUND_FAIL:${String(e.message).slice(0, 60)}`);
    }
  }

  // ③ 操纵杠杆：capValue（或存入价值）÷ DEX 流动性（价格已在上方读取）
  const price = row.price ?? null;
  if (price != null && row.supplyCapRaw && Number(row.supplyCapRaw) > 1) {
    row.capValueUsd = (Number(row.supplyCapRaw) / 10 ** (row.tokDecimals ?? 18)) * price;
    if (row.capValueUsd < 1) row.capValueUsd = 0; // cap 形同虚设
  }
  try {
    const [ts, er] = await Promise.all([
      ethCall(mt, abiCall('totalSupply'), 'totalSupply'),
      ethCall(mt, abiCall('exchangeRateStored'), 'exchangeRateStored').catch(() => null),
    ]);
    row.totalSupplyRaw = ts.toString();
    if (er) {
      // exchangeRateStored: underlying per mToken, scaled 1e18（V2 语义）
      row.suppliedUnderlying = (Number(ts) * Number(er)) / 1e18; // in underlying units
      row.suppliedValueUsd = (row.suppliedUnderlying / 10 ** (row.tokDecimals ?? 18)) * price;
    }
  } catch {
    row.flags.push('SUPPLY_READ_FAIL');
  }

  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${row.underlying}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const j = await res.json();
      const pairs = (j.pairs ?? []).filter(
        (p) => p.chainId === 'base' && typeof p.liquidity?.usd === 'number'
      );
      row.dexLiquidityTop = pairs.length ? Math.max(...pairs.map((p) => p.liquidity.usd)) : null;
      row.dexLiquiditySum = pairs.length ? pairs.reduce((s, p) => s + p.liquidity.usd, 0) : null;
      row.dexPairs = pairs.length;
    } else row.flags.push(`DEXSCREENER_HTTP${res.status}`);
  } catch {
    row.flags.push('DEXSCREENER_FAIL');
  }

  const exposure = row.capValueUsd > 0 ? row.capValueUsd : (row.suppliedValueUsd ?? null);
  row.exposureUsd = exposure;
  if (exposure && row.dexLiquidityTop) {
    row.leverageTop = exposure / row.dexLiquidityTop;
    if (row.leverageTop > 3)
      row.flags.push(`LEVERAGE_HIGH(${row.leverageTop.toFixed(1)}x exposure/top-liquidity)`);
  }
  if (exposure && row.dexLiquiditySum) {
    row.leverageSum = exposure / row.dexLiquiditySum;
    if (row.leverageSum > 5)
      row.flags.push(`LEVERAGE_SUM_HIGH(${row.leverageSum.toFixed(1)}x exposure/all-liquidity)`);
  }

  // ④ description 与 symbol 匹配
  if (row.feedDescription && row.tokSymbol) {
    const d = row.feedDescription.toUpperCase();
    const s = row.tokSymbol.toUpperCase();
    if (d !== 'N/A' && !d.includes(s))
      row.flags.push(`DESC_MISMATCH(feed="${row.feedDescription}" vs token=${s})`);
  }

  rows.push(row);
  const cap = row.capValueUsd ? `$${Math.round(row.capValueUsd).toLocaleString('en-US')}` : 'n/a';
  const sup = row.suppliedValueUsd
    ? `$${Math.round(row.suppliedValueUsd).toLocaleString('en-US')}`
    : 'n/a';
  const liq =
    row.dexLiquidityTop != null
      ? `$${Math.round(row.dexLiquidityTop).toLocaleString('en-US')}`
      : 'n/a';
  const lev = row.leverageTop != null ? `${row.leverageTop.toFixed(1)}x` : 'n/a';
  console.log(
    `${(row.tokSymbol ?? '?').padEnd(8)}\tcf=${row.collateralFactor ?? '?'}\tmintPaused=${row.mintPaused ?? '?'}\tcap=${cap}\tsupplied=${sup}\tliqTop=${liq}\tlev=${lev}\tage=${row.ageSec != null ? `${Math.round(row.ageSec / 60)}min` : '?'}\thb=${row.heartbeatSec ?? '?'}s\tfeed=${row.feed ? row.feed.slice(0, 10) : 'NO'}\tflags=[${row.flags.join('; ')}]`
  );
}

const replacer = (k, v) => (typeof v === 'bigint' ? v.toString() : v);
fs.writeFileSync(
  '/tmp/oracle-hunt-moonwell-base.json',
  JSON.stringify(
    { blockNumber: blockNumber.toString(), blockTime: blockTime.toString(), feedGetter, rows },
    replacer,
    2
  )
);
console.log(
  `\n[done] raw data → /tmp/oracle-hunt-moonwell-base.json (feedGetter=${JSON.stringify(feedGetter)})`
);
