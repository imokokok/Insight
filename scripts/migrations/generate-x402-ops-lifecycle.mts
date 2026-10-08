import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const migrationSql = String.raw`-- Extend the private x402 audit trail into a request lifecycle record so the
-- /ops console can report quote, payment, business, and settlement outcomes.
-- Existing settlement rows remain valid and retain their historical label as legacy by default.
-- Apply this migration before deploying code that writes the new statuses or reads the new columns.

alter table public.x402_settlements
  drop constraint if exists x402_settlements_status_check;

alter table public.x402_settlements
  add constraint x402_settlements_status_check
  check (status in (
    'quote_issued',
    'payment_rejected',
    'payment_verified',
    'business_failed',
    'business_succeeded',
    'settled',
    'settlement_failed',
    'verify_failed'
  ));

alter table public.x402_settlements
  add column if not exists surface text not null default 'legacy'
    check (surface in ('rest', 'mcp', 'legacy')),
  add column if not exists resource text,
  add column if not exists response_time_ms integer
    check (response_time_ms is null or response_time_ms >= 0);

create index if not exists idx_x402_settlements_status_created_at
  on public.x402_settlements (status, created_at desc);

create index if not exists idx_x402_settlements_surface_resource_created_at
  on public.x402_settlements (surface, resource, created_at desc);

comment on table public.x402_settlements is
  'Service-role-only x402 lifecycle audit events and settlement records for the internal Ops console.';

comment on column public.x402_settlements.amount_usdc is
  'Quoted amount for quote_issued events; realized transfer amount for settled events. Revenue queries must sum settled only.';

comment on column public.x402_settlements.response_time_ms is
  'Elapsed time for this lifecycle stage: quote/verification request, business handler, or settlement call.';

comment on column public.x402_settlements.request_id is
  'Opaque id for one HTTP/MCP request. Quote and paid retry are separate requests and cannot be joined as an exact user funnel.';
`;

const repositoryRoot = new URL('../../', import.meta.url);
const outputUrl = new URL('supabase/migrations/0079_x402_ops_lifecycle.sql', repositoryRoot);
const outputPath = fileURLToPath(outputUrl);
const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const check = args.has('--check');

if (write === check || [...args].some((arg) => arg !== '--write' && arg !== '--check')) {
  throw new Error('Use exactly one supported option: --write or --check');
}

if (write) {
  await writeFile(outputPath, migrationSql, 'utf8');
} else {
  const current = await readFile(outputPath, 'utf8');
  if (current !== migrationSql) {
    throw new Error(
      '0079_x402_ops_lifecycle.sql is stale; regenerate it from this TypeScript source.'
    );
  }
}
