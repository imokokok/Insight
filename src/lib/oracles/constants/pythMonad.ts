/**
 * Pyth Core feeds currently sponsored on Monad mainnet.
 *
 * Source: Pyth's public sponsored-feed registry, Monad mainnet section.
 * The IDs are global Pyth feed IDs; support here is intentionally scoped to
 * the Monad Core contract because this is the chain where the feeds are
 * sponsored and continuously pushed on-chain.
 */
export const PYTH_MONAD_CHAIN_ID = 143;

export const PYTH_MONAD_CORE_ADDRESS = '0x2880aB155794e7179c9eE2e38200202908C17B43' as const;

// Keep Pyth Core reads on the same redundant Monad endpoint set used by the
// Stork integration. A sponsored feed can be perfectly healthy while one
// public RPC is congested; one endpoint is not a trustworthy availability gate.
export const PYTH_MONAD_RPC_ENDPOINTS = [
  'https://rpc.monad.xyz',
  'https://rpc1.monad.xyz',
  'https://rpc2.monad.xyz',
  'https://rpc3.monad.xyz',
  'https://rpc-mainnet.monadinfra.com',
] as const;

export interface PythMonadFeed {
  /** Pyth's canonical pair name. `.RR` denotes a rate/reference pair. */
  alias: string;
  /** 32-byte Pyth price-feed identifier, without the 0x prefix. */
  id: string;
  /** Pyth's sponsored update threshold, in seconds. */
  timeDifferenceSeconds: number;
  /** Pyth's sponsored update deviation threshold, expressed as percent. */
  priceDeviationPercent: number;
}

const sponsoredFeed = (
  alias: string,
  id: string,
  priceDeviationPercent: number
): PythMonadFeed => ({ alias, id, timeDifferenceSeconds: 3600, priceDeviationPercent });

/**
 * The complete sponsored list (60 feeds at registry verification time), not a
 * guessed subset. Keep `.RR` records: they are valid on-chain rate feeds but
 * are excluded by the generic USD-feed resolver from USD price consensus.
 */
