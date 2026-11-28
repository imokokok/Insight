import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { PolymarketEvidenceRegistrySchema } from '../src/lib/prediction/polymarketV2/registry';

const runtimeSecretNames = [
  'ALCHEMY_ARBITRUM_RPC',
  'ALCHEMY_AVALANCHE_RPC',
  'ALCHEMY_BASE_RPC',
  'ALCHEMY_BNB_RPC',
  'ALCHEMY_ETHEREUM_RPC',
  'ALCHEMY_LINEA_RPC',
  'ALCHEMY_MONAD_RPC',
  'ALCHEMY_OPTIMISM_RPC',
  'ALCHEMY_POLYGON_RPC',
  'ALCHEMY_SOLANA_RPC',
  'ATTESTATION_KEYS_CONFIG',
  'ATTESTATION_REVOKED_KEYS_CONFIG',
  'ATTESTATION_SAMPLE_SIGNER_PRIVATE_KEY',
  'ATTESTATION_SIGNER_PRIVATE_KEY',
  'BEA_API_USER_ID',
  'BLS_API_REGISTRATION_KEY',
  'COVERAGE_SIGNER_PRIVATE_KEY',
  'CRON_SECRET',
  'CSRF_SECRET',
  'ERC8004_REGISTRAR_PRIVATE_KEY',
  'EVM_PRIVATE_KEY',
  'FRED_API_KEY',
  'GOPLUS_API_KEY',
  'GOPLUS_APP_KEY',
  'GOPLUS_APP_SECRET',
  'HEADLESS_ORACLE_API_KEY',
  'HEADLESS_X402_PRIVATE_KEY',
  'HELIUS_SOLANA_RPC',
  'INSIGHT_API_KEY',
  'INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED',
  'INTERNAL_API_SECRET',
  'JUPITER_API_KEY',
  'JWT_SECRET',
  'MPP_SECRET_KEY',
  'NOWPAYMENTS_API_KEY',
  'NOWPAYMENTS_IPN_SECRET',
  'NOWPAYMENTS_TEST_MODE',
  'OPENFDA_API_KEY',
  'OPS_OWNER_USER_IDS',
  'POLYMARKET_EVIDENCE_ENABLED',
  'POLYMARKET_RULE_BINDINGS_JSON',
  'REDSTONE_GATEWAY_API_KEY',
  'ROBINHOOD_RPC_URL',
  'SEC_EDGAR_USER_AGENT',
  'SOLANA_PRIVATE_KEY',
  'SUPABASE_DB_PASSWORD',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TRONGRID_API_KEY',
  'TRON_FULLNODE_RPC',
  'TRON_RPC_URL',
  'TRON_SOLIDITY_RPC',
  'TURSO_OPS_AUTH_TOKEN',
  'TURSO_OPS_DATABASE_URL',
  'TURSO_PRICE_AUTH_TOKEN',
  'TURSO_PRICE_DATABASE_URL',
  'TELEGRAM_INTEGRATION_SECRET',
  'X402_CDP_API_KEY_ID',
  'X402_CDP_API_KEY_SECRET',
  'X402_ENABLED',
  'X402_FACILITATOR_BEARER_TOKEN',
  'X402_FACILITATOR_BEARER_TOKENS',
  'X402_FACILITATOR_URL',
  'X402_FACILITATOR_URLS',
  'X402_NETWORK',
  'X402_PAY_TO',
  'X402_PRICE_USD',
  'X402_HYPERCORE_MERCHANT_SECRET',
] as const;

const coreRequiredSecretNames = [
  'ATTESTATION_SIGNER_PRIVATE_KEY',
  'CRON_SECRET',
  'CSRF_SECRET',
  'JWT_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TURSO_PRICE_AUTH_TOKEN',
  'TURSO_PRICE_DATABASE_URL',
] as const;

function readSecretMap(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of runtimeSecretNames) {
    const value = process.env[name];
    if (typeof value !== 'string' || value.trim() === '') continue;
    if (value.trim() === '[SENSITIVE]' || value.startsWith('eyJ2IjoidjIiLCJjIjo')) {
      throw new Error(`Refusing to deploy an unreadable or encrypted placeholder for ${name}.`);
    }
    result[name] = value;
  }

  const required: string[] = [...coreRequiredSecretNames];
  if (process.env.MPP_ENABLED === 'true') {
    required.push(
      'MPP_SECRET_KEY',
      'X402_ENABLED',
      'X402_FACILITATOR_URLS',
      'X402_NETWORK',
      'X402_PAY_TO',
      'X402_PRICE_USD'
    );
    if (result.X402_ENABLED !== 'true') {
      throw new Error('X402_ENABLED must be true when production MPP is enabled.');
    }
    if (result.MPP_SECRET_KEY && Buffer.byteLength(result.MPP_SECRET_KEY, 'utf8') < 32) {
      throw new Error('MPP_SECRET_KEY must contain at least 32 bytes.');
    }
  }

  if (process.env.POLYMARKET_EVIDENCE_ENABLED === 'true') {
    const bindingsJson = result.POLYMARKET_RULE_BINDINGS_JSON;
    if (!bindingsJson) {
      throw new Error(
        'POLYMARKET_RULE_BINDINGS_JSON is required when Polymarket evidence is enabled.'
      );
    }
    let bindings: unknown;
    try {
      bindings = JSON.parse(bindingsJson) as unknown;
    } catch {
      throw new Error('POLYMARKET_RULE_BINDINGS_JSON must contain valid JSON.');
    }
    const parsedBindings = PolymarketEvidenceRegistrySchema.safeParse(bindings);
    if (!parsedBindings.success || parsedBindings.data.length < 1) {
      throw new Error(
        'POLYMARKET_RULE_BINDINGS_JSON must be a non-empty array of valid, reviewed source bindings.'
      );
    }
    const usesBls = parsedBindings.data.some((binding) =>
      binding.observations.some((observation) => observation.provider.startsWith('bls.'))
    );
    if (usesBls && !result.BLS_API_REGISTRATION_KEY) {
      throw new Error('BLS_API_REGISTRATION_KEY is required for configured BLS source bindings.');
    }
    const usesProvider = (provider: string) =>
      parsedBindings.data.some((binding) =>
        binding.observations.some((observation) => observation.provider === provider)
      );
    if (usesProvider('sec.submissions') && !result.SEC_EDGAR_USER_AGENT) {
      throw new Error('SEC_EDGAR_USER_AGENT is required for configured SEC source bindings.');
    }
    if (usesProvider('bea.nipa') && !result.BEA_API_USER_ID) {
      throw new Error('BEA_API_USER_ID is required for configured BEA source bindings.');
    }
    if (usesProvider('fred.series') && !result.FRED_API_KEY) {
      throw new Error('FRED_API_KEY is required for configured FRED source bindings.');
    }
  }

  const missing = required.filter((name) => !result[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required Cloudflare Worker secrets: ${missing.join(', ')}`);
  }

  return result;
}

const destination = process.argv[2];
if (!destination) {
  throw new Error('Pass a temporary output file path for the Worker secrets JSON.');
}

const secrets = readSecretMap();
const outputPath = resolve(destination);
await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
await writeFile(outputPath, JSON.stringify(secrets), { mode: 0o600 });
await chmod(outputPath, 0o600);
console.log(`Prepared ${Object.keys(secrets).length} allowlisted Worker secrets; values withheld.`);
