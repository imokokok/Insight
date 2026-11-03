/* eslint-disable no-console */
/**
 * Oracle config flaw hunt — Synthetix Perps V3 (Base) passive scan, v1.
 *
 * 被动读链（零交易、零状态修改），对 Synthetix Perps V3 Base 全部 perp 市场执行四项检查：
 *   ① 价格源结构：getPriceData 的 Pyth feedId 是否对该资产成立（Pyth 链上报价 vs
 *      独立参考价），settlement strategy 的 feedId / priceVerificationContract 是否
 *      与 getPriceData 一致
 *   ② 陈旧度配置：strictStalenessTolerance、settlementDelay / settlementWindowDuration、
 *      链上最新 publishTime 年龄
 *   ③ 标记价健全性：perp indexPrice vs Pyth 链上报价 vs 独立参考价（DefiLlama）
 *      交叉偏差 + 置信区间宽度
 *   ④ 市场参数健全性：maxOpenInterest、maxMarketSize/Value、skewScale、funding 参数、
 *      手续费、清算参数、lockedOiRatio 的量级与组合合理性
 *
 * 地址来源（first-hand）：@synthetixio/v3-contracts@8.10.0 `8453-andromeda` cannon.json
 * （PerpsMarketProxy 0x0A2AF931…，另注 pyth_price_verification_address 默认
 * 0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a）。Pyth 官方 IPyth on Base：
 * 0x8D254a21B3C86D32F717985553077A14A5B68ecd。
 *
 * Run:
 *   node --env-file=.env.local scripts/oracle-hunt-synthetix-perps-base.mjs
 *
 * Output: stdout table + /tmp/oracle-hunt-synthetix-perps-base.json (raw data)
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

if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  setGlobalDispatcher(new ProxyAgent(process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY));
}

const RPC = process.env.ALCHEMY_BASE_RPC;
if (!RPC) throw new Error('ALCHEMY_BASE_RPC missing');

const PERPS_MARKET_PROXY = getAddress('0x0A2AF931eFFd34b81ebcc57E3d3c9B1E1dE1C9Ce');
// PythERC7412Wrapper（cannon def.setting.pyth_price_verification_address 默认值），
// 暴露 IPyth 兼容的 getPriceUnsafe；Base 官方 Pyth 合约在 pull 模型下对未推送 feed
// 的 queryPriceIfExists 会 revert，wrapper 稳定可用
const PYTH_WRAPPER = getAddress('0x8250F4aF4B972684F7b336503E2D6dFeDeB1487a');
const PYTH_PRICE_VERIFICATION_EXPECTED = '0x8250f4af4b972684f7b336503e2d6dfedeb1487a';

const fn = (name, inputs, outputs) => [
  { name, type: 'function', stateMutability: 'view', inputs, outputs },
];
const u = (name) => ({ type: 'uint256', name });
// viem 对多输出返回数组——按 ABI 输出名转对象（数组/对象双兼容）
const named = (res, names) => {
  const arr = Array.isArray(res) ? res : names.map((n) => res?.[n]);
  return Object.fromEntries(names.map((n, i) => [n, arr[i]]));
};
const PERPS_ABI = [
  ...fn('getMarkets', [], [{ type: 'uint128[]' }]),
  ...fn('metadata', [{ type: 'uint128' }], [{ type: 'string' }, { type: 'string' }]),
  // getMarketSummary 在该部署上 revert（与 8.10.0 接口 ABI 不符）——改用逐项 getter
  ...fn('indexPrice', [{ type: 'uint128' }], [u('indexPrice')]),
  ...fn('size', [{ type: 'uint128' }], [u('size')]),
  ...fn('skew', [{ type: 'uint128' }], [{ type: 'int256', name: 'skew' }]),
  ...fn('maxOpenInterest', [{ type: 'uint128' }], [u('maxOpenInterest')]),
  ...fn(
    'currentFundingRate',
    [{ type: 'uint128' }],
    [{ type: 'int256', name: 'currentFundingRate' }]
  ),
  ...fn(
    'currentFundingVelocity',
    [{ type: 'uint128' }],
    [{ type: 'int256', name: 'currentFundingVelocity' }]
  ),
  ...fn(
    'getPriceData',
    [{ type: 'uint128' }],
    [{ type: 'bytes32', name: 'feedId' }, u('strictStalenessTolerance')]
  ),
  ...fn('getFundingParameters', [{ type: 'uint128' }], [u('skewScale'), u('maxFundingVelocity')]),
  ...fn(
    'getLiquidationParameters',
    [{ type: 'uint128' }],
    [
      u('initialMarginRatioD18'),
      u('minimumInitialMarginRatioD18'),
      u('maintenanceMarginScalarD18'),
      u('flagRewardRatioD18'),
      u('minimumPositionMargin'),
    ]
  ),
  ...fn(
    'getMaxLiquidationParameters',
    [{ type: 'uint128' }],
    [
      u('maxLiquidationLimitAccumulationMultiplier'),
      u('maxSecondsInLiquidationWindow'),
      u('maxLiquidationPd'),
      { type: 'address', name: 'endorsedLiquidator' },
    ]
  ),
  ...fn('getMaxMarketSize', [{ type: 'uint128' }], [u('maxMarketSize')]),
  ...fn('getMaxMarketValue', [{ type: 'uint128' }], [u('maxMarketValue')]),
  ...fn('getOrderFees', [{ type: 'uint128' }], [u('makerFee'), u('takerFee')]),
  ...fn('getLockedOiRatio', [{ type: 'uint128' }], [u('lockedOiRatio')]),
  ...fn(
    'getSettlementStrategy',
    [{ type: 'uint128' }, { type: 'uint256' }],
    [
      {
        name: 'settlementStrategy',
        type: 'tuple',
        components: [
          { type: 'uint8', name: 'strategyType' },
          u('settlementDelay'),
          u('settlementWindowDuration'),
          { type: 'address', name: 'priceVerificationContract' },
          { type: 'bytes32', name: 'feedId' },
          u('settlementReward'),
          { type: 'bool', name: 'disabled' },
          u('commitmentPriceDelay'),
        ],
      },
    ]
  ),
];

const PYTH_ABI = [
  // 单 struct 输出按 4 个标量多输出解码（tuple 编码等价）
  ...fn(
    'getPriceUnsafe',
    [{ type: 'bytes32' }],
    [
      { type: 'int64', name: 'price' },
      { type: 'uint64', name: 'conf' },
      { type: 'int32', name: 'expo' },
      { type: 'uint64', name: 'publishTime' },
    ]
  ),
];

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

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

// 独立参考价（DefiLlama → Coingecko 映射）
const CG_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  PEPE: 'pepe',
  ZEC: 'zcash',
  XMR: 'monero',
  FARTCOIN: 'fartcoin',
};

async function fetchReferencePrices(symbols) {
  const pairs = [...new Set(symbols.map((s) => CG_IDS[s]).filter(Boolean))];
  const out = {};
  await Promise.allSettled(
    pairs.map(async (id) => {
      const res = await fetch(`https://coins.llama.fi/prices/current/coingecko:${id}`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return;
      const j = await res.json();
      const entry = j.coins?.[`coingecko:${id}`];
      if (entry?.price) {
        for (const [sym, cgId] of Object.entries(CG_IDS)) {
          if (cgId === id) out[sym] = entry.price;
        }
      }
    })
  );
  return out;
}

const blockNumber = await client.getBlockNumber();
const blockTime = (await client.getBlock({ blockNumber })).timestamp;
console.log(
  `[scan] block=${blockNumber} ts=${blockTime} (${new Date(Number(blockTime) * 1000).toISOString()})`
);

const marketIds = await ethCall(PERPS_MARKET_PROXY, PERPS_ABI, 'getMarkets');
console.log(`[scan] perp markets=${marketIds.length}`);

// 元数据先行一轮（参考价按 symbol 请求）
const metas = new Map();
for (const id of marketIds) {
  try {
    const m = named(await ethCall(PERPS_MARKET_PROXY, PERPS_ABI, 'metadata', [id]), [
      'name',
      'symbol',
    ]);
    metas.set(id, { name: m.name, symbol: m.symbol });
  } catch (e) {
    metas.set(id, { name: null, symbol: null, metaError: String(e?.message ?? e).slice(0, 60) });
  }
}
const assetSymbols = [
  ...new Set(
    [...metas.values()].map((m) => m.symbol?.replace(/PERP$/i, '').toUpperCase()).filter(Boolean)
  ),
];
const reference = await fetchReferencePrices(assetSymbols);
console.log(`[scan] reference prices: ${JSON.stringify(reference)}`);

const rows = [];
for (const marketId of marketIds) {
  const meta = metas.get(marketId);
  const asset = meta.symbol?.replace(/PERP$/i, '').toUpperCase();
  const row = {
    marketId: marketId.toString(),
    symbol: meta.symbol,
    name: meta.name,
    asset,
    flags: meta.metaError ? [`META_FAIL:${meta.metaError}`] : [],
  };

  // 市场摘要。indexPrice 为 ERC-7412 保护函数：链上价格数据缺失时 revert
  // （OracleDataRequired，需要客户端携带 Pyth 更新数据重试）——属预期行为，
  // revert 单独记录，不阻断其余字段，也不算 flag
  for (const [name, args, outputKey] of [
    ['skew', [marketId], 'skew'],
    ['size', [marketId], 'size'],
    ['maxOpenInterest', [marketId], 'maxOpenInterest'],
    ['currentFundingRate', [marketId], 'currentFundingRate'],
    ['currentFundingVelocity', [marketId], 'currentFundingVelocity'],
    ['indexPrice', [marketId], 'indexPriceD18'],
  ]) {
    try {
      const v = await ethCall(PERPS_MARKET_PROXY, PERPS_ABI, name, args);
      row[outputKey] = (Array.isArray(v) ? v[0] : v).toString();
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (name === 'indexPrice') {
        row.indexPriceUnavailable =
          'ERC-7412 OracleDataRequired (view call needs off-chain price update)';
      } else {
        row.flags.push(`${name.toUpperCase()}_FAIL:${msg.slice(0, 60)}`);
      }
    }
  }

  // ①② 价格源结构与陈旧度配置
  try {
    const pd = named(await ethCall(PERPS_MARKET_PROXY, PERPS_ABI, 'getPriceData', [marketId]), [
      'feedId',
      'strictStalenessTolerance',
    ]);
    row.feedId = pd.feedId;
    row.strictStalenessTolerance = Number(pd.strictStalenessTolerance);
    if (pd.feedId === ZERO_BYTES32) row.flags.push('FEED_ID_ZERO');
    if (row.strictStalenessTolerance > 3600) {
      row.flags.push(`STALENESS_TOLERANCE_HIGH(${row.strictStalenessTolerance}s)`);
    }
    // settlement strategy 0（perps Pyth 结算源）；tuple 无名组件按位置取
    try {
      const st = named(
        await ethCall(PERPS_MARKET_PROXY, PERPS_ABI, 'getSettlementStrategy', [marketId, 0n]),
        [
          'strategyType',
          'settlementDelay',
          'settlementWindowDuration',
          'priceVerificationContract',
          'feedId',
          'settlementReward',
          'disabled',
          'commitmentPriceDelay',
        ]
      );
      row.settlement = {
        strategyType: Number(st.strategyType),
        settlementDelay: Number(st.settlementDelay),
        settlementWindowDuration: Number(st.settlementWindowDuration),
        priceVerificationContract: st.priceVerificationContract,
        feedId: st.feedId,
        settlementReward: st.settlementReward.toString(),
        disabled: st.disabled,
        commitmentPriceDelay: Number(st.commitmentPriceDelay),
      };
      if (st.feedId !== pd.feedId) {
        // 已知语义差：getPriceData.feedId 是 ERC-7412 包装器的节点 id，
        // settlement feedId 才是真实 Pyth feed——两者不同属预期，不设 flag，只记录
        row.settlementVsPriceDataFeedDiffer = true;
      }
      if (!st.disabled && st.settlementWindowDuration === 0n) {
        row.flags.push('SETTLEMENT_WINDOW_ZERO');
      }
      if (
        !st.disabled &&
        st.priceVerificationContract !== '0x0000000000000000000000000000000000000000' &&
        getAddress(st.priceVerificationContract).toLowerCase() !== PYTH_PRICE_VERIFICATION_EXPECTED
      ) {
        row.flags.push(`PRICE_VERIFICATION_CHANGED(${st.priceVerificationContract})`);
      }
      row.pythQueryTarget = st.priceVerificationContract;
    } catch (e) {
      row.flags.push(`SETTLEMENT_FAIL:${String(e?.message ?? e).slice(0, 60)}`);
    }
    // Pyth 链上报价：settlement feedId 是真实 Pyth feed，经 PythERC7412Wrapper
    // getPriceUnsafe 直查；priceData feedId 是 ERC-7412 节点 id，仅作对照
    for (const [label, feedId] of [
      ['settlement', row.settlement?.feedId],
      ['priceData', pd.feedId],
    ]) {
      if (!feedId || feedId === ZERO_BYTES32) continue;
      try {
        const q = named(await ethCall(PYTH_WRAPPER, PYTH_ABI, 'getPriceUnsafe', [feedId]), [
          'price',
          'conf',
          'expo',
          'publishTime',
        ]);
        if (Number(q.publishTime) === 0) {
          if (label === 'settlement')
            row.flags.push(`PYTH_NO_PRICE(feedId=${feedId.slice(0, 10)}…)`);
          continue;
        }
        const age = Number(blockTime) - Number(q.publishTime);
        const price = Number(q.price) / 10 ** Math.abs(Number(q.expo));
        const confPct =
          Number(q.price) !== 0 ? (Number(q.conf) / Math.abs(Number(q.price))) * 100 : null;
        row.pyth = { feedSource: label, feedId, price, confPct, publishTimeAgeSec: age };
        if (age > 3600) row.flags.push(`PYTH_STALE(${Math.round(age / 60)}min on ${label})`);
        if (confPct != null && confPct > 1)
          row.flags.push(`CONFIDENCE_WIDE(${confPct.toFixed(2)}%)`);
        break; // 任一来源有效即够
      } catch (e) {
        if (label === 'settlement') {
          row.flags.push(`PYTH_QUERY_FAIL(${label}):${String(e?.message ?? e).slice(0, 50)}`);
        }
      }
    }
  } catch (e) {
    row.flags.push(`PRICE_DATA_FAIL:${String(e?.message ?? e).slice(0, 60)}`);
  }

  // ③ 标记价健全性：Pyth 链上报价 vs 独立参考价（DefiLlama）；
  // indexPrice 因 ERC-7412 多数情况下读不到，仅当可读时额外对照
  if (row.pyth?.price) {
    if (asset && reference[asset] != null) {
      row.referenceUsd = reference[asset];
      row.pythVsRefPct = ((row.pyth.price - reference[asset]) / reference[asset]) * 100;
      if (Math.abs(row.pythVsRefPct) > 2) {
        row.flags.push(`PYTH_VS_REF_MISMATCH(${row.pythVsRefPct.toFixed(2)}% vs DefiLlama)`);
      }
    }
  }
  if (row.indexPriceD18) {
    const idxUsd = Number(row.indexPriceD18) / 1e18;
    row.indexPriceUsd = idxUsd;
    if (row.pyth?.price) {
      row.deviationVsPythPct = ((idxUsd - row.pyth.price) / row.pyth.price) * 100;
      if (Math.abs(row.deviationVsPythPct) > 2) {
        row.flags.push(`INDEX_VS_PYTH_MISMATCH(${row.deviationVsPythPct.toFixed(2)}%)`);
      }
    }
  }

  // ④ 市场参数
  try {
    const fp = named(
      await ethCall(PERPS_MARKET_PROXY, PERPS_ABI, 'getFundingParameters', [marketId]),
      ['skewScale', 'maxFundingVelocity']
    );
    row.skewScale = fp.skewScale.toString();
    row.maxFundingVelocity = fp.maxFundingVelocity.toString();
    if (fp.skewScale === 0n) row.flags.push('SKEW_SCALE_ZERO');
  } catch (e) {
    row.flags.push(`FUNDING_FAIL:${String(e?.message ?? e).slice(0, 60)}`);
  }
  try {
    row.maxMarketSize = (
      await ethCall(PERPS_MARKET_PROXY, PERPS_ABI, 'getMaxMarketSize', [marketId])
    ).toString();
    row.maxMarketValue = (
      await ethCall(PERPS_MARKET_PROXY, PERPS_ABI, 'getMaxMarketValue', [marketId])
    ).toString();
  } catch (e) {
    row.flags.push(`MAX_SIZE_FAIL:${String(e?.message ?? e).slice(0, 60)}`);
  }
  try {
    const lp = named(
      await ethCall(PERPS_MARKET_PROXY, PERPS_ABI, 'getLiquidationParameters', [marketId]),
      [
        'initialMarginRatioD18',
        'minimumInitialMarginRatioD18',
        'maintenanceMarginScalarD18',
        'flagRewardRatioD18',
        'minimumPositionMargin',
      ]
    );
    row.liq = {
      initialMarginRatio: Number(lp.initialMarginRatioD18) / 1e18,
      minimumInitialMarginRatio: Number(lp.minimumInitialMarginRatioD18) / 1e18,
      maintenanceMarginScalar: Number(lp.maintenanceMarginScalarD18) / 1e18,
      flagRewardRatio: Number(lp.flagRewardRatioD18) / 1e18,
      minimumPositionMargin: lp.minimumPositionMargin.toString(),
    };
    if (Number(lp.maintenanceMarginScalarD18) === 0n) row.flags.push('MM_SCALAR_ZERO');
    if (Number(lp.flagRewardRatioD18) / 1e18 > 0.2)
      row.flags.push(`FLAG_REWARD_HIGH(${(Number(lp.flagRewardRatioD18) / 1e18).toFixed(2)})`);
  } catch (e) {
    row.flags.push(`LIQ_FAIL:${String(e?.message ?? e).slice(0, 60)}`);
  }
  try {
    const ml = named(
      await ethCall(PERPS_MARKET_PROXY, PERPS_ABI, 'getMaxLiquidationParameters', [marketId]),
      [
        'maxLiquidationLimitAccumulationMultiplier',
        'maxSecondsInLiquidationWindow',
        'maxLiquidationPd',
        'endorsedLiquidator',
      ]
    );
    row.maxLiq = {
      accumulationMultiplier: Number(ml.maxLiquidationLimitAccumulationMultiplier) / 1e18,
      maxSecondsInLiquidationWindow: Number(ml.maxSecondsInLiquidationWindow),
      maxLiquidationPd: Number(ml.maxLiquidationPd) / 1e18,
      endorsedLiquidator: ml.endorsedLiquidator,
    };
    if (Number(ml.maxSecondsInLiquidationWindow) === 0) row.flags.push('LIQ_WINDOW_ZERO');
  } catch (e) {
    row.flags.push(`MAX_LIQ_FAIL:${String(e?.message ?? e).slice(0, 60)}`);
  }
  try {
    const fees = named(await ethCall(PERPS_MARKET_PROXY, PERPS_ABI, 'getOrderFees', [marketId]), [
      'makerFee',
      'takerFee',
    ]);
    row.makerFee = Number(fees.makerFee) / 1e18;
    row.takerFee = Number(fees.takerFee) / 1e18;
    if (row.takerFee > 0.05)
      row.flags.push(`TAKER_FEE_EXTREME(${(row.takerFee * 100).toFixed(1)}%)`);
  } catch (e) {
    row.flags.push(`FEES_FAIL:${String(e?.message ?? e).slice(0, 60)}`);
  }
  try {
    row.lockedOiRatio = (
      await ethCall(PERPS_MARKET_PROXY, PERPS_ABI, 'getLockedOiRatio', [marketId])
    ).toString();
    if (row.lockedOiRatio === '0') row.flags.push('LOCKED_OI_RATIO_ZERO');
  } catch (e) {
    row.flags.push(`LOCKED_OI_FAIL:${String(e?.message ?? e).slice(0, 60)}`);
  }
  if (row.maxOpenInterest === '0') row.flags.push('MAX_OPEN_INTEREST_UNSET(0)');

  rows.push(row);
  const pythP = row.pyth?.price != null ? `$${row.pyth.price.toPrecision(6)}` : 'n/a';
  const dev = row.pythVsRefPct != null ? `${row.pythVsRefPct.toFixed(2)}%` : 'n/a';
  const tol = row.strictStalenessTolerance != null ? `${row.strictStalenessTolerance}s` : '?';
  const oi =
    row.maxOpenInterest != null ? `$${(Number(row.maxOpenInterest) / 1e18).toExponential(2)}` : '?';
  console.log(
    `${row.symbol?.padEnd(12) ?? '?'}\tid=${row.marketId}\tpyth=${pythP}\tdev=${dev}\ttol=${tol}\tmaxOI=${oi}\tflags=[${row.flags.join('; ')}]`
  );
}

const replacer = (k, v) => (typeof v === 'bigint' ? v.toString() : v);
fs.writeFileSync(
  '/tmp/oracle-hunt-synthetix-perps-base.json',
  JSON.stringify(
    {
      blockNumber: blockNumber.toString(),
      blockTime: blockTime.toString(),
      perpsMarketProxy: PERPS_MARKET_PROXY,
      pythWrapper: PYTH_WRAPPER,
      reference,
      rows,
    },
    replacer,
    2
  )
);
console.log('\n[done] raw data → /tmp/oracle-hunt-synthetix-perps-base.json');
