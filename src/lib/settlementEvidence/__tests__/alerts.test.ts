import { alertWebhookUrl, formatInconsistentAlertText, sendInconsistentAlerts } from '../alerts';

import type { InconsistentAlert } from '../alerts';

function alert(overrides: Partial<InconsistentAlert> = {}): InconsistentAlert {
  return {
    marketSlug: 'btc-updown-5m-1766162100',
    asset: 'BTC',
    settlementVenue: 'chainlink-stream',
    declaredOutcome: 'Down',
    independentOutcome: 'Up',
    priceChangeBps: 500,
    oracleDeviationBps: 320.5,
    candleCoverageE4: 10000,
    windowStartMs: 1766162100000,
    windowEndMs: 1766162400000,
    payloadHash: 'a'.repeat(64),
    ...overrides,
  };
}

describe('alertWebhookUrl', () => {
  it('returns null when unset', () => {
    expect(alertWebhookUrl({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it('rejects non-https webhooks (fail closed)', () => {
    expect(
      alertWebhookUrl({
        SETTLEMENT_ALERT_WEBHOOK_URL: 'http://hook.example/x',
      } as NodeJS.ProcessEnv)
    ).toBeNull();
  });

  it('accepts an https webhook', () => {
    expect(
      alertWebhookUrl({
        SETTLEMENT_ALERT_WEBHOOK_URL: 'https://hooks.example/x',
      } as NodeJS.ProcessEnv)
    ).toBe('https://hooks.example/x');
  });
});

describe('formatInconsistentAlertText', () => {
  it('summarizes declared vs independent with the payload hash', () => {
    const text = formatInconsistentAlertText([alert()]);
    expect(text).toContain('1 inconsistent');
    expect(text).toContain('btc-updown-5m-1766162100');
    expect(text).toContain('declared Down vs independent Up');
    expect(text).toContain(`${'a'.repeat(12)}…`);
  });
});

describe('sendInconsistentAlerts', () => {
  it('delivers a slack-compatible payload', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const delivered = await sendInconsistentAlerts([alert()], {
      webhookUrl: 'https://hooks.example/x',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(delivered).toBe(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://hooks.example/x');
    expect(JSON.parse(String(init.body)).text).toContain('inconsistent');
  });

  it('sends nothing without a webhook', async () => {
    expect(await sendInconsistentAlerts([alert()], { webhookUrl: null })).toBe(0);
    expect(await sendInconsistentAlerts([], { webhookUrl: 'https://hooks.example/x' })).toBe(0);
  });

  it('never throws on webhook failure', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('boom'));
    const delivered = await sendInconsistentAlerts([alert()], {
      webhookUrl: 'https://hooks.example/x',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(delivered).toBe(0);
  });

  it('treats a non-2xx response as not delivered', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response(null, { status: 500 }));
    const delivered = await sendInconsistentAlerts([alert()], {
      webhookUrl: 'https://hooks.example/x',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(delivered).toBe(0);
  });
});
