import Link from 'next/link';

import { getEvidenceChain, type EvidenceChainRow } from '@/lib/ops/evidenceChain';

import { rangeLabel, rangeToHours } from '../range';
import RefreshControl from '../RefreshControl';
import TimeRangePicker from '../TimeRangePicker';
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  OpsScopeNote,
  OpsSectionHeading,
  PageHeader,
  Stat,
  tableCls,
  thCls,
  trCls,
} from '../ui';

export const metadata = {
  title: 'Evidence chain - Insight Ops',
};

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function shortHex(value: string | null, start = 10, end = 6): string {
  if (!value) return '—';
  return value.length > start + end + 3 ? `${value.slice(0, start)}…${value.slice(-end)}` : value;
}

function verdictTone(verdict: string | null): 'good' | 'warn' | 'bad' | 'default' {
  if (verdict === 'PASS' || verdict === 'ALLOW') return 'good';
  if (verdict === 'BLOCK') return 'bad';
  if (verdict === 'CAUTION' || verdict === 'DANGER') return 'warn';
  return 'default';
}

function executionTone(status: string): 'good' | 'warn' | 'bad' | 'default' {
  if (status === 'FAITHFUL') return 'good';
  if (status === 'DEVIATED') return 'bad';
  if (status === 'UNDETERMINED') return 'warn';
  return 'default';
}

