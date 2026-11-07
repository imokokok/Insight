import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_LEDGER_BASELINE,
  evaluateBillingAudit,
  formatAuditReport,
  greenSnapshot,
  type AuditSnapshot,
} from '../lib/billing-a04-check';

const OPTIONS = { repositoryHead: '0130', ledgerBaseline: DEFAULT_LEDGER_BASELINE };

function red(snapshot: AuditSnapshot): string[] {
  return evaluateBillingAudit(snapshot, OPTIONS)
    .filter((check) => !check.ok)
    .map((check) => check.id);
}

test('a database matching the code passes every check', () => {
  const checks = evaluateBillingAudit(greenSnapshot(), OPTIONS);
  assert.deepEqual(
    checks.filter((check) => !check.ok),
    []
  );
  assert.match(formatAuditReport(checks), /A04 PASS/);
});

test('a missing migration names the exact version', () => {
  const snapshot = greenSnapshot();
  snapshot.migrations = snapshot.migrations.filter((version) => version !== '0125');
  const checks = evaluateBillingAudit(snapshot, OPTIONS);
  const required = checks.find((check) => check.id === 'migrations.required');
  assert.equal(required?.ok, false);
  assert.match(required?.detail ?? '', /missing 0125/);
});

test('a database head behind the repository head goes red', () => {
  const snapshot = greenSnapshot();
  snapshot.migrations = snapshot.migrations.filter((version) => version !== '0130');
  const checks = evaluateBillingAudit(snapshot, OPTIONS);
  const head = checks.find((check) => check.id === 'migrations.head');
  assert.equal(head?.ok, false);
  assert.match(head?.detail ?? '', /behind repository head 0130/);
  const required = checks.find((check) => check.id === 'migrations.required');
  assert.equal(required?.ok, false);
  assert.match(required?.detail ?? '', /missing 0130/);
});

test('a ledger below the baseline reports deletion, not a warning', () => {
  const snapshot = greenSnapshot();
  snapshot.ledgerRows = DEFAULT_LEDGER_BASELINE - 1;
  const checks = evaluateBillingAudit(snapshot, OPTIONS);
  const ledger = checks.find((check) => check.id === 'ledger.baseline');
  assert.equal(ledger?.ok, false);
  assert.match(ledger?.detail ?? '', /below the accepted baseline/);
});

test('a stale function overload or changed signature fails by name', () => {
  const changed = greenSnapshot();
  const consume = changed.functions.find((entry) => entry.name === 'consume_credits');
  assert.ok(consume);
  consume.args = 'uuid, numeric, text, text';

  const overloaded = greenSnapshot();
  const topUp = overloaded.functions.find((entry) => entry.name === 'top_up_credits');
  assert.ok(topUp);
  overloaded.functions.push({ ...topUp });

  const changedChecks = evaluateBillingAudit(changed, OPTIONS);
  const overloadedChecks = evaluateBillingAudit(overloaded, OPTIONS);
  assert.deepEqual(red(changed), ['function.consume_credits']);
  assert.match(
    changedChecks.find((check) => check.id === 'function.consume_credits')?.detail ?? '',
    /signature is/
  );
  assert.deepEqual(red(overloaded), ['function.top_up_credits']);
  assert.match(
    overloadedChecks.find((check) => check.id === 'function.top_up_credits')?.detail ?? '',
    /2 overloads/
  );
});

test('a widened or narrowed CHECK value set fails by constraint name', () => {
  const snapshot = greenSnapshot();
  snapshot.constraints.credit_ledger_source_check =
    snapshot.constraints.credit_ledger_source_check.replace(
      "'free'::text",
      "'free'::text, 'credit'::text"
    );
  const checks = evaluateBillingAudit(snapshot, OPTIONS);
  const constraint = checks.find((check) => check.id === 'constraint.credit_ledger_source_check');
  assert.equal(constraint?.ok, false);
  assert.match(constraint?.detail ?? '', /unexpected \[credit\]/);
});

test('a missing pending table and undrained pending rows both go red', () => {
  const missingTable = greenSnapshot();
  missingTable.pendingTable = false;
  missingTable.pendingRows = null;
  assert.deepEqual(red(missingTable), ['pending.table', 'pending.rows']);

  const undrained = greenSnapshot();
  undrained.pendingRows = 3;
  const checks = evaluateBillingAudit(undrained, OPTIONS);
  assert.deepEqual(red(undrained), ['pending.rows']);
  assert.match(
    checks.find((check) => check.id === 'pending.rows')?.detail ?? '',
    /3 rows still pending/
  );
});
