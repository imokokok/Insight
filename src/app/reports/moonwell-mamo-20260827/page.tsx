import Link from 'next/link';

import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Blocks,
  FileSearch,
  ListChecks,
  ShieldAlert,
} from 'lucide-react';

import { EditorialWorkspaceHeader } from '@/components/editorial';

import { FEED, ROUNDS, type FeedRound } from './data';
import PriceChart from './PriceChart';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '拉盘 40 倍、骗走 870 万美元：Moonwell 一年内第三次预言机事故全复盘 - Insight',
  description:
    '2026-08-27，攻击者用「捐赠抬汇率 + 拉盘喂价」的组合拳把 Chainlink MAMO/USD 喂价拉高 40.7 倍，从 Moonwell Base 市场借走 1,103 万美元资产，净获利约 870 万美元。本报告以链上 feed 轮次数据与逐笔交易证据完整复盘。',
};

// 静态事故复盘：内容 immutable，无需 ISR。
export const revalidate = false;

const ATTACK_START = 1787810940; // 2026-08-27T06:09:00Z
const ATTACK_END = 1787823000; // 2026-08-27T09:30:00Z

function fmtUsd(v: number): string {
  if (v >= 1) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
  return `$${v.toFixed(6)}`;
}

function fmtUtc(t: number): string {
  return new Date(t * 1000).toLocaleString('zh-CN', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function shortHash(h: string): string {
  return `${h.slice(0, 10)}…${h.slice(-8)}`;
}

function aggLabel(roundId: string): string {
  const id = BigInt(roundId);
  return `${Number(id >> 64n)}:${(id & 0xffffffffffffffffn).toString().padStart(4, '0')}`;
}

function SectionCard({
  index,
  title,
  icon: Icon,
  children,
}: {
  index: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="report-section-card border-y border-slate-900/15 bg-white/45">
      <div className="flex items-center gap-3 border-b border-slate-900/10 px-5 py-4">
        <Icon className="h-4 w-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-gray-900">
          <span className="editorial-index mr-2">{index}</span>
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Metric({
  label,
  value,
  subtext,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  subtext?: string;
  tone?: 'neutral' | 'bad' | 'warning';
}) {
  const toneClass = {
    neutral: 'bg-gray-50 text-gray-500',
    bad: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-600',
  }[tone];
  return (
    <div className="report-daily-metric border-b border-r border-slate-900/10 bg-white/35 p-5 last:border-r-0 sm:border-b-0">
      <p className="mb-1 text-xs text-gray-500">{label}</p>
      <p className="font-tabular text-2xl font-semibold text-gray-950">{value}</p>
      {subtext && <p className="mt-1 text-xs text-gray-500">{subtext}</p>}
      <span
        className={`mt-3 inline-block h-1 w-8 ${toneClass.replace(/bg-\S+/, '')}`}
        aria-hidden="true"
      />
    </div>
  );
}

function EvidenceTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="report-archive-ledger overflow-x-auto border-y border-slate-900/15 bg-white/55">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-900/15 bg-slate-100/60 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {cells.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 align-top text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HashLink({ hash, chain = 'base' }: { hash: string; chain?: 'base' | 'eth' }) {
  const host = chain === 'eth' ? 'etherscan.io' : 'basescan.org';
  return (
    <a
      href={`https://${host}/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-blue-700 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-600"
    >
      {shortHash(hash)}
    </a>
  );
}

function AddrLink({ addr, chain = 'base' }: { addr: string; chain?: 'base' | 'eth' }) {
  const host = chain === 'eth' ? 'etherscan.io' : 'basescan.org';
  return (
    <a
      href={`https://${host}/address/${addr}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-blue-700 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-600"
    >
      {shortHash(addr)}
    </a>
  );
}

export default function MoonwellMamoIncidentPage() {
  // ---- 链上轮次派生数据（全部来自 aggregator 合约读取，见页脚方法说明）----
  const rounds: FeedRound[] = ROUNDS;
  const preAttack = rounds.filter((r) => r.updatedAt < ATTACK_START);
  const inWindow = rounds.filter((r) => r.updatedAt >= ATTACK_START && r.updatedAt <= ATTACK_END);
  const postAttack = rounds.filter((r) => r.updatedAt > ATTACK_END);

  const baseline = preAttack.length > 0 ? preAttack[preAttack.length - 1] : null;
  const baselinePrice = baseline?.price ?? 0.010597;
  // Quill/Moonwell 引用的攻击前参考价 $0.010597（平台参考价口径，区别于链上最后一轮 $0.010482）
  const referencePrice = 0.010597;
  const peak = inWindow.reduce<FeedRound | null>((m, r) => (!m || r.price > m.price ? r : m), null);
  const peakPrice = peak?.price ?? 0.43127363;
  const peakMultiple = peakPrice / referencePrice;

  const keyRounds: FeedRound[] = [
    ...(baseline ? [baseline] : []),
    ...inWindow.filter(
      (r, i, arr) =>
        i === 0 || i === arr.length - 1 || r.price === peakPrice || i === Math.floor(arr.length / 2)
    ),
    ...postAttack.slice(0, 2),
  ];

  return (
    <div className="editorial-workspace evidence-workbench research-workbench min-h-screen">
      <div className="editorial-frame mx-auto max-w-[1440px] px-5 pb-20 pt-4 sm:px-8 lg:px-12 lg:pb-28">
        <EditorialWorkspaceHeader
          index="05.2"
          stage="Incident review"
          eyebrow="2026-08-27 · Base · Moonwell Lending（MAMO 市场）· 净获利约 $8.7M"
          title="拉盘 40 倍、骗走 870 万美元：Moonwell 一年内第三次预言机事故全复盘"
          description="攻击者没有碰一行合约代码，也没有偷任何私钥——他把抵押品估值公式的两半（mMAMO 兑换率 × MAMO 喂价）都用交易改写了。本报告用 Chainlink MAMO/USD feed 的链上轮次数据和逐笔交易证据，完整还原这条攻击链路。"
          evidence={['链上喂价轮次', '攻击交易序列', '一年三击复盘', '可执行防御清单']}
          action={
            <Link
              href="/reports"
              className="group inline-flex items-center gap-1.5 border border-slate-900/20 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-700"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              报告档案
            </Link>
          }
        />

        {/* 指标条 */}
        <div className="mt-6 grid grid-cols-2 border-y border-slate-900/15 lg:grid-cols-4">
          <Metric
            label="攻击者净获利"
            value="≈ $8.7M"
            subtext="以 DAI 形式转移至以太坊主网"
            tone="bad"
          />
          <Metric
            label="喂价拉升倍数"
            value={`≈ ${peakMultiple.toFixed(1)}×`}
            subtext={`$0.010597 → $${peakPrice.toFixed(8)}`}
            tone="bad"
          />
          <Metric
            label="18 笔借出"
            value="$11,028,762"
            subtext="cbBTC / WETH / USDC / wstETH"
            tone="bad"
          />
          <Metric
            label="清算事件"
            value="595 次"
            subtext="清算几乎没收全部 mMAMO 抵押品"
            tone="warning"
          />
        </div>

        <div className="mt-10 space-y-10">
          {/* 01 事件速览 */}
          <SectionCard index="01" title="事件速览" icon={FileSearch}>
            <div className="space-y-4 text-sm leading-relaxed text-slate-700">
              <p>
                2026 年 8 月 27 日 06:09–09:30（UTC），一名攻击者在 Base 链上对 Moonwell Lending 的
                MAMO 市场执行了教科书级的「抵押品估值操纵」。攻击分两条线同时进行：一是把 5,339 万枚
                MAMO <strong>直接转账</strong>给 mMAMO receipt token
                合约（绕过存款入口，不触发供应上限）， 让每份 mMAMO 的名义含金量凭空放大 3.68
                倍；二是在流动性极薄的 DEX 池里花约 750 万美元买入 约 9,431 万枚 MAMO，把 Chainlink
                MAMO/USD 喂价从 $0.0106 拉到 $0.4313 的峰值。
              </p>
              <p>
                两个被乘数同时被攻击者掌控后，一笔实际价值约 16 万美元的存款被估值成约 2,230
                万美元的抵押品。 攻击者在 3.5 小时内发起 18 笔借款，借走 71.36 cbBTC、623.6
                WETH、256 万 USDC 和 368 wstETH， 共计 $11,028,762，随后全部经 Circle CCTP
                跨回以太坊主网换为 DAI，约 $8.7M 净利落袋。 清算人随后发起 595 次清算，但为时已晚。
              </p>
            </div>
            <div className="mt-5">
              <EvidenceTable
                headers={['项目', '内容']}
                rows={[
                  ['发生时间', '2026-08-27 06:09 – 09:30 UTC（借款窗口）'],
                  [
                    '链 / 市场',
                    'Base · Moonwell Lending · MAMO 市场（MIP-B48 上架，抵押因子 50%）',
                  ],
                  [
                    '攻击者账户',
                    <AddrLink key="a" addr="0x719eae70d4A83f35bF82A2740699F5db84BE919D" />,
                  ],
                  [
                    '关联账户（资金归集）',
                    <AddrLink
                      key="b"
                      addr="0xd71dd9b6e634412713c47fe7ae02c628e338c384"
                      chain="eth"
                    />,
                  ],
                  ['直接损失', '$11,028,762（18 笔借款），约 $8.7M 已跨链出逃'],
                  ['攻击成本', '≈ $7.5M 买币资金（来自 Tornado Cash 提款的 800 ETH）'],
                  ['合约是否被入侵', '否。无合约漏洞、无私钥泄露，纯粹是估值输入被操纵'],
                  ['资金现状', '以 DAI 形式留存于攻击者以太坊钱包（截至报告发布）'],
                ]}
              />
            </div>
          </SectionCard>

          {/* 02 攻击拆解 */}
          <SectionCard index="02" title="攻击拆解：一条七步流水线" icon={Activity}>
            <div className="space-y-4 text-sm leading-relaxed text-slate-700">
              <p>
                这不是一次临时的「发现漏洞顺手打一把」，而是完整的资金—建仓—放大—抽走流程。按时间顺序拆开：
              </p>
            </div>
            <div className="mt-5">
              <EvidenceTable
                headers={['步骤', '动作', '关键数据', '证据']}
                rows={[
                  [
                    '1. 资金筹备',
                    'Tornado Cash 提款 → CoW Swap 卖 ETH → CCTP 跨链',
                    '关联账户收到 800.098 ETH，卖出 799 ETH 换 1,947,391 USDC，经 Circle CCTP 桥至 Base',
                    '—',
                  ],
                  [
                    '2. 吸筹',
                    '在 Base 多个 DEX 分批买入 MAMO（流动性薄，数十笔成交）',
                    '≈ $7.50M 买入 ≈ 94.3M MAMO，均价随买入水涨船高',
                    '—',
                  ],
                  [
                    '3. 建立底仓',
                    '正式存入 Moonwell 换取 mMAMO',
                    '存入 15,089,595 MAMO，按当时参考价 $0.010597 仅值 $159,904',
                    '—',
                  ],
                  [
                    '4. 捐赠抬汇率',
                    '直接向 mMAMO 合约转账（绕过 supply cap）',
                    '两笔共 53,393,290 MAMO；mMAMO 汇率 0.020513 → 0.075460（3.68×），未 mint 一份新份额',
                    <>
                      <HashLink hash="0x056597f42302ab7f9f5e91c7f84856d3ba73827da7f956645d1f26bdde109ce9" />
                      <br />
                      <HashLink hash="0xaf284d7f60dd8f2ebb41cba6a080e95a6deceb3a2c93ff58016996de61de3cd9" />
                    </>,
                  ],
                  [
                    '5. 拉盘喂价',
                    '继续买入同一批薄流动性池，推动喂价',
                    'Chainlink MAMO/USD 喂价 $0.0106 → 峰值 $0.43127363；Moonwell 实际接受价峰值 $0.40248571',
                    '见下方 03 节轮次数据',
                  ],
                  [
                    '6. 抵押膨胀',
                    '汇率 × 喂价同时被放大',
                    '抵押品估值 ≈ $22.3M–$23.9M，按 50% 抵押因子可借 $11.1M–$12M',
                    '—',
                  ],
                  [
                    '7. 借款与出逃',
                    '18 笔借款 → 换 USDC → CCTP 至 Ethereum → 换 DAI',
                    '共借出 $11,028,762；约 $8.7M 完成 cross-chain 出逃',
                    <>
                      <HashLink
                        hash="0x9b362a0a28723ba6c3f891329ea1df9785ad156b1fb9b5b317ea623c9150f86e"
                        chain="eth"
                      />
                      <br />
                      <HashLink
                        hash="0x0bcf401c128cd8d99d067213a65c1f0dcbe720c928cd85fa904cfcbcaad19ca4"
                        chain="eth"
                      />
                    </>,
                  ],
                ]}
              />
            </div>
            <div className="mt-5 border-l-2 border-red-500 bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-700">
              借款明细（摘录）：14.34 / 12.53 / 12.45 / 11.55 / 6.31 cbBTC 等共 71.36 cbBTC；560
              WETH 与 63.60 WETH；1.3M / 990K（最后一笔）/ 270K USDC；368 wstETH。完整的 18 笔借款
              tx 清单见 Quill Audits 复盘（页脚来源 [1]）。
            </div>
          </SectionCard>

          {/* 03 链上证据 */}
          <SectionCard index="03" title="链上证据：喂价轮次与关键交易" icon={Blocks}>
            <div className="space-y-4 text-sm leading-relaxed text-slate-700">
              <p>
                Insight 平台的 price_snapshots 从 2026-09-20 才开始收录 MAMO
                feed（事故后），因此本节证据 不依赖平台快照，而是直接读取 Chainlink
                MAMO/USD（Base）aggregator 代理合约的历史轮次——
                任何人都可以在链上验证下表的每一个数字。
              </p>
              <EvidenceTable
                headers={['Feed 属性', '值']}
                rows={[
                  ['Feed 代理合约', <AddrLink key="f" addr={FEED.proxy} />],
                  [
                    '精度 / 心跳',
                    `8 位小数 · heartbeat 86400s（24h）· 偏离阈值未公开（Chainlink RDD 元数据）`,
                  ],
                  [
                    'Phase 1 上线时间',
                    '2025-10-02 14:36 UTC（phase 1 共 6,946 轮，2026-04-15 更换 aggregator）',
                  ],
                  ['Phase 2 起始', '2026-04-15 02:00 UTC，事故发生时运行于此 aggregator'],
                ]}
              />
            </div>

            <div className="mt-6 border-y border-slate-900/15 bg-white/55 p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                MAMO/USD 喂价走势（2026-08-18 → 08-29 UTC）
              </h3>
              <PriceChart rounds={rounds} attackStart={ATTACK_START} attackEnd={ATTACK_END} />
            </div>

            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">关键轮次（合约直读）</h3>
              <EvidenceTable
                headers={['轮次（phase:agg）', '时间（UTC）', '喂价', '相对攻击前基线']}
                rows={keyRounds.map((r) => [
                  <span key="id" className="font-mono text-xs">
                    {aggLabel(r.roundId)}
                  </span>,
                  fmtUtc(r.updatedAt),
                  <span key="p" className="font-tabular font-semibold">
                    {fmtUsd(r.price)}
                  </span>,
                  <span
                    key="m"
                    className={`font-tabular text-xs font-semibold ${r.price > baselinePrice * 1.5 ? 'text-red-600' : 'text-slate-500'}`}
                  >
                    {(r.price / baselinePrice).toFixed(2)}×
                  </span>,
                ])}
              />
              <p className="mt-3 text-xs text-slate-500">
                读取方法：eth_call 调用 EACAggregatorProxy.getRoundData，窗口 2026-08-18 00:00 →
                08-29 00:00 UTC， 共 {rounds.length} 轮；图中红线为攻击窗口（06:09–09:30）。
              </p>
            </div>
          </SectionCard>

          {/* 04 三连击复盘 */}
          <SectionCard index="04" title="一年三击：Moonwell 的预言机问题清单" icon={ShieldAlert}>
            <div className="space-y-4 text-sm leading-relaxed text-slate-700">
              <p>
                把镜头拉远，这次 $8.7M 并不是孤立事件。过去一年，Moonwell
                已经第三次因为「喂给合约的数字」吃亏：
              </p>
            </div>
            <div className="mt-5">
              <EvidenceTable
                headers={['时间', '事故', '出错的环节', '损失']}
                rows={[
                  ['2025-11', 'Chainlink feed 数据缺陷', 'feed 层：喂价数据本身有缺陷', '≈ $1M'],
                  [
                    '2026-02-15',
                    'cbETH oracle 配置错误（MIP-X43）',
                    '配置层：治理提案把 cbETH/ETH 兑换率直接当成 USD 价（报 $1.12 而非 ≈$2,200），1,096.317 cbETH 被错误清算',
                    '$1.78M 坏账',
                  ],
                  [
                    '2026-08-27',
                    'MAMO 喂价操纵 + 汇率捐赠',
                    '市场层：抵押估值的两个乘数（receipt token 汇率、喂价）都能被同一攻击者用交易改写',
                    '≈ $8.7M',
                  ],
                ]}
              />
            </div>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-700">
              <p>
                <strong>三次事故，没有一个出在合约字节码里。</strong>
                第一次是数据缺陷，第二次是配置错误，
                第三次是市场操纵——它们分别击穿了预言机栈的三层：数据层、配置层、经济层。这正是预言机风险
                与传统智能合约风险的本质区别：合约审计可以保证「代码按预期执行」，但保证不了「输入值得被信任」。
              </p>
              <p>
                放到行业尺度看，这类风险正在加速暴露：据 DeFiLlama hacks 数据统计，2026 年前 10
                个月预言机 相关事故已达 <strong>42 起</strong>，超过 2025 全年的 18 起；OWASP 也在
                SC03:2026 中首次将 预言机操纵列为独立风险类别。
              </p>
            </div>
          </SectionCard>

          {/* 05 可执行建议 */}
          <SectionCard index="05" title="可执行建议：把这次事故变成下一次的拦截" icon={ListChecks}>
            <div className="space-y-4 text-sm leading-relaxed text-slate-700">
              <p>
                Insight 的 pre-trade safety check
                框架把「能不能安全地把某资产当抵押品交互」拆成一组可在
                交易前验证的检查项。用这套框架对 2026-08-27 事前状态做复演，结论非常明确：
              </p>
            </div>
            <div className="mt-5">
              <EvidenceTable
                headers={['Pre-trade 检查项', '事前复演判定', '事发时实况']}
                rows={[
                  [
                    'Feed 覆盖',
                    <span key="1" className="font-semibold text-emerald-700">
                      PASS
                    </span>,
                    'Chainlink MAMO/USD（Base）2025-10 起运行，feed 存在且有活跃轮次',
                  ],
                  [
                    '喂价新鲜度',
                    <span key="2" className="font-semibold text-emerald-700">
                      PASS
                    </span>,
                    '24h heartbeat，攻击前轮次正常更新——新鲜度检查根本拦不住这类攻击',
                  ],
                  [
                    '喂价 vs 现货一致性',
                    <span key="3" className="font-semibold text-red-700">
                      FAIL
                    </span>,
                    '喂价可被同一批买入交易直接推高（事后 40.7×）',
                  ],
                  [
                    '操纵成本',
                    <span key="4" className="font-semibold text-red-700">
                      FAIL
                    </span>,
                    '≈ $7.5M 买单即可撬动整个喂价——远低于可借出的 $11M',
                  ],
                  [
                    '抵押品流动性深度',
                    <span key="5" className="font-semibold text-red-700">
                      FAIL
                    </span>,
                    'MAMO DEX 池极薄，喂价回落的抛压无人吸收',
                  ],
                  [
                    '综合判定',
                    <span key="6" className="font-semibold text-red-700">
                      BLOCK
                    </span>,
                    '任何一笔以 MAMO 为抵押的 pre-trade 都应被拦截',
                  ],
                ]}
              />
            </div>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-700">
              <p>对应到协议与集成方，这份事故至少留下五条可落地的规则：</p>
              <ol className="ml-4 list-decimal space-y-2.5">
                <li>
                  <strong>Receipt token 汇率跳变要当事故报警，不是数据点。</strong>mMAMO
                  汇率在两笔交易里跳了 3.68 倍且没有任何 mint 事件伴随——监控「汇率变动与 mint/redeem
                  活动脱钩」就能在借款发生前拦下攻击。
                </li>
                <li>
                  <strong>价格来源与可操纵市场同源 = 红旗。</strong>
                  当某资产的喂价来自攻击者买得动的那片流动性， 必须叠加 TWAP
                  窗口、流动性下限或第二信息源，才允许其支撑真实借贷。
                </li>
                <li>
                  <strong>Supply cap 看合约余额，不只看存款入口。</strong>20M MAMO 的供应上限只守了
                  deposit 路径，直接 transfer 进 mMAMO 的 53.4M 完全绕过了它。
                </li>
                <li>
                  <strong>低价 + 薄流动性的冷启动资产不应充当抵押品。</strong>单价 $0.01 量级、池深
                  $7M 就能拉 40 倍的资产， 无论 CF 给多少，估值上限都应被硬性封顶。
                </li>
                <li>
                  <strong>给预言机留下可审计的轨迹。</strong>本轮复盘的全部数字都来自链上 aggregator
                  轮次， 任何人可独立复算——预言机侧的透明度基础设施（feed 目录、轮次历史、事后
                  attestation）应该成为 借贷协议的标配，而不是事后复盘的奢侈品。
                </li>
              </ol>
              <div className="mt-4 border-l-2 border-blue-600 bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-800">
                <BadgeCheck className="mr-1 inline h-3.5 w-3.5" />
                本报告的判定框架与 Insight 平台 pre-trade safety check 一致；平台支持对同类 verdict
                附加 EIP-712 签名的 off-chain attestation，供合约与下游系统程序化验证。读者可使用
                Insight 的
                <Link
                  href="/safety-check"
                  className="mx-1 underline decoration-blue-300 underline-offset-2 hover:decoration-blue-600"
                >
                  Safety Check
                </Link>
                与
                <Link
                  href="/cross-oracle"
                  className="mx-1 underline decoration-blue-300 underline-offset-2 hover:decoration-blue-600"
                >
                  Cross-Oracle
                </Link>
                工具对任意资产复演上述检查。
              </div>
            </div>
          </SectionCard>

          {/* 来源与方法 */}
          <section className="border-y border-slate-900/15 bg-white/45 p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">来源与方法</h2>
            <ol className="ml-4 list-decimal space-y-1.5 text-xs leading-relaxed text-slate-600">
              <li>
                Quill Audits,{' '}
                <em>Moonwell $8.7M mMAMO Exchange Rate Inflation Exploit (Explained)</em>,
                2026-09-02 — 攻击者地址、捐赠/借款/跨链 tx 清单与金额拆解
              </li>
              <li>
                Olympix, <em>Moonwell&apos;s $8.7M Loss</em> — 攻击者地址标注（Moonwell Exploiter
                2）
              </li>
              <li>
                BlockSec Weekly, <em>~$23M Lost: Cosmos EVM, Moonwell Exploits</em> —
                事件时间线交叉验证
              </li>
              <li>
                Moonwell 治理论坛, <em>MIP-X43: cbETH Oracle Incident Summary</em> — 2026-02 cbETH
                事故复盘
              </li>
              <li>DeFiLlama hacks 数据（api.llama.fi/hacks）— 行业事故频率统计</li>
              <li>
                Chainlink Reference Data Directory（feeds-ethereum-mainnet-base-1.json，2026-08-19
                快照）— feed 元数据（heartbeat、精度）
              </li>
              <li>
                链上直读：Base RPC eth_call → EACAggregatorProxy{' '}
                <span className="font-mono">{FEED.proxy}</span> 的 getRoundData
                历史轮次（本页图表与轮次表的唯一数据源）
              </li>
            </ol>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              方法说明：所有美元金额取自公开复盘报告的链上核算；喂价轮次由 Insight 于 2026-10-21
              直接从 aggregator 合约读取，可独立复算。本报告为事后技术复盘，不构成投资建议。
            </p>
          </section>

          <div className="flex items-center justify-between border-t border-slate-900/15 pt-6">
            <p className="editorial-index">Insight · Oracle Transparency &amp; Risk Intelligence</p>
            <Link
              href="/safety-check"
              className="inline-flex items-center gap-1.5 border border-slate-950 bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
            >
              在你的下一笔交易前跑一次检查
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
