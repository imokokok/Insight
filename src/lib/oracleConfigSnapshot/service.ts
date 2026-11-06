/**
 * Default source reader and pack assembly for oracle config snapshots.
 *
 * The record is intentionally STATELESS: no new table, no migration. The signed
 * snapshot is handed to the caller, who keeps the evidence. That is the right
 * shape for "sell verifiable input": the proof lives with the holder, not in
 * our database, and it keeps the payload deterministic within an hour bucket.
 *
 * Source reads are fail-closed: a broken feed registry produces UNAVAILABLE
 * checks, never a fabricated provider list.
 */

import { nonDerivedGroupCount } from '@/lib/attestations/sourceGroups';
import { CHAINLINK_PRICE_FEEDS } from '@/lib/oracles/services/chainlinkDataSources/priceFeedConfig';
import { getAllActiveFeedsByProviderWithStatus } from '@/lib/oracles/utils/dynamicFeedResolver';
import { listReviewedProfiles } from '@/lib/reviewed/registry';

import { buildPayload, canonicalJson, computePayloadHash, sha256Hex } from './engine';
import { signOracleConfigSnapshot } from './signing';
import type {
  OracleConfigSnapshotInput,
  OracleConfigSnapshotPack,
  OracleConfigSources,
} from './types';
import { ORACLE_CONFIG_SNAPSHOT_BUCKET_SECONDS } from './types';

/** Deterministic pin of the exact reviewed-profile registry used. */
export function computeRegistryPin(): string {
  const profileIds = listReviewedProfiles()
    .map((profile) => profile.profileId)
    .sort();
  return sha256Hex(canonicalJson(profileIds));
}

/**
 * Read observable source state. Only real registered data is reported; when a
 * source cannot be read the corresponding check is marked UNAVAILABLE.
 */
export async function collectOracleConfigSources(
  input: OracleConfigSnapshotInput
): Promise<OracleConfigSources> {
  const symbol = input.assetSymbol.toUpperCase();
  const { feeds, errored } = await getAllActiveFeedsByProviderWithStatus();

  const matching = [...feeds.values()]
    .flat()
    .filter((feed) => feed.symbol.toUpperCase() === symbol && feed.chain_id === input.chainId);

  const providers = [...new Set(matching.map((feed) => feed.provider))].sort();
  const nonDerivedGroups = nonDerivedGroupCount(providers);

  const staticFeed = CHAINLINK_PRICE_FEEDS[symbol]?.[input.chainId] ?? null;
  const registeredFeed = matching.find((feed) => feed.provider === 'chainlink') ?? null;
  const feed = staticFeed
    ? {
        address: staticFeed.address,
        name: staticFeed.name,
        symbol: staticFeed.symbol,
        decimals: staticFeed.decimals,
      }
    : registeredFeed
      ? {
          address: registeredFeed.address,
          name: registeredFeed.name,
          symbol: registeredFeed.symbol,
          decimals: registeredFeed.decimals,
        }
      : null;

  const needle = input.protocolId.toLowerCase();
  const profile =
    listReviewedProfiles().find((item) => item.profileId.toLowerCase().includes(needle)) ?? null;

  return {
    providers,
    nonDerivedGroups,
    feed,
    profile: profile
      ? {
          profileId: profile.profileId,
          status: profile.status,
          activityStatus: profile.activityStatus,
        }
      : null,
    feedRegistryErrored: errored,
    registryPin: computeRegistryPin(),
  };
}

/**
 * Build a signed, idempotent snapshot. Within one hour bucket the payload and
 * the typed-data hash are byte-identical for the same configuration, so a
 * repeated paid call can never return a downgraded or different record.
 */
export async function buildOracleConfigSnapshotPack(
  input: OracleConfigSnapshotInput
): Promise<OracleConfigSnapshotPack> {
  const bucketMs = ORACLE_CONFIG_SNAPSHOT_BUCKET_SECONDS * 1000;
  const bucketStartMs = Math.floor(Date.now() / bucketMs) * bucketMs;
  const sources = await collectOracleConfigSources(input);
  const payload = buildPayload(input, sources, bucketStartMs, bucketStartMs);
  const payloadHash = computePayloadHash(payload);
  const attestation = await signOracleConfigSnapshot(payload, payloadHash);
  return { payload, payloadHash, attestation };
}
