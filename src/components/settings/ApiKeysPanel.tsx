'use client';

import { Key } from 'lucide-react';

import { ApiKeyManager } from '@/components/api-keys';
import { useSession } from '@/stores/authStore';

export function ApiKeysPanel() {
  const session = useSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
        <p className="text-sm text-slate-500">Please sign in to manage your API keys.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <Key className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">API Keys</h2>
          <p className="text-sm text-slate-500">Manage your API access credentials</p>
        </div>
      </div>
      <ApiKeyManager accessToken={accessToken} />
    </div>
  );
}
