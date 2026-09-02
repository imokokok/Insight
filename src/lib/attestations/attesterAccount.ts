/**
 * @fileoverview Shared attester-account loader for the EIP-712 oracle safety
 * attestations (v1 and v2).
 *
 * Loads the platform's attester key from `ATTESTATION_SIGNER_PRIVATE_KEY` once
 * per process, caches it, and exposes a typed `signTypedData`. When the key is
 * unset or invalid, returns null — callers MUST treat null as "attestations
 * unavailable" and never let it affect the safety verdict (the attestation is a
 * positioning layer, never a safety-critical dependency).
 *
 * viem is imported lazily so this module never crashes at import time when the
 * optional key is unset, and so the crypto code is only pulled into the server
 * bundle when actually used.
 */

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('AttesterAccount');

export interface AttesterAccount {
  address: string;
  signTypedData: (args: unknown) => Promise<string>;
}

let cachedAccount: AttesterAccount | null = null;
let accountInitAttempted = false;

export async function getAttesterAccount(): Promise<AttesterAccount | null> {
  if (accountInitAttempted) return cachedAccount;
  accountInitAttempted = true;

  const privateKey = process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    // Feature disabled — expected in dev / until the operator provisions a key.
    return null;
  }

  try {
    const { privateKeyToAccount } = await import('viem/accounts');
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    cachedAccount = {
      address: account.address,
      signTypedData: account.signTypedData as (args: unknown) => Promise<string>,
    };
    logger.info('Attester account loaded', { address: account.address });
    return cachedAccount;
  } catch (error) {
    logger.warn('Failed to load attester account; attestations disabled', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// --- Dedicated SAMPLE signer (Headless H8, 2026-09-02) ----------------------
//
// The production sample endpoints sign SYNTHETIC settlement facts. When the
// production attester signs them, nothing in the signed fields distinguishes a
// demo from a real trade — the SYNTHETIC label lived only in the unsigned
// envelope wrapper, so stripping the wrapper left a genuine production-signed
// receipt for a trade that never happened (H8: "a label beside the signature
// is not a property of it").
//
// Fix: samples are signed by a DEDICATED key (ATTESTATION_SAMPLE_SIGNER_PRIVATE_KEY)
// that the .well-known key registry publishes with role "sample". A verifier
// that checks the signature AND the registry can tell a sample from a real
// attestation by the signer alone. There is deliberately NO fallback to the
// production key: if the sample key is unconfigured, sample endpoints return
// 503 — fail-closed beats a mislabeled signature.

let cachedSampleAccount: AttesterAccount | null = null;
let sampleAccountInitAttempted = false;

export async function getSampleAttesterAccount(): Promise<AttesterAccount | null> {
  if (sampleAccountInitAttempted) return cachedSampleAccount;
  sampleAccountInitAttempted = true;

  const privateKey = process.env.ATTESTATION_SAMPLE_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    // No dedicated sample key provisioned — samples stay unsigned (503).
    return null;
  }

  try {
    const { privateKeyToAccount } = await import('viem/accounts');
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    cachedSampleAccount = {
      address: account.address,
      signTypedData: account.signTypedData as (args: unknown) => Promise<string>,
    };
    logger.info('Sample attester account loaded', { address: account.address });
    return cachedSampleAccount;
  } catch (error) {
    logger.warn('Failed to load sample attester account; samples disabled', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** The dedicated sample signer's address, when provisioned. The .well-known
 *  registry publishes this with role "sample" so verifiers can label receipts
 *  signed by it as synthetic demo data. */
export async function getSampleAttesterAddress(): Promise<string | null> {
  const account = await getSampleAttesterAccount();
  return account?.address ?? null;
}

/** The platform's attester address, when a key is configured. Publish this so
 *  third parties can reject attestations from anyone else. */
export async function getAttesterAddress(): Promise<string | null> {
  const account = await getAttesterAccount();
  return account?.address ?? null;
}
