import type { OnChainVerification } from '@/types/oracle/price';

const CHAIN_EXPLORER_BASE_URL: Record<number, string> = {
  1: 'https://etherscan.io',
  42161: 'https://arbiscan.io',
  10: 'https://optimistic.etherscan.io',
  137: 'https://polygonscan.com',
  43114: 'https://snowtrace.io',
  56: 'https://bscscan.com',
  8453: 'https://basescan.org',
  250: 'https://ftmscan.com',
  534352: 'https://scrollscan.com',
  324: 'https://explorer.zksync.io',
  100: 'https://gnosisscan.io',
  5000: 'https://explorer.mantle.xyz',
  59144: 'https://lineascan.build',
  1313161554: 'https://aurorascan.dev',
  42220: 'https://celoscan.io',
  81457: 'https://blastscan.io',
  2222: 'https://kavascan.com',
  1284: 'https://moonbeam.moonscan.io',
  1285: 'https://moonriver.moonscan.io',
  1088: 'https://andromeda-explorer.metis.io',
  14: 'https://flare-explorer.flare.network',
  25: 'https://cronoscan.com',
};

const TRON_EXPLORER_BASE = 'https://tronscan.org/#';

const STELLAR_EXPLORER_BASE = 'https://stellar.expert/explorer/public';

function getExplorerBaseUrl(chainId: number): string {
  return CHAIN_EXPLORER_BASE_URL[chainId] || '';
}

function buildContractExplorerUrl(chainId: number, contractAddress: string): string {
  const base = getExplorerBaseUrl(chainId);
  if (!base) return '';
  return `${base}/address/${contractAddress}#readContract`;
}

function buildTronContractExplorerUrl(contractAddress: string): string {
  return `${TRON_EXPLORER_BASE}/contract/${contractAddress}`;
}

function buildStellarContractExplorerUrl(contractId: string): string {
  return `${STELLAR_EXPLORER_BASE}/contract/${contractId}`;
}

export function buildEvmVerification(
  contractAddress: string,
  chainId: number,
  method: string
): OnChainVerification {
  return {
    type: 'on-chain',
    contractAddress,
    chainId,
    explorerUrl: buildContractExplorerUrl(chainId, contractAddress),
    method,
  };
}

export function buildTronVerification(
  contractAddress: string,
  method: string
): OnChainVerification {
  return {
    type: 'on-chain',
    contractAddress,
    chainId: 728126428,
    explorerUrl: buildTronContractExplorerUrl(contractAddress),
    method,
  };
}

export function buildStellarVerification(contractId: string, method: string): OnChainVerification {
  return {
    type: 'on-chain',
    contractAddress: contractId,
    chainId: -1,
    explorerUrl: buildStellarContractExplorerUrl(contractId),
    method,
  };
}

export function buildApiVerification(
  apiUrl: string,
  method: string,
  displayName?: string
): OnChainVerification {
  return {
    type: 'api',
    contractAddress: displayName || apiUrl,
    chainId: 0,
    explorerUrl: apiUrl,
    method,
  };
}
