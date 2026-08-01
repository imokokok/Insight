import { resolveFeed } from '@/lib/oracles/utils/dynamicFeedResolver';

/**
 * Switchboard On-Demand integration constants.
 *
 * Switchboard serves signed price updates through its public Crossbar gateway
 * (`https://crossbar.switchboard.xyz`). Reading the latest consensus value for
 * a feed via `GET /v2/update/{feedHash}` is free, unauthenticated, and requires
 * no SWTCH tokens — the SWTCH subscription only gates the low-latency Surge
 * WebSocket *stream* and on-chain `updateFeeds` fee submission, neither of which
 * Insight uses (it only reads the signed `medianResponses` payload off-chain).
 *
 * The feed hashes below are the deterministic IDs of Switchboard's managed
 * Surge feeds (WEIGHTED source, USD quote) — multi-source aggregated prices
 * maintained by the Switchboard oracle network on Solana. Source:
 * `GET /stream/surge_feeds` (verified 2026-08-01).
 */

export const SWITCHBOARD_CROSSBAR_URL = 'https://crossbar.switchboard.xyz';

/** Lists every managed Surge feed with its deterministic feed hash. */
export const SWITCHBOARD_SURGE_FEEDS_URL = `${SWITCHBOARD_CROSSBAR_URL}/stream/surge_feeds`;

export const SWITCHBOARD_CACHE_TTL = {
  PRICE: 10000,
  FEED_LIST: 300000, // 5 min — the Surge feed catalogue rarely changes
} as const;

// Switchboard Surge feeds return 18-decimal scaled integer strings
// (e.g. "63053870000000000000000" == $63053.87).
export const SWITCHBOARD_DECIMALS = 18;

// Preferred Surge source: WEIGHTED aggregates every configured market source
// for a pair, giving the most stable cross-exchange consensus price.
export const SWITCHBOARD_PREFERRED_SOURCE = 'WEIGHTED';

/**
 * Switchboard supported symbols. Keep this list in sync with the keys of
 * `SWITCHBOARD_FEED_IDS` below — both are curated from the public Surge feed
 * catalogue and verified against live Crossbar responses.
 */
export const switchboardSymbols = [
  '1INCH',
  'AAVE',
  'ADA',
  'ALGO',
  'APE',
  'APT',
  'AR',
  'ARB',
  'ATOM',
  'AVAX',
  'AXS',
  'BAL',
  'BCH',
  'BNB',
  'BONK',
  'BSV',
  'BTC',
  'CAKE',
  'CFX',
  'COMP',
  'CRV',
  'CVX',
  'DOGE',
  'DOT',
  'DYDX',
  'EGLD',
  'ENS',
  'ETC',
  'ETH',
  'FET',
  'FIL',
  'FLOW',
  'FLR',
  'FRAX',
  'GALA',
  'GMX',
  'GRT',
  'HBAR',
  'HYPE',
  'ICP',
  'IMX',
  'INJ',
  'JTO',
  'JUP',
  'KAVA',
  'KSM',
  'LDO',
  'LINK',
  'LTC',
  'MANA',
  'MNT',
  'NEAR',
  'OP',
  'PEPE',
  'QNT',
  'RPL',
  'RUNE',
  'SAND',
  'SEI',
  'SHIB',
  'SNX',
  'SOL',
  'STETH',
  'STRK',
  'STX',
  'SUI',
  'SUSHI',
  'THETA',
  'TIA',
  'TRX',
  'UNI',
  'USDC',
  'USDS',
  'USDT',
  'VET',
  'W',
  'WBTC',
  'WIF',
  'XLM',
  'XRP',
  'XTZ',
  'YFI',
  'ZEC',
] as const;

/**
 * Symbol → deterministic Surge feed hash (WEIGHTED source, USD quote).
 * Verified against live `GET /v2/update/{feedHash}` responses on 2026-08-01.
 */
