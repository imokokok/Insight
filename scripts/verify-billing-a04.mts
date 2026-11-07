/* eslint-disable no-console */
/**
 * A04: prove the production database and the checked-out code are the same era.
 *
 * Reads one snapshot from `public.billing_schema_audit()` (migration 0129) over
 * the service-role REST client, then asserts applied migrations, the ledger
 * baseline, seven function signatures, two CHECK value sets, and the pending
 * settlement table. Every failure names the exact item that drifted; the exit
 * code is 1 if anything is red.
 *
 * Usage:
 *   npm run billing:verify:a04
 *   node --import tsx --env-file=.env.local scripts/verify-billing-a04.mts --baseline=2118
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * Read-only: the audit function only selects.
 */
import { readdir } from 'node:fs/promises';

import { createClient } from '@supabase/supabase-js';

import {
  DEFAULT_LEDGER_BASELINE,
  evaluateBillingAudit,
  formatAuditReport,
  type AuditSnapshot,
} from './lib/billing-a04-check';

function option(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((argument) => argument.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

async function repositoryHead(): Promise<string> {
  const files = await readdir(new URL('../supabase/migrations/', import.meta.url));
  const versions = files
    .map((file) => file.match(/^(\d{4})_/)?.[1])
    .filter((version): version is string => version !== undefined)
    .sort();
  if (versions.length === 0) throw new Error('no numbered migrations found in supabase/migrations');
  return versions.at(-1) as string;
}

function fail(message: string): never {
  console.error(`A04 FAILED: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    fail(
      'missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (load .env.local with --env-file)'
    );
  }

  const baseline = Number(option('baseline') ?? DEFAULT_LEDGER_BASELINE);
  if (!Number.isInteger(baseline) || baseline < 0) {
    fail(`--baseline must be a non-negative integer, got "${option('baseline')}"`);
  }

  const head = await repositoryHead();
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc('billing_schema_audit');

  if (error) {
    const missingFunction =
      error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? '');
    if (missingFunction) {
      fail(
        'public.billing_schema_audit() is not deployed: migration 0129 is not applied, ' +
          `so the database is older than the code (repository head ${head})`
      );
    }
    fail(`billing_schema_audit() failed: ${error.code ?? 'unknown'} ${error.message}`);
  }

  const snapshot = data as AuditSnapshot | null;
  if (!snapshot || !Array.isArray(snapshot.functions) || !Array.isArray(snapshot.migrations)) {
    fail('billing_schema_audit() returned an unexpected shape; redeploy migration 0129');
  }

  const checks = evaluateBillingAudit(snapshot, {
    repositoryHead: head,
    ledgerBaseline: baseline,
  });

  console.log(`A04 production billing schema audit — ${new URL(url).host}`);
  console.log(formatAuditReport(checks));

  if (checks.some((check) => !check.ok)) process.exit(1);
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
