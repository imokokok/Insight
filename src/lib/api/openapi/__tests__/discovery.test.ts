import { buildOpenApiDiscovery } from '../discovery';

const BASE_CONFIG = {
  x402Enabled: true,
  mppEnabled: true,
  mcpMppEnabled: true,
  network: 'eip155:84532' as const,
  amountAtomic: '20000',
  priceUsd: 0.02,
};

describe('OpenAPI payment discovery', () => {
  it('uses canonical MPP offers with configured USDC contract and atomic amount', () => {
    const document = buildOpenApiDiscovery(BASE_CONFIG);
    const rest = document.paths['/api/v1/safety/pre-trade'].get['x-payment-info'] as {
      offers: Array<Record<string, unknown>>;
    };
    const mcp = document.paths['/api/mcp/mpp'].post['x-payment-info'] as {
      offers: Array<Record<string, unknown>>;
    };

    expect(rest).toEqual({
      offers: [
        {
          intent: 'charge',
          method: 'evm',
          amount: '20000',
          currency: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          description: '$0.02 USDC per successful pre-trade safety check',
        },
      ],
    });
    expect(mcp).toEqual(rest);
    expect(document.paths['/api/mcp'].post['x-payment-info']).toBeUndefined();
    expect(document.paths['/api/mcp'].post['x-x402-payment-info']).toEqual(
      expect.objectContaining({ protocol: 'x402-v2' })
    );
  });

  it('omits MPP offers when the feature is disabled and isolates x402 metadata', () => {
    const document = buildOpenApiDiscovery({
      ...BASE_CONFIG,
      mppEnabled: false,
      mcpMppEnabled: false,
    });

    expect(document.paths['/api/v1/safety/pre-trade'].get['x-payment-info']).toBeUndefined();
    expect(document.paths['/api/mcp/mpp']).toBeUndefined();
    expect(document.paths['/api/v1/safety/pre-trade'].get['x-x402-payment-info']).toBeDefined();
    expect(document.paths['/api/mcp'].post['x-x402-payment-info']).toBeDefined();
  });

  it('omits x402 pricing metadata when its payment rail is disabled', () => {
    const document = buildOpenApiDiscovery({ ...BASE_CONFIG, x402Enabled: false });

    expect(document.paths['/api/v1/safety/pre-trade'].get['x-x402-payment-info']).toBeUndefined();
    expect(document.paths['/api/mcp'].post['x-x402-payment-info']).toBeUndefined();
    expect(document.paths['/api/mcp/mpp'].post['x-payment-info']).toBeDefined();
  });

  it('limits the MPP MCP discovery schema to the pilot tool', () => {
    const document = buildOpenApiDiscovery(BASE_CONFIG);
    const operation = document.paths['/api/mcp/mpp'].post;
    const requestBody = operation.requestBody as Record<string, unknown>;
    const content = requestBody.content as Record<string, Record<string, unknown>>;
    const json = content['application/json'];
    const schema = json.schema as Record<string, unknown>;
    const properties = schema.properties as Record<string, Record<string, unknown>>;
    const params = properties.params;
    const paramsProperties = params.properties as Record<string, Record<string, unknown>>;

    expect(properties.method.const).toBe('tools/call');
    expect(paramsProperties.name.const).toBe('pre_trade_safety_check');
    expect(operation.responses).toHaveProperty('402');
  });
});
