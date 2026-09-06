'use client';

import { useState } from 'react';

import {
  CheckCircle2,
  Check,
  Copy,
  Loader2,
  Radar,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useAppUrl } from '@/hooks/useAppUrl';
import { useSession } from '@/stores/authStore';

type Verdict = 'normal' | 'caution' | 'danger';
type MlRiskLevel = 'low' | 'medium' | 'high';
type TrustLevel = 'low' | 'medium' | 'high';

/**
 * The signed receipt the endpoint returns alongside the signal. Null when no
 * attester key is configured — signing is additive and never changes a verdict.
 */
interface WatchAttestation {
  uid: string;
  schemaVersion: 1 | 2;
  attester: string;
  attesterLabel: string;
  validUntil: number;
  validForSeconds: number;
  signature: string;
  verifyUrl: string;
}

interface OracleWatchSignal {
  symbol: string;
  chain: string | null;
  verdict: Verdict;
  recommendation: 'proceed' | 'proceed_with_caution' | 'halt';
  maxDeviationPct: number | null;
  agreement: number;
  participantCount: number;
  outlierCount: number;
  staleCount: number;
  consensusPrice: number | null;
  reason: string;
  /**
   * Optional because this is a client component reading a live JSON payload:
   * an older deployment (or a cached response) may not carry them yet, and the
   * demo must render rather than crash on a missing field.
   */
  reasonCodes?: string[];
  requiredParticipantCount?: number;
  sourceGroupCount?: number;
  requiredSourceGroupCount?: number;
  independenceSatisfied?: boolean;
  attestation?: WatchAttestation | null;
  mlRiskScore: number | null;
  mlScore1h: number | null;
  mlScore6h: number | null;
  mlRiskLevel: MlRiskLevel | null;
  avgReputation: number | null;
  minReputation: number | null;
  quorumSatisfied: boolean;
  trustScore: number;
  trustLevel: TrustLevel;
  providers: Array<{
    provider: string;
    status: 'success' | 'unsupported' | 'error';
    deviationPct: number | null;
    isOutlier: boolean;
    isStale: boolean;
  }>;
  evaluatedAt: string;
}

const CHAIN_OPTIONS = [
  { label: 'Any chain', value: '' },
  { label: 'Ethereum', value: 'ethereum' },
  { label: 'Arbitrum', value: 'arbitrum' },
  { label: 'Optimism', value: 'optimism' },
  { label: 'Base', value: 'base' },
  { label: 'BNB Chain', value: 'bnb-chain' },
  { label: 'Avalanche', value: 'avalanche' },
  { label: 'Polygon', value: 'polygon' },
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
  normal: {
    label: 'NORMAL',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle2,
    summary: 'Cross-oracle data is healthy and consistent. Safe to keep depending on the feed.',
  },
  caution: {
    label: 'CAUTION',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: ShieldCheck,
    summary: 'Minor divergence, outliers or staleness detected. Consider reducing exposure.',
  },
  danger: {
    label: 'DANGER',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: ShieldAlert,
    summary: 'Significant oracle risk — or no cross-oracle coverage. Pause dependent operations.',
  },
};

