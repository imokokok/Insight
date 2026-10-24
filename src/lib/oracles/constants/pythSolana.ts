/**
 * Pyth Core price feeds currently sponsored on Solana mainnet-beta.
 *
 * Pyth's sponsored-feed catalogue publishes only the feeds that Pyth pushes
 * to shard 0. This is intentionally a reviewed, finite list: we never turn an
 * arbitrary asset symbol into a Pyth RPC read. Feed IDs are global Pyth Core
 * identifiers; the shard-0 Solana price-feed account is derived at read time
 * from the ID and the official Pyth Core Push Oracle program.
 *
 * Source: https://docs.pyth.network/pro/sponsored-feeds (Solana section),
 * cross-checked against the public Pyth symbols directory on 2026-10-25.
 */

/** Project-internal Solana chain id; see `constants/chainMapping.ts`. */
export const PYTH_SOLANA_CHAIN_ID = 0;

/** Original Pyth Core Push Oracle program used to derive shard-0 account addresses. */
export const PYTH_SOLANA_PUSH_ORACLE_PROGRAM_ID =
  'pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT' as const;

/** Pyth's current Solana Receiver program, which owns migrated PriceUpdateV2 accounts. */
export const PYTH_SOLANA_PRICE_UPDATE_OWNER_PROGRAM_ID =
  'rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ' as const;

export interface PythSolanaFeed {
  /** Pyth's display alias, without the Pyth asset-class prefix. */
  alias: string;
  /** Canonical 32-byte Pyth Core ID, without a `0x` prefix. */
  id: string;
  /** Sponsored push heartbeat. This is a target, not a freshness guarantee. */
  timeDifferenceSeconds: number;
  /** Sponsored update deviation threshold, expressed as a percentage. */
  priceDeviationPercent: number;
}

function sponsoredFeed(
  alias: string,
  id: string,
  timeDifferenceSeconds = 60,
  priceDeviationPercent = 0.5
): PythSolanaFeed {
  return { alias, id, timeDifferenceSeconds, priceDeviationPercent };
}

/**
 * Complete Solana mainnet sponsored list at the catalogue verification date.
 *
 * Keep reference-rate feeds in the registry. They are readable Pyth evidence,
 * but existing USD-consensus routing excludes `.RR` pairs through its normal
 * USD-feed predicate, so a rate never masquerades as an USD asset price.
 */
