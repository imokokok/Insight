# Pre-trade module boundary

`src/lib/safety/preTrade` is the canonical boundary for a pre-trade safety
assessment. It is an application use case shared by REST routes, MCP tools,
guards and journey workflows; it is not an HTTP service.

## Public API

Import the use case and all of its public types from one entrypoint:

```ts
import {
  preTradeSafetyCheck,
  type PreTradeSafetyInput,
  type PreTradeSafetyResult,
} from '@/lib/safety/preTrade';
```

The entrypoint deliberately exposes only the assessment use case and its
contract. Consumers must not import implementation helpers directly.

## Dependency direction

```text
REST / MCP / guard / journey adapter
                ↓
     safety/preTrade (application use case)
                ↓
  oracle, attestation, DEX, lending and persistence capabilities
```

The application layer may compose existing capabilities. Transport adapters
remain responsible for parsing requests, authentication, response formatting
and payment handling; they do not own safety policy.

## Compatibility and migration

The former `@/lib/api/services/preTradeSafetyService` path remains a thin
compatibility facade. New source imports are blocked by ESLint. Delete that
facade only after downstream integrators have migrated.

## Next extraction seam

`assess.ts` is intentionally still an orchestrator. Its next safe split is
pure policy evaluation (deviation, staleness, depeg and protocol-buffer rules)
into dependency-free modules with characterization tests. Do not split network
calls, signing or audit persistence into a separate service before their port
contracts and failure semantics are explicit.
