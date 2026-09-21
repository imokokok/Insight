import test from 'node:test';
import assert from 'node:assert/strict';
import { requestLedger } from '../cron-control.mjs';

test('ledger requests retain their options and abort an unresponsive fetch', async () => {
  await assert.rejects(
    requestLedger(
      'https://example.invalid/ledger',
      { method: 'PATCH' },
      (_url, options) => {
        assert.equal(options.method, 'PATCH');
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(options.signal.reason), {
            once: true,
          });
        });
      },
      25
    ),
    { name: 'TimeoutError' }
  );
});
