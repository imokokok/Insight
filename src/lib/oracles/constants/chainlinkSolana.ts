/**
 * Canonical identifiers for Chainlink OCR2 price-feed accounts on Solana
 * mainnet-beta. The feed roster itself is intentionally not committed here:
 * Chainlink publishes it in the Reference Data Directory, and Insight only
 * accepts a directory entry after directly validating its on-chain account.
 */
export const CHAINLINK_SOLANA_CHAIN_ID = 0;

export const CHAINLINK_SOLANA_MAINNET_GENESIS_HASH = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

export const CHAINLINK_SOLANA_MAINNET_CAIP2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

/** The OCR2 Data Feeds Store program that owns official mainnet feed accounts. */
export const CHAINLINK_SOLANA_STORE_PROGRAM_ID = 'HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny';

/**
 * Chainlink's official live reference directory. It supplies identifiers and
 * product metadata only; it is never used as a price source.
 */
export const CHAINLINK_SOLANA_RDD_URL =
  'https://reference-data-directory.vercel.app/feeds-solana-mainnet.json';

export const CHAINLINK_SOLANA_RDD_SOURCE = 'chainlink-solana-rdd';

/** Anchor discriminator for the Chainlink Solana `Transmissions` account. */
export const CHAINLINK_SOLANA_TRANSMISSIONS_DISCRIMINATOR = Buffer.from([
  96, 179, 69, 66, 128, 129, 73, 117,
]);

/** SDK v2 reads one 48-byte latest transmission after a 192-byte header. */
export const CHAINLINK_SOLANA_HEADER_BYTES = 192;
export const CHAINLINK_SOLANA_TRANSMISSION_BYTES = 48;
