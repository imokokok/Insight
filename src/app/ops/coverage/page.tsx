import Link from 'next/link';

import { getCoverageSlo } from '@/lib/coverage/collector';
import { requireOpsOwner } from '@/lib/ops/auth';

import RefreshControl from '../RefreshControl';
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

export const metadata = { title: 'Coverage readiness - Insight Ops' };

export default async function CoveragePage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string }>;
}) {
  await requireOpsOwner();
  const params = await searchParams;
  const hours = params.hours === '168' ? 168 : params.hours === '672' ? 672 : 24;
  const summary = await getCoverageSlo(hours).catch(() => null);
  const targets = summary?.targets ?? [];
  const hasTargets = targets.length > 0;
  const healthy = targets.filter((target) => target.status === 'HEALTHY').length;
  const gaps = targets.filter((target) => target.status === 'MEASUREMENT_GAP').length;
  const missing = targets.reduce((total, target) => total + target.missing, 0);
  const pct = (value: number | null) => (value === null ? '—' : `${value.toFixed(2)}%`);

  return (
    <div className="ops-view ops-reliability-view ops-coverage-view mx-auto max-w-[1280px] px-5 pb-14 pt-2 sm:px-8">
      <PageHeader
        index="06"
        context="Coverage readiness"
        title="Coverage readiness"
        subtitle="每 15 分钟记录一次证据覆盖状态；只有数据足够且完成采样，才计为达标。"
        updatedAt={summary?.measuredAt}
        actions={<RefreshControl />}
      />

      <OpsScopeNote label="统计口径">
        内部目标为 99%，目前不是客户 SLA。漏跑和采集失败计入分母，未结束的时段不计入统计；
        签名可用性单独列示。
      </OpsScopeNote>

      <nav className="ops-coverage-window mt-5" aria-label="统计窗口">
        <span>Observation window</span>
        <div>
          {([24, 168, 672] as const).map((windowHours) => (
            <Link
              key={windowHours}
              href={`/ops/coverage?hours=${windowHours}`}
              aria-current={hours === windowHours ? 'page' : undefined}
            >
              {windowHours / 24} 天
            </Link>
          ))}
        </div>
      </nav>

      {!summary ? (
        <ErrorBanner message="覆盖记录不可用。请检查数据库迁移和采集任务；不能将此状态视为达标。" />
      ) : (
        <>
          <OpsSectionHeading
            index="01"
            title="Coverage signal"
            detail="Current policy targets and sampled readiness in the selected window."
          />
          <div className="ops-signal-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="监测资产 / 链" value={targets.length} index="01" />
            <Stat
              label="达标资产 / 链"
              value={hasTargets ? healthy : '—'}
              tone={hasTargets ? (healthy === targets.length ? 'good' : 'warn') : 'default'}
              hint={hasTargets ? '无漏测且数据目标达标' : '尚未开始采样'}
              index="02"
            />
            <Stat
              label="漏测目标"
              value={hasTargets ? gaps : '—'}
              tone={gaps > 0 ? 'warn' : 'default'}
              hint="存在采样缺口的目标"
              index="03"
            />
            <Stat
              label="漏测时段"
              value={hasTargets ? missing : '—'}
              tone={missing > 0 ? 'bad' : 'default'}
              hint="所有目标的漏测总数"
              index="04"
            />
          </div>

          <OpsSectionHeading
            index="02"
            title="Target ledger"
            detail="Readiness, sampling, error budget, and latest reason for each asset and chain."
          />
          <Card>
            {!hasTargets ? (
              <EmptyState message="尚未开始采样。运行 coverage-slo 采集任务后，从登记时间开始统计。" />
            ) : (
              <>
                <p className="ops-table-scroll-hint md:hidden">横向滑动可查看全部列 →</p>
                <div className="ops-table-scroll overflow-x-auto">
                  <table className={tableCls}>
                    <thead>
                      <tr>
                        {[
                          '资产 / 证据链',
                          '数据达标',
                          '签名可用',
                          '已测 / 应测',
                          '漏测',
                          '剩余失败预算',
                          '状态',
                          '最近原因',
                        ].map((heading) => (
                          <th className={thCls} key={heading} scope="col">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {targets.map((target) => (
                        <tr className={trCls} key={target.id}>
                          <td className="py-3 pr-3 font-medium text-slate-900">
                            {target.asset} / {target.chain_id}
                            <details className="ops-policy-detail">
                              <summary>策略版本</summary>
                              <code>{target.policy_id}</code>
                            </details>
                          </td>
                          <td className="tabular-nums">{pct(target.dataReadyPct)}</td>
                          <td className="tabular-nums">{pct(target.signedReadyPct)}</td>
                          <td className="tabular-nums">
                            {target.observed} / {target.expected}
                          </td>
                          <td className="tabular-nums">{target.missing}</td>
                          <td className="tabular-nums">
                            {target.remainingErrorBudgetSlots === null
                              ? '—'
                              : target.remainingErrorBudgetSlots.toFixed(2)}{' '}
                            时段
                          </td>
                          <td>
                            <Badge
                              tone={
                                target.status === 'HEALTHY'
                                  ? 'good'
                                  : target.status === 'WARMING_UP'
                                    ? 'default'
                                    : target.status === 'BELOW_OBJECTIVE'
                                      ? 'bad'
                                      : 'warn'
                              }
                            >
                              {target.status.replaceAll('_', ' ')}
                            </Badge>
                          </td>
                          <td>
                            {target.latest?.reasons.join(', ') ||
                              target.latest?.status ||
                              '尚无样本'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          <OpsSectionHeading
            index="03"
            title="Interpretation limits"
            detail="What this sampled record can and cannot establish."
          />
          <Card>
            <div className="ops-coverage-method-grid">
              <p>15 分钟采样可能漏掉短时故障，不能代表连续在线率。</p>
              <p>来源组来自策略中的运营方分类，不等于已证明底层数据完全独立。</p>
              <p>历史达标率不决定当前交易能否执行；交易风险和执行授权需单独检查。</p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
