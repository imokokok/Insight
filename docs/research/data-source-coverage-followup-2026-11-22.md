# Data-source coverage follow-up — 2026-11-22

## Scope

This follow-up checks the production coverage registry after the Pyth
classification release and compares the remaining shadow providers with their
first-party feed documentation. Registry presence, provider classification,
request-time freshness, and strict quorum eligibility are separate facts.

The latest public registry diagnostic observed during this review reported
2,032 feeds, 13 providers, 912 symbols, 11 chains, and 581 feeds with
single-provider risk. These are catalog counts; they do not say that each
asset/chain pair has a fresh price or a three-provider quorum.

## Classification gap closed in source

The reviewed source-group table already names Chronicle and Stork as distinct
provider groups. The strict coverage policy added Pyth in v4, but omitted those
two reviewed providers, so the public diagnostic could show them as
unclassified even when their feeds were registered.

Policy v5 adds `stork → stork` and `chronicle → chronicle`, matching the reviewed
provider map. This is a classification-only change. The minimum remains three
eligible providers and two independent groups; source age stays capped at 300
seconds; existing observations marked excluded remain excluded. A group label
does not prove non-overlapping upstream market inputs.

The policy is append-only and opt-in. V1–V4 policy bytes stay unchanged, and
V4 remains discoverable for existing pins. The production trust reference is
versioned separately and consumers must pin V5 explicitly.

## Freshness and source-overlap review

| Provider  | First-party evidence checked                                                                                                                                                                                                                                                                                                                          | What it proves                                                                         | Remaining gap                                                                                                                                                                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pyth      | [Monad sponsored feeds](https://docs.pyth.network/pro/sponsored-feeds) lists MON/USD with a one-hour heartbeat and 0.1% deviation trigger.                                                                                                                                                                                                            | Pyth offers the feed on Monad.                                                         | Feed listing and heartbeat do not prove a request-time observation is at most 300 seconds old. The Insight adapter reads the current on-chain value; it does not submit a Pyth update.                                                                                                 |
| Stork     | [Pushed assets](https://docs.stork.network/resources/stork-pushed-assets) lists Monad MONUSD with a 3,600-second maximum staleness and 0.02% delta. The [REST API](https://docs.stork.network/api-reference/rest-api) requires Basic authentication.                                                                                                  | MONUSD is an available on-chain Stork feed with its own timestamp.                     | The public page does not establish current freshness or which exchanges underpin MONUSD. The existing MON/USD strict-quorum change remains an unmerged draft pending source-overlap review.                                                                                            |
| Chronicle | The [MON/USD dashboard](https://chroniclelabs.org/dashboard/data-feeds/MON-USD) showed Monad Mainnet and “Live”; the page snapshot showed its last on-chain update at 2026-11-21 18:22 UTC. The [dashboard guide](https://docs.chroniclelabs.org/Products/DataFeeds/dashboard) says validator details can expose each validator's underlying sources. | Chronicle lists a MON/USD feed on Monad and documents a way to inspect source details. | The page snapshot was over ten hours behind when retrieved on Nov 22, so that snapshot cannot satisfy the strict 300-second rule. The rendered validator/source table was empty in the retrieved page; a current on-chain read and feed-level source-overlap capture are still needed. |

The current Monad production diagnostic from the preceding deployment review
identified Chainlink and Pyth as the two strict participants. Stork, Chronicle,
and Redstone were visible in the registry but did not count toward that request's
quorum. This follow-up does not change any of those runtime eligibility flags.

## Required closure for Monad MON/USD

1. Obtain a fresh `getConsensusPrice(MON, Monad)` probe through the authenticated
   production diagnostic or a working RPC path. Record per-provider age,
   retrieval time, success, statistical outlier status, and quorum eligibility.
2. Capture Stork's MONUSD publisher/source identities and Chronicle's
   MON/USD validator source rows. Compare those underlying sources with
   Chainlink and Pyth; different operator names alone are insufficient.
3. Keep the Stork promotion draft unmerged until a reviewer records the
   source-overlap decision. Promote only MON/USD if freshness history and source
   independence both pass. Chronicle can remain classified and shadow-only while
   its last-update cadence or upstream overlap is unresolved.
4. Recheck the production diagnostic after deployment and confirm all thirteen
   reviewed provider classes are named while the policy still rejects excluded,
   stale, or unclassified observations.

No wide feed polling or historical backfill was performed. No commercial data
rights were inferred from publicly visible catalogs. Other open evidence items
remain in the [portfolio coverage audit](data-source-coverage-audit-2026-11-20.md).
