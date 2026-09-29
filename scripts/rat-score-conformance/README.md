# Pinned RAT Score NVDA consumer conformance fixture

`v1_score_NVDA.fixture.json` is a byte-exact copy of
[`SAW72/rwa-transparency-score` at commit `0e832c24a405e17cfc567ebe51cefd9046c5e10d`](https://github.com/SAW72/rwa-transparency-score/blob/0e832c24a405e17cfc567ebe51cefd9046c5e10d/docs/examples/v1_score_NVDA.fixture.json).
SHA-256: `76316c0d6b933a111d32e0cca9c50d9c02851da61c289a80701151370b46903a`.

The companion test runs with `node --import tsx --test scripts/tests/rat-score-conformance.test.mts`
or as part of `npm run test:reliability`. It checks the fixture's evidence labels,
refuses ticker-only instrument binding through Insight's actual `rwaInstrumentId`
validator, and confirms that wrapper prices lack the exact instrument and source
observation time needed for Insight price input. It performs no network request,
does not evaluate an action, and produces no signed assessment. The adjacent
`nvda_consumer_conformance.simulation.json` is a copy of RAT's deterministic
simulation golden output; the test checks its pin, complete pillar verification,
unknown price freshness, and `mayAuthorizeExecution: false` independently of
the RAT runtime.
