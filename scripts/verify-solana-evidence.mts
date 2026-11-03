#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { verifySolanaEvidence } from '../src/lib/execution/solanaEvidence';

const [filePath, trustedPublicKey] = process.argv.slice(2);
if (!filePath || !trustedPublicKey || process.argv.length !== 4) {
  console.error(
    'Usage: npm run verify:solana-evidence -- <receipt.json> <trusted-ed25519-public-key-base58>'
  );
  process.exit(2);
}

try {
  const source = await readFile(resolve(filePath), 'utf8');
  if (Buffer.byteLength(source, 'utf8') > 1_000_000) throw new Error('Evidence file exceeds 1 MB');
  const evidence: unknown = JSON.parse(source);
  if (!verifySolanaEvidence(evidence, trustedPublicKey)) {
    console.error('INVALID: signature, trusted signer, schema, or payload validation failed');
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      { valid: true, schema: evidence.schema, signerPublicKey: evidence.signer.publicKey },
      null,
      2
    )
  );
} catch (error) {
  console.error(`INVALID: ${error instanceof Error ? error.message : 'could not read evidence'}`);
  process.exit(1);
}
