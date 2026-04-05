import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('BinanceMarketService');

export interface TokenMarketData {
  symbol: string;
  name: string;
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  totalVolume24h: number;
  high24h: number;
  low24h: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  priceChangePercentage7d?: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply?: number;
  ath: number;
  athChangePercentage: number;
  atl: number;
  atlChangePercentage: number;
  lastUpdated: string;
}

export interface HistoricalPricePoint {
  timestamp: number;
  price: number;
  marketCap?: number;
  volume?: number;
}

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';
const REQUEST_TIMEOUT = 15000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

function isValidPositiveNumber(value: unknown): value is number {
  return isValidNumber(value) && value > 0;
}

function validatePrice(value: unknown, fieldName: string): number {
  const num =
    typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN;

  if (!isValidPositiveNumber(num)) {
    logger.warn(`Invalid ${fieldName}: ${value}, returning 0`);
    return 0;
  }

  return num;
}

function validateOptionalNumber(value: unknown, fieldName: string): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const num =
    typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN;

  if (!isValidNumber(num)) {
    logger.warn(`Invalid ${fieldName}: ${value}, returning 0`);
    return 0;
  }

  return num;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY * (i + 1) * 2;
          logger.warn(`Rate limited, waiting ${waitTime}ms...`);
          await delay(waitTime);
          continue;
        }
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i === retries - 1) {
        break;
      }

      logger.warn(`Fetch attempt ${i + 1} failed, retrying in ${RETRY_DELAY}ms...`);
      await delay(RETRY_DELAY * (i + 1));
    }
  }

  throw new Error(`Failed after ${retries} retries: ${lastError?.message}`);
}

// Binance 交易对映射
const BINANCE_SYMBOLS: Record<string, string> = {
  LINK: 'LINKUSDT',
  ETH: 'ETHUSDT',
  BTC: 'BTCUSDT',
  RED: 'REDUSDT',
  USDC: 'USDCUSDT',
  USDT: 'USDT',
  DAI: 'DAIUSDT',
  MATIC: 'MATICUSDT',
  AVAX: 'AVAXUSDT',
  BNB: 'BNBUSDT',
  ARB: 'ARBUSDT',
  OP: 'OPUSDT',
  UNI: 'UNIUSDT',
  AAVE: 'AAVEUSDT',
  BAND: 'BANDUSDT',
  PYTH: 'PYTHUSDT',
  API3: 'API3USDT',
  UMA: 'UMAUSDT',
  TRB: 'TRBUSDT',
  DIA: 'DIAUSDT',
  SOL: 'SOLUSDT',
  DOGE: 'DOGEUSDT',
  XRP: 'XRPUSDT',
  ADA: 'ADAUSDT',
  DOT: 'DOTUSDT',
  LTC: 'LTCUSDT',
  BCH: 'BCHUSDT',
  ETC: 'ETCUSDT',
  XLM: 'XLMUSDT',
  TRX: 'TRXUSDT',
  EOS: 'EOSUSDT',
  XMR: 'XMRUSDT',
  XTZ: 'XTZUSDT',
  ATOM: 'ATOMUSDT',
  ALGO: 'ALGOUSDT',
  VET: 'VETUSDT',
  IOTA: 'IOTAUSDT',
  NEO: 'NEOUSDT',
  QTUM: 'QTUMUSDT',
  ZRX: 'ZRXUSDT',
  BAT: 'BATUSDT',
  ENJ: 'ENJUSDT',
  MANA: 'MANAUSDT',
  SAND: 'SANDUSDT',
  CHZ: 'CHZUSDT',
  SHIB: 'SHIBUSDT',
  FTM: 'FTMUSDT',
  GRT: 'GRTUSDT',
  SUSHI: 'SUSHIUSDT',
  COMP: 'COMPUSDT',
  MKR: 'MKRUSDT',
  YFI: 'YFIUSDT',
  CRV: 'CRVUSDT',
  SNX: 'SNXUSDT',
  ZEC: 'ZECUSDT',
  DASH: 'DASHUSDT',
  NANO: 'NANOUSDT',
  THETA: 'THETAUSDT',
  ONT: 'ONTUSDT',
  ZIL: 'ZILUSDT',
  KNC: 'KNCUSDT',
  LRC: 'LRCUSDT',
  STORJ: 'STORJUSDT',
  KAVA: 'KAVAUSDT',
  REN: 'RENUSDT',
  BAL: 'BALUSDT',
  YFII: 'YFIIUSDT',
  SRM: 'SRMUSDT',
  CELR: 'CELRUSDT',
  ANKR: 'ANKRUSDT',
  STMX: 'STMXUSDT',
  TOMO: 'TOMOUSDT',
  PERL: 'PERLUSDT',
  DNT: 'DNTUSDT',
  LTO: 'LTOUSDT',
  COS: 'COSUSDT',
  TCT: 'TCTUSDT',
  WRX: 'WRXUSDT',
  LEND: 'LENDUSDT',
  COTI: 'COTIUSDT',
  STPT: 'STPTUSDT',
  HBAR: 'HBARUSDT',
  OMG: 'OMGUSDT',
  NKN: 'NKNUSDT',
  SC: 'SCUSDT',
  IOST: 'IOSTUSDT',
  DGB: 'DGBUSDT',
  WTC: 'WTCUSDT',
  KEY: 'KEYUSDT',
  MFT: 'MFTUSDT',
  DOCK: 'DOCKUSDT',
  WAN: 'WANUSDT',
  FUN: 'FUNUSDT',
  CVC: 'CVCUSDT',
  MTL: 'MTLUSDT',
  GO: 'GOUSDT',
  POA: 'POAUSDT',
  NAV: 'NAVUSDT',
  VIA: 'VIAUSDT',
  BEAM: 'BEAMUSDT',
  RVN: 'RVNUSDT',
  HC: 'HCUSDT',
  ARK: 'ARKUSDT',
  MITH: 'MITHUSDT',
  GRS: 'GRSUSDT',
  EVX: 'EVXUSDT',
  FUEL: 'FUELUSDT',
  CDP: 'CDPUSDT',
  AGI: 'AGIUSDT',
  PAX: 'PAXUSDT',
  TUSD: 'TUSDUSDT',
  USDS: 'USDSUSDT',
  USDSB: 'USDSBUSDT',
  BGBP: 'BGBPUSDT',
  EUR: 'EURUSDT',
  RUB: 'RUBUSDT',
  TRY: 'TRYUSDT',
  BIDR: 'BIDRUSDT',
  IDRT: 'IDRTUSDT',
  ZAR: 'ZARUSDT',
  UAH: 'UAHUSDT',
  NGN: 'NGNUSDT',
  BRL: 'BRLUSDT',
  VAI: 'VAIUSDT',
  UST: 'USTUSDT',
  USDP: 'USDPUSDT',
};

