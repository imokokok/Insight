'use client';

import { useState } from 'react';

import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  Shield,
  Zap,
  Crown,
  Clock,
  ExternalLink,
} from 'lucide-react';

import { useApiKeys, type ApiKeyItem } from '@/hooks/useApiKeys';

const PLAN_CONFIG = {
  free: {
    label: 'Free',
    icon: Shield,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    rateLimit: '60 req/min',
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    rateLimit: '600 req/min',
  },
  enterprise: {
    label: 'Enterprise',
    icon: Crown,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    rateLimit: '6,000 req/min',
  },
} as const;

const MAX_ACTIVE_KEYS = 5;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function ApiKeyRow({
  apiKey,
  onDelete,
}: {
  apiKey: ApiKeyItem;
  onDelete: (id: string, name: string) => void;
}) {
  const plan = PLAN_CONFIG[apiKey.plan] ?? PLAN_CONFIG.free;
  const PlanIcon = plan.icon;

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
      <div className={`w-10 h-10 rounded-md ${plan.bg} flex items-center justify-center`}>
        <PlanIcon className={`w-5 h-5 ${plan.color}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">{apiKey.name}</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${plan.bg} ${plan.color} border ${plan.border}`}
          >
            {plan.label}
          </span>
          {!apiKey.is_active && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-200">
              Revoked
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span className="font-mono">{apiKey.key_prefix}••••••••</span>
          <span>•</span>
          <span>{plan.rateLimit}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(apiKey.last_used_at)}
          </span>
        </div>
        {apiKey.usage && (
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span>24h: {apiKey.usage.last24h} requests</span>
            <span>7d: {apiKey.usage.last7d} requests</span>
          </div>
        )}
      </div>

      <button
        onClick={() => onDelete(apiKey.id, apiKey.name)}
        className="p-2 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
        title="Delete API key"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ApiKeyPanel() {
  const { keys, isLoading, error, createKey, deleteKey } = useApiKeys();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPlan, setNewKeyPlan] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [isCreating, setIsCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const activeKeys = keys.filter((k) => k.is_active);
  const canCreate = activeKeys.length < MAX_ACTIVE_KEYS;

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;

    setIsCreating(true);
    setLocalError(null);
    try {
      const result = await createKey(newKeyName.trim(), newKeyPlan);
      if (result && result.key) {
        setCreatedKey(result.key);
        setNewKeyName('');
        setNewKeyPlan('free');
        setShowCreateForm(false);
      } else {
        setLocalError('Failed to create API key');
      }
    } catch {
      setLocalError('Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setLocalError(null);
    try {
      const success = await deleteKey(deleteTarget.id);
      if (success) {
        setDeleteTarget(null);
      } else {
        setLocalError('Failed to delete API key');
      }
    } catch {
      setLocalError('Failed to delete API key');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setLocalError('Failed to copy to clipboard');
    }
  };

  const displayError = localError || error;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading API keys...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {createdKey && (
        <div className="bg-white rounded-lg border-2 border-green-300 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-green-100 bg-green-50/80">
            <h2 className="text-lg font-semibold text-green-900 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              API Key Created
            </h2>
            <p className="text-sm text-green-700 mt-1">
              Copy your API key now. You won&apos;t be able to see it again.
            </p>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-2 p-3 bg-gray-900 rounded-lg">
              <code className="flex-1 text-green-400 font-mono text-sm break-all">
                {createdKey}
              </code>
              <button
                onClick={() => handleCopy(createdKey)}
                className="p-2 text-gray-400 hover:text-white rounded transition-colors"
                title="Copy API key"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={() => {
                  setCreatedKey(null);
                  setCopied(false);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Done
              </button>
              <a
                href="/docs#developer"
                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                View API docs
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-gray-400" />
            API Keys
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage API keys for programmatic access
            {activeKeys.length > 0 && (
              <span className="ml-2 text-gray-400">
                ({activeKeys.length}/{MAX_ACTIVE_KEYS} active)
              </span>
            )}
          </p>
        </div>

        <div className="p-6">
          {displayError && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm mb-4">
              {displayError}
            </div>
          )}

          {!showCreateForm && canCreate && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md mb-4"
            >
              <Plus className="w-4 h-4" />
              Create API Key
            </button>
          )}

          {!canCreate && (
            <div className="p-3 bg-warning-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm mb-4">
              You&apos;ve reached the maximum of {MAX_ACTIVE_KEYS} active API keys. Delete an
              existing key to create a new one.
            </div>
          )}

          {showCreateForm && (
            <div className="p-4 bg-gray-50 rounded-lg mb-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production API"
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all duration-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    Object.entries(PLAN_CONFIG) as [
                      'free' | 'pro' | 'enterprise',
                      (typeof PLAN_CONFIG)['free'],
                    ][]
                  ).map(([planKey, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={planKey}
                        onClick={() => setNewKeyPlan(planKey)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          newKeyPlan === planKey
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${config.color}`} />
                          <span className="font-medium text-sm text-gray-900">{config.label}</span>
                        </div>
                        <span className="text-xs text-gray-500">{config.rateLimit}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCreate}
                  disabled={!newKeyName.trim() || isCreating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 disabled:opacity-50 text-sm font-medium"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewKeyName('');
                    setNewKeyPlan('free');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {keys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No API keys yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Create an API key to access the Insight API programmatically
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 -mx-6">
              {keys.map((apiKey) => (
                <ApiKeyRow
                  key={apiKey.id}
                  apiKey={apiKey}
                  onDelete={(id, name) => setDeleteTarget({ id, name })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-400" />
            Security
          </h2>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
            <span>API keys are hashed with SHA-256 before storage</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
            <span>The full key is only shown once at creation</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
            <span>Keys can be passed via x-api-key header or Authorization: Bearer</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
            <span>Expired keys are automatically deactivated</span>
          </div>
        </div>
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-danger-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-danger-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete API Key</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Are you sure you want to delete &quot;{deleteTarget.name}&quot;? This action
                    cannot be undone. Any applications using this key will lose access immediately.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
