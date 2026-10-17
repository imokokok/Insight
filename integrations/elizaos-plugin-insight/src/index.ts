/**
 * ElizaOS plugin for Insight (https://www.oracleinsight.xyz/): pre-trade
 * decision-input integrity for onchain AI agents. Before the agent signs a
 * trade, INSIGHT_PRE_TRADE_CHECK asks Insight whether the price it relies on
 * is trustworthy (PASS/WARN/BLOCK from multi-provider oracle consensus) and
 * pays the $0.02 per-call fee via x402 v2 USDC from the agent's configured
 * key. INSIGHT_VERIFY_ATTESTATION verifies the returned EIP-712 attestation
 * through the free verify endpoint.
 *
 * Configuration (runtime settings or env):
 *   ORACLE_INSIGHT_BASE_URL          default https://www.oracleinsight.xyz
 *   ORACLE_INSIGHT_X402_PRIVATE_KEY  agent payment key (USDC + gas per check)
 *   ORACLE_INSIGHT_X402_NETWORKS     comma list, default eip155:8453,eip155:1,eip155:10,eip155:42161,eip155:137,eip155:143,eip155:56
 *   ORACLE_INSIGHT_BNB_RPC_URL       RPC for BNB mandate approvals (optional)
 *   ORACLE_INSIGHT_REPUTATION_OPT_IN 'true'/'1' to anchor check feedback on-chain (ERC-8004)
 *   ORACLE_INSIGHT_REPUTATION_AGENT_ID  this agent's ERC-8004 agentId (required for opt-in)
 */
import { logger } from '@elizaos/core';
import type { IAgentRuntime, Plugin } from '@elizaos/core';

import { preTradeCheckAction } from './actions/preTradeCheck.js';
import { verifyAttestationAction } from './actions/verifyAttestation.js';
import { buildPaidFetch } from './insightClient.js';
import { createPluginContext, setPluginContext } from './pluginContext.js';
import { insightProvider } from './provider.js';
import { resolveSettings } from './settings.js';

const insightPlugin: Plugin = {
  name: 'oracle-insight',
  description:
    'Insight oracle-safety checks (PASS/WARN/BLOCK) with x402 USDC payment and EIP-712 attestation verification, from oracleinsight.xyz',
  init: async (_config: Record<string, string>, runtime: IAgentRuntime): Promise<void> => {
    const settings = resolveSettings(runtime);
    const paidFetch = buildPaidFetch(settings);
    setPluginContext(createPluginContext(settings, paidFetch));
    logger.info(
      `Insight plugin ready (${settings.baseUrl}, x402 payment ${paidFetch ? 'enabled' : 'disabled — 402s will surface setup guidance'})`
    );
  },
  actions: [preTradeCheckAction, verifyAttestationAction],
  providers: [insightProvider],
};

export default insightPlugin;
export { insightPlugin };
export { preTradeCheckAction, verifyAttestationAction, insightProvider };
/**
 * AEON mandate client scheme (BNB Smart Chain USDC and other non-EIP-3009
 * tokens). Exported so non-ElizaOS agents can register BNB payments on an
 * @x402/fetch x402Client in three lines; the plugin itself registers it for
 * eip155:56 in buildPaidFetch.
 */
export { ExactEvmMandateScheme, createMandateSignerFromKey } from './aeonMandate.js';
