# Market-data rights clearance — 2026-10-15

## Decision and status

The commercial analysis identifies written data rights as a launch prerequisite. Insight's optional decision-input assessment code can use stored hourly cross-exchange references (including medians, source counts and spreads) alongside other evidence. A license for public API access does not by itself establish permission for commercial application use, aggregation, or customer-facing derived assessments.

No vendor has been contacted and no license or paid plan has been accepted through this task. The Gmail connector is disabled by the administrator, and no other connected email channel is available. The drafts below are ready for a private business email channel. They make no purchase commitment and do not accept terms.

Buyer interviews and design-partner outreach remain paused at the user's direction. This record covers data-rights clearance only.

## Current product use to describe accurately

- The Insight assessment code can compare a caller's decision price with a stored hourly CEX reference and report source coverage and spread. The assessment is optional and does not authorize a trade; production enablement was not verified in this task.
- The digital-asset reference collector code requests Coinbase, Kraken, Gemini and Crypto.com observations. Crypto.com is mapped to the direct WBTC/USD venue observation; the active production collection schedule was not verified in this task.
- Alpaca's U.S. equity quote adapter is documented as local development only; it is not connected to persistence, public routes, or scheduled production collection.
- Do not describe market-reference observations or outputs as licensed until the applicable vendor confirms the intended use in writing.

## Vendor terms to resolve

