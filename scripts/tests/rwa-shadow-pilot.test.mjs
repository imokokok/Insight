import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getRwaShadowPilotStatus, sampleRwaShadowPilot } from '../rwa-shadow-pilot.mjs';

const policy = {
  schema: 'insight.rwa-reference-shadow-pilot.v1',
  pilotId: 'fixture',
  registryVersion: 'fixture.v1',
  timeZone: 'Asia/Shanghai',
  startedAt: '2026-09-21T00:00:00Z',
  qualifyingStartDate: '2026-09-28',
  requiredCheckpoints: ['2026-09-28', '2026-10-05', '2026-10-12'],
  instruments: ['AAPL'],
  criteria: { autoPromote: false },
};

const verified = {
  ok: true,
  mode: 'live',
  registryVersion: 'fixture.v1',
  sources: ['ISO_10383_MIC', 'OpenFIGI', 'Robinhood_RHJ'],
  instruments: [{ symbol: 'AAPL', status: 'SHADOW' }],
};

test('records one hash-chained success per checkpoint and becomes review-ready after three checks', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'rwa-pilot-'));
  try {
    for (const [index, date] of policy.requiredCheckpoints.entries()) {
      const now = new Date(`${date}T02:00:00Z`);
      const result = await sampleRwaShadowPilot({
        directory,
        policy,
        now,
        verify: async () => verified,
      });
      assert.equal(result.sampled, true);
      assert.equal(result.event.sequence, index + 1);
      assert.equal(result.event.ok, true);
      assert.equal(result.event.qualifying, true);
    }
    const duplicate = await sampleRwaShadowPilot({
      directory,
      policy,
      now: new Date('2026-10-12T08:00:00Z'),
      verify: async () => verified,
    });
    assert.equal(duplicate.sampled, false);
    const summary = await getRwaShadowPilotStatus({
      directory,
      policy,
      now: new Date('2026-10-12T08:00:00Z'),
    });
    assert.equal(summary.status, 'READY_FOR_REVIEW');
    assert.deepEqual(summary.completedCheckpoints, policy.requiredCheckpoints);
    assert.deepEqual(summary.remainingCheckpoints, []);
    assert.equal(summary.activationRecommendation, 'MANUAL_REVIEW');
    assert.equal(summary.autoPromote, false);
    const lines = (await readFile(path.join(directory, 'events.ndjson'), 'utf8'))
      .trim()
      .split('\n');
    assert.equal(lines.length, 3);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('distinguishes availability failures from identity drift and never auto-promotes', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'rwa-pilot-'));
  try {
    await sampleRwaShadowPilot({
      directory,
      policy,
      now: new Date(Date.UTC(2026, 8, 28, 2)),
      verify: async () => {
        throw new Error('REFERENCE_HTTP_503:api.openfigi.com');
      },
    });
    let summary = await getRwaShadowPilotStatus({
      directory,
      policy,
      now: new Date(Date.UTC(2026, 8, 28, 3)),
    });
    assert.equal(summary.status, 'COLLECTING');
    assert.equal(summary.availabilityFailures, 1);

    await sampleRwaShadowPilot({
      directory,
      policy,
      now: new Date(Date.UTC(2026, 8, 29, 2)),
      verify: async () => {
        throw new Error('OPENFIGI_MAPPING_DRIFT:AAPL');
      },
    });
    summary = await getRwaShadowPilotStatus({
      directory,
      policy,
      now: new Date(Date.UTC(2026, 8, 29, 3)),
    });
    assert.equal(summary.status, 'REVIEW_REQUIRED');
    assert.equal(summary.identityDriftFailures, 1);
    assert.equal(summary.activationRecommendation, 'KEEP_SHADOW');
    assert.equal(summary.autoPromote, false);
  } finally {
    await rm(directory, { recursive: true });
  }
});
