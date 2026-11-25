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
 * cross-checked against the public Pyth symbols directory on 2026-11-22.
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
 * Complete 37-feed Solana mainnet sponsored list at the catalogue verification date.
 *
 * Keep reference-rate feeds in the registry. They are readable Pyth evidence,
 * but existing USD-consensus routing excludes `.RR` pairs through its normal
 * USD-feed predicate, so a rate never masquerades as an USD asset price.
 */
export const PYTH_SOLANA_SPONSORED_FEEDS: readonly PythSolanaFeed[] = [
  sponsoredFeed('SOL/USD', 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d'),
  sponsoredFeed('MSOL/USD', 'c2289a6a43d2ce91c6f55caec370f4acc38a2ed477f58813334c6d03749ff2a4'),
  sponsoredFeed('BSOL/USD', '89875379e70f8fbadc17aef315adf3a8d5d160b811435537e03c97e8aac97d9c'),

  sponsoredFeed('USDC/USD', 'eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a'),

  sponsoredFeed('USDT/USD', '2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b'),
  sponsoredFeed('JUP/USD', '0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996'),

  sponsoredFeed('PYTH/USD', '0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff'),

  sponsoredFeed('INF/USD', 'f51570985c642c49c2d6e50156390fdba80bb6d5f7fa389d2f012ced4f7d208f'),
  sponsoredFeed('MNDE/USD', '3607bf4d7b78666bd3736c7aacaf2fd2bc56caa8667d3224971ebe3c0623292a'),
  sponsoredFeed('JLP/USD', 'c811abc82b4bad1f9bd711a2773ccaa935b03ecef974236942cec5e0eb845a3a'),

  sponsoredFeed(
    'JUPSOL/SOL.RR',
    'f8d8d6b6c866c8b2624fb5b679ae846738725e5fc887fa8e927c8d8645018a2b'
  ),
  sponsoredFeed('NAV.USTB/USD', 'dea78edd10cd7ae4524cc1744216788746306623bc3553014eeab6062860795d'),
  sponsoredFeed('NAV.USCC/USD', '5d73a5953dc86c4773adc778c30e8a6dfc94c5c3a74d7ebb56dd5e70350f044a'),

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

  sponsoredFeed('EURC/USD', '76fa85158bf14ede77087fe3ae472f66213f6ea2f5b411cb2de472794990fa5c'),
  sponsoredFeed(
    'SYRUPUSDC/USD',
    'e616297dab48626eaacf6d030717b25823b13ae6520b83f4735bf8deec8e2c9a'
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