function formatUsd(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function formatPct(n: number, withSign = true): string {
  return `${n >= 0 && withSign ? '+' : ''}${n.toFixed(2)}%`;
}

export function OracleWatchDemo({ apiKey }: { apiKey?: string }) {
  const session = useSession();
  const [asset, setAsset] = useState('ETH');
  const [chain, setChain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OracleWatchSignal | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runWatch() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params = new URLSearchParams({ symbol: asset });
      if (chain) params.set('chain', chain);
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      } else if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      const res = await fetch(`/api/v1/oracle-watch?${params.toString()}`, { headers });
      const json = await res.json();

      if (!res.ok || !json.success) {
        const code = json?.error?.code ?? 'UNKNOWN';
        const message = json?.error?.message ?? 'Request failed';
        setError(`${code}: ${message}`);
        return;
      }

      setResult(json.data as OracleWatchSignal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  const canCall = Boolean(session?.access_token || apiKey);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ---- Form ---- */}
        <div className="space-y-5">
          <div>
            <label
              htmlFor="oracle-watch-asset"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Asset
            </label>
            <input
              id="oracle-watch-asset"
              type="text"
              value={asset}
              onChange={(e) => setAsset(e.target.value.toUpperCase())}
              placeholder="ETH"
              className="w-full border border-slate-900/20 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="oracle-watch-chain"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Chain (optional)
            </label>
            <select
              id="oracle-watch-chain"
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              className="w-full border border-slate-900/20 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {CHAIN_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={runWatch}
            disabled={loading || !canCall}
            className="inline-flex w-full items-center justify-center gap-2 border border-blue-700 bg-blue-700 px-5 py-3 font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Watching cross-oracle feeds…
              </>
            ) : (
              <>
                <Radar className="w-4 h-4" />
                Run Oracle Watch
              </>
            )}
          </Button>

          {!canCall && (
            <p className="text-xs text-slate-500 text-center">
              Sign in or provide an API key below to run a live check.
            </p>
          )}
          {error && (
            <div className="flex items-start gap-2 border-l-2 border-red-500 bg-red-50 p-3 text-sm text-red-700">
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="font-mono">{error}</span>
            </div>
          )}
        </div>

        {/* ---- Result ---- */}
        <div className="space-y-4">
          {!result && !loading && (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center border-y border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Radar className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500 max-w-xs">
                Pick an asset and run Oracle Watch. Insight aggregates live cross-oracle deviation,
                agreement, quorum, outliers and staleness into one verdict an agent can gate on.
              </p>
            </div>
          )}

          {result && <OracleWatchSignalCard result={result} />}
        </div>
      </div>

      <CallingMethods asset={asset} chain={chain} />
    </div>
  );
}

