/**
 * Pure assertions behind `scripts/verify-billing-a04.mts`.
 *
 * The CLI only fetches one snapshot from `public.billing_schema_audit()` and
 * this module decides pass/fail, so the red behaviour can be tested without a
 * production credential.
 */

export type AuditFunction = {
  name: string;
  args: string;
  result: string;
};

export type AuditSnapshot = {
  migrations: string[];
  ledgerRows: number;
  ledgerMaxId: number | string | null;
  functions: AuditFunction[];
  constraints: Record<string, string>;
  pendingTable: boolean;
  pendingRows: number | null;
};

export type AuditCheck = {
  id: string;
  ok: boolean;
  detail: string;
};

export type AuditOptions = {
  /** Highest migration present in the checked-out repository. */
  repositoryHead: string;
  /** Ledger rows accepted at the A04 baseline; fewer means history was rewritten. */
  ledgerBaseline: number;
};

/**
 * Migrations this check must find applied. 0122 widened the acquisition
 * allowlist, 0123-0128 established the credit ledger semantics, 0129 adds
 * the audit function itself, and 0130 adds the product 24h concurrency caps
 * trigger (owned by the product line; it must be merged before this audit is
 * green in production).
 */
export const REQUIRED_MIGRATIONS = [
  '0122',
  '0123',
  '0124',
  '0125',
  '0126',
  '0127',
  '0128',
  '0129',
  '0130',
] as const;

/**
 * The migration head the audit pins. 0130 belongs to the 24h concurrency caps
 * trigger; new migrations start at 0131. A database or checkout at any other
 * head means the two histories have diverged, so the audit must not be green.
 */
export const EXPECTED_HEAD = REQUIRED_MIGRATIONS[REQUIRED_MIGRATIONS.length - 1];

export const DEFAULT_LEDGER_BASELINE = 2118;

/**
 * Final credit-billing contract after the 0123-0128 chain. Any migration that
 * rebuilds one of these from an older snapshot must keep or deliberately
 * update this list; otherwise PostgREST callers break silently.
 */
export const EXPECTED_FUNCTIONS: Record<string, { args: string; result: string }> = {
  add_monthly_credits: { args: '', result: 'integer' },
  consume_credits: {
    args: 'p_key_id uuid, p_cost numeric, p_metering_key text, p_ref text, p_source text, p_reason text, p_request_id text, p_meta jsonb',
    result: 'jsonb',
  },
  top_up_credits: {
    args: 'p_user_id uuid, p_amount numeric, p_metering_key text, p_kind text, p_ref text, p_source text, p_reason text, p_request_id text, p_meta jsonb',
    result: 'numeric',
  },
  precheck_credits: {
    args: 'p_key_id uuid, p_cost numeric',
    result: 'jsonb',
  },
  record_pending_settlement: {
    args: 'p_key_id uuid, p_cost numeric, p_metering_key text, p_ref text, p_source text, p_reason text, p_request_id text, p_meta jsonb, p_error text',
    result: 'bigint',
  },
  settle_pending_credits: {
    args: 'p_limit integer',
    result: 'jsonb',
  },
  record_waived_credit: {
    args: 'p_key_id uuid, p_metering_key text, p_ref text, p_source text, p_reason text, p_request_id text, p_meta jsonb',
    result: 'jsonb',
  },
};

export const EXPECTED_CHECK_VALUES: Record<string, string[]> = {
  credit_ledger_source_check: ['signup', 'x402', 'subscription', 'wallet', 'free'],
  credit_ledger_kind_check: ['topup', 'usage', 'refund', 'grant', 'waiver'],
};

function sorted(values: string[]): string[] {
  return [...values].sort();
}

function diff(expected: string[], actual: string[]): string {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = expected.filter((value) => !actualSet.has(value));
  const unexpected = actual.filter((value) => !expectedSet.has(value));
  const parts: string[] = [];
  if (missing.length > 0) parts.push(`missing [${missing.join(', ')}]`);
  if (unexpected.length > 0) parts.push(`unexpected [${unexpected.join(', ')}]`);
  return parts.length === 0 ? `${expected.length} values match` : parts.join('; ');
}

function checkMigrations(snapshot: AuditSnapshot, repositoryHead: string): AuditCheck[] {
  const applied = new Set(snapshot.migrations.map((version) => version.trim()));
  const missing = REQUIRED_MIGRATIONS.filter((version) => !applied.has(version));
  const sortedVersions = sorted(snapshot.migrations);
  const databaseHead = sortedVersions.length > 0 ? sortedVersions[sortedVersions.length - 1] : null;

  const required: AuditCheck = {
    id: 'migrations.required',
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? `${REQUIRED_MIGRATIONS[0]}..${REQUIRED_MIGRATIONS.at(-1)} all applied (${applied.size} versions recorded)`
        : `missing ${missing.join(', ')} (database head ${databaseHead ?? 'unknown'})`,
  };

  let headDetail: string;
  let headOk = false;
  if (databaseHead === null) {
    headDetail = `no migration history recorded; expected ${repositoryHead}`;
  } else if (databaseHead === repositoryHead) {
    headOk = true;
    headDetail = `database head ${databaseHead} matches repository head`;
  } else if (databaseHead < repositoryHead) {
    headDetail = `database head ${databaseHead} is behind repository head ${repositoryHead}: apply the newer migrations`;
  } else {
    headDetail = `database head ${databaseHead} is ahead of repository head ${repositoryHead}: check out newer code`;
  }

  return [required, { id: 'migrations.head', ok: headOk, detail: headDetail }];
}

