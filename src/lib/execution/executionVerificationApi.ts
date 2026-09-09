import { getAttesterAddress, getSampleAttesterAddress } from '@/lib/attestations/attesterAccount';
import { verifyExecutionReceipt, type ExecutionReceipt } from '@/lib/attestations/executionReceipt';
import { buildKeyRegistryConfig, trustedAttesterEntry } from '@/lib/attestations/keyRegistryConfig';
import {
  verifyExecutionPair,
  type PreTradeAttestationInput,
} from '@/lib/execution/verifyExecutionPair';
import {
  evaluateActivePartnerExecutionPolicy,
  evaluateExecutionPolicy,
  type PartnerId,
} from '@/lib/protocol/partnerIntegrationRegistry';

export type ExecutionPolicySelection =
  | { mode: 'public'; policyId?: string }
  | { mode: 'partner'; partnerId: PartnerId; policyId: string };

function evaluateSelectedPolicy(
  selection: ExecutionPolicySelection,
  schemaVersion: number,
  profileId: string | null
) {
  if (selection.mode === 'partner') {
    return evaluateActivePartnerExecutionPolicy(
      selection.partnerId,
      selection.policyId,
      schemaVersion,
      profileId
    );
  }
  return selection.policyId
    ? evaluateExecutionPolicy(selection.policyId, schemaVersion, profileId)
    : null;
}

function policyEnforcementMode(selection: ExecutionPolicySelection) {
  if (selection.mode === 'partner') return 'active-partner-policy-required';
  return selection.policyId ? 'public-explicit-policy' : 'public-cryptographic-only';
}

export async function verifyExecutionReceiptForApi(
  attestation: Record<string, unknown>,
  selection: ExecutionPolicySelection
) {
  const result = await verifyExecutionReceipt(attestation as unknown as ExecutionReceipt);
  const registry = buildKeyRegistryConfig(
    await getAttesterAddress(),
    await getSampleAttesterAddress()
  );
  const trustedKey = trustedAttesterEntry(result.attester, result.executedAt, registry);
  const consumerPolicy = evaluateSelectedPolicy(selection, result.schemaVersion, result.profileId);
  const valid = result.valid && trustedKey !== null && (consumerPolicy?.valid ?? true);
  const reason = !result.valid
    ? result.reason
    : result.cryptographicValid && !trustedKey
      ? 'untrusted_attester: signature is valid but the signer is not an authorised production key'
      : consumerPolicy && !consumerPolicy.valid
        ? consumerPolicy.reason
        : result.reason;

  return {
    valid,
    cryptographicValid: result.cryptographicValid,
    trustedAttester: trustedKey !== null,
    keyId: trustedKey?.key_id ?? null,
    attester: result.attester,
    uid: result.uid,
    executedAt: result.executedAt,
    validUntil: result.validUntil,
    expired: result.expired,
    executionStatus: result.executionStatus,
    schemaVersion: attestation.schemaVersion,
    profileId: result.profileId,
    policyEnforcement: policyEnforcementMode(selection),
    consumerPolicy,
    reason,
  };
}

export async function verifyExecutionPairForApi(
  body: {
    preTradeAttestation: Record<string, unknown>;
    executionReceipt: Record<string, unknown> & { schemaVersion: number; data: unknown };
    destinationPreTradeAttestation?: Record<string, unknown>;
  },
  selection: ExecutionPolicySelection
) {
  const result = await verifyExecutionPair(
    body.preTradeAttestation as unknown as PreTradeAttestationInput,
    body.executionReceipt as never,
    body.destinationPreTradeAttestation as unknown as PreTradeAttestationInput | undefined
  );
  const executionData = body.executionReceipt.data as Record<string, unknown>;
  const consumerPolicy = evaluateSelectedPolicy(
    selection,
    body.executionReceipt.schemaVersion,
    typeof executionData.profileId === 'string' ? executionData.profileId : null
  );
  const pairedValid = result.pairedValid && (consumerPolicy?.valid ?? true);

  return {
    pairedValid,
    closedLoopStatus: pairedValid ? result.closedLoopStatus : 'PAIR_INVALID',
    reason:
      !result.pairedValid || !consumerPolicy || consumerPolicy.valid
        ? result.reason
        : consumerPolicy.reason,
    policyEnforcement: policyEnforcementMode(selection),
    consumerPolicy,
    binding: result.binding,
    preTrade: {
      valid: result.preTrade.valid,
      expired: result.preTrade.expired,
      uid: result.preTrade.uid,
      schemaVersion: result.preTrade.schemaVersion,
      attester: result.preTrade.attester,
      reason: result.preTrade.reason,
    },
    execution: result.execution,
    destinationPreTrade: result.destinationPreTrade
      ? {
          valid: result.destinationPreTrade.valid,
          expired: result.destinationPreTrade.expired,
          uid: result.destinationPreTrade.uid,
          schemaVersion: result.destinationPreTrade.schemaVersion,
          attester: result.destinationPreTrade.attester,
          reason: result.destinationPreTrade.reason,
        }
      : null,
  };
}
