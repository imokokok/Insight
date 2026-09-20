import Link from 'next/link';

import { getCoverageSlo } from '@/lib/coverage/collector';
import { requireOpsOwner } from '@/lib/ops/auth';

import RefreshControl from '../RefreshControl';
import { PageHeader, ErrorBanner, tableCls, thCls, trCls } from '../ui';

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
  const pct = (value: number | null) => (value === null ? '—' : `${value.toFixed(2)}%`);
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        title="数据覆盖可用性"
        subtitle="每 15 分钟采样；数据够用才计为达标。交易风险和执行授权仍需单独检查。"
        actions={<RefreshControl />}
      />
      <nav className="flex gap-4 mb-6" aria-label="统计窗口">
        {([24, 168, 672] as const).map((h) => (
          <Link
            key={h}
            href={`/ops/coverage?hours=${h}`}
            aria-current={hours === h ? 'page' : undefined}
            className="underline"
          >
            {h / 24} 天
          </Link>
        ))}
      </nav>
      {!summary ? (
        <ErrorBanner message="覆盖记录不可用。请检查数据库迁移和采集任务；不能将此状态视为达标。" />
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-4">
            内部目标 99%，尚非客户
            SLA。漏跑和采集失败计入分母；未结束的时段不计入统计。签名可用性单独显示。
          </p>
          {summary.targets.length === 0 ? (
            <p>尚未开始采样。运行 coverage-slo 采集任务后，从登记时间开始统计。</p>
          ) : (
            <div className="overflow-x-auto">
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
                    ].map((h) => (
                      <th className={thCls} key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.targets.map((t) => (
                    <tr className={trCls} key={t.id}>
                      <td className="py-3 pr-3">
                        {t.asset} / {t.chain_id}
                        <details>
                          <summary>策略版本</summary>
                          <code className="break-all">{t.policy_id}</code>
                        </details>
                      </td>
                      <td>{pct(t.dataReadyPct)}</td>
                      <td>{pct(t.signedReadyPct)}</td>
                      <td>
                        {t.observed} / {t.expected}
                      </td>
                      <td>{t.missing}</td>
                      <td>
                        {t.remainingErrorBudgetSlots === null
                          ? '—'
                          : t.remainingErrorBudgetSlots.toFixed(2)}{' '}
                        时段
                      </td>
                      <td>{t.status}</td>
                      <td>{t.latest?.reasons.join(', ') || t.latest?.status || '尚无样本'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-6">
            15
            分钟采样可能漏掉短时故障，不能代表连续在线率。来源组来自策略中的运营方分类，不等于已证明底层数据完全独立。历史达标率不决定当前交易能否执行。
          </p>
        </>
      )}
    </div>
  );
}
