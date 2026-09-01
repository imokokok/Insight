/* eslint-disable no-console */
/**
 * Generate a dedicated EIP-712 attester key for oracle-safety attestations.
 *
 * The pre-trade safety check signs each verdict with this key (offchain,
 * gasless EIP-712). Anyone can then verify the signature against the published
 * attester address at GET /api/v1/safety/attestation/verify. Use a DEDICATED
 * key — do NOT reuse an operational wallet or treasury key.
 *
 * Run: npx tsx scripts/generate-attester-key.ts
 *
 * Output: a fresh private key + its Ethereum address + the exact steps to
 * activate attestation. The key is generated locally and never leaves this
 * machine — copy it into .env.local yourself.
 */
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║          Insight oracle-safety attester key          ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

console.log('Private key  → set as ATTESTATION_SIGNER_PRIVATE_KEY');
console.log(`  ${privateKey}\n`);

console.log('Attester address  → published at the verify endpoint (verifiers trust this)');
console.log(`  ${account.address}\n`);

console.log('── Next steps ──────────────────────────────────────────');
console.log('  1. Add to .env.local:');
console.log(`       ATTESTATION_SIGNER_PRIVATE_KEY=${privateKey}`);
console.log('     (and set NEXT_PUBLIC_APP_URL to your public URL in production)');
console.log('  2. Restart the server:  npm run dev   (or rebuild in prod)');
console.log('  3. Confirm it is active:');
console.log('       curl http://localhost:3000/api/v1/safety/attestation/verify');
console.log(
  '       → { "data": { "attestationEnabled": true, "attester": "' + account.address + '" } }\n'
);
console.log('  4. Run a pre-trade check at /pre-trade-safety — the result now carries');
console.log('     an EIP-712 attestation you can verify in the panel below.\n');
console.log('⚠  Keep this key safe. Anyone holding it can sign attestations as you.');
console.log('   Store it in your secrets manager, never in git.\n');
console.log('── On rotation ────────────────────────────────────────');
console.log('   Keep the PREVIOUS private key. Relying parties that pinned the old');
console.log('   attester may ask you to sign a transition with both the old and the');
console.log('   new key, and production only ever holds the current one.\n');
