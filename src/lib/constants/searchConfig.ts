export type SearchItemType = 'token' | 'oracle' | 'chain' | 'protocol';

export interface SearchableItem {
  id: string;
  type: SearchItemType;
  name: string;
  symbol?: string;
  aliases: string[];
  category?: string;
  path: string;
}

const searchableItems: SearchableItem[] = [
  // Tokens
  {
    id: 'token-btc',
    type: 'token',
    name: 'Bitcoin',
    symbol: 'BTC',
    aliases: ['bitcoin', 'btc'],
    category: 'layer1',
    path: '/price-query?symbol=BTC',
  },
  {
    id: 'token-eth',
    type: 'token',
    name: 'Ethereum',
    symbol: 'ETH',
    aliases: ['ethereum', 'eth'],
    category: 'layer1',
    path: '/price-query?symbol=ETH',
  },
  {
    id: 'token-sol',
    type: 'token',
    name: 'Solana',
    symbol: 'SOL',
    aliases: ['solana', 'sol'],
    category: 'layer1',
    path: '/price-query?symbol=SOL',
  },
  {
    id: 'token-avax',
    type: 'token',
    name: 'Avalanche',
    symbol: 'AVAX',
    aliases: ['avalanche', 'avax'],
    category: 'layer1',
    path: '/price-query?symbol=AVAX',
  },
  {
    id: 'token-near',
    type: 'token',
    name: 'Near',
    symbol: 'NEAR',
    aliases: ['near', 'near protocol'],
    category: 'layer1',
    path: '/price-query?symbol=NEAR',
  },
  {
    id: 'token-matic',
    type: 'token',
    name: 'Polygon',
    symbol: 'MATIC',
    aliases: ['polygon', 'matic'],
    category: 'layer1',
    path: '/price-query?symbol=MATIC',
  },
  {
    id: 'token-arb',
    type: 'token',
    name: 'Arbitrum',
    symbol: 'ARB',
    aliases: ['arbitrum', 'arb'],
    category: 'layer2',
    path: '/price-query?symbol=ARB',
  },
  {
    id: 'token-op',
    type: 'token',
    name: 'Optimism',
    symbol: 'OP',
    aliases: ['optimism', 'op'],
    category: 'layer2',
    path: '/price-query?symbol=OP',
  },
  {
    id: 'token-dot',
    type: 'token',
    name: 'Polkadot',
    symbol: 'DOT',
    aliases: ['polkadot', 'dot'],
    category: 'layer1',
    path: '/price-query?symbol=DOT',
  },
  {
    id: 'token-ada',
    type: 'token',
    name: 'Cardano',
    symbol: 'ADA',
    aliases: ['cardano', 'ada'],
    category: 'layer1',
    path: '/price-query?symbol=ADA',
  },
  {
    id: 'token-atom',
    type: 'token',
    name: 'Cosmos',
    symbol: 'ATOM',
    aliases: ['cosmos', 'atom'],
    category: 'layer1',
    path: '/price-query?symbol=ATOM',
  },
  {
    id: 'token-ftm',
    type: 'token',
    name: 'Fantom',
    symbol: 'FTM',
    aliases: ['fantom', 'ftm'],
    category: 'layer1',
    path: '/price-query?symbol=FTM',
  },
  {
    id: 'token-link',
    type: 'token',
    name: 'Chainlink',
    symbol: 'LINK',
    aliases: ['chainlink', 'link', 'oracle'],
    category: 'defi',
    path: '/price-query?symbol=LINK',
  },
  {
    id: 'token-uni',
    type: 'token',
    name: 'Uniswap',
    symbol: 'UNI',
    aliases: ['uniswap', 'uni'],
    category: 'defi',
    path: '/price-query?symbol=UNI',
  },
  {
    id: 'token-aave',
    type: 'token',
    name: 'Aave',
    symbol: 'AAVE',
    aliases: ['aave'],
    category: 'defi',
    path: '/price-query?symbol=AAVE',
  },
  {
    id: 'token-mkr',
    type: 'token',
    name: 'Maker',
    symbol: 'MKR',
    aliases: ['maker', 'mkr', 'makerdao'],
    category: 'defi',
    path: '/price-query?symbol=MKR',
  },
  {
    id: 'token-snx',
    type: 'token',
    name: 'Synthetix',
    symbol: 'SNX',
    aliases: ['synthetix', 'snx'],
    category: 'defi',
    path: '/price-query?symbol=SNX',
  },
  {
    id: 'token-comp',
    type: 'token',
    name: 'Compound',
    symbol: 'COMP',
    aliases: ['compound', 'comp'],
    category: 'defi',
    path: '/price-query?symbol=COMP',
  },
  {
    id: 'token-yfi',
    type: 'token',
    name: 'yearn.finance',
    symbol: 'YFI',
    aliases: ['yearn', 'yfi', 'yearn finance'],
    category: 'defi',
    path: '/price-query?symbol=YFI',
  },
  {
    id: 'token-crv',
    type: 'token',
    name: 'Curve',
    symbol: 'CRV',
    aliases: ['curve', 'crv'],
    category: 'defi',
    path: '/price-query?symbol=CRV',
  },
  {
    id: 'token-ldo',
    type: 'token',
    name: 'Lido',
    symbol: 'LDO',
    aliases: ['lido', 'ldo'],
    category: 'defi',
    path: '/price-query?symbol=LDO',
  },
  {
    id: 'token-sushi',
    type: 'token',
    name: 'SushiSwap',
    symbol: 'SUSHI',
    aliases: ['sushi', 'sushiswap'],
    category: 'defi',
    path: '/price-query?symbol=SUSHI',
  },
  {
    id: 'token-1inch',
    type: 'token',
    name: '1inch',
    symbol: '1INCH',
    aliases: ['1inch'],
    category: 'defi',
    path: '/price-query?symbol=1INCH',
  },
  {
    id: 'token-bal',
    type: 'token',
    name: 'Balancer',
    symbol: 'BAL',
    aliases: ['balancer', 'bal'],
    category: 'defi',
    path: '/price-query?symbol=BAL',
  },
  {
    id: 'token-fxs',
    type: 'token',
    name: 'Frax',
    symbol: 'FXS',
    aliases: ['frax', 'fxs', 'frax share'],
    category: 'defi',
    path: '/price-query?symbol=FXS',
  },
  {
    id: 'token-rpl',
    type: 'token',
    name: 'Rocket Pool',
    symbol: 'RPL',
    aliases: ['rocketpool', 'rpl', 'rocket pool'],
    category: 'defi',
    path: '/price-query?symbol=RPL',
  },
  {
    id: 'token-gmx',
    type: 'token',
    name: 'GMX',
    symbol: 'GMX',
    aliases: ['gmx'],
    category: 'defi',
    path: '/price-query?symbol=GMX',
  },
  {
    id: 'token-dydx',
    type: 'token',
    name: 'dYdX',
    symbol: 'DYDX',
    aliases: ['dydx', 'd y d x'],
    category: 'defi',
    path: '/price-query?symbol=DYDX',
  },
  {
    id: 'token-usdc',
    type: 'token',
    name: 'USD Coin',
    symbol: 'USDC',
    aliases: ['usdc', 'usd coin'],
    category: 'stablecoin',
    path: '/price-query?symbol=USDC',
  },
  {
    id: 'token-usdt',
    type: 'token',
    name: 'Tether',
    symbol: 'USDT',
    aliases: ['usdt', 'tether'],
    category: 'stablecoin',
    path: '/price-query?symbol=USDT',
  },
  {
    id: 'token-dai',
    type: 'token',
    name: 'Dai',
    symbol: 'DAI',
    aliases: ['dai'],
    category: 'stablecoin',
    path: '/price-query?symbol=DAI',
  },

  // Oracles
  {
    id: 'oracle-chainlink',
    type: 'oracle',
    name: 'Chainlink',
    symbol: 'LINK',
    aliases: ['chainlink', 'link', 'king of oracles', 'chain link'],
    category: 'oracle',
    path: '/chainlink',
  },
  {
    id: 'oracle-pyth',
    type: 'oracle',
    name: 'Pyth Network',
    symbol: 'PYTH',
    aliases: ['pyth', 'pyth network'],
    category: 'oracle',
    path: '/pyth',
  },
  {
    id: 'oracle-api3',
    type: 'oracle',
    name: 'API3',
    symbol: 'API3',
    aliases: ['api3', 'api 3'],
    category: 'oracle',
    path: '/api3',
  },
  {
    id: 'oracle-redstone',
    type: 'oracle',
    name: 'RedStone',
    symbol: 'RED',
    aliases: ['redstone', 'red stone'],
    category: 'oracle',
    path: '/redstone',
  },
  {
    id: 'oracle-dia',
    type: 'oracle',
    name: 'DIA',
    symbol: 'DIA',
    aliases: ['dia', 'decentralized information asset'],
    category: 'oracle',
    path: '/dia',
  },
  {
    id: 'oracle-winklink',
    type: 'oracle',
    name: 'WINkLink',
    symbol: 'WIN',
    aliases: ['winklink', 'win klink', 'tron oracle'],
    category: 'oracle',
    path: '/winklink',
  },

  // Blockchains
  {
    id: 'chain-ethereum',
    type: 'chain',
    name: 'Ethereum',
    symbol: 'ETH',
    aliases: ['ethereum', 'eth'],
    category: 'layer1',
    path: '/cross-chain?chain=ethereum',
  },
  {
    id: 'chain-solana',
    type: 'chain',
    name: 'Solana',
    symbol: 'SOL',
    aliases: ['solana', 'sol'],
    category: 'layer1',
    path: '/cross-chain?chain=solana',
  },
  {
    id: 'chain-arbitrum',
    type: 'chain',
    name: 'Arbitrum',
    symbol: 'ARB',
    aliases: ['arbitrum', 'arb'],
    category: 'layer2',
    path: '/cross-chain?chain=arbitrum',
  },
  {
    id: 'chain-optimism',
    type: 'chain',
    name: 'Optimism',
    symbol: 'OP',
    aliases: ['optimism', 'op'],
    category: 'layer2',
    path: '/cross-chain?chain=optimism',
  },
  {
    id: 'chain-polygon',
    type: 'chain',
    name: 'Polygon',
    symbol: 'MATIC',
    aliases: ['polygon', 'matic'],
    category: 'layer1',
    path: '/cross-chain?chain=polygon',
  },
  {
    id: 'chain-avalanche',
    type: 'chain',
    name: 'Avalanche',
    symbol: 'AVAX',
    aliases: ['avalanche', 'avax'],
    category: 'layer1',
    path: '/cross-chain?chain=avalanche',
  },
  {
    id: 'chain-base',
    type: 'chain',
    name: 'Base',
    symbol: 'BASE',
    aliases: ['base', 'base chain', 'coinbase chain'],
    category: 'layer2',
    path: '/cross-chain?chain=base',
  },
  {
    id: 'chain-bnb',
    type: 'chain',
    name: 'BNB Chain',
    symbol: 'BNB',
    aliases: ['bnb', 'bnb chain', 'bsc', 'binance smart chain'],
    category: 'layer1',
    path: '/cross-chain?chain=bnb-chain',
  },
  {
    id: 'chain-fantom',
    type: 'chain',
    name: 'Fantom',
    symbol: 'FTM',
    aliases: ['fantom', 'ftm'],
    category: 'layer1',
    path: '/cross-chain?chain=fantom',
  },
  {
    id: 'chain-cosmos',
    type: 'chain',
    name: 'Cosmos',
    symbol: 'ATOM',
    aliases: ['cosmos', 'atom'],
    category: 'layer1',
    path: '/cross-chain?chain=cosmos',
  },
  {
    id: 'chain-near',
    type: 'chain',
    name: 'Near',
    symbol: 'NEAR',
    aliases: ['near', 'near protocol'],
    category: 'layer1',
    path: '/cross-chain?chain=near',
  },
  {
    id: 'chain-aptos',
    type: 'chain',
    name: 'Aptos',
    symbol: 'APT',
    aliases: ['aptos', 'apt'],
    category: 'layer1',
    path: '/cross-chain?chain=aptos',
  },
  {
    id: 'chain-sui',
    type: 'chain',
    name: 'Sui',
    symbol: 'SUI',
    aliases: ['sui'],
    category: 'layer1',
    path: '/cross-chain?chain=sui',
  },
];

