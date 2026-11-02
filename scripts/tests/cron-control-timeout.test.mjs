import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { requestLedger } from '../cron-control.mjs';

test('ledger requests retain their options and abort an unresponsive fetch', async () => {
  await assert.rejects(
    requestLedger(
      'https://example.invalid/ledger',
      { method: 'PATCH' },
      (_url, options) => {
        assert.equal(options.method, 'PATCH');
        return new Promise((_resolve, reject) => {
          // AbortSignal.timeout uses an unrefed timer. Keep this mocked request
          // alive until it aborts, as a real in-flight fetch would.
          const watchdog = setTimeout(
            () => reject(new Error('Ledger request did not abort')),
            5_000
          );
          options.signal.addEventListener(
            'abort',
            () => {
              clearTimeout(watchdog);
              reject(options.signal.reason);
            },
            { once: true }
          );
        });
      },
      25
    ),
    { name: 'TimeoutError' }
  );
});

test('native fallback skips while a recent primary dispatch is in flight', async () => {
  const saved = new Map();
  const keys = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CRON_WORKFLOW',
    'GITHUB_EVENT_NAME',
    'FALLBACK_MAX_AGE_MINUTES',
    'FALLBACK_REQUIRE_NO_PRIMARY_IN_FLIGHT',
    'FALLBACK_PRIMARY_IN_FLIGHT_MAX_AGE_MINUTES',
    'GITHUB_OUTPUT',
  ];
  for (const key of keys) saved.set(key, process.env[key]);
  const originalFetch = globalThis.fetch;
  const outputDir = await mkdtemp(join(tmpdir(), 'cron-control-test-'));

  try {
    Object.assign(process.env, {
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      CRON_WORKFLOW: 'snapshot-collect.yml',
      GITHUB_EVENT_NAME: 'schedule',
      FALLBACK_MAX_AGE_MINUTES: '25',
      FALLBACK_REQUIRE_NO_PRIMARY_IN_FLIGHT: 'true',
      FALLBACK_PRIMARY_IN_FLIGHT_MAX_AGE_MINUTES: '8',
      GITHUB_OUTPUT: join(outputDir, 'output'),
    });

    const requests = [];
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      if (url.searchParams.get('status') === 'eq.succeeded') {
        return new Response('[]', { status: 200 });
      }
      return new Response('[{"id":"primary-run"}]', { status: 200 });
    };

    const { guard } = await import(`../cron-control.mjs?test=${Date.now()}`);
    await guard();

    assert.equal(await readFile(process.env.GITHUB_OUTPUT, 'utf8'), 'should_run=false\n');
    assert.equal(requests.length, 2);
    assert.equal(requests[1].searchParams.get('status'), 'in.(dispatching,running)');
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      const value = saved.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