// 代币名称映射
const TOKEN_NAMES: Record<string, string> = {
  LINK: 'Chainlink',
  ETH: 'Ethereum',
  BTC: 'Bitcoin',
  RED: 'RedStone',
  USDC: 'USD Coin',
  USDT: 'Tether',
  DAI: 'Dai',
  MATIC: 'Polygon',
  AVAX: 'Avalanche',
  BNB: 'BNB',
  ARB: 'Arbitrum',
  OP: 'Optimism',
  UNI: 'Uniswap',
  AAVE: 'Aave',
  BAND: 'Band Protocol',
  PYTH: 'Pyth Network',
  API3: 'API3',
  UMA: 'UMA',
  TRB: 'Tellor',
  DIA: 'DIA',
  SOL: 'Solana',
  DOGE: 'Dogecoin',
  XRP: 'XRP',
  ADA: 'Cardano',
  DOT: 'Polkadot',
  LTC: 'Litecoin',
  BCH: 'Bitcoin Cash',
  ETC: 'Ethereum Classic',
  XLM: 'Stellar',
  TRX: 'TRON',
  EOS: 'EOS',
  XMR: 'Monero',
  XTZ: 'Tezos',
  ATOM: 'Cosmos',
  ALGO: 'Algorand',
  VET: 'VeChain',
  IOTA: 'IOTA',
  NEO: 'NEO',
  QTUM: 'Qtum',
  ZRX: '0x',
  BAT: 'Basic Attention Token',
  ENJ: 'Enjin Coin',
  MANA: 'Decentraland',
  SAND: 'The Sandbox',
  CHZ: 'Chiliz',
  SHIB: 'Shiba Inu',
  FTM: 'Fantom',
  GRT: 'The Graph',
  SUSHI: 'SushiSwap',
  COMP: 'Compound',
  MKR: 'Maker',
  YFI: 'yearn.finance',
  CRV: 'Curve DAO Token',
  SNX: 'Synthetix',
  ZEC: 'Zcash',
  DASH: 'Dash',
  NANO: 'Nano',
  THETA: 'Theta Network',
  ONT: 'Ontology',
  ZIL: 'Zilliqa',
  KNC: 'Kyber Network',
  LRC: 'Loopring',
  STORJ: 'Storj',
  KAVA: 'Kava',
  REN: 'Ren',
  BAL: 'Balancer',
  YFII: 'DFI.Money',
  SRM: 'Serum',
  CELR: 'Celer Network',
  ANKR: 'Ankr',
  STMX: 'StormX',
  TOMO: 'TomoChain',
  PERL: 'Perlin',
  DNT: 'district0x',
  LTO: 'LTO Network',
  COS: 'Contentos',
  TCT: 'TokenClub',
  WRX: 'WazirX',
  LEND: 'Aave',
  COTI: 'COTI',
  STPT: 'STP Network',
  HBAR: 'Hedera',
  OMG: 'OMG Network',
  NKN: 'NKN',
  SC: 'Siacoin',
  IOST: 'IOST',
  DGB: 'DigiByte',
  WTC: 'Waltonchain',
  KEY: 'SelfKey',
  MFT: 'Mainframe',
  DOCK: 'Dock',
  WAN: 'Wanchain',
  FUN: 'FunFair',
  CVC: 'Civic',
  MTL: 'Metal',
  GO: 'GoChain',
  POA: 'POA Network',
  NAV: 'NavCoin',
  VIA: 'Viacoin',
  BEAM: 'Beam',
  RVN: 'Ravencoin',
  HC: 'HyperCash',
  ARK: 'Ark',
  MITH: 'Mithril',
  GRS: 'Groestlcoin',
  EVX: 'Everex',
  FUEL: 'Etherparty',
  CDP: 'Cindicator',
  AGI: 'SingularityNET',
  PAX: 'Paxos Standard',
  TUSD: 'TrueUSD',
  USDS: 'StableUSD',
  USDSB: 'StableUSD',
  BGBP: 'Binance GBP Stable Coin',
  EUR: 'Euro',
  RUB: 'Russian Ruble',
  TRY: 'Turkish Lira',
  BIDR: 'BIDR',
  IDRT: 'Rupiah Token',
  ZAR: 'South African Rand',
  UAH: 'Ukrainian Hryvnia',
  NGN: 'Nigerian Naira',
  BRL: 'Brazilian Real',
  VAI: 'Vai',
  UST: 'TerraUSD',
  USDP: 'Pax Dollar',
};

