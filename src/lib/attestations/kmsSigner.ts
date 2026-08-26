/**
 * KMS-backed EIP-712 signer seam (key-rotation-procedure.md §5 gap 3).
 *
 * Goal: move the attester signing path off a raw Vercel env-var private key
 * onto an HSM-backed KMS (AWS KMS / GCP KMS) where the private key never
 * leaves the boundary and signing happens through the cloud API.
 *
 * KMS ECDSA (secp256k1) returns only (r, s) — NOT the recovery id. To assemble
 * a 0x-prefixed EIP-712 signature we recover the correct yParity by trying both
 * candidates and picking the one whose recovered address matches the known key.
 * {@link recoverAddressFromRs} is pure and fully unit-tested offline; the
 * actual cloud transport {@link signDigestWithKms} is the remaining seam that
 * needs the provider SDK + credentials provisioned (see KMS_SIGNER_STATUS).
 */

import { recoverAddress, type Hex } from 'viem';

export type { Hex };

export interface KmsSignerConfig {
  provider: 'aws' | 'gcp';
  /** Cloud KMS key resource id / path. */
  keyId: string;
  /** AWS region / GCP location. */
  region?: string;
}

export interface KmsSignature {
  r: Hex;
  s: Hex;
}

/**
 * Status of the cloud transport. The provider SDK and credentials are
 * provisioned in the operator's cloud account, NOT in this repo, so the real
 * signer cannot run here. Wire it up during the KMS migration
 * (key-rotation-procedure §3): call AWS KMS `Sign` (MessageType=DIGEST) or GCP
 * `AsymmetricSign`, parse the DER/ECDSA (r, s), and return it here.
 */
export const KMS_SIGNER_STATUS =
  'stub: provider SDK + credentials not provisioned in this environment';

/**
 * Signs a 32-byte digest via the configured KMS. THIS IS THE CLOUD SEAM.
 * Left as a clearly-marked stub because the provider SDK and credentials are
 * provisioned in the operator's cloud account, not in this repo.
 */
export async function signDigestWithKms(
  _config: KmsSignerConfig,
  _digest: Hex
): Promise<KmsSignature> {
  throw new Error(`KMS signing not available: ${KMS_SIGNER_STATUS}`);
}

/**
 * Recover the signer address from a digest and the raw (r, s) returned by a
 * KMS ECDSA sign (which omits the recovery id). KMS secp256k1 signatures come
 * back as (r, s) only, so we try both yParity candidates (0 and 1) and return
 * the one whose recovered address matches `candidate`.
 *
 * Returns null if neither candidate recovers to `candidate` — this is the
 * negative path the spec requires: a wrong (r, s) can NEVER be coerced into
 * matching an address it wasn't signed with, regardless of which parity we
 * try. That property is what makes the yParity loop safe: it can only ever
 * surface the true signer, never forge a different one.
 */
export async function recoverAddressFromRs(
  digest: Hex,
  r: Hex,
  s: Hex,
  candidate: Hex
): Promise<Hex | null> {
  const rHex = r.replace(/^0x/, '');
  const sHex = s.replace(/^0x/, '');
  if (rHex.length !== 64 || sHex.length !== 64) {
    throw new Error('r and s must each be a 32-byte hex string');
  }
  const candidateLower = candidate.toLowerCase();
  for (const yParity of [0, 1] as const) {
    const signature = `0x${rHex}${sHex}${yParity === 0 ? '00' : '01'}` as Hex;
    try {
      const recovered = await recoverAddress({ hash: digest, signature });
      if (recovered.toLowerCase() === candidateLower) return recovered;
    } catch {
      /* wrong parity candidate — try the other */
    }
  }
  return null;
}
