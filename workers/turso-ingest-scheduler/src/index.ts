const REQUEST_TIMEOUT_MS = 210_000;
const INGEST_CRON = '*/15 * * * *';
const PROJECT_CRON = '3,18,33,48 * * * *';

function schedulerUrl(base: string, scheduledTime: number): URL {
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

async function trigger(
  env: Env,
  baseUrl: string,
  task: 'turso_ingest' | 'turso_projection',
  scheduledTime: number
): Promise<void> {
  const url = schedulerUrl(baseUrl, scheduledTime);
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
      throw new Error(`Insight ${task} endpoint returned HTTP ${response.status}`);
    }
    // eslint-disable-next-line no-console -- the Cron Event log is the scheduler's durable operator signal.
    console.log(
      JSON.stringify({
        event: `${task}_triggered`,
        scheduledTime,
        status: response.status,
      })
    );
  } finally {
    clearTimeout(timeout);
  }
}

const worker = {
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const task =
      controller.cron === INGEST_CRON
        ? { name: 'turso_ingest' as const, url: env.INSIGHT_INGEST_URL }
        : controller.cron === PROJECT_CRON
          ? { name: 'turso_projection' as const, url: env.INSIGHT_PROJECT_URL }
          : null;
    if (!task) {
      console.error(JSON.stringify({ event: 'unexpected_cron_trigger', cron: controller.cron }));
      return;
    }

    try {
      await trigger(env, task.url, task.name, controller.scheduledTime);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: `${task.name}_failed`,
          cron: controller.cron,
          scheduledTime: controller.scheduledTime,
          error: error instanceof Error ? error.message : String(error),
        })
      );
      throw error;
    }
  },
} satisfies ExportedHandler<Env>;

export default worker;
export { schedulerUrl };
