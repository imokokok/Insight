'use client';

import { useState } from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Sparkles,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useSession } from '@/stores/authStore';

type Verdict = 'PASS' | 'CAUTION' | 'DANGER' | 'BLOCK';

interface ProviderPrice {
  price: number;
  deviationPct: number | null;
  isOutlier: boolean;
  dataAgeSeconds: number | null;
  isStale: boolean;
  confidence: number | null;
  reputationScore: number | null;
  status: 'success' | 'unsupported' | 'error';
}

interface ContributingFactor {
  rule: string;
  value: number;
  threshold: number;
  triggeredVerdict: 'CAUTION' | 'DANGER' | 'BLOCK';
  message: string;
}

interface DepegWarning {
  stablecoin: string;
  deviationPct: number;
  riskLevel: string;
}

interface SafetyResult {
  verdict: Verdict;
  consensusPrice: number;
  maxDeviationPct: number;
  manipulationRiskScore: number;
  staleDataRisk: boolean;
  crossProviderAgreement: number;
  recommendedMaxPositionUsd: number;
  participantCount: number;
  providerPrices: Record<string, ProviderPrice>;
  depegWarnings: DepegWarning[];
  warnings: string[];
  contributingFactors: ContributingFactor[];
  evaluatedAt: string;
  latencyMs: number;
  /** ML risk-score probability (0..1) when the model is active, else null. */
  mlScore: number | null;
  /** trainedAt of the model that produced mlScore; null when no model active. */
  mlModelVersion: string | null;
}

const CHAIN_OPTIONS = [
  { label: 'Ethereum', value: 1 },
  { label: 'Arbitrum', value: 42161 },
  { label: 'Base', value: 8453 },
  { label: 'BNB Chain', value: 56 },
  { label: 'Polygon', value: 137 },
  { label: 'Optimism', value: 10 },
  { label: 'Avalanche', value: 43114 },
  { label: 'Chain-agnostic', value: 0 },
];

const ACTION_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Swap', value: 'swap' },
  { label: 'Borrow', value: 'borrow' },
  { label: 'Lend', value: 'lend' },
  { label: 'Liquidate', value: 'liquidate' },
  { label: 'Repay', value: 'repay' },
];

const VERDICT_CONFIG: Record<
  Verdict,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: typeof ShieldCheck;
    summary: string;
  }
> = {
  PASS: {
    label: 'PASS',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle2,
    summary: 'Oracle data is healthy. Safe to proceed.',
  },
  CAUTION: {
    label: 'CAUTION',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: ShieldCheck,
    summary: 'Minor risk signals detected. Consider reducing size.',
  },
  DANGER: {
    label: 'DANGER',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: ShieldAlert,
    summary: 'Significant oracle risk. Do not execute without review.',
  },
  BLOCK: {
    label: 'BLOCK',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: ShieldX,
    summary: 'Critical risk. Do not execute. Oracle may be manipulated.',
  },
};

function formatUsd(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatPct(n: number, withSign = true): string {
  return `${n >= 0 && withSign ? '+' : ''}${n.toFixed(2)}%`;
}

export function PreTradeSafetyDemo({ apiKey }: { apiKey?: string }) {
  const session = useSession();
  const [asset, setAsset] = useState('ETH');
  const [chainId, setChainId] = useState(1);
  const [action, setAction] = useState('swap');
  const [amount, setAmount] = useState('100000');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SafetyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runCheck() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params = new URLSearchParams({
        asset,
        chainId: String(chainId),
        action,
        tradeAmountUsd: amount,
      });
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      } else if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      const res = await fetch(`/api/v1/safety/pre-trade?${params.toString()}`, { headers });
      const json = await res.json();

      if (!res.ok || !json.success) {
        const code = json?.error?.code ?? 'UNKNOWN';
        const message = json?.error?.message ?? 'Request failed';
        if (res.status === 401 || res.status === 402) {
          setError(`${code}: ${message}`);
        } else {
          setError(`${code}: ${message}`);
        }
        return;
      }

      setResult(json.data as SafetyResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  const canCall = Boolean(session?.access_token || apiKey);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* ---- Form ---- */}
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Asset</label>
          <input
            type="text"
            value={asset}
            onChange={(e) => setAsset(e.target.value.toUpperCase())}
            placeholder="ETH"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Chain</label>
            <select
              value={chainId}
              onChange={(e) => setChainId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CHAIN_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {ACTION_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Trade size (USD)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              $
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100000"
              className="w-full pl-7 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            />
          </div>
        </div>

        <Button
          onClick={runCheck}
          disabled={loading || !canCall}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking oracle integrity…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Run Pre-Trade Safety Check
            </>
          )}
        </Button>

        {!canCall && (
          <p className="text-xs text-slate-500 text-center">
            Sign in or provide an API key below to run a live check.
          </p>
        )}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="font-mono">{error}</span>
          </div>
        )}
      </div>

      {/* ---- Result ---- */}
      <div className="space-y-4">
        {!result && !loading && (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
            <ShieldCheck className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500 max-w-xs">
              Fill in the trade intent and run a check. Insight will aggregate cross-oracle
              consensus, deviation, freshness and depeg signals into a single safety verdict.
            </p>
          </div>
        )}

        {result && <VerdictCard result={result} />}
      </div>
    </div>
  );
}

