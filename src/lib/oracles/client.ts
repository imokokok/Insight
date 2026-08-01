/**
 * Client-safe oracle exports.
 *
 * This module exports only lightweight helpers and types that are safe to
 * include in client-side bundles. It intentionally does NOT re-export any
 * oracle client implementation (ChainlinkClient, PythClient, API3Client,
 * etc.) so that importing it does not pull viem, @api3/contracts,
 * @pythnetwork/hermes-client, or other heavy server-only dependencies into
 * the browser bundle.
 *
 * Functions that need to instantiate oracle clients (e.g. getDefaultFactory)
 * should remain on the server or be called through API routes. The full
 * barrel at `@/lib/oracles` should only be used by Server Components / API
 * routes where the heavy dependencies are acceptable.
 */

export { extractBaseSymbol } from './utils/oracleDataUtils';
export type { IOracleClient, IOracleClientFactory } from './interfaces';
export type { BaseOracleClient } from './base';
