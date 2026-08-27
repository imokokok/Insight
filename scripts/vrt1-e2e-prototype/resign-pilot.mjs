// Resign the pilot receipt with the CURRENT attester key (Route A rotation).
//
// Why (Tutankhamun 2026-08-27, "one operational thing, time bounded"):
//   the prototype receipt (uid 0x08e2d411…) is signed with the OLD key whose
//   published window closes 2026-09-02. If we anchor after that date, a verifier
//   checking key validity at verification time will reject a receipt that was
//   perfectly valid when it was made. Either anchor before Sep 2, or re-sign the
//   pilot receipt with the current key and anchor that.
//
// This script implements the second option: re-sign the same 26-field data with
// the CURRENT private key (A_new = 0x6506F789…E8ce), producing a fresh receipt.
// Note: the uid is the EIP-712 digest, which depends only on the signed content,
// not on the signing key, so it stays the same; the signature and attester change.
//
// Usage:
//   node scripts/vrt1-e2e-prototype/resign-pilot.mjs \
//     --private-key <A_NEW_PRIVATE_KEY_HEX> \
//     [--out scripts/vrt1-e2e-prototype/sample-receipt-current-key.json]
//
// The private key lives in Vercel (ATTESTATION_SIGNER_PRIVATE_KEY after the
// rotation) or in the local .env.local. This script never sends it anywhere.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { privateKeyToAccount } from 'viem/accounts';
import { hashTypedData } from 'viem';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const privKey = arg('--private-key') || process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
if (!privKey) {
  console.error(
    'Missing private key. Pass --private-key <hex> or set ATTESTATION_SIGNER_PRIVATE_KEY.'
  );
  process.exit(1);
}
const outPath = arg('--out') || join(__dirname, 'sample-receipt-current-key.json');
const inPath = arg('--in') || join(__dirname, 'sample-receipt.json');

const receipt = JSON.parse(readFileSync(inPath, 'utf8'));
const att = receipt.attestation;
const data = att.data;

const account = privateKeyToAccount(privKey);

// Fresh timestamp window: re-signing means a new signedAt/checkedAt/validUntil.
const signedAt = new Date().toISOString();
const checkedAt = Math.floor(Date.now() / 1000);
const validUntil = checkedAt + 600;

// EIP-712 message over the UPDATED data (uint256 -> BigInt, same as original signer)
const newData = { ...data, validUntil, checkedAt };
const message = {};
for (const f of att.eip712.types.OracleSafetyCheck) {
  message[f.name] = f.type === 'uint256' ? BigInt(newData[f.name]) : newData[f.name];
}

const digest = hashTypedData({
  domain: att.eip712.domain,
  types: { OracleSafetyCheck: att.eip712.types.OracleSafetyCheck },
  primaryType: att.eip712.primaryType,
  message,
});
const signature = await account.signTypedData({
  domain: att.eip712.domain,
  types: { OracleSafetyCheck: att.eip712.types.OracleSafetyCheck },
  primaryType: att.eip712.primaryType,
  message,
});

const newReceipt = JSON.parse(JSON.stringify(receipt));
newReceipt.attestation.uid = digest;
newReceipt.attestation.attester = account.address;
newReceipt.attestation.signedAt = signedAt;
newReceipt.attestation.validUntil = validUntil;
newReceipt.attestation.signature = signature;
newReceipt.attestation.data.validUntil = validUntil;
newReceipt.attestation.data.checkedAt = checkedAt;

writeFileSync(outPath, JSON.stringify(newReceipt, null, 2));

console.log(`re-signed with CURRENT key (A_new = ${account.address})`);
console.log(`  old uid  : ${att.uid}`);
console.log(`  new uid  : ${digest}`);
console.log(`  new signedAt: ${signedAt}  (checkedAt ${checkedAt}, validUntil ${validUntil})`);
console.log(`  wrote ${outPath}`);
console.log('');
console.log('Next: node scripts/vrt1-e2e-prototype/prototype.mjs <that file>');
