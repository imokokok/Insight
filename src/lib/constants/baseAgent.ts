/**
 * Public Base identity and attribution metadata for Insight.
 *
 * The private key that owns this ERC-8004 identity remains in the runtime
 * secret store and must never be placed in source control.
 */
export const BASE_AGENT = {
  chainId: 8453,
  identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  agentId: 1201765n,
  agentURI: 'https://www.oracleinsight.xyz/.well-known/agent8004.json',
  builderCode: 'bc_mukkhhgf',
  registrarAddress: '0x5FBbbCbF2Ade44F5c604E5E55f11945E1ADdD231',
} as const;
