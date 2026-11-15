import { getX402PaymentOptions, parseX402Config, SOLANA_MAINNET_CAIP2 } from '../config';
import { buildFacilitatorRoutes } from '../resourceServer';

const PAY_TO = 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX';
const PAYAI_FACILITATOR_URL = 'https://facilitator.payai.network';

describe('x402 facilitator claim order', () => {
  afterEach(() => {
    // @ts-expect-error test stub
    global.fetch = undefined;
  });

  it('queries explicitly mapped facilitators before defaulted ones', async () => {
    const supportedUrls: string[] = [];
    const fetchMock = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/supported')) supportedUrls.push(url);
      return Response.json({
        kinds: [
          // The defaulted facilitator also advertises the Solana rail: with
          // first-claim routing this must not steal verify/settle from the
          // explicitly mapped facilitator.
          { x402Version: 2, scheme: 'exact', network: SOLANA_MAINNET_CAIP2 },
          { x402Version: 2, scheme: 'exact', network: 'eip155:8453' },
        ],
        extensions: [],
        signers: {},
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const cfg = parseX402Config({
      X402_ENABLED: 'true',
      X402_EVM_ENABLED: 'true',
      X402_NETWORK: 'eip155:8453',
      X402_PAY_TO: '0xAbC0000000000000000000000000000000000001',
      X402_SOLANA_ENABLED: 'true',
      X402_SOLANA_NETWORK: SOLANA_MAINNET_CAIP2,
      X402_SOLANA_PAY_TO: PAY_TO,
      X402_SOLANA_FACILITATOR_URL: PAYAI_FACILITATOR_URL,
    });
    const options = getX402PaymentOptions(cfg);
    const routes = buildFacilitatorRoutes(cfg, undefined, options);
    expect(routes.length).toBeGreaterThan(0);
    // The explicitly mapped Solana facilitator owns exactly the Solana rail.
    const payai = routes.find((route) => route.networks.has(SOLANA_MAINNET_CAIP2));
    expect(payai).toBeDefined();

    // Resolve the same /supported discovery the resource server uses.
    for (const route of routes) {
      await route.client.getSupported();
    }

    const first = supportedUrls[0];
    expect(first).toContain('facilitator.payai.network');
    expect(supportedUrls.findIndex((u) => u.includes('facilitator.payai.network'))).toBeLessThan(
      supportedUrls.findIndex((u) => !u.includes('facilitator.payai.network'))
    );
  });
});