export const PYTH_SOLANA_SPONSORED_FEEDS: readonly PythSolanaFeed[] = [
  sponsoredFeed('SOL/USD', 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d'),
  sponsoredFeed('MSOL/USD', 'c2289a6a43d2ce91c6f55caec370f4acc38a2ed477f58813334c6d03749ff2a4'),
  sponsoredFeed('BSOL/USD', '89875379e70f8fbadc17aef315adf3a8d5d160b811435537e03c97e8aac97d9c'),
  sponsoredFeed('SSOL/SOL.RR', 'add6499a420f809bbebc0b22fbf68acb8c119023897f6ea801688e0d6e391af4'),
  sponsoredFeed('BONK/USD', '72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419'),
  sponsoredFeed('W/USD', 'eff7446475e218517566ea99e72a4abec2e1bd8498b43b7d8331e29dcb059389'),
  sponsoredFeed('MEW/USD', '514aed52ca5294177f20187ae883cec4a018619772ddce41efcc36a6448f5d5d'),
  sponsoredFeed('USDC/USD', 'eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a'),
  sponsoredFeed('BTC/USD', 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43'),
  sponsoredFeed('USDT/USD', '2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b'),
  sponsoredFeed('JUP/USD', '0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996'),
  sponsoredFeed('ETH/USD', 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace'),
  sponsoredFeed('PYTH/USD', '0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff'),
  sponsoredFeed('WIF/USD', '4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc'),
  sponsoredFeed('INF/USD', 'f51570985c642c49c2d6e50156390fdba80bb6d5f7fa389d2f012ced4f7d208f'),
  sponsoredFeed('MNDE/USD', '3607bf4d7b78666bd3736c7aacaf2fd2bc56caa8667d3224971ebe3c0623292a'),
  sponsoredFeed('JLP/USD', 'c811abc82b4bad1f9bd711a2773ccaa935b03ecef974236942cec5e0eb845a3a'),
  sponsoredFeed('WBTC/USD', 'c9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33'),
  sponsoredFeed('TRUMP/USD', '879551021853eec7a7dc827578e8e69da7e4fa8148339aa0d3d5296405be4b1a'),
  sponsoredFeed('FARTCOIN/USD', '58cd29ef0e714c5affc44f269b2c1899a52da4169d7acc147b9da692e6953608'),
  sponsoredFeed('ACRED/USD', '40ac3329933a6b5b65cf31496018c5764ac0567316146f7d0de00095886b480d'),
  sponsoredFeed('PUMP/USD', '7a01fca212788bba7c5bf8c9efd576a8a722f070d2c17596ff7bb609b8d5c3b9'),
  sponsoredFeed(
    'JUPSOL/SOL.RR',
    'f8d8d6b6c866c8b2624fb5b679ae846738725e5fc887fa8e927c8d8645018a2b'
  ),
  sponsoredFeed('NAV.USTB/USD', 'dea78edd10cd7ae4524cc1744216788746306623bc3553014eeab6062860795d'),
  sponsoredFeed('NAV.USCC/USD', '5d73a5953dc86c4773adc778c30e8a6dfc94c5c3a74d7ebb56dd5e70350f044a'),
  sponsoredFeed('ZBTC/USD', '3d824c7f7c26ed1c85421ecec8c754e6b52d66a4e45de20a9c9ea91de8b396f9'),
  sponsoredFeed('LBTC/USD', '8f257aab6e7698bb92b15511915e593d6f8eae914452f781874754b03d0c612b'),
  sponsoredFeed('INF/SOL.RR', '3e9961b890c4e77e9009c1a6d81dc556e24a3c190b02d1682c8f545c53b1d4a2'),
  sponsoredFeed(
    'SYRUPUSDC/USDC.RR',
    '2ad31d1c4a85fbf2156ce57fab4104124c5ef76a6386375ecfc8da1ed5ce1486'
  ),
  sponsoredFeed('ORE/USD', '142b804c658e14ff60886783e46e5a51bdf398b4871d9d8f7c28aa1585cad504'),
  sponsoredFeed('NOPAL/USD.RR', '8858dfaa8998ff44681aa145a8aa5b7772979b1d044a1bbf3cf5d971168baa85'),
  sponsoredFeed(
    'NBASIS/USD.RR',
    'fd9397e6dfc968ff8eaa652c6e4b7dfdeb6fdc940afe90c23ca5acfa45d408e1'
  ),
  sponsoredFeed(
    'NWISDOM/USD.RR',
    '384986c9655ec6887dbd7f7430d864992f872db2c77ba5781a26b78dad277adc'
  ),
  sponsoredFeed(
    'NALPHA/USD.RR',
    '57d1e11bea1316c2f7263a39c2780685691585aae34eff39300f5db564501b17'
  ),
  sponsoredFeed(
    'NFALCON/USD.RR',
    '323647322045edff1a0928dca6628169a57afdea43a5f0d948115e3dcae9c1fb'
  ),
  sponsoredFeed(
    'CASH/RD.RR',
    '64c74ffd61574170cfaee65c54c8810adcf83f6c31f3c256d9a290dcbf4ff1a9',
    30
  ),
  sponsoredFeed('CASH/USD', 'df3320ef0f4617337b8dbb924f2aaa4f9db08f522a5435b44f9066c1ac4c7f95', 30),
  sponsoredFeed(
    'PST/USDC.RR',
    '675e36f84a6be779ed793c71eb5c03151e1866c125767f46933626e0610af84d',
    240,
    0.05
  ),
  sponsoredFeed('JUPUSD/USD', '8ed858a2214e892c9371694fb6c8a9037b6ed4052c4edf209f8cb988484e81d9'),
  sponsoredFeed(
    'Equity.US.GLXY/USD',
    '67e031d1723e5c89e4a826d80b2f3b41a91b05ef6122d523b8829a02e0f563aa'
  ),
  sponsoredFeed(
    'HYUSD/JITOSOL.RR',
    '36d77e389795b35ee2cb71bddb68677bac6d5405da8745cb6442352fecc25c14'
  ),
  sponsoredFeed(
    'EHYUSD/JITOSOL.RR',
    '9773ee09043d14e7f33f19db04a9c86fdac2d409a3885534029f6bd077bdcd37'
  ),
  sponsoredFeed(
    'XSOL/JITOSOL.RR',
    '332e31d3fc656ca11dc8522f55791aa8dcd9dbeee0508ab880effc12a12b5c59'
  ),
  sponsoredFeed('JITOSOL/USD', '67be9f519b95cf24338801051f9a808eff0a578ccb388db73b7f6fe1de019ffb'),
  sponsoredFeed(
    'JITOSOL/SOL.RR',
    '01d577b07031e12635d2fb86af6ae938bdc2b6dba9602d8e8af34d44587566fc'
  ),
  sponsoredFeed('MSOL/SOL.RR', '046e7c1cf187195ba3174028ab3be75be88382956f7d4d4b6b507e727370f284'),
  sponsoredFeed('JTO/USD', 'b43660a5f790c69354b0729a5ef9d50d68f1df92107540210b9cccba1f947cc2'),
  sponsoredFeed('RENDER/USD', '3d4a2bd9535be6ce8059d75eadeba507b043257321aa544717c56fa19b49e35d'),
  sponsoredFeed('ZEC/USD', 'be9b59d178f0d6a97ab4c343bff2aa69caa1eaae3e9048a65788c529b125bb24'),
  sponsoredFeed('DSOL/USD', '41f858bae36e7ee3f4a3a6d4f176f0893d4a261460a52763350d00f8648195ee'),
  sponsoredFeed('DSOL/SOL.RR', 'fce16340ad552578e1a59b7013cfa1cedafac3df3a7d4640554a4614a973cabd'),
  sponsoredFeed('MET/USD', '0292e0f405bcd4a496d34e48307f6787349ad2bcd8505c3d3a9f77d81a67a682'),
  sponsoredFeed('CLOUD/USD', '7358313661dcd4f842a1423aa4f7a05f009001c9113201c719621d3f1aa80a73'),
  sponsoredFeed('HYPE/USD', '4279e31cc369bbcc2faf022b382b080e32a8e689ff20fbc530d2a603eb6cd98b'),
  sponsoredFeed('USD1/USD', '0a2425d43486780990d8b63543029e20556be51fd756cca584212f4d539611d4'),
  sponsoredFeed('BNSOL/USD', '55f8289be7450f1ae564dd9798e49e7d797d89adbc54fe4f8c906b1fcb94b0c3'),
  sponsoredFeed('TNSR/USD', '05ecd4597cd48fe13d6cc3596c62af4f9675aee06e2e0b94c06d8bee2b659e05'),
  sponsoredFeed('2Z/USD', 'f2b3ab1c49e35e881003c3c0482d18b181a1560b697b844c24c8f85aba1cab95'),
  sponsoredFeed('AAVE/USD', '2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445'),
  sponsoredFeed('EURC/USD', '76fa85158bf14ede77087fe3ae472f66213f6ea2f5b411cb2de472794990fa5c'),
  sponsoredFeed(
    'SYRUPUSDC/USD',
    'e616297dab48626eaacf6d030717b25823b13ae6520b83f4735bf8deec8e2c9a'
  ),
  sponsoredFeed('USDE/USD', '6ec879b1e9963de5ee97e9c8710b742d6228252a5e2ca12d4ae81d7fe5ee8c5d'),
  sponsoredFeed(
    'RKUSOL/SOL.RR',
    'a0eccdd47cacbacde31b058fe3e6eb56bc4e159c1304487eb5cf0dffd0581de1'
  ),
  sponsoredFeed('XAU/USD', '765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2'),
] as const;

const feedsByAlias = new Map(PYTH_SOLANA_SPONSORED_FEEDS.map((feed) => [feed.alias, feed]));

/** Resolve a Pyth alias or a bare USD-base symbol without guessing arbitrary assets. */
export function resolvePythSolanaFeed(symbol: string): PythSolanaFeed | null {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;
  return feedsByAlias.get(normalized) ?? feedsByAlias.get(`${normalized}/USD`) ?? null;
}

export function isPythSolanaFeedId(value: string): value is `${string}` {
  return /^[0-9a-f]{64}$/i.test(value);
}
