# Insight as ERC-8004 evidence provider (v1)

ERC-8004 ([Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004)) defines three on-chain registries for AI agents: **Identity** (who), **Reputation** (what others observed), and **Validation** (what a checker stakes). Insight supplies the evidence layer between them: signed, reproducible decision-input checks that an agent, a counterparty, or a staker can anchor into Reputation or Validation flows.

Machine-readable version of this page: [`/erc8004/v1/insight-evidence.v1.json`](https://www.oracleinsight.xyz/erc8004/v1/insight-evidence.v1.json). Agent-facing registration file: [`/.well-known/agent8004.json`](https://www.oracleinsight.xyz/.well-known/agent8004.json).

Insight's own identity is registered on the BNB Chain mainnet (chain 56) Identity Registry as **agentId 375779** — tx `0x5f7896ec9142681ea27680f692117b1dc367b76100f0e64edb76fd4fa45ee185` (2026-10-17), `tokenURI` → `/.well-known/agent8004.json`. Registrator tooling: [`scripts/register-erc8004-agent.ts`](../scripts/register-erc8004-agent.ts) (read-only `--check` mode is safe to run against any agentId).

A second registration exists on **Monad mainnet (chain 143)** — same canonical Identity Registry addresses — as **agentId 10414**: tx `0x63c782dc97372e3c2abeed105f8d01566bf677abc7701261eaa1b72f1c80c95b` (2026-10-19), same `tokenURI`. Reputation anchoring currently writes to the BNB Chain registry only; the Monad registration establishes chain-local identity for Monad-native agents and integrations.

## What Insight signs today

1. **Oracle Safety Attestation v2** — an EIP-712 typed attestation with a stable UID over 26 signed fields: verdict (PASS/WARN/BLOCK), CAIP-19 asset pair binding, request/provider/reason-code commitments, quorum (≥3 independent providers), operator independence (≥2 non-derived groups), and a bounded validity window (600 s). Obtained from `POST /api/v1/safety/pre-trade`; offline-verifiable from the domain and types in the response envelope, or via `POST /api/v1/safety/attestation/verify`.
2. **x402-quality/v0 receipts** — draft quality-attestation artifacts generated from live paid receipts (verdict, response timing, settlement facts). Reference implementation for the x402 quality-attestation discussion, not an adopted standard.

## Anchoring into ERC-8004

**Validation Registry.** A validation request for "was this trade's decision input sound?" is answered with a v2 attestation: the `validationResponse` cites the attestation `uid`, and a verifier re-derives the UID from the signed fields (deterministic — the same input always produces the same UID) or calls the verify endpoint. Because the attestation window is 600 s, validation evidence is fresh by construction.

**Reputation Registry.** Feedback about an agent's decision quality carries a `feedbackURI` pointing at the concrete artifacts (attestation JSON, quality receipt) rather than free-form praise. The UID + `requestHash` binding makes each feedback item reproducible and dispute-checkable: anyone can re-verify the attestation signature against Insight's published domain.

## Identity binding without key exposure

The paying agent's EVM address arrives in the `PAYMENT-SIGNATURE` payer field and is recorded in the settlement audit. On networks where the agent holds an ERC-8004 identity token from that same address, evidence rows bind to the `agentId` naturally — no agent key ever touches Insight. Challenge scope binds each payment to the exact resource (REST URL or MCP tool + canonicalized arguments), so receipts cannot be replayed against different requests.

## What this is not

- Insight does not operate registry contracts; anchoring happens on whichever registry deployment the agent ecosystem uses (e.g. BNB Chain's official Identity Registry at `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`).
- The evidence envelope is documentation, not a new signed object. Every artifact above is independently signed under Insight's existing EIP-712 domains.
- x402-quality/v0 remains a draft reference implementation.
