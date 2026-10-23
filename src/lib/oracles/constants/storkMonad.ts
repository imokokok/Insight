/**
 * Stork feeds that Stork publishes to Monad mainnet itself.
 *
 * The asset ids and update policies are deliberately committed rather than
 * inferred at runtime: an unlisted or renamed Stork asset must never be
 * treated as a price feed. Source: Stork's Monad pushed-assets registry.
 */
export const STORK_MONAD_CHAIN_ID = 143;

export const STORK_MONAD_CONTRACT_ADDRESS = '0xacC0a0cF13571d30B4b8637996F5D6D774d4fd62' as const;

/** Official public Monad mainnet endpoints, in the order listed by Monad. */
export const STORK_MONAD_RPC_ENDPOINTS = [
  'https://rpc.monad.xyz',
  'https://rpc1.monad.xyz',
  'https://rpc2.monad.xyz',
  'https://rpc3.monad.xyz',
  'https://rpc-mainnet.monadinfra.com',
] as const;

export interface StorkMonadFeed {
  /** Insight's canonical symbol. */
  alias: string;
  /** Stork's plaintext asset identifier, hashed as keccak256(bytes(assetId)) on-chain. */
  assetId: string;
  /** Keccak256(assetId), verified against Stork's documented encoding. */
  encodedAssetId: `0x${string}`;
  /** Stork's published maximum age for the Monad pushed feed. */
  maxStalenessSeconds: number;
  /** Stork's published push threshold, expressed as a percentage. */
  priceDeviationPercent: number;
}

const pushedFeed = (
  alias: string,
  assetId: string,
  encodedAssetId: `0x${string}`,
  priceDeviationPercent: number
): StorkMonadFeed => ({
  alias,
  assetId,
  encodedAssetId,
  maxStalenessSeconds: 3600,
  priceDeviationPercent,
});

/**
 * Stork's complete documented Monad mainnet pushed-feed set.
 *
 * Entries were reviewed against Stork's asset registry and direct Monad
 * contract reads. The `.RR` suffix is retained for a reference-rate feed so
 * it cannot be mistaken for a USD spot price by callers.
 */
