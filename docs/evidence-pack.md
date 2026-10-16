# Decision evidence pack

The evidence pack assembles one pre-trade operation's verifiable evidence
chain into a single, manifest-hashed object that a counterparty — an auditor,
an LP, an insurer, a dispute reviewer — can verify without Insight's
cooperation. It answers the post-hoc question "what did the agent know, what
authorized it, and what actually executed?" for one `preTradeUid`.

The pack is evidence, not authorization. It does not authenticate the caller's
quote source, prove upstream data truthfulness, or guarantee execution quality.

## What a pack contains

| Section                                | Content                                                                                                                                                                                | Signed?                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `preTrade[]`                           | One entry per pre-trade row (source, and destination on the agent swap path): verdict, attester, signed flag, and the full decision-input assessment including its EIP-712 attestation | Assessment: signed by Insight; row provenance columns are audit metadata |
| `inputGate`                            | The combined operation-input gate audit written before an execution handle issued (route quote, oracle cross-rate, deviations)                                                         | No — unsigned audit context by design                                    |
| `executionReceipt`                     | Settlement columns plus the full signed execution receipt payload                                                                                                                      | Payload: signed by Insight                                               |
| `clientArtifacts.preTradeAttestations` | The signed oracle pre-trade attestation envelopes, as returned in the original API response (never persisted server-side)                                                              | Signed by Insight; client-asserted presence                              |
| `clientArtifacts.priorSeal`            | PriorSeal authorization / observation / attempt objects                                                                                                                                | Produced outside Insight; verify against PriorSeal's own surface         |
| `manifest`                             | Canonical-JSON keccak hashes of every section above, plus `packHash` over the manifest itself                                                                                          | Integrity commitment, not a signature                                    |

The manifest makes the pack internally tamper-evident: any byte change in a
covered section breaks the corresponding hash. Each signature-bearing artifact
is still verified against its own schema; the manifest never replaces
signature verification.

## Assemble a pack (service)

```sh
curl 'https://www.oracleinsight.xyz/api/v1/safety/decision-input/evidence-pack?preTradeUid=0x…' \
  | jq '.data'
```

`preTradeUid` is a pre-trade attestation UID; `receiptUid` accepts an execution
receipt UID instead (exactly one of the two). The UID is the capability: it is
a 256-bit unguessable identifier that appears inside the signed artifacts a
customer would hand to a reviewer anyway. The read is rate-limited,
quota-counted, and never cached.

## Add client-held artifacts (SDK)

The service never stores the oracle pre-trade attestation envelopes or
PriorSeal objects. The integrator merges what it holds, and the manifest is
recomputed:

```ts
import { withEvidencePackClientArtifacts, verifyEvidencePack } from 'oracle-insight-guard';

const enriched = withEvidencePackClientArtifacts(fetchedPack, {
  preTradeAttestations: {
    source: sourceResponse.attestation,
    destination: destResponse.attestation,
  },
  priorSeal: { authorizationId, observation },
});

const result = await verifyEvidencePack(enriched, trust);
// result.integrityValid, result.assessments, result.clientPreTradeEnvelopes,
// result.linkage.receiptMatchesAnchors, result.completeness
```

`verifyEvidencePack` verifies offline against the consumer's pinned trust
profile:

1. every manifest hash is recomputed from the pack's own sections;
2. each carried decision-input assessment passes EIP-712 verification with
   `allowHistorical` — a post-hoc pack is expected to contain expired
   five-minute windows, and expiry is reported, not fatal;
3. client-held oracle envelopes verify against their own schema and their UIDs
   match the pack anchors;
4. anchor linkage holds: assessment `linkedPreTradeUid` ↔ row attestation UID ↔
   receipt `preTradeUid` / `destinationPreTradeUid`.

Execution-receipt signature verification remains with the dedicated surfaces:
the offline `verify-insight-receipt` package or Insight's
`/api/v1/execution/attestation/verify` endpoint. PriorSeal objects must be
checked against PriorSeal's own verification surface.

## Verify a pack (service, no install)

```sh
curl 'https://www.oracleinsight.xyz/api/v1/safety/decision-input/evidence-pack' \
  --header 'content-type: application/json' \
  --data-binary "$(jq -c '{pack: .data}' pack.json)"
```

The POST recomputes the manifest, verifies each assessment signature, checks
client envelopes when present, and — when both signed oracle envelopes and the
signed receipt are in the pack — runs the closed-loop pair verification (UID,
request hash, chain, asset, action, validity windows, trusted signers). No
data is persisted.

## Trust boundaries

- Manifest hashes prove internal consistency of the pack only; they say
  nothing about the truthfulness of upstream market data or the caller's quote
  source.
- Decision-input attestations expire five minutes after issuance. An expired
  signature still proves what Insight signed; it was only enforceable inside
  its window.
- Client-supplied artifacts are hashed into the manifest for binding, but only
  count as verified when their own signature checks pass.
- A `BLOCK`/`INSUFFICIENT_EVIDENCE` assessment or an
  `executedAgainstWarning` closed-loop status is retained verbatim — the pack
  is equally useful for showing that a trade ran against advice.
- The pack is not an authorization, a transaction-safety guarantee, or a
  light-client proof.
