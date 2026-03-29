export type ChainId = 1 | 42161 | 10 | 137 | 8453 | 43114;

export type ExplorerType = 'tx' | 'address' | 'block' | 'token';

interface ChainConfig {
  name: string;
  etherscanUrl: string;
  symbol: string;
}

const CHAIN_CONFIGS: Record<ChainId, ChainConfig> = {
  1: {
    name: 'Ethereum',
    etherscanUrl: 'https://etherscan.io',
    symbol: 'ETH',
  },
  42161: {
    name: 'Arbitrum',
    etherscanUrl: 'https://arbiscan.io',
    symbol: 'ETH',
  },
  10: {
    name: 'Optimism',
    etherscanUrl: 'https://optimistic.etherscan.io',
    symbol: 'ETH',
  },
  137: {
    name: 'Polygon',
    etherscanUrl: 'https://polygonscan.com',
    symbol: 'MATIC',
  },
  8453: {
    name: 'Base',
    etherscanUrl: 'https://basescan.org',
    symbol: 'ETH',
  },
  43114: {
    name: 'Avalanche',
    etherscanUrl: 'https://snowtrace.io',
    symbol: 'AVAX',
  },
};

export function getEtherscanUrl(
  type: ExplorerType,
  hash: string,
  chain: ChainId = 1
): string {
  const config = CHAIN_CONFIGS[chain] || CHAIN_CONFIGS[1];

  const baseUrl = config.etherscanUrl;

  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${hash}`;
    case 'address':
      return `${baseUrl}/address/${hash}`;
    case 'block':
      return `${baseUrl}/block/${hash}`;
    case 'token':
      return `${baseUrl}/token/${hash}`;
    default:
      return `${baseUrl}/tx/${hash}`;
  }
}

export function getTellorScanUrl(queryId: string): string {
  return `https://tellorscan.io/query/${queryId}`;
}

export function formatTxHash(hash: string, startChars: number = 6, endChars: number = 4): string {
  if (!hash) return '';
  if (hash.length <= startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  return formatTxHash(address, startChars, endChars);
}

export function formatBlockHeight(height: number | string): string {
  const num = typeof height === 'string' ? parseInt(height.replace(/,/g, '')) : height;
  return num.toLocaleString();
}

export function getChainName(chainId: ChainId): string {
  return CHAIN_CONFIGS[chainId]?.name || 'Unknown';
}

export function getChainSymbol(chainId: ChainId): string {
  return CHAIN_CONFIGS[chainId]?.symbol || 'ETH';
}

export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export interface DataVerificationInfo {
  source: 'on-chain' | 'cache' | 'fallback';
  blockHeight?: number;
  txHash?: string;
  reporterAddress?: string;
  timestamp?: number;
  queryId?: string;
  chainId?: ChainId;
}

export function generateVerificationLinks(info: DataVerificationInfo): {
  txUrl?: string;
  blockUrl?: string;
  reporterUrl?: string;
  tellorScanUrl?: string;
} {
  const chainId = info.chainId || 1;
  const result: {
    txUrl?: string;
    blockUrl?: string;
    reporterUrl?: string;
    tellorScanUrl?: string;
  } = {};

  if (info.txHash && isValidTxHash(info.txHash)) {
    result.txUrl = getEtherscanUrl('tx', info.txHash, chainId);
  }

  if (info.blockHeight) {
    result.blockUrl = getEtherscanUrl('block', String(info.blockHeight), chainId);
  }

  if (info.reporterAddress && isValidAddress(info.reporterAddress)) {
    result.reporterUrl = getEtherscanUrl('address', info.reporterAddress, chainId);
  }

  if (info.queryId) {
    result.tellorScanUrl = getTellorScanUrl(info.queryId);
  }

  return result;
}