export async function getTokenMarketData(symbol: string): Promise<TokenMarketData | null> {
  try {
    const binanceSymbol = BINANCE_SYMBOLS[symbol.toUpperCase()];
    if (!binanceSymbol) {
      logger.warn(`Unknown symbol: ${symbol}`);
      return null;
    }

    logger.info(`Fetching market data for ${symbol} (${binanceSymbol})...`);

    const tickerResponse = await fetchWithRetry(
      `${BINANCE_API_BASE}/ticker/24hr?symbol=${binanceSymbol}`
    );

    const tickerData = await tickerResponse.json();

    if (!tickerData || typeof tickerData !== 'object') {
      logger.error(`Invalid ticker data received for ${symbol}`);
      return null;
    }

    const priceResponse = await fetchWithRetry(
      `${BINANCE_API_BASE}/ticker/price?symbol=${binanceSymbol}`
    );

    const priceData = await priceResponse.json();

    if (!priceData || typeof priceData !== 'object') {
      logger.error(`Invalid price data received for ${symbol}`);
      return null;
    }

    const currentPrice = validatePrice(priceData.price, 'currentPrice');

    if (currentPrice === 0) {
      logger.error(`Invalid current price for ${symbol}, skipping market data`);
      return null;
    }

    const high24h = validatePrice(tickerData.highPrice, 'high24h');
    const low24h = validatePrice(tickerData.lowPrice, 'low24h');
    const priceChange24h = validateOptionalNumber(tickerData.priceChange, 'priceChange24h') ?? 0;
    const priceChangePercentage24h =
      validateOptionalNumber(tickerData.priceChangePercent, 'priceChangePercentage24h') ?? 0;

    const volume = validateOptionalNumber(tickerData.volume, 'volume');
    const weightedAvgPrice = validateOptionalNumber(
      tickerData.weightedAvgPrice,
      'weightedAvgPrice'
    );
    const totalVolume24h =
      volume !== null && weightedAvgPrice !== null ? volume * weightedAvgPrice : 0;

    const marketData: TokenMarketData = {
      symbol: symbol.toUpperCase(),
      name: TOKEN_NAMES[symbol.toUpperCase()] || symbol.toUpperCase(),
      currentPrice,
      marketCap: 0,
      marketCapRank: 0,
      totalVolume24h,
      high24h,
      low24h,
      priceChange24h,
      priceChangePercentage24h,
      circulatingSupply: 0,
      totalSupply: 0,
      ath: 0,
      athChangePercentage: 0,
      atl: 0,
      atlChangePercentage: 0,
      lastUpdated: tickerData.closeTime
        ? new Date(tickerData.closeTime).toISOString()
        : new Date().toISOString(),
    };

    logger.info(`Successfully fetched market data for ${symbol}`);
    return marketData;
  } catch (error) {
    logger.error(
      `Failed to fetch market data for ${symbol}:`,
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function getMultipleTokensMarketData(symbols: string[]): Promise<TokenMarketData[]> {
  try {
    const binanceSymbols = symbols.map((s) => BINANCE_SYMBOLS[s.toUpperCase()]).filter(Boolean);

    if (binanceSymbols.length === 0) {
      logger.warn('No valid symbols provided');
      return [];
    }

    logger.info(`Fetching market data for multiple tokens: ${binanceSymbols.join(', ')}`);

    // Binance 没有批量查询接口，需要逐个查询
    const results: TokenMarketData[] = [];
    for (const symbol of symbols) {
      const data = await getTokenMarketData(symbol);
      if (data) {
        results.push(data);
      }
    }

    return results;
  } catch (error) {
    logger.error(
      'Failed to fetch multiple tokens market data:',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function getHistoricalPrices(
  symbol: string,
  days: number = 30
): Promise<HistoricalPricePoint[]> {
  try {
    const binanceSymbol = BINANCE_SYMBOLS[symbol.toUpperCase()];
    if (!binanceSymbol) {
      logger.warn(`Unknown symbol: ${symbol}`);
      return [];
    }

    logger.info(`Fetching historical prices for ${symbol} (${days} days)...`);

    // 将天数转换为合适的间隔
    let interval: string;
    let limit: number;

    if (days <= 1) {
      interval = '1h';
      limit = 24;
    } else if (days <= 7) {
      interval = '1h';
      limit = Math.min(days * 24, 168);
    } else if (days <= 30) {
      interval = '4h';
      limit = Math.min(days * 6, 180);
    } else if (days <= 90) {
      interval = '12h';
      limit = Math.min(days * 2, 180);
    } else {
      interval = '1d';
      limit = Math.min(days, 365);
    }

    const response = await fetchWithRetry(
      `${BINANCE_API_BASE}/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`
    );

    const data = await response.json();

    // Binance klines 格式: [
    //   0: 开盘时间,
    //   1: 开盘价,
    //   2: 最高价,
    //   3: 最低价,
    //   4: 收盘价,
    //   5: 成交量,
    //   6: 收盘时间,
    //   7: 成交额,
    //   ...
    // ]
    const prices: HistoricalPricePoint[] = data.map((item: (number | string)[]) => ({
      timestamp: Number(item[0]), // 开盘时间
      price: parseFloat(String(item[4])), // 收盘价
      volume: parseFloat(String(item[5])), // 成交量
    }));

    logger.info(`Successfully fetched ${prices.length} historical price points for ${symbol}`);
    return prices;
  } catch (error) {
    logger.error(
      `Failed to fetch historical prices for ${symbol}:`,
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function getOHLCData(
  symbol: string,
  days: number = 30
): Promise<Array<{ timestamp: number; open: number; high: number; low: number; close: number }>> {
  try {
    const binanceSymbol = BINANCE_SYMBOLS[symbol.toUpperCase()];
    if (!binanceSymbol) {
      logger.warn(`Unknown symbol: ${symbol}`);
      return [];
    }

    logger.info(`Fetching OHLC data for ${symbol} (${days} days)...`);

    // 将天数转换为合适的间隔
    let interval: string;
    let limit: number;

    if (days <= 1) {
      interval = '1h';
      limit = 24;
    } else if (days <= 7) {
      interval = '1h';
      limit = Math.min(days * 24, 168);
    } else if (days <= 30) {
      interval = '4h';
      limit = Math.min(days * 6, 180);
    } else if (days <= 90) {
      interval = '12h';
      limit = Math.min(days * 2, 180);
    } else {
      interval = '1d';
      limit = Math.min(days, 365);
    }

    const response = await fetchWithRetry(
      `${BINANCE_API_BASE}/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`
    );

    const data = await response.json();

    const ohlcData = data.map((item: (number | string)[]) => ({
      timestamp: Number(item[0]),
      open: parseFloat(String(item[1])),
      high: parseFloat(String(item[2])),
      low: parseFloat(String(item[3])),
      close: parseFloat(String(item[4])),
    }));

    logger.info(`Successfully fetched ${ohlcData.length} OHLC data points for ${symbol}`);
    return ohlcData;
  } catch (error) {
    logger.error(
      `Failed to fetch OHLC data for ${symbol}:`,
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export const binanceMarketService = {
  getTokenMarketData,
  getMultipleTokensMarketData,
  getHistoricalPrices,
  getOHLCData,
};
