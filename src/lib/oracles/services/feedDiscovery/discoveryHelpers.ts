export function getChainlinkDiscoverySymbols(): string[] {
  return [
    // === Major Cryptocurrencies ===
    'BTC',
    'ETH',
    'BNB',
    'SOL',
    'XRP',
    'ADA',
    'AVAX',
    'DOT',
    'MATIC',
    'LINK',
    'UNI',
    'ATOM',
    'LTC',
    'BCH',
    'ETC',
    'XLM',
    'ALGO',
    'XTZ',
    'EOS',
    'FIL',
    'HBAR',
    'NEAR',
    'FTM',
    'FLOW',
    'ICP',
    'VET',
    'THETA',
    'KAVA',
    'ZEC',
    'DASH',
    'XMR',
    'WAVES',
    'KSM',
    'ZIL',
    'QTUM',
    'ICX',
    'ONT',
    'ZRX',
    'BAT',
    'REP',

    // === DeFi Tokens ===
    'AAVE',
    'COMP',
    'MKR',
    'SNX',
    'CRV',
    'SUSHI',
    'YFI',
    'BAL',
    '1INCH',
    'LDO',
    'RPL',
    'FXS',
    'CVX',
    'SPELL',
    'ALCX',
    'BADGER',
    'PERP',
    'REN',
    'KNC',
    'BNT',
    'ALPHA',
    'CREAM',
    'RUNE',
    'LUNA',
    'UST',
    'WNXM',
    'NXM',
    'MPL',
    'BOND',
    'ORN',
    'RARI',
    'FARM',
    'ALPHA',
    'SRM',
    'RAY',
    'FTT',
    'OXY',
    'TOKE',

    // === Layer 2 & Sidechains ===
    'ARB',
    'OP',
    'METIS',
    'BOBA',
    'IMX',
    'LRC',
    'MINA',
    'CELR',
    'SKL',

    // === NFT & Gaming ===
    'SAND',
    'MANA',
    'AXS',
    'ENJ',
    'GALA',
    'ILV',
    'ALICE',
    'TLM',
    'SLP',
    'CHZ',
    'AUDIO',
    'GHST',
    'LOOKS',
    'BLUR',
    'APE',

    // === Oracle & Data ===
    'GRT',
    'BAND',
    'API3',
    'TRB',

    // === Infrastructure ===
    'RNDR',
    'AR',
    'STORJ',
    'ANKR',
    'NKN',
    'POKT',

    // === New Layer 1s ===
    'SUI',
    'SEI',
    'TIA',
    'APT',
    'INJ',
    'TON',
    'STRK',
    'JUP',
    'JTO',
    'WLD',

    // === Memecoins ===
    'DOGE',
    'SHIB',
    'PEPE',
    'WIF',
    'BONK',
    'FLOKI',

    // === Liquid Staking Derivatives ===
    'STETH',
    'RETH',
    'CBETH',
    'WSTETH',
    'WEETH',
    'STMATIC',
    'FRXETH',
    'SFRXETH',
    'RETH',
    'ANKRETH',
    'SWETH',

    // === Wrapped Assets ===
    'WBTC',
    'RENBTC',
    'TBTC',
    'HBTC',
    'WETH',

    // === Stablecoins ===
    'USDC',
    'USDT',
    'DAI',
    'FRAX',
    'LUSD',
    'BUSD',
    'TUSD',
    'USDD',
    'USDP',
    'GUSD',
    'USDX',
    'USDN',
    'RSV',
    'USDK',
    'PAX',
    'HUSD',
    'SUSD',
    'MUSD',
    'DUSD',
    'CRVUSD',
    'GHO',
    'PYUSD',
    'FDUSD',
    'EURC',
    'EURT',
    'EURS',
    'XSGD',
    'XAUT',

    // === RWA (Real World Assets) ===
    'PAXG',
    'DGX',
    'PMGT',

    // === Newer DeFi ===
    'PENDLE',
    'ENA',
    'ETHFI',
    'W',
    'TNSR',
    'SAGA',
    'ENS',
    'GMX',
    'RDNT',
    'MAGIC',
    'GRAIL',
    'JOE',
    'PNG',
    'QUICK',
    'DYDX',
    'PERP',
    'LEVER',
    'CAKE',
    'BIFI',

    // === Exchange Tokens ===
    'CRO',
    'HT',
    'OKB',
    'LEO',
    'KCS',
    'GT',

    // === Forex Pairs ===
    'EUR',
    'GBP',
    'JPY',
    'CHF',
    'AUD',
    'CAD',
    'NZD',
    'SGD',
    'HKD',
    'KRW',
    'INR',
    'MXN',
    'BRL',
    'SEK',
    'NOK',
    'DKK',
    'TRY',
    'ZAR',
    'PHP',
    'IDR',
    'CNY',
    'RUB',
    'THB',
    'PLN',
    'CZK',
    'ILS',
    'CLP',
    'TWD',
    'ARS',

    // === Commodities ===
    'XAU', // Gold
    'XAG', // Silver
    'XPT', // Platinum
    'XPD', // Palladium
    'XCU', // Copper
    'OIL', // Crude Oil
    'BRENT', // Brent Crude
    'NG', // Natural Gas

    // === US Equities (Tech) ===
    'AAPL',
    'AMZN',
    'GOOGL',
    'GOOG',
    'MSFT',
    'META',
    'TSLA',
    'NVDA',
    'AMD',
    'INTC',
    'NFLX',
    'COIN',
    'SQ',
    'PYPL',
    'SHOP',
    'UBER',
    'SNAP',
    'TWTR',
    'PINS',
    'ROKU',
    'ZM',
    'DOCU',
    'SNOW',
    'DDOG',
    'NET',
    'CRWD',
    'ZS',
    'OKTA',

    // === US Equities (Finance) ===
    'JPM',
    'BAC',
    'WFC',
    'GS',
    'MS',
    'C',
    'USB',
    'PNC',
    'BK',
    'AXP',
    'V',
    'MA',
    'SCHW',

    // === US Equities (Other) ===
    'BRK.B',
    'JNJ',
    'UNH',
    'PG',
    'HD',
    'DIS',
    'ADBE',
    'CRM',
    'ORCL',
    'CSCO',
    'VZ',
    'T',
    'CMCSA',
    'PEP',
    'KO',
    'NKE',
    'MCD',
    'WMT',
    'CVX',
    'XOM',
    'BA',
    'CAT',
    'MMM',
    'HON',

    // === ETFs ===
    'SPY',
    'QQQ',
    'IWM',
    'DIA',
    'VTI',
    'VOO',
    'GLD',
    'SLV',
    'TLT',
    'HYG',
    'LQD',
    'EEM',
    'EFA',
    'VEA',
    'IEMG',
    'VWO',
    'ARKK',
    'ARKW',
    'ARKG',
  ];
}

