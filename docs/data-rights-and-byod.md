# Data rights and caller-held quote evidence

Insight distinguishes the technical integrity of an input from permission to
use it. A source response being publicly reachable, useful for research, or
marked “non-commercial” does not by itself permit Insight to collect, retain,
derive from, or expose it for a customer-facing decision.

## Enforced boundary

`src/lib/dataRights/evidenceRights.ts` is the single source-rights register for
the shared CEX market-reference collector. Every venue begins as
`research-quarantined`.

- Customer-facing collection admits only `vendor-licensed` sources with a
  non-empty reviewed agreement reference and no expired validity date.
- The collector exits without calling a CEX when no source is admitted.
- Migration `0090_market_reference_rights_gate.sql` marks historical CEX rows
  `research-quarantined` and makes the customer market-reference RPC read only
  `vendor-licensed` rows. A prior row cannot become customer evidence merely
  because a new configuration is deployed.
- The market-reference client and Track-B outcome-label service also refuse to
  read CEX rollups while the register has no eligible vendor source. This keeps
  unlicensed history out of customer assessments and model-label generation,
  including before a remote database has received the migration.
- `synthetic` evidence can be used only in the explicit `staging` evaluation
  mode. `research-quarantined` evidence is never permitted.

Changing the register is a reviewed implementation step after the written
agreement is in hand; it is not a substitute for deciding what the agreement
covers. Never place credentials, agreement text, or a vendor payload in this
register.

## Customer BYOD quote provenance

For a customer’s own authorized venue, Insight accepts a hash-only provenance
envelope. The customer retains its raw request and response; Insight receives
the source identifier, rights classification, quote fields, and two canonical
hashes. This binds the submitted quote to what the customer retained without
turning Insight into a proxy or redistribution channel.

```ts
import { createDecisionInputQuoteProvenance } from 'oracle-insight-guard';

const quoteProvenance = createDecisionInputQuoteProvenance({
  sourceId: 'customer-broker',
  rightsScope: 'customer-authorized',
  asset: 'ETH',
  chainId: 1,
  quotePriceUsd: 2000.5,
  observedAt: '2026-10-13T06:29:58.000Z',
  request: customerRetainedRequest,
  response: customerRetainedResponse,
});
```

Set `requireQuoteProvenance: true` with that envelope when calling the
decision-input assessment. `agent_begin_trade` requires it for both legs. The
assessment checks that the asset, chain, price, and timestamp match exactly and
signs the accepted envelope into `quoteInputHash` and the assessment.

The envelope does **not** prove that a vendor issued the response, prove the
customer’s contractual right, authenticate an upstream API, or make a quote
executable. It is a tamper-evident binding to caller-retained material. The
customer must retain the raw data, relevant authorization, and any required
audit record; Insight should request that material only through an agreed
support or evidence process.

## Safe local exercise

Run the deterministic no-network exercise with:

```sh
npm run decision-input:synthetic-e2e
```

It proves two properties: the same synthetic evidence can produce a sufficient
staging result, and is rejected as `QUOTE_PROVENANCE_RIGHTS` by a
customer-facing evaluation. It does not contact a vendor, create a staging
account, validate real credentials, or establish commercial rights.

Synthetic staging results are marked inside the signed assessment. SDK
verification rejects that marker by default; a test verifier must explicitly
set `allowStagingEvidence: true`. A staging signature therefore cannot be
silently reused as a production decision input.
