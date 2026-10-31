import { getTursoPriceClient, readTursoPriceConfig } from '@/lib/turso/price/client';
import { ensureTursoPriceSchema, TURSO_PRICE_SCHEMA_VERSION } from '@/lib/turso/price/schema';

// This script is deliberately data-plane only: it can create/upgrade schema
// inside the configured price database, but cannot create or delete Turso
// databases. Keep organization-level tokens out of scheduled collectors.
readTursoPriceConfig();
const client = getTursoPriceClient();

try {
  await ensureTursoPriceSchema(client);
  const result = await client.execute(
    'SELECT count(*) AS policy_count FROM persistence_policies WHERE policy_key = ?',
    ['__default__']
  );
  if (Number(result.rows[0]?.policy_count) !== 1) {
    throw new Error('Turso default price persistence policy was not installed');
  }
  console.log(`Turso price schema v${TURSO_PRICE_SCHEMA_VERSION} is ready.`);
} finally {
  client.close();
}
