/**
 * Per-key monthly credit-budget editor.
 *
 * Paid keys are credit-metered; this control lets the owner set a hard cap on
 * credits the key may consume per calendar month (0 = use wallet balance).
 * The cap is enforced inside the credit precheck/consume RPCs.
 *
 * Extracted from BillingPanel to keep that component under the
 * max-lines-per-function lint limit.
 */

import { useState } from 'react';

import { Save } from 'lucide-react';

import { Button } from '@/components/ui/Button';

interface KeyBudgetEditorProps {
  accessToken: string | null | undefined;
  keyId: string;
  defaultBudget: number | null;
  onSaved: () => void;
  onError: (message: string) => void;
}

export function KeyBudgetEditor({
  accessToken,
  keyId,
  defaultBudget,
  onSaved,
  onError,
}: KeyBudgetEditorProps) {
  const [value, setValue] = useState<string>(defaultBudget ? String(defaultBudget) : '');
  const [editing, setEditing] = useState(false);

  const save = async () => {
    if (!accessToken) return;

    try {
      const amount = value.trim() === '' ? null : Number(value);
      if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
        throw new Error('Budget must be a positive number');
      }

      const response = await fetch(`/api/user/api-keys/${keyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ budgetMonthly: amount }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to save budget');
      }

      setEditing(false);
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save budget');
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <label className="text-xs text-slate-500" htmlFor={`budget-${keyId}`}>
        Monthly budget (credits)
      </label>
      <input
        id={`budget-${keyId}`}
        type="number"
        min={1}
        step={1}
        placeholder={defaultBudget ? String(defaultBudget) : 'Unlimited'}
        value={value}
        disabled={!editing}
        onChange={(e) => setValue(e.target.value)}
        className="w-28 border border-slate-200 px-2.5 py-1.5 font-mono text-sm text-slate-700 focus:border-blue-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
      />
      {editing ? (
        <Button
          variant="secondary"
          size="sm"
          className="rounded-sm border-blue-200 text-blue-700 hover:bg-blue-50"
          leftIcon={<Save className="w-3.5 h-3.5" />}
          onClick={save}
        >
          Save
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="rounded-sm text-slate-500"
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>
      )}
    </div>
  );
}