function VerdictCard({ result }: { result: SafetyResult }) {
  const cfg = VERDICT_CONFIG[result.verdict];
  const Icon = cfg.icon;

  return (
    <div className="space-y-4">
      <div className={`p-5 rounded-2xl border-2 ${cfg.border} ${cfg.bg}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Icon className={`w-7 h-7 ${cfg.color}`} />
            <div>
              <div className={`text-xl font-bold ${cfg.color}`}>{cfg.label}</div>
              <div className="text-xs text-slate-600">{cfg.summary}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Latency</div>
            <div className="text-sm font-mono text-slate-700">{result.latencyMs}ms</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Metric label="Consensus Price" value={`$${formatUsd(result.consensusPrice)}`} />
          <Metric
            label="Max Deviation"
            value={formatPct(result.maxDeviationPct)}
            warn={Math.abs(result.maxDeviationPct) >= 3}
          />
          <Metric
            label="Provider Agreement"
            value={`${(result.crossProviderAgreement * 100).toFixed(1)}%`}
            warn={result.crossProviderAgreement < 0.85}
          />
          <Metric
            label="Manipulation Risk"
            value={result.manipulationRiskScore.toFixed(2)}
            warn={result.manipulationRiskScore >= 0.4}
          />
          <Metric
            label="Stale Data Risk"
            value={result.staleDataRisk ? 'Yes' : 'No'}
            warn={result.staleDataRisk}
          />
          <Metric
            label="Recommended Max"
            value={`$${formatUsd(result.recommendedMaxPositionUsd)}`}
          />
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center gap-1.5 text-[11px] text-slate-500">
          <Sparkles className="w-3 h-3" />
          {result.mlModelVersion ? (
            <span>Risk score: ML-assisted · model retrains every 3 days</span>
          ) : (
            <span>Risk score: rule-based engine</span>
          )}
        </div>
      </div>

      {Object.keys(result.providerPrices).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <h4 className="text-sm font-semibold text-slate-700">
              Provider Breakdown ({result.participantCount} providers)
            </h4>
          </div>
          <div className="divide-y divide-slate-100">
            {Object.entries(result.providerPrices).map(([provider, d]) => (
              <div key={provider} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{provider}</span>
                  {d.isOutlier && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded">
                      OUTLIER
                    </span>
                  )}
                  {d.isStale && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
                      STALE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 font-mono text-xs text-slate-600">
                  <span>${formatUsd(d.price)}</span>
                  <span
                    className={
                      d.deviationPct !== null && Math.abs(d.deviationPct) >= 3
                        ? 'text-red-600 font-semibold'
                        : ''
                    }
                  >
                    {d.deviationPct === null ? 'n/a' : formatPct(d.deviationPct)}
                  </span>
                  <span>{d.dataAgeSeconds === null ? 'n/a' : `${d.dataAgeSeconds}s`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.contributingFactors.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-slate-700">Triggered Risk Factors</h4>
          </div>
          <ul className="space-y-1.5">
            {result.contributingFactors.map((f, i) => (
              <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${
                    f.triggeredVerdict === 'BLOCK'
                      ? 'bg-red-100 text-red-700'
                      : f.triggeredVerdict === 'DANGER'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {f.triggeredVerdict}
                </span>
                <span>{f.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.depegWarnings.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Active Stablecoin Depeg</h4>
          <div className="flex flex-wrap gap-2">
            {result.depegWarnings.map((w) => (
              <span
                key={w.stablecoin}
                className="px-2.5 py-1 text-xs font-mono bg-slate-100 text-slate-700 rounded-lg"
              >
                {w.stablecoin}: {formatPct(w.deviationPct)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`font-mono font-medium ${warn ? 'text-red-600' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  );
}
