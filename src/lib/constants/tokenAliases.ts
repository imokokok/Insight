export interface TokenAlias {
  symbol: string;
  name: string;
  aliases: string[];
  category: 'layer1' | 'layer2' | 'defi' | 'stablecoin';
}

export const tokenAliases: TokenAlias[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    aliases: ['bitcoin', 'btc', '比特', '比特币'],
    category: 'layer1',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    aliases: ['ethereum', 'eth', '以太', '以太坊'],
    category: 'layer1',
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    aliases: ['solana', 'sol', '索拉纳'],
    category: 'layer1',
  },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    aliases: ['avalanche', 'avax', '雪崩'],
    category: 'layer1',
  },
  {
    symbol: 'NEAR',
    name: 'Near',
    aliases: ['near', 'near protocol', 'near协议'],
    category: 'layer1',
  },
  {
    symbol: 'MATIC',
    name: 'Polygon',
    aliases: ['polygon', 'matic', '多边形'],
    category: 'layer1',
  },
  {
    symbol: 'ARB',
    name: 'Arbitrum',
    aliases: ['arbitrum', 'arb', '阿比特'],
    category: 'layer2',
  },
  {
    symbol: 'OP',
    name: 'Optimism',
    aliases: ['optimism', 'op', '乐观'],
    category: 'layer2',
  },
  {
    symbol: 'DOT',
    name: 'Polkadot',
    aliases: ['polkadot', 'dot', '波卡'],
    category: 'layer1',
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    aliases: ['cardano', 'ada', '艾达'],
    category: 'layer1',
  },
  {
    symbol: 'ATOM',
    name: 'Cosmos',
    aliases: ['cosmos', 'atom', '宇宙', '阿童木'],
    category: 'layer1',
  },
  {
    symbol: 'FTM',
    name: 'Fantom',
    aliases: ['fantom', 'ftm', '幻影'],
    category: 'layer1',
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    aliases: ['chainlink', 'link', '预言机', '链link'],
    category: 'defi',
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    aliases: ['uniswap', 'uni', '优尼'],
    category: 'defi',
  },
  {
    symbol: 'AAVE',
    name: 'Aave',
    aliases: ['aave', '阿维'],
    category: 'defi',
  },
  {
    symbol: 'MKR',
    name: 'Maker',
    aliases: ['maker', 'mkr', 'makerdao'],
    category: 'defi',
  },
  {
    symbol: 'SNX',
    name: 'Synthetix',
    aliases: ['synthetix', 'snx'],
    category: 'defi',
  },
  {
    symbol: 'COMP',
    name: 'Compound',
    aliases: ['compound', 'comp', '复利'],
    category: 'defi',
  },
  {
    symbol: 'YFI',
    name: 'yearn.finance',
    aliases: ['yearn', 'yfi', 'yearn finance'],
    category: 'defi',
  },
  {
    symbol: 'CRV',
    name: 'Curve',
    aliases: ['curve', 'crv', '曲线'],
    category: 'defi',
  },
  {
    symbol: 'LDO',
    name: 'Lido',
    aliases: ['lido', 'ldo', '丽都'],
    category: 'defi',
  },
  {
    symbol: 'SUSHI',
    name: 'SushiSwap',
    aliases: ['sushi', 'sushiswap', '寿司'],
    category: 'defi',
  },
  {
    symbol: '1INCH',
    name: '1inch',
    aliases: ['1inch', '一英寸'],
    category: 'defi',
  },
  {
    symbol: 'BAL',
    name: 'Balancer',
    aliases: ['balancer', 'bal'],
    category: 'defi',
  },
  {
    symbol: 'FXS',
    name: 'Frax',
    aliases: ['frax', 'fxs', 'frax share'],
    category: 'defi',
  },
  {
    symbol: 'RPL',
    name: 'Rocket Pool',
    aliases: ['rocketpool', 'rpl', 'rocket pool'],
    category: 'defi',
  },
  {
    symbol: 'GMX',
    name: 'GMX',
    aliases: ['gmx'],
    category: 'defi',
  },
  {
    symbol: 'DYDX',
    name: 'dYdX',
    aliases: ['dydx', 'd y d x'],
    category: 'defi',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    aliases: ['usdc', 'usd coin', '美元币'],
    category: 'stablecoin',
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    aliases: ['usdt', 'tether', '泰达币'],
    category: 'stablecoin',
  },
  {
    symbol: 'DAI',
    name: 'Dai',
    aliases: ['dai', '戴'],
    category: 'stablecoin',
  },
];

export const tokenAliasMap = new Map<string, string>();

tokenAliases.forEach((token) => {
  tokenAliasMap.set(token.symbol.toLowerCase(), token.symbol);
  tokenAliasMap.set(token.name.toLowerCase(), token.symbol);
  token.aliases.forEach((alias) => {
    tokenAliasMap.set(alias.toLowerCase(), token.symbol);
  });
});

export function findTokenByQuery(query: string): string | null {
  const normalizedQuery = query.trim().toLowerCase();
  
  const directMatch = tokenAliasMap.get(normalizedQuery);
  if (directMatch) return directMatch;
  
  for (const [alias, symbol] of tokenAliasMap.entries()) {
    if (alias.includes(normalizedQuery) || normalizedQuery.includes(alias)) {
      return symbol;
    }
  }
  
  return null;
}

export function searchTokens(query: string): TokenAlias[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];
  
  const results: { token: TokenAlias; score: number }[] = [];
  
  tokenAliases.forEach((token) => {
    let score = 0;
    
    if (token.symbol.toLowerCase() === normalizedQuery) {
      score = 100;
    } else if (token.name.toLowerCase() === normalizedQuery) {
      score = 95;
    } else if (token.aliases.some((a) => a.toLowerCase() === normalizedQuery)) {
      score = 90;
    } else if (token.symbol.toLowerCase().startsWith(normalizedQuery)) {
      score = 80;
    } else if (token.name.toLowerCase().startsWith(normalizedQuery)) {
      score = 75;
    } else if (token.aliases.some((a) => a.toLowerCase().startsWith(normalizedQuery))) {
      score = 70;
    } else if (token.symbol.toLowerCase().includes(normalizedQuery)) {
      score = 50;
    } else if (token.name.toLowerCase().includes(normalizedQuery)) {
      score = 45;
    } else if (token.aliases.some((a) => a.toLowerCase().includes(normalizedQuery))) {
      score = 40;
    }
    
    if (score > 0) {
      results.push({ token, score });
    }
  });
  
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, 8).map((r) => r.token);
}
