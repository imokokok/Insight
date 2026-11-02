const REQUEST_TIMEOUT_MS = 210_000;

interface Env {
  INSIGHT_INGEST_URL: string;
  INGEST_SCHEDULER_SECRET: string;
}

function ingestUrl(base: string, scheduledTime: number): URL {
  const url = new URL(base);
  if (url.protocol !== 'https:') throw new Error('INSIGHT_INGEST_URL must use HTTPS');
  if (url.username || url.password)
    throw new Error('INSIGHT_INGEST_URL must not contain credentials');
  if (!Number.isSafeInteger(scheduledTime) || scheduledTime < 0) {
    throw new Error('Invalid Cloudflare scheduled time');
  }
  url.searchParams.set('scheduled_for', new Date(scheduledTime).toISOString());
  return url;
}

async function triggerIngest(env: Env, scheduledTime: number): Promise<void> {
  const url = ingestUrl(env.INSIGHT_INGEST_URL, scheduledTime);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.INGEST_SCHEDULER_SECRET}`,
        'User-Agent': 'insight-turso-ingest-scheduler/1',
      },
      signal: abortController.signal,
    });
    if (!response.ok) {
      throw new Error(`Insight ingest endpoint returned HTTP ${response.status}`);
    }
    // eslint-disable-next-line no-console -- the Cron Event log is the scheduler's durable operator signal.
    console.log(
      JSON.stringify({
        event: 'turso_ingest_triggered',
        scheduledTime,
        status: response.status,
      })
    );
  } finally {
    clearTimeout(timeout);
  }
}

const worker = {
  async scheduled(controller: { scheduledTime: number }, env: Env): Promise<void> {
    await triggerIngest(env, controller.scheduledTime);
  },
};

export default worker;
export { ingestUrl };