export const SWITCHBOARD_FEED_IDS: Record<string, string> = {
  '1INCH': '975b894fd4135ff0f42b6a1da434d8ccae9d7d4560c24595d6da79c0fbe61fbe',
  AAVE: '19c581a14f071f9cabab21166d37450203fff792c7937631d30372b3dcd15ad2',
  ADA: '695237a767cd572030dfecaf163b1e396fc622b739e4bf5b18429e96c7759392',
  ALGO: 'f6a22d4d74b0fb038b2e0989a6f8481d490f23c40477defb0787b7a2c12bd1b3',
  APE: 'fd57d589801dd827c69de9490f3a1254956ad28efac75b93dbbe02454d5c0cb6',
  APT: '09e6d48cf5725b99da96c1722cf2319ea9a6aea89cc7451cbfd026d8368e58cb',
  AR: '394940a952428638ef2e92d7c47fb66e156ce9978d3f67c62b5c0d3cbf4c5c64',
  ARB: 'dfb091ce2c14e99ade875c6d0a21761436864dae554e688917cca8d049825109',
  ATOM: '634e4ac84d501d937f0c15ff0bce79b13f747f4dd58302fd81614a4910f68a13',
  AVAX: '816c9411e88fbaecb344754c55cb325db1923c37c2c58980da7c3287d3206697',
  AXS: '257e9e5e903494bc603c3d72aa2ade4b5ca0a7f7a5e5b03c2334c0ef1155b9d4',
  BAL: '88931b0fc67e9e5e9bad7383eedf495587572e73d2e82eafb17ad07827c577e3',
  BCH: '13e2d1a46dee1acc1804e67115bc326433450dc3c88761c050427a361172e1a8',
  BNB: '962d4dbb6ae366e1de9315d7055a46bd363d529f54059f6a6c2e6a245bebf825',
  BONK: 'f4ab6ab42006c41089ecd1f49f0c0124c323fdf5e6b97d36e9767c4029e0db7d',
  BSV: '15b057625c63fc46452c9c8565b48acc6e74f920103bf11a76a138a3f2965128',
  BTC: '4cd1cad962425681af07b9254b7d804de3ca3446fbfd1371bb258d2c75059812',
  CAKE: '88ecdee5d25396097c6b07eae577d5e9db264baad344e50a5fbdcad68a72f9cf',
  CFX: '9d68e3bfb7fe465965e2c67e17b236c250953a8a830e12f55652b545ba151543',
  COMP: 'b9b8a6f6e13d6c61c0b6b8f6f7d1a5bffb264829288d735f8e9a280f9e41c96f',
  CRV: 'afe15c5bc916c3ac012e20923c004fd14779436639c567207cf02fcc7654bfc6',
  CVX: 'dd90daa01ec7207ec56f231768947c50151e01c9a6b583accc947ed395a4361c',
  DOGE: '5bc6d1f034f43bb9fb09064ab68334c155d9af931fad52eb13119caa75b126c3',
  DOT: '61dfe0b0549e07dbc893c4a9c91b50fa278ca62488784286683fc0e62c565daf',
  DYDX: 'e99296710c2c709e494456c0e769947495ea8347f85bad2bbcc6af97ced2cd6d',
  EGLD: '59566aa778a0ddb6f849dd9531fbc9a188401a00852dca72292bb76e60231b9c',
  ENS: 'e5ff8611488904894f38495d9e3e6cf639f197365e7f530e35e3c8a4e25249db',
  ETC: 'bb7b1cd9894977c76f695dea74832735ffb537fe935cfea6fbb5bc70db48599b',
  ETH: 'a0950ee5ee117b2e2c30f154a69e17bfb489a7610c508dc5f67eb2a14616d8ea',
  FET: 'a08409b1aaa787f5f491cbc86390850c2e7b0e5f5601c525a9122ba3c841bcfc',
  FIL: '5bae7811c799fc0a398138816a8538ee5a8d186e0e4c771e7b00eba83eae9a4d',
  FLOW: '002423ab6a34cd9827d92a94b67cf2c611ee6b3d190ba662f4899eeba37f7c0e',
  FLR: '8507ae5c76f392962e19f165194c6ec7581d6d6997e932022618a94e345383c4',
  FRAX: '15eef02c4b3a0d1c3d830756d483ec265eee9b403952ea468de649d32c63f2b5',
  GALA: 'f7cc4982e9e37ad59fae1d7c439b57b7c2c0877d481df2ce01c9004bdfa6543a',
  GMX: '1d5dece10edcb41d1cf4a19aa65fac0d261b455eb57586b51ee3a923b82bc07a',
  GRT: '35780e5a1b059d795fa71cb527cba43069af8d9000a3d3f5225f6a573bf9d89d',
  HBAR: '88fd2ac0ae6f96aaa1bc31aab507b427a20fd9267b1059b1448894642ca5b0fa',
  HYPE: '63e105a067be323be6114d3b6c6d96293203c4b8ad3d0dee5e159ea2af77b59c',
  ICP: 'eea5c8930eecc680b0330edba97a56352cd6a144537f4c9c2d92f609da2371bc',
  IMX: 'd6b3b353c408021d45be37602405f12e7a791a029f689709171c24479cf58611',
  INJ: 'c6f7b18f32bf9a2998794ddc8bd5a1c0a910af04dd580c1cdcfba7ec3cda6ed1',
  JTO: 'c195636662f39f70077144754343f19ad863a0b2745745057c811d69f6e18407',
  JUP: '662f17d899970c1e3f714c4ffdbd0bf4576d25d8eb9c3401e9bcc8d2614c06f8',
  KAVA: 'fc702cf546e1e82f731166425f2ad4727d925f9b0662cae6c9f3f577476f122c',
  KSM: '44cea0d0ee54bb10794d4fede9835fcdd752d1f6c5e8631144f0131abb787c82',
  LDO: '42c550935ec4dc2e3fcac0313f8db6473a8ad651d5e0102229e735c69f9a231e',
  LINK: '8f4abf107a287e17fdd20055d328d74a30d4b636471552508dfb7c5432d4b7d5',
  LTC: '224c5405be8cf6a535ef9cbd37d2eda3891b58a6356003689078053fd8eb5f06',
  MANA: 'df2092c50c201ccf2e5a598fe7b92e0a3fb1c1290adcf7e1cca037b97e4b7e8e',
  MNT: 'c40d0b801b0bd9c0476fe2e05646b2c5cf31a1e2cae2334a8aa2e921e8cb5a15',
  NEAR: 'b29c6e0f49e4cbac962e1955879de227f6c89c2bba1d80c30e3aed8b96e6e8c9',
  OP: '44296a1eda8f9ddc96da874ed8239d1a0d7e911ba267c953c059d3a51ed0f446',
  PEPE: '0c26af82e737baa4dec6983b8047a6de6979cfe1376ae84b3b283dc1f8e365df',
  QNT: '733c940282cabfd0bf73b36fffc0cff94ed4a82d2166c836bc589a7971e33b42',
  RPL: '7eb780d39a98d4cef37ea7035e30839a165ef09fe61b4d997a19e1439e0523e0',
  RUNE: '04df1a9aeefad73283f5f0ee14c430d2c5664a737b1d0b03e4211e27b2d3f57f',
  SAND: 'de8481662a6addaf704efa2b594a61e85458bcd8c967b14ef8be635068f07c50',
  SEI: '40fa0ee232f466da9d17579604ef8984ef672a89f1143388eb91afe252910f45',
  SHIB: '38a5da1bbe2b9855bbe3d4bf41ab70228878f3d38eee12eecb31876c6305761c',
  SNX: '19fe1971eee7bc17d57dc0a85dc31e27694e70a72f2b35813f814338e358dad4',
  SOL: '822512ee9add93518eca1c105a38422841a76c590db079eebb283deb2c14caa9',
  STETH: '75d4d4262e456396a66c780c0862ccaf759c568dcf42c41e70ced26dc78dbb75',
  STRK: '589653af5d10aa19646da8c2a13395057f965d4035e2d3754794937c4da86a7b',
  STX: '0fcb7a023601381f3066c2f86bf6c687d153361233f27d10266ab8fd860a7e9c',
  SUI: '7ceef94f404e660925ea4b33353ff303effaf901f224bdee50df3a714c1299e9',
  SUSHI: 'ad6b3f3cf2a43e8e7c6f93d309f0494ae4dc8b8b59f5c50b7d852cc55e5a4477',
  THETA: '83e00a6575b8a5de4b696ca2863bac2c15f31f13a5fd12aee3a3d60dc418bbdd',
  TIA: '4a6072c172fcafd15e393b4428fea473135dafa52108870e8da12531ce44ce02',
  TRX: 'd8aeb1ae9d7de4b2570bddbf07197520a662c63dfbd59a4f6dc863ebcf6db147',
  UNI: '1c8ae5d2eaea755b3ef5146b75c74dc130be3d400d9859fb89407e829fc2d0d9',
  USDC: '883ea8295f70ae506e894679d124196bb07064ea530cefd835b58c33a5ab6549',
  USDS: 'f2b757149298533cd4e27fe07ef5ef999a4b3383e3888f14bb28cf12a1e6a2c7',
  USDT: '8327414619366bc88545bf72da9fb072d1c324fcd94deeea0bd189c8229e5bc9',
  VET: '56491c73424d70c238e08939e36649423ccc8f7ce1b2174480d77d35ee4bcb07',
  W: 'fbc53ad1560f56b5125607ae214950868cc7a45d7953d48175bcaccfdff362bb',
  WBTC: '0b83fcfc4e041a3154d015f32aa08e07486c108bd5e87512ec914f88eed9e38b',
  WIF: '4195292b62f36aa94717ed48d3309fff60f1499c96f9dcf65165b85fc9ceeb96',
  XLM: '735fb8cc936c680647eb51f62d20dc18918540f53233c825401260a13ebfa4b6',
  XRP: '4403dfe267ac4f30e15c10e21fb8ddfc4a4d42f69f2ca3d88c18c657f0ff8710',
  XTZ: '8e938a57ce710d2fa68abf818c6b884695b65d309219e529ac8a2df75d22a908',
  YFI: '94582c77707091b2688c6094a279abe52fe03d9396351e4d6f3f1e389a0723a3',
  ZEC: 'c909e0484b444ab0f4c75766374bde727fe0b3deaf39d201e1bc79e3034c6a37',
};

// Reverse lookup (feed hash → symbol) for discovery / response mapping.
export const SWITCHBOARD_FEED_ID_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(SWITCHBOARD_FEED_IDS).map(([symbol, feedId]) => [feedId, symbol])
);

/** Synchronous hardcoded lookup (no DB round-trip). */
export function getSwitchboardFeedId(symbol: string): string | null {
  return SWITCHBOARD_FEED_IDS[symbol.toUpperCase()] ?? null;
}

/**
 * Database-first feed hash resolution: prefer the `oracle_feeds` row written by
 * `sync-feeds` discovery so catalogue updates take effect without redeploying.
 * Falls back to the hardcoded `SWITCHBOARD_FEED_IDS` map when the DB is empty.
 */
export async function getSwitchboardFeedIdAsync(symbol: string): Promise<string | null> {
  const upperSymbol = symbol.toUpperCase();

  try {
    const feed = await resolveFeed('switchboard', upperSymbol, 0);
    if (feed?.address) {
      return feed.address;
    }
  } catch {
    // Database lookup failed, fall through to hardcoded map.
  }

  return SWITCHBOARD_FEED_IDS[upperSymbol] ?? null;
}