function explorerUrl(chainId: number | null, txHash: string): string | null {
  if (chainId === 8453) return `https://basescan.org/tx/${txHash}`;
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${txHash}`;
  return null;
}

function ReceiptTable({ rows, emptyMessage }: { rows: EvidenceChainRow[]; emptyMessage: string }) {
  if (rows.length === 0) return <EmptyState message={emptyMessage} />;
  return (
    <div>
      <p className="ops-table-scroll-hint lg:hidden">Scroll sideways to inspect every column →</p>
      <div className="ops-table-scroll overflow-x-auto">
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCls}>Executed (Beijing)</th>
              <th className={thCls}>Receipt UID</th>
              <th className={thCls}>Action</th>
              <th className={thCls}>Execution</th>
              <th className={thCls}>Fill</th>
              <th className={thCls}>Price Δ / bound</th>
              <th className={thCls}>Slippage</th>
              <th className={thCls}>Paired pre-trade</th>
              <th className={thCls}>Transaction</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const txUrl = explorerUrl(row.settlementChainId, row.txHash);
              const overBound =
                row.priceDeltaBps !== null &&
                row.maxSlippageBps !== null &&
                Math.abs(row.priceDeltaBps) > row.maxSlippageBps;
              return (
                <tr key={row.id} className={trCls}>
                  <td className="whitespace-nowrap py-2 pr-3 text-xs tabular-nums text-gray-500">
                    {formatTime(row.executedAt ?? row.createdAt)}
                  </td>
                  <td
                    className="whitespace-nowrap py-2 pr-3 font-mono text-xs text-gray-600"
                    title={row.receiptUid ?? undefined}
                  >
                    {shortHex(row.receiptUid, 12, 8)}
                    {!row.attested && (
                      <span className="ml-2">
                        <Badge tone="warn">unsigned</Badge>
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-gray-700">
                    {row.action ?? '—'}
                    <div className="text-[10px] uppercase tracking-wide text-gray-400">
                      {row.source}
                      {row.environment ? ` · ${row.environment}` : ''}
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <Badge tone={executionTone(row.executionStatus)}>{row.executionStatus}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-xs text-gray-600">{row.fillStatus}</td>
                  <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs tabular-nums">
                    <span className={overBound ? 'text-danger-700' : 'text-gray-600'}>
                      {row.priceDeltaBps ?? '—'}
                    </span>
                    <span className="text-gray-400"> / {row.maxSlippageBps ?? '—'} bps</span>
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    {row.slippageSatisfied === true ? (
                      <span className="text-success-700">within</span>
                    ) : row.slippageSatisfied === false ? (
                      <span className="text-danger-700">breach</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {row.pairedVerdict ? (
                      <span className="flex items-center gap-2">
                        <Badge tone={verdictTone(row.pairedVerdict)}>{row.pairedVerdict}</Badge>
                        <span
                          className="font-mono text-[10px] text-gray-500"
                          title={`pre_trade_checks.id ${row.pairedCheckId ?? ''}`}
                        >
                          #{row.pairedCheckId?.slice(0, 8)}
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Badge tone="warn">unpaired</Badge>
                        <span className="font-mono text-[10px] text-gray-400">
                          {row.preTradeUid ? 'anchor not found' : 'no anchor uid'}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {txUrl ? (
                      <Link
                        href={txUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-700 hover:underline"
                      >
                        {shortHex(row.txHash)}
                      </Link>
                    ) : (
                      <span className="text-gray-400">{shortHex(row.txHash)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function OpsEvidencePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const hours = rangeToHours(range);
  const label = rangeLabel(range);
  const chain = await getEvidenceChain(hours);
  const s = chain.summary;

  return (
    <div className="ops-view ops-evidence-view mx-auto max-w-[1440px] px-5 pb-14 pt-2 sm:px-8">
      <PageHeader
        index="13"
        context="Issuance evidence"
        title="Evidence chain"
        subtitle="Follow each execution back to the signed pre-trade check that authorised it — and see which executions have no anchor at all."
        updatedAt={new Date().toISOString()}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <TimeRangePicker current={range ?? '24h'} />
            <RefreshControl />
            <Link href="/ops/issuance" className="ops-page-link">
              Issuance control <span aria-hidden="true">↗</span>
            </Link>
          </div>
        }
      />

      <OpsScopeNote label="How to read this">
        Each execution receipt carries the UID of the pre-trade attestation it was authorised under;
        this view joins it to that check on{' '}
        <code>execution_receipts.pre_trade_uid = pre_trade_checks.attestation_uid</code>. The join
        is a soft reference, and the authoritative copy of every value is the signed envelope — this
        table is the index over it, not a substitute. An <strong>unpaired</strong> execution is one
        whose authorising check cannot be produced, which is the case a counterparty most needs to
        see.
      </OpsScopeNote>

      {s.errored && (
        <ErrorBanner message="执行收据查询失败，以下数字不可用。请确认 migration 0037/0046 已应用且 execution_receipts 可读。" />
      )}
      {s.pairingErrored && (
        <ErrorBanner message="预交易配对联接失败（pre_trade_checks 查询错误）。收据本身可读，但“已配对/未配对”的划分不完整。" />
      )}

      <OpsSectionHeading
        index="01"
        title="Pairing coverage"
        detail={`Executions issued in the last ${label}, and how many can be traced back to a signed pre-trade check.`}
      />
      <div className="ops-signal-grid grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Execution receipts"
          value={s.errored ? '—' : s.receipts}
          hint={`current window ${label}`}
          index="01"
        />
        <Stat
          label="Paired to a check"
          value={s.errored ? '—' : s.paired}
          tone={s.receipts > 0 && s.unpaired > 0 ? 'warn' : 'default'}
          hint={s.receipts > 0 ? `${s.unpaired} unpaired` : 'no executions yet'}
          index="02"
        />
        <Stat
          label="Executed past a warning"
          value={s.errored ? '—' : s.executedAgainstWarning}
          tone={s.executedAgainstWarning > 0 ? 'warn' : 'good'}
          hint="paired verdict was CAUTION / DANGER / BLOCK"
          index="03"
        />
        <Stat
          label="Slippage breaches"
          value={s.errored ? '—' : s.slippageBreaches}
          tone={s.slippageBreaches > 0 ? 'bad' : 'good'}
          hint="signed bound not met"
          index="04"
        />
      </div>

      <div className="ops-secondary-grid mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Faithful fills"
          value={s.errored ? '—' : s.faithful}
          tone="good"
          hint="execution_status FAITHFUL"
          index="05"
        />
        <Stat
          label="Deviated"
          value={s.errored ? '—' : s.deviated}
          tone={s.deviated > 0 ? 'bad' : 'good'}
          hint="execution_status DEVIATED"
          index="06"
        />
        <Stat
          label="Undetermined"
          value={s.errored ? '—' : s.undetermined}
          tone={s.undetermined > 0 ? 'warn' : 'default'}
          hint="could not be established"
          index="07"
        />
        <Stat
          label="Not executed"
          value={s.errored ? '—' : s.notExecuted}
          hint="receipted but no fill"
          index="08"
        />
      </div>

      <OpsSectionHeading
        index="02"
        title="Executions with no authorising check"
        detail="Highest-priority rows: an execution that cannot be paired to a signed pre-trade check cannot be justified after the fact."
      />
      <Card>
        {s.errored ? (
          <EmptyState message="receipt query unavailable" />
        ) : (
          <ReceiptTable
            rows={chain.unpaired}
            emptyMessage="every execution in this window pairs to a signed pre-trade check"
          />
        )}
      </Card>

      <OpsSectionHeading
        index="03"
        title="Deviations"
        detail="Executions that drifted from the authorised path, could not be established, or breached their signed slippage bound."
      />
      <Card>
        {s.errored ? (
          <EmptyState message="receipt query unavailable" />
        ) : (
          <ReceiptTable
            rows={chain.deviations}
            emptyMessage="no deviations or slippage breaches in this window"
          />
        )}
      </Card>

      <OpsSectionHeading
        index="04"
        title="Recent executions"
        detail="Newest receipts in the window, paired or not."
      />
      <Card>
        {s.errored ? (
          <EmptyState message="receipt query unavailable" />
        ) : (
          <ReceiptTable
            rows={chain.recent}
            emptyMessage="no execution receipts have been issued in this window — nothing to attest to yet"
          />
        )}
      </Card>
    </div>
  );
}
