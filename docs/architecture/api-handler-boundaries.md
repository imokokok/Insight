# API handler boundaries

`src/lib/api/handler.ts` owns request orchestration: middleware order, route
deadlines, protected-cache policy, response diagnostics, and API-key usage
logging. It must not become the implementation home for billing or replay
protocols.

- `src/lib/api/billing/restBilling.ts` owns REST credit receipts, deferred
  settlement, batch pricing/waivers, and the public batch billing echo.
- `src/lib/api/replay/restReplay.ts` owns REST idempotency body snapshots and
  cache-admission rules. Replaying a cached response is still orchestrated by
  the handler so it receives fresh balance, rate-limit, CORS, and diagnostic
  headers.
- `src/lib/api/transport/responseSnapshot.ts` is the shared safe response-body
  snapshot primitive. It preserves a deliverable response when `Response.clone`
  is unavailable in a runtime or test polyfill.

Keep these dependencies one-way: transport may not depend on billing or replay;
replay may depend on transport and billing types only; route-specific policy
belongs above these modules in the handler.
