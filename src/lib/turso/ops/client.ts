// Operational data-plane client for machine-generated tables that are moving
// off Supabase (egress-quota retirement, 2026-11). The market reference domain
// is the first migration; the client deliberately shares the existing Turso
// price database credentials so cron bundles need no new secrets.
//
// The cron runner executes committed bundles without node_modules, so this
// must stay on the self-contained web client (same constraint as
// src/lib/turso/price/client.ts).
import { createClient, type Client } from '@libsql/client/web';

export interface TursoOpsConfig {
  url: string;
  authToken: string;
}

export function readTursoOpsConfig(env: NodeJS.ProcessEnv = process.env): TursoOpsConfig {
  // Ops tables currently live in the same Turso database as the price domain;
  // dedicated vars win when the databases are split later.
  const url = (env.TURSO_OPS_DATABASE_URL ?? env.TURSO_PRICE_DATABASE_URL)?.trim();
  const authToken = (env.TURSO_OPS_AUTH_TOKEN ?? env.TURSO_PRICE_AUTH_TOKEN)?.trim();
  // Turso canonical URLs use libsql://, but the web client also speaks plain
  // https:// to the same host — accept both so local tooling can reuse the
  // dashboard host form.
  if (!url || !/^(libsql|https):\/\//.test(url)) {
    throw new Error('Missing or invalid TURSO_OPS_DATABASE_URL (or TURSO_PRICE_DATABASE_URL)');
  }
  if (!authToken) throw new Error('Missing TURSO_OPS_AUTH_TOKEN (or TURSO_PRICE_AUTH_TOKEN)');
  return { url, authToken };
}

let cachedOpsClient: Client | undefined;

export function getTursoOpsClient(): Client {
  if (!cachedOpsClient) {
    const { url, authToken } = readTursoOpsConfig();
    cachedOpsClient = createClient({ url, authToken, concurrency: 4 });
  }
  return cachedOpsClient;
}

/** Test seam; production code never needs to discard a healthy remote client. */
export function resetTursoOpsClientForTests(): void {
  cachedOpsClient = undefined;
}
