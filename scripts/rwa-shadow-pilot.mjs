import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const defaultEvidenceDirectory = path.join(repositoryRoot, '.local', 'rwa-shadow-pilot');
const policyPath = path.join(repositoryRoot, 'protocol', 'rwa-shadow-pilot.v1.json');
const registryPath = path.join(repositoryRoot, 'protocol', 'rwa-instrument-registry.v1.json');

function stableJson(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && Object.getPrototypeOf(value) === Object.prototype)
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  throw new TypeError('RWA_PILOT_INVALID_JSON');
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(stableJson(value)).digest('hex')}`;
}

function calendarDate(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function classifyFailure(message) {
  return /DRIFT|MISMATCH|NOT_FOUND|INVALID_(?:FIGI|MIC)|UID|ISIN|DEPLOYMENT|REGISTRY_VERSION/i.test(
    message
  )
    ? 'IDENTITY_DRIFT'
    : 'AVAILABILITY';
}

export async function loadRwaShadowPilotPolicy() {
  const [policy, registry] = await Promise.all([
    readFile(policyPath, 'utf8').then(JSON.parse),
    readFile(registryPath, 'utf8').then(JSON.parse),
  ]);
  const registrySymbols = registry.entries
    .map((entry) => entry.issuerBinding.symbol)
    .sort()
    .join(',');
  if (
    policy.schema !== 'insight.rwa-reference-shadow-pilot.v1' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(policy.qualifyingStartDate) ||
    !Array.isArray(policy.requiredCheckpoints) ||
    policy.requiredCheckpoints.length < 1 ||
    new Set(policy.requiredCheckpoints).size !== policy.requiredCheckpoints.length ||
    !policy.requiredCheckpoints.every((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)) ||
    policy.requiredCheckpoints[0] !== policy.qualifyingStartDate ||
    policy.criteria?.autoPromote !== false ||
    policy.registryVersion !== registry.version ||
    policy.qualifyingStartDate !== registry.sources?.isoMic?.effectiveDate ||
    [...policy.instruments].sort().join(',') !== registrySymbols
  ) {
    throw new TypeError('RWA_PILOT_POLICY_INVALID');
  }
  return policy;
}

async function readEvents(directory) {
  let contents;
  try {
    contents = await readFile(path.join(directory, 'events.ndjson'), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  const events = contents
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  let previousDigest = null;
  for (const [index, event] of events.entries()) {
    const { digest, ...unsigned } = event;
    if (
      event.schema !== 'insight.rwa-reference-shadow-sample.v1' ||
      event.sequence !== index + 1 ||
      event.previousDigest !== previousDigest ||
      digest !== sha256(unsigned)
    ) {
      throw new TypeError(`RWA_PILOT_CHAIN_INVALID:${index + 1}`);
    }
    previousDigest = digest;
  }
  return events;
}

export function summarizeRwaShadowPilot(policy, events, now = new Date()) {
  const successfulDates = new Set(
    events
      .filter((event) => event.ok === true && event.localDate >= policy.qualifyingStartDate)
      .map((event) => event.localDate)
  );
  const completedCheckpoints = policy.requiredCheckpoints.filter((date) =>
    successfulDates.has(date)
  );
  const remainingCheckpoints = policy.requiredCheckpoints.filter(
    (date) => !successfulDates.has(date)
  );
  const driftFailures = events.filter(
    (event) => event.ok === false && event.failure?.class === 'IDENTITY_DRIFT'
  );
  const availabilityFailures = events.filter(
    (event) => event.ok === false && event.failure?.class === 'AVAILABILITY'
  );
  const today = calendarDate(now, policy.timeZone);
  let status = 'COLLECTING';
  if (driftFailures.length > 0) status = 'REVIEW_REQUIRED';
  else if (remainingCheckpoints.length === 0) status = 'READY_FOR_REVIEW';
  else if (today < policy.qualifyingStartDate) status = 'PREFLIGHT';
  return {
    schema: 'insight.rwa-reference-shadow-summary.v1',
    pilotId: policy.pilotId,
    registryVersion: policy.registryVersion,
    policyDigest: sha256(policy),
    generatedAt: now.toISOString(),
    status,
    qualifyingStartDate: policy.qualifyingStartDate,
    requiredCheckpoints: policy.requiredCheckpoints,
    completedCheckpoints,
    remainingCheckpoints,
    totalSamples: events.length,
    identityDriftFailures: driftFailures.length,
    availabilityFailures: availabilityFailures.length,
    lastSampleAt: events.at(-1)?.observedAt ?? null,
    lastDigest: events.at(-1)?.digest ?? null,
    activationRecommendation: status === 'READY_FOR_REVIEW' ? 'MANUAL_REVIEW' : 'KEEP_SHADOW',
    autoPromote: false,
  };
}

async function writeSummary(directory, summary) {
  await mkdir(directory, { recursive: true });
  const destination = path.join(directory, 'summary.json');
  const temporary = path.join(directory, `summary.${process.pid}.tmp`);
  await writeFile(temporary, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await rename(temporary, destination);
}

async function runLiveVerifier() {
  const { stdout } = await execFileAsync(
    process.execPath,
    ['--import', 'tsx', path.join(scriptDirectory, 'verify-rwa-reference-data.ts')],
    {
      cwd: repositoryRoot,
      env: process.env,
      maxBuffer: 1024 * 1024,
      timeout: 60_000,
    }
  );
  const result = JSON.parse(stdout.trim().split('\n').at(-1));
  if (result.ok !== true || result.mode !== 'live')
    throw new TypeError('RWA_PILOT_LIVE_CHECK_FAILED');
  return result;
}

export async function sampleRwaShadowPilot(options = {}) {
  const policy = options.policy ?? (await loadRwaShadowPilotPolicy());
  const directory = path.resolve(options.directory ?? defaultEvidenceDirectory);
  const now = options.now ?? new Date();
  const verify = options.verify ?? runLiveVerifier;
  const events = await readEvents(directory);
  const localDate = calendarDate(now, policy.timeZone);
  if (events.some((event) => event.localDate === localDate && event.ok === true)) {
    const summary = summarizeRwaShadowPilot(policy, events, now);
    await writeSummary(directory, summary);
    return { sampled: false, reason: 'SUCCESS_ALREADY_RECORDED_FOR_DATE', summary };
  }

  let verification = null;
  let failure = null;
  try {
    verification = await verify();
    if (verification.registryVersion !== policy.registryVersion) {
      throw new TypeError(
        `REGISTRY_VERSION_DRIFT:${verification.registryVersion}:${policy.registryVersion}`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failure = {
      class: classifyFailure(message),
      code: message.slice(0, 300),
    };
  }

  const unsigned = {
    schema: 'insight.rwa-reference-shadow-sample.v1',
    pilotId: policy.pilotId,
    registryVersion: policy.registryVersion,
    sequence: events.length + 1,
    observedAt: now.toISOString(),
    localDate,
    qualifying: policy.requiredCheckpoints.includes(localDate),
    ok: failure === null,
    verification,
    failure,
    previousDigest: events.at(-1)?.digest ?? null,
  };
  const event = { ...unsigned, digest: sha256(unsigned) };
  await mkdir(directory, { recursive: true });
  await appendFile(path.join(directory, 'events.ndjson'), `${JSON.stringify(event)}\n`, 'utf8');
  const updatedEvents = [...events, event];
  const summary = summarizeRwaShadowPilot(policy, updatedEvents, now);
  await writeSummary(directory, summary);
  return { sampled: true, event, summary };
}

export async function getRwaShadowPilotStatus(options = {}) {
  const policy = options.policy ?? (await loadRwaShadowPilotPolicy());
  const directory = path.resolve(options.directory ?? defaultEvidenceDirectory);
  const events = await readEvents(directory);
  const summary = summarizeRwaShadowPilot(policy, events, options.now ?? new Date());
  await writeSummary(directory, summary);
  return summary;
}

async function main() {
  const command = process.argv[2] ?? 'status';
  if (!['sample', 'status'].includes(command)) throw new TypeError('Use sample or status');
  const result =
    command === 'sample' ? await sampleRwaShadowPilot() : await getRwaShadowPilotStatus();
  console.log(JSON.stringify(result));
  if (command === 'sample' && result.sampled && result.event.ok === false) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
