# The Advisory-Only Boundary Convention

**Version 0.1 · 2026-11-24 · Status: open for adoption**

A machine-readable convention for risk, oracle, and analytics APIs whose
outputs are inputs to a decision rather than decisions themselves. Insight
publishes and conforms to it; any other API may adopt the same convention.

## The problem

An agent that receives a verdict — `block`, `danger`, `risk_high` — has no
protocol-level way to know what kind of statement it is. Three readings are
possible and they lead to different behavior:

1. **Reference** — one input among several; the agent decides.
2. **Gate** — the issuing system will itself prevent disallowed actions.
3. **Guarantee** — the issuer asserts the underlying facts are correct.

Absorbing a `block` verdict as (2) or (3) is the dangerous default: agents
either skip their own judgement ("the system handled it") or over-trust the
data. Today this distinction is, at best, buried in prose docs nobody's agent
reads.

## The convention

A conforming API **publishes, at every machine-read surface it owns, a single
boolean field with reserved semantics**:

```json
{ "insightDoesNotEnforce": true }
```

`true` asserts, on behalf of the publisher, all four of:

1. It **never signs or broadcasts transactions** for the caller.
2. It **never gates or blocks execution** — no server-side hook can stop the
   caller's action; enforcement belongs entirely to the caller.
3. It **never proves a price or fact is correct** — signatures and attestations
   prove provenance and integrity of the published fields, nothing more.
4. Every verdict, assessment, and judgment is **advisory-only input**; the
   decision to act on it belongs to the application or agent.

The field is **forced**: conforming implementations inject it server-side and
reject or override any caller attempt to unset or falsify it. Error responses
carry it too.

## Where it must appear

| Surface                                                 | Requirement                                                                                                    |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Every response envelope                                 | `meta.insightDoesNotEnforce: true`, injected by the framework, forced against override, present on error paths |
| Protocol/key discovery document (e.g. `/.well-known/*`) | an `advisory_boundary` section with the four assertions plus signer-role classification                        |
| Agent tool protocols (e.g. MCP)                         | the boundary in server instructions and in every tool result's `_meta`                                         |
| Typed SDK / OpenAPI contract                            | the field declared in response types and schema, with the semantics documented                                 |

Repetition is the point. A marker placed at only one layer is consumed there
and gone; a conforming publisher repeats it at every exit point it owns.

## How to verify a conforming API

All checks are mechanical, no prose required:

1. **Presence** — every response (pick random endpoints, including error
   paths) contains `meta.insightDoesNotEnforce === true`.
2. **Immutability** — no request parameter, header, or client-side option can
   produce a response without it.
3. **Behavior** — the publisher's product surface contains no path that signs
   or broadcasts a blockchain transaction on behalf of a caller. (For Insight,
   verified by audit: the only transaction-signing surface is the caller's own
   wallet, on the caller's own client.)
4. **Trust separation** — keys that sign demo/synthetic/historical records are
   classified by role and are rejected by the verifier's production-trust
   path.

## Insight conformance (as of 2026-11-24)

- REST/x402: `ApiResponseBuilder` injects the field on success and error paths;
  callers cannot override it.
- MCP: server `instructions` state the boundary at initialize; every tool
  result carries `_meta.insightDoesNotEnforce: true`.
- `.well-known/oracle-keys.json`: `advisory_boundary` section, signer roles
  `attester` / `sample` / `trail-signer` with distinct trust semantics.
- SDK (`oracle-insight-guard`): `ResponseMeta.insightDoesNotEnforce` typed and
  echoed; README documents that the optional gated execution helper runs
  inside the caller's process under the caller's policy.
- OpenAPI: `ApiMeta` declares the field (`required`, `const true`).

## Adopting

Any API whose outputs are advisory may conform: publish the field with forced
injection at the four surfaces above, keep behavior consistent with the four
assertions, and link this document as the convention reference. No registry,
no governance process — copy the field name and semantics exactly.

Rationale for the shared name: an agent that learns to check
`insightDoesNotEnforce` once can apply that check to any conforming API.
Divergent names would force per-vendor integration and defeat the point.