export const PYTH_MONAD_SPONSORED_FEEDS: readonly PythMonadFeed[] = [
  sponsoredFeed('BTC/USD', 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43', 0.1),
  sponsoredFeed('ETH/USD', 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', 0.1),
  sponsoredFeed('MON/USD', '31491744e2dbf6df7fcf4ac0820d18a609b49076d45066d3568424e62f686cd1', 0.1),
  sponsoredFeed('SOL/USD', 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d', 0.1),
  sponsoredFeed(
    'USDC/USD',
    'eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
    0.2
  ),
  sponsoredFeed(
    'USDT/USD',
    '2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
    0.2
  ),
  sponsoredFeed(
    'WBTC/USD',
    'c9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33',
    0.2
  ),
  sponsoredFeed(
    'WETH/USD',
    '9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6',
    0.2
  ),
  sponsoredFeed(
    'WSTETH/USD',
    '6df640f3b8963d8f8358f791f352b8364513f6ab1cca5ed3f1f7b5448980e784',
    0.2
  ),
  sponsoredFeed(
    'WSTETH/STETH.RR',
    'f59ead01ed0faba85332a1e2feae8ddb14a1c94ebac259f1c982c92fc7ce333e',
    0.2
  ),
  sponsoredFeed(
    'STETH/ETH.RR',
    'cf40822c7635ddbde64c831982c65b3b37247f139e8e53078d1602e886badd2f',
    0.2
  ),
  sponsoredFeed('SUI/USD', '23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744', 0.2),
  sponsoredFeed(
    'HYPE/USD',
    '4279e31cc369bbcc2faf022b382b080e32a8e689ff20fbc530d2a603eb6cd98b',
    0.2
  ),
  sponsoredFeed(
    'SUSDE/USD',
    'ca3ba9a619a4b3755c10ac7d5e760275aa95e9823d38a84fedd416856cdba37c',
    0.2
  ),
  sponsoredFeed(
    'SUSDE/USDE.RR',
    '271c64ce459937abf721d42552035713b6c58f80eeceab716a624607fda4b10f',
    0.2
  ),
  sponsoredFeed(
    'USDE/USD',
    '6ec879b1e9963de5ee97e9c8710b742d6228252a5e2ca12d4ae81d7fe5ee8c5d',
    0.2
  ),
  sponsoredFeed(
    'USDY/USD',
    'e393449f6aff8a4b6d3e1165a7c9ebec103685f3b41e60db4277b5b6d10e7326',
    0.2
  ),
  sponsoredFeed(
    'PYUSD/USD',
    'c1da1b73d7f01e7ddd54b3766cf7fcd644395ad14f70aa706ec5384c59e76692',
    0.2
  ),
  sponsoredFeed('DAI/USD', 'b0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e833f70dabfd', 0.2),
  sponsoredFeed(
    'USDS/USD',
    '77f0971af11cc8bac224917275c1bf55f2319ed5c654a1ca955c82fa2d297ea1',
    0.2
  ),
  sponsoredFeed(
    'SUSDS/USDS.RR',
    '6968a8641208463d17ae3b9cfa0e4841a7aa7a5d54122b9f692b84fe9ce3409f',
    0.2
  ),
  sponsoredFeed(
    'FDUSD/USD',
    'ccdc1a08923e2e4f4b1e6ea89de6acbc5fe1948e9706f5604b8cb50bc1ed3979',
    0.2
  ),
  sponsoredFeed(
    'LBTC/USD',
    '8f257aab6e7698bb92b15511915e593d6f8eae914452f781874754b03d0c612b',
    0.2
  ),
  sponsoredFeed(
    'SOLVBTC/USD',
    'f253cf87dc7d5ed5aa14cba5a6e79aee8bcfaef885a0e1b807035a0bbecc36fa',
    0.2
  ),
  sponsoredFeed(
    'CBBTC/USD',
    '2817d7bfe5c64b8ea956e1a26f573ef64e72e4d7891f2d6af9bcc93f7aff9a97',
    0.2
  ),
  sponsoredFeed(
    'WEETH/USD',
    '9ee4e7c60b940440a261eb54b6d8149c23b580ed7da3139f7f08f4ea29dad395',
    0.2
  ),
  sponsoredFeed(
    'RSETH/USD',
    '0caec284d34d836ca325cf7b3256c078c597bc052fbd3c0283d52b581d68d71f',
    0.2
  ),
  sponsoredFeed(
    'EZETH/USD',
    '06c217a791f5c4f988b36629af4cb88fad827b2485400a358f3b02886b54de92',
    0.2
  ),
  sponsoredFeed(
    'WEETH/EETH.RR',
    '343558e79f587e098c321218ecb34d031ba709ab3e84133126f3c98511b91f64',
    0.2
  ),
  sponsoredFeed(
    'RSETH/ETH.RR',
    '56e9b5eb08e62dd4b445f29e4ec7d3b3d49617d64f2d331d36a2101d4904e3c4',
    0.2
  ),
  sponsoredFeed('XAU/USD', '765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2', 0.2),
  sponsoredFeed('XAG/USD', 'f2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e', 0.2),
  sponsoredFeed('XRP/USD', 'ec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8', 0.2),
  sponsoredFeed('BNB/USD', '2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f', 0.2),
  sponsoredFeed('ADA/USD', '2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d', 0.2),
  sponsoredFeed('APT/USD', '03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5', 0.2),
  sponsoredFeed('SEI/USD', '53614f1cb0c031d4af66c04cb9c756234adad0e1cee85303795091499a4084eb', 0.2),
  sponsoredFeed(
    'AVAX/USD',
    '93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7',
    0.2
  ),
  sponsoredFeed('TIA/USD', '09f7c1d7dfbb7df2b8fe3d3d87ee94a2259d212da4f30c1f0540d066dfa44723', 0.2),
  sponsoredFeed('POL/USD', 'ffd11c5a1cfd42f80afb2df4d9f264c15f956d68153335374ec10722edd70472', 0.2),
  sponsoredFeed(
    'BERA/USD',
    '962088abcfdbdb6e30db2e340c8cf887d9efb311b1f2f17b155a63dbb6d40265',
    0.2
  ),
  sponsoredFeed('S/USD', 'f490b178d0c85683b7a0f2388b40af2e6f7c90cbe0f96b31f315f08d0e5a2d6d', 0.2),
  sponsoredFeed(
    'DOGE/USD',
    'dcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c',
    0.2
  ),
  sponsoredFeed('OP/USD', '385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf', 0.2),
  sponsoredFeed('ARB/USD', '3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5', 0.2),
  sponsoredFeed(
    'EBTC/USD',
    'be3dd0cf4a168f82e4912952b24420211ad52641b7365d49866d59e20c948288',
    0.2
  ),
  sponsoredFeed(
    'STONE/ETH.RR',
    '7a508a94c9276cbc60d04e1a8cf839d20d835bb869a74487dfffa8f1bfd1ce42',
    0.2
  ),
  sponsoredFeed(
    'ETHX/ETH.RR',
    '1b8eb073e2a900cdf1f6ee37ddab4869a4400499ec6e52f3e268a93f46c55429',
    0.2
  ),
  sponsoredFeed(
    'PYTH/USD',
    '0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff',
    0.2
  ),
  sponsoredFeed(
    'CAKE/USD',
    '2356af9529a1064d41e32d617e2ce1dca5733afa901daba9e2b68dee5d53ecf9',
    0.2
  ),
  sponsoredFeed(
    'LINK/USD',
    '8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221',
    0.2
  ),
  sponsoredFeed('UNI/USD', '78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501', 0.2),
  sponsoredFeed(
    'AAVE/USD',
    '2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445',
    0.2
  ),
  sponsoredFeed('RED/USD', '0bb28b82f08477fadbf9607fc8408ff61ca129fae40adc7a8d2ab8945f97ee74', 0.2),
  sponsoredFeed('W/USD', 'eff7446475e218517566ea99e72a4abec2e1bd8498b43b7d8331e29dcb059389', 0.2),
  sponsoredFeed('AXL/USD', '60144b1d5c9e9851732ad1d9760e3485ef80be39b984f6bf60f82b28a2b7f126', 0.2),
  sponsoredFeed('ZRO/USD', '3bd860bea28bf982fa06bcf358118064bb114086cc03993bd76197eaab0b8018', 0.2),
  sponsoredFeed('STG/USD', '008546b175392b878c5c7ff0b6327b1cb12669be012fc2935c09a16fc8f6c58f', 0.2),
  sponsoredFeed(
    'AUSD/USD',
    'd9912df360b5b7f21a122f15bdd5e27f62ce5e72bd316c291f7c86620e07fb2a',
    0.2
  ),
  sponsoredFeed(
    'SMON/MON.RR',
    '7fbf66b9b4e8b0e5723fc7001b00848c7d25225982ab33f6a5d111fdbf528001',
    0.2
  ),
] as const;

const feedsByAlias = new Map(PYTH_MONAD_SPONSORED_FEEDS.map((feed) => [feed.alias, feed]));

export function resolvePythMonadFeed(symbol: string): PythMonadFeed | null {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;
  return feedsByAlias.get(normalized) ?? feedsByAlias.get(`${normalized}/USD`) ?? null;
}

export function isPythMonadFeedId(value: string): value is `0x${string}` {
  return /^0x[0-9a-f]{64}$/i.test(value);
}
