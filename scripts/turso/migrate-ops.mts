import { getTursoOpsClient, readTursoOpsConfig } from '@/lib/turso/ops/client';
import {
  ensureTursoOpsSchema,
  isTursoOpsSchemaCurrent,
  TURSO_OPS_SCHEMA_VERSION,
} from '@/lib/turso/ops/schema';

// Data-plane only (same boundary as migrate-price.mts): it can create/upgrade
// schema inside the configured Turso database, but cannot create or delete
// Turso databases. Keep organization-level tokens out of scheduled collectors.
readTursoOpsConfig();
const client = getTursoOpsClient();

try {
  await ensureTursoOpsSchema(client);
  if (!(await isTursoOpsSchemaCurrent(client))) {
    throw new Error('Turso ops schema version marker was not installed');
  }
  console.log(`Turso ops schema v${TURSO_OPS_SCHEMA_VERSION} is ready.`);
} finally {
  client.close();
}
