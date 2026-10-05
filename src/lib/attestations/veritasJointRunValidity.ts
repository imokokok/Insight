import { ValidationError } from '@/lib/errors';
import { bodyWithoutId, keccakContentId } from '@/lib/protocol/contentAddress';
import { activePartnerIntegrationPolicy } from '@/lib/protocol/partnerIntegrationRegistry';

import candidatePolicy from '../../../protocol/mainline/policies/veritas/v5.json';

export const VERITAS_JOINT_RUN_RULE_HASH =
  '0xb1071d6929d1dc13812d9aa19bf28a74dca4d90c07d47e9b2052f9f9c3c52465';
export const VERITAS_JOINT_RUN_POLICY_ID =
  '0x55fbfb17fbab461ff237cad4b19f8fba71411461d19f8e99af103910ae47ae63';
const candidatePolicyMatches =
  candidatePolicy.policyId === VERITAS_JOINT_RUN_POLICY_ID &&
  keccakContentId(bodyWithoutId(candidatePolicy, 'policyId')) === VERITAS_JOINT_RUN_POLICY_ID &&
  candidatePolicy.jointRunValidity.selectionRuleHash === VERITAS_JOINT_RUN_RULE_HASH &&
  candidatePolicy.jointRunValidity.gateWindowSeconds === 1800 &&
  candidatePolicy.jointRunValidity.runId === 'insight-veritas-2026-09-18' &&
  candidatePolicy.jointRunValidity.latestWindowEndUtc === '2026-10-06T17:00:00Z';

interface IssuanceContext {
  partnerId: string;
  policyId: string;
  apiKeyId?: string;
  asset: string;
  destinationAsset?: string;
  chainId: number;
  action: string;
  tradeAmountUsd: number;
  schemaVersion?: number;
}

/** A one-time partner issuance path; activation, key ID and date are independent gates. */
export function assertVeritasJointRun1800Admission(
  context: IssuanceContext,
  phase: 'request' | 'sign',
  now = new Date(),
  configuredWindow = process.env.VERITAS_JOINT_RUN_1800_WINDOW_DATE,
  configuredApiKeyId = process.env.VERITAS_JOINT_RUN_1800_API_KEY_ID
): void {
  const activePolicy = activePartnerIntegrationPolicy('veritas');
  if (
    context.partnerId !== 'veritas' ||
    !candidatePolicyMatches ||
    context.policyId !== VERITAS_JOINT_RUN_POLICY_ID ||
    activePolicy?.policyId !== context.policyId ||
    activePolicy.productionReachability !== 'enabled'
  ) {
    throw new ValidationError('VERITAS 1800-second policy is not active for this partner.');
  }
  if (!configuredApiKeyId || !context.apiKeyId || context.apiKeyId !== configuredApiKeyId) {
    throw new ValidationError('VERITAS 1800-second issuance API key is not authorized.');
  }
  if (
    context.chainId !== 1 ||
    context.action !== 'swap' ||
    context.tradeAmountUsd !== 50_000 ||
    context.schemaVersion !== 3 ||
    !(
      (context.asset === 'WETH' && context.destinationAsset === 'USDC') ||
      (context.asset === 'USDC' && context.destinationAsset === 'WETH')
    )
  ) {
    throw new ValidationError('VERITAS 1800-second issuance requires the fixed v3 WETH/USDC pair.');
  }
  if (configuredWindow !== '2026-10-06') {
    throw new ValidationError('VERITAS 1800-second live candidate date is not selected.');
  }
  const start = Date.parse(`${configuredWindow}T15:30:00Z`);
  const cutoff = Date.parse(
    `${configuredWindow}T${phase === 'request' ? '16:20:00' : '16:25:00'}Z`
  );
  if (now.getTime() < start || now.getTime() >= cutoff) {
    throw new ValidationError(`VERITAS 1800-second ${phase} is outside its one-time cutoff.`);
  }
}
