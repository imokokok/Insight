import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { InMemoryReservationStore, executeCrossing, verifyNative } from './aeb-option2-adapter.mjs';

const fixture = JSON.parse(
  await readFile(new URL('./signed-nonproduction-fixture.json', import.meta.url))
);
const profile = JSON.parse(
  await readFile(new URL('./authorization-profile.json', import.meta.url))
);
const fresh = fixture.testClock.checkedAt + 100;
const make = () => ({
  bundle: structuredClone({
    profile,
    authorization: fixture.authorization,
    sourceCheck: fixture.sourceCheck,
    destinationCheck: fixture.destinationCheck,
  }),
  config: { ...fixture.trust, maximumCheckAgeSeconds: 300 },
  expectedAction: structuredClone(fixture.executionAction),
});

{
  const { bundle, config } = make();
  const result = await verifyNative(bundle, config, fixture.testClock.checkedAt - 1);
  assert.equal(result.ok, true);
  console.log('REPRODUCED future-dated checks accepted at checkedAt - 1');
}
{
  const { bundle, config, expectedAction } = make();
  const store = new InMemoryReservationStore();
  const originalReserve = store.reserve.bind(store);
  const authorizedRouter = expectedAction.router;
  store.reserve = (key) => {
    originalReserve(key);
    expectedAction.router = '0x0000000000000000000000000000000000000001';
  };
  let receivedRouter;
  const result = await executeCrossing({
    bundle,
    config,
    expectedAction,
    store,
    submitter: async (action) => {
      receivedRouter = action.router;
      return { status: 'COMMITTED' };
    },
    admissionNowSeconds: fresh,
    submissionNowSeconds: fresh + 1,
  });
  assert.equal(result.decision, 'SUBMITTED');
  assert.notEqual(receivedRouter, authorizedRouter);
  console.log(
    'REPRODUCED post-mapping caller-owned action mutation reaches submitter as SUBMITTED'
  );
}
{
  const { bundle, config, expectedAction } = make();
  const store = new InMemoryReservationStore();
  let calls = 0;
  await assert.rejects(
    executeCrossing({
      bundle,
      config,
      expectedAction,
      store,
      submitter: async () => {
        calls++;
        throw new Error('synthetic connection reset after possible entry');
      },
      admissionNowSeconds: fresh,
      submissionNowSeconds: fresh + 1,
    }),
    /synthetic connection reset/
  );
  const unit = `one-use-action-authorization:${fixture.authorization.uid}`;
  assert.equal(calls, 1);
  assert.equal(store.snapshot(unit).state, 'PROVIDER_ENTERED');
  assert.throws(() => store.reserve(unit), /REPLAY_FENCED/);
  console.log(
    'REPRODUCED submitter exception escapes with PROVIDER_ENTERED; replay stays fenced but no RECONCILE result'
  );
}
{
  const { bundle, config } = make();
  config.maximumCheckAgeSeconds = 600;
  const result = await verifyNative(bundle, config, fixture.testClock.checkedAt + 350);
  assert.equal(profile.acceptancePolicy.maximumCheckAgeSeconds, 300);
  assert.equal(result.ok, true);
  console.log(
    'REPRODUCED 350-second check accepted with config 600 although signed profile says maximum 300'
  );
}
console.log(
  '4/4 diagnostic behaviors reproduced; synthetic inputs only, no network or physical transaction.'
);
