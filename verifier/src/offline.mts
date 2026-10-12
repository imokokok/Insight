#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

import {
  parsePinnedKeyRegistry,
  verifyReceipt,
  verifyExecutionReceipt,
  verifyExecutionPair,
  type RoutableAttestation,
  type ExecutionReceipt,
  verifyContextAttestation,
} from './index.js';

const help =
  'Usage: verify-insight-offline --registry registry.json --registry-sha256 HEX (--receipt receipt.json | --pre-trade source.json --execution execution.json [--destination destination.json] | --context-attestation attestation.json [--token-security-view view.json])';
const known = new Set([
  '--registry',
  '--registry-sha256',
  '--receipt',
  '--pre-trade',
  '--execution',
  '--destination',
  '--context-attestation',
  '--token-security-view',
]);
async function json(path: string): Promise<unknown> {
  const raw = await readFile(path);
  if (raw.byteLength > 1048576) throw new Error('Receipt exceeds 1 MiB');
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Receipt must be a JSON object');
  return value;
}
async function main() {
  const args = process.argv.slice(2),
    options = new Map<string, string>();
  if (args.length === 1 && args[0] === '--help') {
    process.stdout.write(help + '\n');
    return;
  }
  for (let i = 0; i < args.length; i += 2) {
    if (!known.has(args[i]) || options.has(args[i]) || !args[i + 1] || args[i + 1].startsWith('--'))
      throw new Error(help);
    options.set(args[i], args[i + 1]);
  }
  const registryPath = options.get('--registry'),
    pin = options.get('--registry-sha256');
  const receiptPath = options.get('--receipt'),
    sourcePath = options.get('--pre-trade'),
    executionPath = options.get('--execution'),
    destinationPath = options.get('--destination'),
    contextAttestationPath = options.get('--context-attestation'),
    tokenSecurityViewPath = options.get('--token-security-view');
  const modeCount =
    Number(Boolean(receiptPath)) +
    Number(Boolean(sourcePath || executionPath || destinationPath)) +
    Number(Boolean(contextAttestationPath));
  if (
    !registryPath ||
    !pin ||
    modeCount !== 1 ||
    (receiptPath && (sourcePath || executionPath || destinationPath || tokenSecurityViewPath)) ||
    (contextAttestationPath && (sourcePath || executionPath || destinationPath)) ||
    (!contextAttestationPath && tokenSecurityViewPath) ||
    (!receiptPath && !contextAttestationPath && (!sourcePath || !executionPath))
  )
    throw new Error(help);
  const snapshot = parsePinnedKeyRegistry(await readFile(registryPath), pin);
  const trust = { keyRegistry: snapshot.registry };
  let result: unknown, accepted: boolean;
  if (receiptPath) {
    const receipt = await json(receiptPath);
    const receiptRecord = receipt as RoutableAttestation;
    const execution =
      receiptRecord.eip712?.primaryType === 'ExecutionReceipt' ||
      receiptRecord.type === 'ExecutionReceipt';
    const verified = execution
      ? await verifyExecutionReceipt(receiptRecord as ExecutionReceipt, trust)
      : await verifyReceipt(receiptRecord, trust);
    const key = snapshot.registry.keys!.find(
      (k) => k.public_key.toLowerCase() === verified.attester.toLowerCase()
    );
    accepted =
      verified.valid &&
      verified.code === 'ok' &&
      verified.keyStatus === 'valid' &&
      key?.role !== 'sample';
    result = verified;
  } else if (contextAttestationPath) {
    const verified = await verifyContextAttestation(
      await json(contextAttestationPath),
      tokenSecurityViewPath ? await json(tokenSecurityViewPath) : undefined,
      trust
    );
    const key = snapshot.registry.keys!.find(
      (k) => k.public_key.toLowerCase() === (verified.attester ?? '').toLowerCase()
    );
    accepted =
      verified.valid &&
      verified.code === 'ok' &&
      verified.resultLinked &&
      verified.keyStatus === 'valid' &&
      key?.role !== 'sample';
    result = verified;
  } else {
    const paired = await verifyExecutionPair(
      (await json(sourcePath!)) as RoutableAttestation,
      (await json(executionPath!)) as ExecutionReceipt,
      destinationPath ? ((await json(destinationPath)) as RoutableAttestation) : null,
      trust
    );
    accepted = paired.pairedValid;
    result = paired;
  }
  process.stdout.write(
    JSON.stringify(
      {
        schema: 'insight.offline-verification.v1',
        accepted,
        registrySnapshot: { sha256: snapshot.sha256, byteLength: snapshot.byteLength },
        result,
      },
      null,
      2
    ) + '\n'
  );
  if (!accepted) process.exitCode = 1;
}
main().catch((error: unknown) => {
  process.stderr.write(
    JSON.stringify({
      accepted: false,
      error: error instanceof Error ? error.message : 'Offline verification failed',
    }) + '\n'
  );
  process.exitCode = 1;
});