const STORK_MONAD_PUSHED_FEED_DEFINITIONS = [
  [
    'AAVE/USD',
    'AAVEUSD',
    '0x029ff4e5b838907c663ddd7b03d9a7f56b1d8cb32cfc0662c37f2632c64b52a4',
    0.05,
  ],
  ['ADA/USD', 'ADAUSD', '0x3cfdbed8f424d2c7113c47bb0775876d7a34cf04c48fcd15fc7bc2e8be85f3ed', 0.05],
  ['APT/USD', 'APTUSD', '0x90f4b4c95f9dee30278d7a62dab1916915c1472a51d03d39089f8492136b04aa', 0.05],
  ['ARB/USD', 'ARBUSD', '0x365f8b30df22d80f2e0b406679ef53f75e49d6cad9c1c9e6bc1df7b092658a20', 0.05],
  [
    'AUSD/USD',
    'AUSDUSD',
    '0xf0f5bc7822329038ac4dbc4c6e6a4453c1980612111a87ff67d3624c8b2e0b2e',
    0.05,
  ],
  [
    'AVAX/USD',
    'AVAXUSD',
    '0x0c26b653bce6116d26804ec1e9815465af19aaf56c39eaaf001816375fdf8a1d',
    0.05,
  ],
  [
    'BERA/USD',
    'BERAUSD',
    '0x9c7a8f90aa21b1e368d1a5f7b4d75aa03fec9abb903d84946ef76fd6fd79b312',
    0.05,
  ],
  ['BNB/USD', 'BNBUSD', '0x1bc6d6279e196b1fa7b94a792d57a47433858940c1b3500f2a5e69640cd12ef4', 0.05],
  ['BTC/USD', 'BTCUSD', '0x7404e3d104ea7841c3d9e6fd20adfe99b4ad586bc08d8f3bd3afef894cf184de', 0.02],
  [
    'CAKE/USD',
    'CAKEUSD',
    '0x4cdec5681c52113a81c288e66a15ad09ceb2136a349c1d5b1f18c0c54b74f22a',
    0.05,
  ],
  [
    'DOGE/USD',
    'DOGEUSD',
    '0xaf3aa213a005c9a693262f7bd09dff6e39069392dea742922b0ecb61b5201751',
    0.05,
  ],
  [
    'EARNAUSDA/USD.RR',
    'EARNAUSDAUSD_RR',
    '0xe904b211ca1fdc78d094550c6c43d86f391a94277b71f1d84221835469acc8e0',
    0.5,
  ],
  ['ETH/USD', 'ETHUSD', '0x59102b37de83bdda9f38ac8254e596f0d9ac61d2035c07936675e87342817160', 0.02],
  [
    'HYPE/USD',
    'HYPEUSD',
    '0x4458c4980d94bc7fef3ade260b034fb575f04ce6ce4abb20b9c1dbc4b0b9d169',
    0.05,
  ],
  [
    'LINK/USD',
    'LINKUSD',
    '0x694cad6038bcbefcc30e11862e412bb58f9c4ac3c9e0f9ed02d3e38b16829263',
    0.05,
  ],
  ['MON/USD', 'MONUSD', '0xa4f6b07ae0c89e3f3cc03c1badcc3e9adffdf7206bafcd56d142979800887385', 0.02],
  ['OP/USD', 'OPUSD', '0x2316c275dd635566dd979f717711dcb9fef72e5b70bb46b28ed03958eb7a0e85', 0.05],
  ['POL/USD', 'POLUSD', '0x3677639ed5e5918f1a5fdf6848a3a197d562a51fb309aac07903bd911d4e4eba', 0.05],
  [
    'PYTH/USD',
    'PYTHUSD',
    '0xcf7965bf4ad8d01e1b4eeae12c41695dfa3c70c18de932ee0cfecf7235cfb48f',
    0.05,
  ],
  ['RED/USD', 'REDUSD', '0x7dfc788a1dc29f8559bcbf976dba1921ea21f3c18811aec678bd350f42229e38', 0.05],
  [
    'SBTC/USD',
    'SBTCUSD',
    '0x08fc8780f52cb9e9b6c835e55c4c083d9fe2d67470c1eb5207021292f95e5052',
    0.05,
  ],
  ['SEI/USD', 'SEIUSD', '0x7dd60a3246f0df98f307775ca3856eb28872e2d36d044d307fe39768b2be208b', 0.05],
  ['SOL/USD', 'SOLUSD', '0x1dcd89dfded9e8a9b0fa1745a8ebbacbb7c81e33d5abc81616633206d932e837', 0.05],
  ['SUI/USD', 'SUIUSD', '0xa24cc95a4f3d70a0a2f7ac652b67a4a73791631ff06b4ee7f729097311169b81', 0.05],
  ['S/USD', 'SUSD', '0xe18df262d6d0bec60a8d935280235a1a1ee38eabbe83ca3eb9a1ed48b31ac8cb', 0.05],
  [
    'SUSDE/USD',
    'SUSDEUSD',
    '0xf287ddec9700e4ab1db93dbfa5f0e125ee87f8a9eda635f76895e923408d8105',
    0.05,
  ],
  ['TIA/USD', 'TIAUSD', '0xc45bed07b2865e75808c5b94bf1720502a8d22ebcacb0a8d435d244e2ea1bd07', 0.05],
  ['UNI/USD', 'UNIUSD', '0x9e6266a76df39a05a79ea6566fb4780787a70d8bd92ac5e8d5227ee526d20554', 0.05],
  [
    'USDC/USD',
    'USDCUSD',
    '0x7416a56f222e196d0487dce8a1a8003936862e7a15092a91898d69fa8bce290c',
    0.05,
  ],
  [
    'USDE/USD',
    'USDEUSD',
    '0xa794a3432ecbe502ac5e44b28475b66b948cbd938ddae5005515133d328dad04',
    0.05,
  ],
  [
    'USDT/USD',
    'USDTUSD',
    '0x6dcd0a8fb0460d4f0f98c524e06c10c63377cd098b589c0b90314bfb55751558',
    0.05,
  ],
  [
    'WBTC/USD',
    'WBTCUSD',
    '0x1ddeb20108df88bf27cc4a55fff8489a99c37ae2917ce13927c6cdadf4128503',
    0.05,
  ],
  [
    'WEETH/USD',
    'WEETHUSD',
    '0x2778ff4ef448d972c023c579b2bff9c55d48d0fde830dcdd72fff8189c01993e',
    0.05,
  ],
  [
    'WETH/USD',
    'WETHUSD',
    '0x8afba5f1a5d4969d23c3b42db1b88f8a9c8176392de5bf066752260478ce82b8',
    0.05,
  ],
  [
    'WSTETH/USD',
    'WSTETHUSD',
    '0x56dd6ca223192c3f415d95b0e6812b9405845c7853522975239c88b6f4f34cbd',
    0.05,
  ],
  ['XAU/USD', 'XAUUSD', '0xe21c86d8b6a127bfef214d88fdb0c279e55d27dd8c443733e46c8d3de3c98cd6', 0.05],
  ['XRP/USD', 'XRPUSD', '0x49139a167820038c145d3069c93650bc8e58e050592ba1095de576411ddf693d', 0.05],
  ['ZRO/USD', 'ZROUSD', '0xeab1f0a597440f80e490a45615f860cae60e8c85c615d96922a38a41ef99155e', 0.05],
] as const satisfies ReadonlyArray<readonly [string, string, `0x${string}`, number]>;

export const STORK_MONAD_PUSHED_FEEDS: readonly StorkMonadFeed[] =
  STORK_MONAD_PUSHED_FEED_DEFINITIONS.map(
    ([alias, assetId, encodedAssetId, priceDeviationPercent]) =>
      pushedFeed(alias, assetId, encodedAssetId, priceDeviationPercent)
  );

const feedsByAlias = new Map(STORK_MONAD_PUSHED_FEEDS.map((feed) => [feed.alias, feed]));

export function resolveStorkMonadFeed(symbol: string): StorkMonadFeed | null {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;
  return feedsByAlias.get(normalized) ?? feedsByAlias.get(`${normalized}/USD`) ?? null;
}
