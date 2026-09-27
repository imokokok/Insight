# Insight product positioning

## Core

**Oracle transparency and risk intelligence for DeFi.**

Insight makes oracle observations, source reliability, and the risks of relying on a price inspectable. It connects cross-source comparison, deviation, freshness, source independence, and protocol exposure to explainable assessments and portable signed evidence when signing is available.

Its product path is **oracle observations → transparency → risk assessment → verifiable evidence**. Protocol teams, operators, developers, and AI agents can use these capabilities independently of PriorSeal. Pre-trade checks and agent workflows are applications of the oracle foundation; they do not replace it.

中文：**预言机透明度与风险情报，让价格背后的来源和使用风险可见、可判断，并保留可验证的评估证据。**

## Public copy

- Homepage headline: **See the oracles behind the price.**
- Short description: **Compare oracle sources, understand the risk of relying on a price, and retain verifiable assessment evidence.**
- Agent description: **Give agents oracle evidence before they act.**
- SDK description: **Oracle risk assessments, monitoring, and signed price/fill evidence, with assessment-only APIs and optional gated execution.**

## Three independently selectable offers

| Offer               | Buyer need                                               | Evidence scope                                                                                                 |
| ------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Insight             | Oracle transparency, monitoring, and risk assessment     | Oracle observations and assessments; supported execution-price/fill evidence                                   |
| PriorSeal           | Explicit authorization and execution accountability      | Principal-signed permission, ordering evidence, observed EVM execution, and supported authorization compliance |
| Insight + PriorSeal | Connect assessment, authorization, execution, and review | Linked original artifacts with separate keys, trust checks, and verification scopes                            |

Combined description: **Oracle risk intelligence, explicit authorization, and verifiable execution evidence for onchain agents.**

中文：**提供预言机风险评估、明确授权与可独立复核的执行证据，连接链上行动的依据、权限和结果。**

## Claim boundaries

- An assessment is not principal authorization. A PASS verdict does not guarantee price correctness, economic safety, or profitability.
- A valid signature establishes the issuer and integrity of signed fields under independently confirmed key trust. It does not independently prove every underlying observation or reproduce the entire risk model.
- At OracleSafetyCheck v3, signed counts and thresholds allow local recomputation of the quorum and independence gates. Do not extend that claim to every assessment rule or earlier schema.
- Signing depends on attestation availability. Do not promise that every check is signed.
- Execution receipts cover their supported price/fill semantics; they do not replace PriorSeal's authorization evidence.
- Monitoring follows documented collection and polling cadences. Avoid claims of continuous real-time coverage or guaranteed strategy safety.
- Registry provenance, anchoring, and timestamp evidence require their own verification. An assessment signature alone does not establish an independent pre-execution timestamp.

Keep current README, homepage, SEO, API/MCP descriptions, SDK introductions, and repository About copy consistent with this scope. Preserve protocol identifiers, signed fields, frozen examples, and historical records when updating wording.