function OracleWatchSignalCard({ result }: { result: OracleWatchSignal }) {
  const cfg = VERDICT_CONFIG[result.verdict];
  const Icon = cfg.icon;

  return (
    <div className="space-y-4">
      <div className={`border-l-2 border-y border-r p-5 ${cfg.border} ${cfg.bg}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Icon className={`w-7 h-7 ${cfg.color}`} />
            <div>
              <div className={`text-xl font-bold ${cfg.color}`}>{cfg.label}</div>
              <div className="text-xs text-slate-600">{cfg.summary}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Recommendation</div>
            <div className="text-sm font-mono font-medium text-slate-800">
              {result.recommendation}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Metric
            label="Consensus Price"
            value={result.consensusPrice !== null ? `$${formatUsd(result.consensusPrice)}` : 'n/a'}
          />
          <Metric
            label="Max Deviation"
            value={result.maxDeviationPct !== null ? formatPct(result.maxDeviationPct) : 'n/a'}
            warn={(result.maxDeviationPct ?? 0) >= 3}
          />
          <Metric
            label="Provider Agreement"
            value={`${(result.agreement * 100).toFixed(1)}%`}
            warn={result.agreement < 0.85}
          />
          <Metric
            label="Consensus Providers"
            value={
              result.requiredParticipantCount
                ? `${result.participantCount} / ${result.requiredParticipantCount}`
                : String(result.participantCount)
            }
            warn={!result.quorumSatisfied}
          />
          <Metric
            label="Quorum"
            value={result.quorumSatisfied ? 'met' : 'short'}
            warn={!result.quorumSatisfied}
          />
          {/* Independence is a different axis from headcount: three responses can
              come from one operator. */}
          <Metric
            label="Independent Groups"
            value={
              result.sourceGroupCount !== undefined && result.requiredSourceGroupCount !== undefined
                ? `${result.sourceGroupCount} / ${result.requiredSourceGroupCount}`
                : 'n/a'
            }
            warn={result.independenceSatisfied === false}
          />
          <Metric
            label="Trust Score"
            value={`${result.trustScore}/100`}
            warn={result.trustScore < 50}
          />
          <Metric
            label="Outliers"
            value={String(result.outlierCount)}
            warn={result.outlierCount > 0}
          />
          <Metric label="Stale" value={String(result.staleCount)} warn={result.staleCount > 0} />
          <Metric
            label="Avg Reputation"
            value={result.avgReputation !== null ? result.avgReputation.toFixed(1) : 'n/a'}
            warn={(result.avgReputation ?? 100) < 60}
          />
          <Metric
            label="Min Reputation"
            value={result.minReputation !== null ? result.minReputation.toFixed(1) : 'n/a'}
            warn={(result.minReputation ?? 100) < 50}
          />
        </div>

        <div className="mt-3 pt-3 border-t border-slate-200/70">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Credibility Trust Score
            </span>
            <span
              className={`text-[11px] font-semibold uppercase ${
                result.trustLevel === 'high'
                  ? 'text-emerald-600'
                  : result.trustLevel === 'medium'
                    ? 'text-amber-600'
                    : 'text-red-600'
              }`}
            >
              {result.trustLevel} · {result.trustScore}/100
            </span>
          </div>
          <div className="h-2 overflow-hidden bg-slate-200">
            <div
              className={`h-full ${
                result.trustLevel === 'high'
                  ? 'bg-emerald-500'
                  : result.trustLevel === 'medium'
                    ? 'bg-amber-400'
                    : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(4, result.trustScore))}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            composite of quorum · agreement · deviation · ML risk · reputation · cleanliness
          </div>
        </div>

        {result.mlRiskScore !== null && result.mlRiskLevel !== null && (
          <div className="mt-3 pt-3 border-t border-slate-200/70">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                ML Manipulation Risk (advisory)
              </span>
              <span className="text-[11px] font-semibold uppercase text-slate-400">
                score {result.mlRiskScore.toFixed(3)}
              </span>
            </div>
            <div className="h-2 overflow-hidden bg-slate-200">
              <div
                className={`h-full ${
                  result.mlRiskLevel === 'high'
                    ? 'bg-red-500'
                    : result.mlRiskLevel === 'medium'
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(4, result.mlRiskScore * 100))}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Level:{' '}
                <span
                  className={`font-semibold uppercase ${
                    result.mlRiskLevel === 'high'
                      ? 'text-red-600'
                      : result.mlRiskLevel === 'medium'
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                  }`}
                >
                  {result.mlRiskLevel}
                </span>{' '}
                · 1h {result.mlScore1h?.toFixed(3)} · 6h {result.mlScore6h?.toFixed(3)}
              </span>
              <span className="text-[10px] text-slate-400">
                forward-looking, does not override verdict
              </span>
            </div>
          </div>
        )}

        <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center gap-1.5 text-[11px] text-slate-500">
          <Radar className="w-3 h-3" />
          <span>
            Reason: <span className="font-mono text-slate-600">{result.reason}</span> · evaluated at{' '}
            <span className="font-mono">{new Date(result.evaluatedAt).toLocaleTimeString()}</span>
          </span>
        </div>

        {result.reasonCodes && result.reasonCodes.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Codes:</span>
            {result.reasonCodes.map((code) => (
              <span
                key={code}
                className="px-1.5 py-0.5 text-[10px] font-mono font-medium bg-slate-100 text-slate-600 rounded"
              >
                {code}
              </span>
            ))}
          </div>
        )}
      </div>

      {result.providers.length > 0 && (
        <div className="overflow-hidden border-y border-slate-900/15 bg-white/55">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <h4 className="text-sm font-semibold text-slate-700">
              Provider Breakdown ({result.participantCount} responding)
            </h4>
          </div>
          <div className="divide-y divide-slate-100">
            {result.providers.map((p) => (
              <div
                key={p.provider}
                className="px-4 py-2.5 flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 capitalize">{p.provider}</span>
                  {p.isOutlier && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded">
                      OUTLIER
                    </span>
                  )}
                  {p.isStale && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
                      STALE
                    </span>
                  )}
                  {p.status !== 'success' && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded">
                      {p.status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 font-mono text-xs text-slate-600">
                  <span>{p.status === 'success' ? 'ok' : p.status}</span>
                  <span
                    className={
                      p.deviationPct !== null && Math.abs(p.deviationPct) >= 3
                        ? 'text-red-600 font-semibold'
                        : ''
                    }
                  >
                    {p.deviationPct === null ? 'n/a' : formatPct(p.deviationPct)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.attestation && (
        <div className="overflow-hidden border-y border-slate-900/15 bg-white/55">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700">
              Signed Receipt (EIP-712 · v{result.attestation.schemaVersion})
            </h4>
            <span className="border-l-2 border-emerald-500 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              verifiable
            </span>
          </div>
          <div className="px-4 py-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 shrink-0">UID</span>
              <span className="font-mono text-slate-700 truncate">{result.attestation.uid}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 shrink-0">Attester</span>
              <span className="font-mono text-slate-700 truncate">
                {result.attestation.attester}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 shrink-0">Valid until</span>
              <span className="font-mono text-slate-700">
                {new Date(result.attestation.validUntil * 1000).toLocaleTimeString()}
                <span className="text-slate-400">
                  {' '}
                  · {result.attestation.validForSeconds}s window
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 shrink-0">Signature</span>
              <span className="font-mono text-slate-700 truncate">
                {result.attestation.signature.slice(0, 42)}…
              </span>
            </div>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-500">
            Verify independently:{' '}
            <span className="font-mono text-slate-600 break-all">
              POST {result.attestation.verifyUrl}
            </span>{' '}
            with <span className="font-mono">{'{ "attestation": <receipt> }'}</span>. Schemas and
            public keys are published at{' '}
            <span className="font-mono text-slate-600">/.well-known/oracle-keys.json</span>.
          </div>
        </div>
      )}
    </div>
  );
}

function CallingMethods({ asset, chain }: { asset: string; chain: string }) {
  const [tab, setTab] = useState<'mcp' | 'rest'>('mcp');
  const [copied, setCopied] = useState(false);
  const baseUrl = useAppUrl();
  const safeChain = chain || 'ethereum';

  const mcpSnippet = `Call the MCP tool:
tool: oracle_watch
{
  "symbol": "${asset.toUpperCase()}",
  "chain": "${safeChain}"
}

The agent returns a machine-readable verdict:
- Verdict: NORMAL | CAUTION | DANGER
- Recommendation: proceed | proceed_with_caution | halt
- Reason: within_tolerance | deviation_agreement_outlier_or_stale | deviation_or_agreement_breached_danger | insufficient_cross_oracle_quorum | ml_forward_risk_high | no_cross_oracle_coverage
Also gate on the composite Credibility Trust Score (0-100, low|medium|high).`;

  const restSnippet = `curl -X GET "${baseUrl}/api/v1/oracle-watch?symbol=${encodeURIComponent(asset.toUpperCase())}&chain=${safeChain}" \\
  -H "X-API-Key: ins_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Accept: application/json"

# Response: { "data": {
#   "verdict": "normal|caution|danger",
#   "recommendation": "proceed|proceed_with_caution|halt",
#   "maxDeviationPct": 0.42,
#   "agreement": 0.99,
#   "participantCount": 4,
#   "outlierCount": 0,
#   "staleCount": 0,
#   "mlRiskScore": 0.08,         # forward-looking manipulation risk (advisory)
#   "mlRiskLevel": "low",
#   "avgReputation": 92.5,
#   "minReputation": 88.0,
#   "quorumSatisfied": true,     # >= 3 independent providers
#   "trustScore": 88,            # composite credibility rating 0-100
#   "trustLevel": "high",
#   "providers": [ ... ]
# } }`;

  const code = tab === 'mcp' ? mcpSnippet : restSnippet;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="overflow-hidden border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab('mcp')}
            className={`border px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === 'mcp'
                ? 'border-slate-600 bg-slate-700 text-white'
                : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            MCP · oracle_watch
          </button>
          <button
            type="button"
            onClick={() => setTab('rest')}
            className={`border px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === 'rest'
                ? 'border-slate-600 bg-slate-700 text-white'
                : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            REST · /api/v1/oracle-watch
          </button>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-xs text-slate-200 overflow-x-auto font-mono leading-relaxed max-h-[440px]">
        <code>{code}</code>
      </pre>
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
