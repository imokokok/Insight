'use client';

import { Key } from 'lucide-react';

import { ApiKeyManager } from '@/components/api-keys';
import { useSession } from '@/stores/authStore';

export function ApiKeysPanel() {
  const session = useSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    return (
      <div className="settings-record p-6 md:p-8">
        <p className="text-sm text-slate-500">Please sign in to manage your API keys.</p>
      </div>
    );
  }

  return (
    <section className="settings-record p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50">
          <Key className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">API Keys</h2>
          <p className="text-sm text-slate-500">Manage your API access credentials</p>
        </div>
      </div>
      <ApiKeyManager accessToken={accessToken} />
    </section>
  );
}
