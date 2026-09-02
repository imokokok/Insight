'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { AlertCircle, Check, Coins, Copy, Gift, Key, Loader2, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { PLANS, isTrialActive, normalizePlan } from '@/lib/billing/plans';

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  plan: string;
  rateLimit: number;
  monthlyQuotaUsed: number;
  quotaResetAt: string;
  trialEndsAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

interface CreatedKey {
  id: string;
  name: string;
  prefix: string;
  plainKey: string;
  rateLimit: number;
  createdAt: string;
}

const PLAN_BADGE_STYLES: Record<string, string> = {
  free: 'bg-slate-100 text-slate-700',
  pro: 'bg-blue-100 text-blue-700',
  protocol: 'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

interface ApiKeyManagerProps {
  accessToken: string;
  showHeader?: boolean;
  className?: string;
}

export function ApiKeyManager({
  accessToken,
  showHeader = false,
  className = '',
}: ApiKeyManagerProps) {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/api-keys', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load API keys');
      }

      setKeys(result.data.keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || creating) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to create API key');
      }

      setCreatedKey({
        id: result.data.key.id,
        name: result.data.key.name,
        prefix: result.data.key.prefix,
        plainKey: result.data.plainKey,
        rateLimit: result.data.key.rateLimit,
        createdAt: result.data.key.createdAt,
      });
      setNewKeyName('');
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to revoke this API key? This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/user/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to revoke API key');
      }

      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return 'Never';
    return new Date(value).toLocaleString();
  };

  const order: Array<'free' | 'pro' | 'protocol' | 'enterprise'> = [
    'free',
    'pro',
    'protocol',
    'enterprise',
  ];
  const topPlan =
    keys.length === 0
      ? 'free'
      : normalizePlan(
          keys.reduce((top, k) => {
            const kPlan = normalizePlan(k.plan);
            return order.indexOf(kPlan) > order.indexOf(normalizePlan(top)) ? k.plan : top;
          }, keys[0].plan)
        );
  const topPlanConfig = PLANS[topPlan];
  const hasTrial = keys.some((k) => isTrialActive(k.trialEndsAt));

  return (
    <div className={className}>
      {showHeader && (
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">API Keys</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Create and manage API keys to access the Insight API. Each key is free to use within
                the rate limit.
              </p>
            </div>
          </div>
        </div>
      )}

      {createdKey && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-900">Copy your API key now</h3>
              <p className="text-sm text-amber-800 mt-1">
                This is the only time you will see the full key. Store it somewhere safe.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 block px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm font-mono text-slate-900 break-all">
                  {createdKey.plainKey}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(createdKey.plainKey)}
                  className="shrink-0 rounded-xl border-amber-200 text-amber-800 hover:bg-amber-100"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCreatedKey(null)}
                className="mt-3 text-amber-900 hover:bg-amber-100 rounded-lg"
              >
                I have copied my key
              </Button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} className="mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g. Local Development"
            maxLength={100}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-900 placeholder-slate-400 transition-all"
          />
          <Button
            type="submit"
            disabled={creating || !newKeyName.trim()}
            leftIcon={
              creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />
            }
            className="shrink-0 rounded-xl"
          >
            Create Key
          </Button>
        </div>
      </form>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Key className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No API keys yet. Create one above to get started.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Rate Limit
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Monthly Usage
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Last Used
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {keys.map((key) => {
                const keyPlan = normalizePlan(key.plan);
                const planConfig = PLANS[keyPlan];
                const quotaLimit = planConfig.monthlyQuota;
                const quotaPct =
                  quotaLimit > 0 ? Math.min(100, (key.monthlyQuotaUsed / quotaLimit) * 100) : 0;
                const isCredited = keyPlan !== 'free';
                const trialActive = isTrialActive(key.trialEndsAt);

                return (
                  <tr key={key.id}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{key.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                          PLAN_BADGE_STYLES[keyPlan] ?? PLAN_BADGE_STYLES.free
                        }`}
                      >
                        {planConfig.name}
                      </span>
                      {trialActive && (
                        <span
                          className="ml-1.5 inline-flex items-center text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded"
                          title={`Trial ends ${new Date(key.trialEndsAt!).toLocaleDateString()}`}
                        >
                          <Gift className="w-3 h-3 mr-0.5" />
                          trial
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 font-mono">
                      {key.prefix}••••••••
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{key.rateLimit}/min</td>
                    <td className="px-4 py-3">
                      {isCredited ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md whitespace-nowrap">
                          <Coins className="w-3.5 h-3.5" />
                          Credit-metered
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-[80px] max-w-[120px] bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                quotaPct > 80
                                  ? 'bg-red-500'
                                  : quotaPct > 50
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                              }`}
                              style={{ width: `${quotaPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 whitespace-nowrap tabular-nums">
                            {key.monthlyQuotaUsed.toLocaleString()}/
                            {quotaLimit > 0 ? quotaLimit.toLocaleString() : '∞'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {formatDate(key.lastUsedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(key.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600">
        <p className="font-semibold text-slate-900 mb-1">{topPlanConfig.name} plan</p>
        {hasTrial ? (
          <p>
            You have an active Pro Trial. Upgrade at{' '}
            <Link
              href="/settings?tab=billing"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Settings → Billing
            </Link>{' '}
            to keep your higher limits after the trial ends.
          </p>
        ) : topPlan === 'free' ? (
          <p>
            Free tier: {topPlanConfig.monthlyQuota.toLocaleString()} calls/month,{' '}
            {topPlanConfig.rateLimit}/min. Need higher limits?{' '}
            <Link href="/api#pricing" className="text-blue-600 hover:text-blue-700 font-medium">
              Upgrade to Pro
            </Link>{' '}
            (49 USDC/mo) or{' '}
            <Link
              href="/settings?tab=billing"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              claim a 7-day Pro Trial
            </Link>
            .
          </p>
        ) : (
          <p>
            Manage your subscription at{' '}
            <Link
              href="/settings?tab=billing"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Settings → Billing
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