function checkLedger(snapshot: AuditSnapshot, baseline: number): AuditCheck[] {
  const rows = snapshot.ledgerRows;
  return [
    {
      id: 'ledger.baseline',
      ok: rows >= baseline,
      detail:
        rows >= baseline
          ? `${rows} rows (baseline ${baseline}, max id ${snapshot.ledgerMaxId ?? 'none'})`
          : `${rows} rows is below the accepted baseline ${baseline}: rows were deleted or rewritten (max id ${snapshot.ledgerMaxId ?? 'none'})`,
    },
  ];
}

function checkFunctions(snapshot: AuditSnapshot): AuditCheck[] {
  return Object.entries(EXPECTED_FUNCTIONS).map(([name, expected]) => {
    const definitions = snapshot.functions.filter((entry) => entry.name === name);
    if (definitions.length === 0) {
      return { id: `function.${name}`, ok: false, detail: 'not found' };
    }
    if (definitions.length > 1) {
      return {
        id: `function.${name}`,
        ok: false,
        detail: `${definitions.length} overloads (${definitions.map((entry) => entry.args || '(no args)').join(' | ')}): PostgREST would be ambiguous`,
      };
    }
    const actual = definitions[0];
    const problems: string[] = [];
    if (actual.args !== expected.args) {
      problems.push(`signature is "${actual.args}", expected "${expected.args}"`);
    }
    if (actual.result !== expected.result) {
      problems.push(`returns ${actual.result}, expected ${expected.result}`);
    }
    return {
      id: `function.${name}`,
      ok: problems.length === 0,
      detail:
        problems.length === 0
          ? `${actual.args || '(no args)'} -> ${actual.result}`
          : problems.join('; '),
    };
  });
}

function checkConstraints(snapshot: AuditSnapshot): AuditCheck[] {
  return Object.entries(EXPECTED_CHECK_VALUES).map(([name, expected]) => {
    const definition = snapshot.constraints[name];
    if (!definition) {
      return {
        id: `constraint.${name}`,
        ok: false,
        detail: 'constraint not found on credit_ledger',
      };
    }
    const actual = [...definition.matchAll(/'([a-z0-9_]+)'(?:::text)?/g)]
      .map((match) => match[1])
      .filter((value) => value !== 'text');
    return {
      id: `constraint.${name}`,
      ok: sorted(expected).join(',') === sorted(actual).join(','),
      detail: diff(expected, actual),
    };
  });
}

function checkPending(snapshot: AuditSnapshot): AuditCheck[] {
  return [
    {
      id: 'pending.table',
      ok: snapshot.pendingTable,
      detail: snapshot.pendingTable
        ? 'public.credit_pending_settlements exists'
        : 'public.credit_pending_settlements is missing',
    },
    {
      id: 'pending.rows',
      ok: snapshot.pendingRows === 0,
      detail:
        snapshot.pendingRows === null
          ? 'unknown (table missing)'
          : snapshot.pendingRows === 0
            ? '0 rows with status = pending'
            : `${snapshot.pendingRows} rows still pending: the billing cron has not drained them`,
    },
  ];
}

export function evaluateBillingAudit(snapshot: AuditSnapshot, options: AuditOptions): AuditCheck[] {
  return [
    ...checkMigrations(snapshot, options.repositoryHead),
    ...checkLedger(snapshot, options.ledgerBaseline),
    ...checkFunctions(snapshot),
    ...checkConstraints(snapshot),
    ...checkPending(snapshot),
  ];
}

export function formatAuditReport(checks: AuditCheck[]): string {
  const lines = checks.map(
    (check) => `${check.ok ? 'PASS' : 'FAIL'}  ${check.id}: ${check.detail}`
  );
  const failed = checks.filter((check) => !check.ok);
  lines.push('');
  if (failed.length === 0) {
    lines.push(
      `A04 PASS: ${checks.length}/${checks.length} checks green; database and code are the same era.`
    );
  } else {
    lines.push(`A04 FAILED: ${failed.length}/${checks.length} checks failed.`);
    lines.push(`First mismatch: ${failed[0].id} (${failed[0].detail})`);
  }
  return lines.join('\n');
}

/** Build a passing snapshot; tests mutate one field to prove the checker goes red. */
export function greenSnapshot(): AuditSnapshot {
  return {
    migrations: [...REQUIRED_MIGRATIONS],
    ledgerRows: DEFAULT_LEDGER_BASELINE,
    ledgerMaxId: 2141,
    functions: Object.entries(EXPECTED_FUNCTIONS).map(([name, expected]) => ({
      name,
      args: expected.args,
      result: expected.result,
    })),
    constraints: {
      credit_ledger_source_check:
        "CHECK (((source IS NULL) OR (source = ANY (ARRAY['signup'::text, 'x402'::text, 'subscription'::text, 'wallet'::text, 'free'::text])))",
      credit_ledger_kind_check:
        "CHECK ((kind = ANY (ARRAY['topup'::text, 'usage'::text, 'refund'::text, 'grant'::text, 'waiver'::text])))",
    },
    pendingTable: true,
    pendingRows: 0,
  };
}