export function inferCategory(symbol: string): string {
  const forex = [
    'EUR',
    'GBP',
    'JPY',
    'CHF',
    'AUD',
    'CAD',
    'NZD',
    'SGD',
    'HKD',
    'KRW',
    'INR',
    'MXN',
    'BRL',
    'SEK',
    'NOK',
    'TRY',
    'ZAR',
    'PHP',
    'IDR',
    'CNY',
  ];
  const commodity = ['XAU', 'XAG', 'XPT', 'XPD'];
  const equity = ['AAPL', 'AMZN', 'TSLA', 'GOOGL', 'MSFT', 'META', 'NVDA', 'COIN'];
  const stablecoin = [
    'USDC',
    'USDT',
    'DAI',
    'FRAX',
    'LUSD',
    'BUSD',
    'TUSD',
    'USDD',
    'USDP',
    'PYUSD',
    'GHO',
    'CRVUSD',
  ];

  if (forex.includes(symbol)) return 'forex';
  if (commodity.includes(symbol)) return 'commodity';
  if (equity.includes(symbol)) return 'equity';
  if (stablecoin.includes(symbol)) return 'stablecoin';
  return 'crypto';
}

export function decodeFlareFeedId(feedId: string): { symbol: string; category: string } | null {
  try {
    // Remove 0x prefix
    const hex = feedId.startsWith('0x') ? feedId.slice(2) : feedId;
    if (hex.length !== 42) return null; // 21 bytes = 42 hex chars

    // First byte is category
    const categoryByte = parseInt(hex.slice(0, 2), 16);
    // Bytes 1-20 are the hex-encoded feed name
    const nameHex = hex.slice(2);
    // Decode hex to string, removing null bytes
    const nameBytes = Buffer.from(nameHex, 'hex');
    const name = nameBytes.toString('utf8').replace(/\0/g, '').trim();

    if (!name) return null;

    const categoryMap: Record<number, string> = {
      1: 'crypto',
      2: 'forex',
      3: 'commodity',
      4: 'equity',
      33: 'crypto', // Custom crypto feed (0x21)
    };

    const category = categoryMap[categoryByte] || 'crypto';

    return { symbol: name, category };
  } catch {
    return null;
  }
}
