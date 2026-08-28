'use client';

import { useEffect, useState } from 'react';

import { AlertCircle, Loader2 } from 'lucide-react';

import { LendingSafetyPanel } from '@/components/safety/LendingSafetyPanel';
import type {
  LendingSafetyAction,
  ProtocolSafetyContext,
} from '@/lib/api/services/preTradeSafetyService';
import { useSession } from '@/stores/authStore';

/** Map protocol registry chain string → numeric chainId for the pre-trade API. */
const CHAIN_NAME_TO_ID: Record<string, number> = {
  ethereum: 1,
  mainnet: 1,
  arbitrum: 42161,
  base: 8453,
  bnb: 56,
  bsc: 56,
  polygon: 137,
  optimism: 10,
  avalanche: 43114,
  linea: 59144,
};

interface PreTradePayload {
  protocolSafety: ProtocolSafetyContext | null;
  recommendedActions: LendingSafetyAction[];
  // Decision summary + forward-looking signals surfaced from the live pre-trade
  // check so the position page shows not only "how far from liquidation" but
  // "is it safe to act right now" (verdict) and the predictive ML risk.
  verdict?: 'PASS' | 'CAUTION' | 'DANGER' | 'BLOCK';
  maxDeviationPct?: number;
  crossProviderAgreement?: number;
  participantCount?: number;
  manipulationRiskScore?: number;
  mlScore1h?: number | null;
  mlScore6h?: number | null;
  anomalyScore?: number;
}

export function LendingSafetySection({
  protocolId,
  asset,
  chain,
  amountUsd = 10000,
}: {
  protocolId: string;
  asset: string;
  chain: string;
  amountUsd?: number;
}) {
  const session = useSession();
  const [data, setData] = useState<PreTradePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chainId = CHAIN_NAME_TO_ID[chain?.toLowerCase() ?? ''];
  // Derive validity from inputs; if any required input is missing, render nothing
  // and skip the effect — avoids the setState-in-effect anti-pattern and any
  // flash of stale data from a previous position.
  const valid = Boolean(protocolId && asset && chainId);

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    // Reset loading + error at the start of each fetch — standard
    // fetch-on-deps-change pattern. The rule's "derive everything" advice
    // doesn't fit a fetch that legitimately needs to clear the previous result
    // before showing the new one; .then/.catch/.finally setStates are in async
    // callbacks and are not flagged.
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    const params = new URLSearchParams({
      asset,
      chainId: String(chainId),
      action: 'borrow',
      tradeAmountUsd: String(amountUsd),
      protocolId,
    });

    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    fetch(`/api/v1/safety/pre-trade?${params.toString()}`, { headers })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`${res.status} ${text || res.statusText}`);
        }
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const payload = json?.data as PreTradePayload | undefined;
        if (payload) {
          setData({
            protocolSafety: payload.protocolSafety ?? null,
            recommendedActions: payload.recommendedActions ?? [],
            verdict: payload.verdict,
            maxDeviationPct: payload.maxDeviationPct,
            crossProviderAgreement: payload.crossProviderAgreement,
            participantCount: payload.participantCount,
            manipulationRiskScore: payload.manipulationRiskScore,
            mlScore1h: payload.mlScore1h ?? null,
            mlScore6h: payload.mlScore6h ?? null,
            anomalyScore: payload.anomalyScore,
          });
        } else {
          setData({
            protocolSafety: null,
            recommendedActions: [],
            verdict: undefined,
            maxDeviationPct: undefined,
            crossProviderAgreement: undefined,
            participantCount: undefined,
            manipulationRiskScore: undefined,
            mlScore1h: null,
            mlScore6h: null,
            anomalyScore: undefined,
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [valid, protocolId, asset, chainId, amountUsd, session?.access_token]);

  if (!valid) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Pre-Trade Lending Check
        </h3>
        <span className="text-[10px] text-slate-400">
          is it safe to open / increase this borrow right now?
        </span>
      </div>

      {loading && !data && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Running pre-trade oracle safety check…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-2 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Pre-trade check unavailable: {error}</span>
        </div>
      )}

      {data && (data.protocolSafety || data.recommendedActions.length > 0 || data.verdict) && (
        <LendingSafetyPanel
          protocolSafety={data.protocolSafety}
          actions={data.recommendedActions}
          verdict={data.verdict}
          maxDeviationPct={data.maxDeviationPct}
          crossProviderAgreement={data.crossProviderAgreement}
          participantCount={data.participantCount}
          manipulationRiskScore={data.manipulationRiskScore}
          mlScore1h={data.mlScore1h}
          mlScore6h={data.mlScore6h}
          anomalyScore={data.anomalyScore}
        />
      )}

      {data &&
        !data.protocolSafety &&
        data.recommendedActions.length === 0 &&
        !data.verdict &&
        !loading &&
        !error && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Oracle dispersion within safe bounds for this borrow on {asset}.
          </div>
        )}
    </section>
  );
}
