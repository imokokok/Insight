import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRemoteArgs } from '../bin/insight-mcp.mjs';

test('defaults to the hosted endpoint and the mcp label', () => {
  assert.deepEqual(buildRemoteArgs({}), [
    'https://www.oracleinsight.xyz/api/mcp',
    '--header',
    'x-insight-entry-source:mcp',
  ]);
});

test('honors an allowed entry source and a custom endpoint', () => {
  assert.deepEqual(
    buildRemoteArgs({
      INSIGHT_MCP_URL: 'https://staging.example.test/api/mcp',
      INSIGHT_ENTRY_SOURCE: 'sendaifun',
    }),
    ['https://staging.example.test/api/mcp', '--header', 'x-insight-entry-source:sendaifun']
  );
});

test('rejects a free-form entry source instead of forwarding it', () => {
  const args = buildRemoteArgs({ INSIGHT_ENTRY_SOURCE: 'campaign-42' });
  assert.equal(args[2], 'x-insight-entry-source:mcp');
});

test('expands the API key from the environment, never the argument list', () => {
  const args = buildRemoteArgs({ INSIGHT_API_KEY: 'ins_secret_value' });
  assert.ok(args.includes('X-API-Key:${INSIGHT_API_KEY}'));
  assert.ok(!args.some((arg) => arg.includes('ins_secret_value')));
});

test('appends caller-supplied mcp-remote flags after the fixed headers', () => {
  const args = buildRemoteArgs({}, ['--header', 'X-Custom:value']);
  assert.deepEqual(args.slice(-2), ['--header', 'X-Custom:value']);
});