export interface SearchResult {
  item: SearchableItem;
  score: number;
  matchType: 'exact' | 'prefix' | 'contains';
}

export function searchAll(query: string): SearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const results: SearchResult[] = [];

  searchableItems.forEach((item) => {
    let score = 0;
    let matchType: 'exact' | 'prefix' | 'contains' = 'contains';

    const symbolLower = item.symbol?.toLowerCase() || '';
    const nameLower = item.name.toLowerCase();
    const aliasesLower = item.aliases.map((a) => a.toLowerCase());

    if (symbolLower === normalizedQuery || nameLower === normalizedQuery) {
      score = 100;
      matchType = 'exact';
    } else if (aliasesLower.includes(normalizedQuery)) {
      score = 95;
      matchType = 'exact';
    } else if (symbolLower.startsWith(normalizedQuery)) {
      score = 90;
      matchType = 'prefix';
    } else if (nameLower.startsWith(normalizedQuery)) {
      score = 85;
      matchType = 'prefix';
    } else if (aliasesLower.some((a) => a.startsWith(normalizedQuery))) {
      score = 80;
      matchType = 'prefix';
    } else if (symbolLower.includes(normalizedQuery)) {
      score = 60;
      matchType = 'contains';
    } else if (nameLower.includes(normalizedQuery)) {
      score = 55;
      matchType = 'contains';
    } else if (aliasesLower.some((a) => a.includes(normalizedQuery))) {
      score = 50;
      matchType = 'contains';
    }

    if (score > 0) {
      results.push({ item, score, matchType });
    }
  });

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const typeOrder = { token: 0, oracle: 1, chain: 2, protocol: 3 };
    return typeOrder[a.item.type] - typeOrder[b.item.type];
  });

  return results.slice(0, 10);
}

export function getTokenSymbol(query: string): string | null {
  const normalizedQuery = query.trim().toLowerCase();

  for (const item of searchableItems) {
    if (item.type !== 'token') continue;

    if (item.symbol?.toLowerCase() === normalizedQuery) {
      return item.symbol;
    }
    if (item.name.toLowerCase() === normalizedQuery) {
      return item.symbol || null;
    }
    if (item.aliases.some((a) => a.toLowerCase() === normalizedQuery)) {
      return item.symbol || null;
    }
  }

  return null;
}