| Vendor              | Official contact                                                                               | Clearance question                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coinbase            | `marketdata@coinbase.com`                                                                      | Its current terms limit ordinary use to personal/research purposes and restrict end-user applications, distribution, and derived works without prior express written consent. Request commercial permission for backend collection, hourly aggregation, and use in an API assessment. [Terms](https://www.coinbase.com/legal/market_data) · [Data Marketplace](https://help.coinbase.com/en/data-marketplace/getting-started/coinbase-data-marketplace) |
| Kraken              | `marketdata@kraken.com`                                                                        | Its API guide says prior permission is required for non-personal commercial use of public endpoint data, including market data. Request written permission for server-side reference collection and derived assessment outputs. [API guide](https://docs-legacy.kraken.com/api/docs/guides/global-intro/)                                                                                                                                               |
| Gemini              | `bizdev@gemini.com`                                                                            | Its Market Data Agreement limits ordinary permitted use and prohibits redistribution; it directs commercial-use and redistribution requests to business development. Request permission for derived outputs delivered through Insight's API. [Agreement](https://www.gemini.com/legal/market-data-agreement)                                                                                                                                            |
| Crypto.com Exchange | Official [Exchange support](https://help.crypto.com/en/collections/260596-crypto-com-exchange) | The published U.S. Exchange terms restrict third-party use, publication/distribution, and commercialization of Exchange Materials without express written consent. Ask which agreement and entity govern Insight's public `get-tickers` use, including WBTC/USD aggregation and customer-facing derived results. [Terms](https://static2.crypto.com/exchange/assets/documents/us-tnc.pdf)                                                               |
| Alpaca              | Official [Partnerships / contact form](https://alpaca.markets/partnerships)                    | Its published terms call for 30 days' advance written notice for commercial use or making data available through a user application. Confirm applicability to the documented local IEX development check and request the proper commercial-use review before any production use. [Terms](https://files.alpaca.markets/disclosures/library/TermsAndConditions.pdf)                                                                                       |

## Questions for each vendor

Ask the vendor to confirm in writing:

1. Whether this use is allowed for Insight as an independently sold product and, if applicable, as part of the Insight + PriorSeal workflow.
2. Whether Insight may collect and retain the vendor's observations server-side, normalize and aggregate them by hour, and use the resulting median, deviation, spread, freshness and source-count indicators in API responses and signed assessment evidence.
3. Whether raw values, derived values, source names, historical samples or audit records may be shown to customers; which attribution and customer terms are required; and whether outputs may support a paid risk-control API.
4. Required product tier, fees, rate limits, notice period, reporting, audit and retention obligations, approved jurisdictions, and the process for executing any separate license.
5. Whether existing development or production observations need to be restricted, deleted, or retained differently while a license request is pending.

Do not accept a license, paid plan, click-through agreement, or recurring fee as part of this inquiry. Route any proposed agreement or charge for the user's review.

## Ready-to-send inquiry drafts

### Coinbase

**To:** marketdata@coinbase.com
**Subject:** Commercial permission for derived market-reference use in Insight

Hello Coinbase Market Data team,

I am evaluating the data-rights requirements for Insight ([oracleinsight.xyz](https://www.oracleinsight.xyz/)), a pre-trade evidence and risk-assessment API. Its optional decision-input assessment code compares a caller-supplied price with an hourly cross-exchange reference and returns derived evidence such as source coverage and spread. The product supports authenticated or paid API access; the assessment's current production enablement was not verified in this task.

Could you confirm whether Coinbase Market Data may be collected and retained server-side, normalized and aggregated into hourly reference statistics, and used in those customer-facing derived assessments? Please point me to the required commercial license or prior-consent process, fees, attribution and customer terms, any restrictions on derived outputs, and whether the use must pause while a request is reviewed.

This is a request for information and permission only; it is not an order or acceptance of any agreement or fee.

Regards,
YuTao Peng
Insight

### Kraken

**To:** marketdata@kraken.com
**Subject:** Written permission for commercial use of public Kraken market data

Hello Kraken Market Data team,

I am evaluating data rights for Insight ([oracleinsight.xyz](https://www.oracleinsight.xyz/)), a pre-trade evidence and risk-assessment API. The optional decision-input assessment code uses hourly cross-exchange reference statistics, including a median, source coverage and spread, to assess caller-provided prices. The product supports authenticated or paid API access; the assessment's current production enablement was not verified in this task.

Please confirm the permission or license required to collect and retain public Kraken spot observations server-side, aggregate them hourly, and use derived statistics in customer-facing API assessments. Please include the applicable fees, attribution and customer terms, reporting/audit obligations, and any restrictions while an application is pending.

This is a request for information and permission only; it is not an order or acceptance of any agreement or fee.

Regards,
YuTao Peng
Insight

### Gemini

**To:** bizdev@gemini.com
**Subject:** Commercial and derived-data permission for Insight API assessments

Hello Gemini Business Development team,

I am evaluating the data-rights requirements for Insight ([oracleinsight.xyz](https://www.oracleinsight.xyz/)), a pre-trade evidence and risk-assessment API. Its optional decision-input assessment code uses hourly cross-exchange reference statistics (median, source coverage and spread) alongside caller-provided prices. The product supports authenticated or paid API access; the assessment's current production enablement was not verified in this task.

Could you advise whether this use is permitted under the current Market Data Agreement or requires a separate commercial/redistribution agreement? Please clarify whether server-side retention, hourly aggregation, customer-facing derived outputs, source attribution and audit evidence are covered, and provide the applicable fees and customer-term requirements.

This is a request for information and permission only; it is not an order or acceptance of any agreement or fee.

Regards,
YuTao Peng
Insight

### Crypto.com Exchange

**Submit through:** [Crypto.com Exchange support](https://help.crypto.com/en/collections/260596-crypto-com-exchange)
**Subject:** Written permission for commercial use of Crypto.com Exchange market data

Hello Crypto.com Exchange team,

I am evaluating data rights for Insight ([oracleinsight.xyz](https://www.oracleinsight.xyz/)), a pre-trade evidence and risk-assessment API. Its digital-asset reference collector code requests public spot ticker observations, including WBTC/USD, and the optional assessment code can use hourly aggregated reference statistics such as median, source coverage and spread. The product supports authenticated or paid API access; the assessment's current production enablement was not verified in this task.

Please identify the agreement and Crypto.com entity applicable to this use, and confirm what written permission or license is required for server-side collection, retention, hourly aggregation and customer-facing derived assessments. Please include fees, attribution, customer terms, reporting/audit obligations, jurisdiction limits, and whether existing observations should be restricted while the request is reviewed.

This is a request for information and permission only; it is not an order or acceptance of any agreement or fee.

Regards,
YuTao Peng
Insight

### Alpaca

**Submit through:** [Alpaca partnerships/contact](https://alpaca.markets/partnerships)
**Subject:** Commercial-use review for Alpaca market data

Hello Alpaca team,

Insight ([oracleinsight.xyz](https://www.oracleinsight.xyz/)) has a documented, local-only development check for U.S. equity quotes using Alpaca's IEX feed. The code is not connected to persistence, a public API, or scheduled production collection. Before any broader use, I would like to confirm the notice and license requirements for internal evaluation and for a possible customer-facing risk assessment API.

Please confirm the appropriate commercial-use review path, whether advance written notice is required for the current local test, and what license, fees, attribution and customer-facing restrictions would apply if derived quote freshness/deviation indicators were later used in an API. No production integration is being requested by this inquiry.

This is a request for information only; it is not an order or acceptance of any agreement or fee.

Regards,
YuTao Peng
Insight

## Release gate

Keep the CEX-derived feature's commercial claims and expansion blocked until the relevant vendors confirm the exact use in writing. The vendor response must be mapped to the specific product route, data fields, jurisdictions, display/derived-output behavior, retention and customer terms before the source is marked cleared.
