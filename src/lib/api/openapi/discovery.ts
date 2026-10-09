import { MPP_MCP_TOOL } from '@/lib/api/mpp/config';
import { usdcForNetwork, type X402NetworkId } from '@/lib/api/x402/config';

import sourceDocument from './discovery.json';

type JsonObject = Record<string, unknown>;
type OpenApiDocument = {
  info: JsonObject;
  paths: Record<string, Record<string, JsonObject>>;
};

export interface OpenApiPaymentConfig {
  x402Enabled: boolean;
  mppEnabled: boolean;
  mcpMppEnabled: boolean;
  network: X402NetworkId;
  amountAtomic: string;
  priceUsd: number;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {};
}

function mppOffer(config: OpenApiPaymentConfig): JsonObject {
  return {
    intent: 'charge',
    method: 'evm',
    amount: config.amountAtomic,
    currency: usdcForNetwork(config.network),
    description: `$${config.priceUsd.toFixed(2)} USDC per successful pre-trade safety check`,
  };
}

function addMcpPaymentNameConstraint(operation: JsonObject): void {
  const requestBody = object(operation.requestBody);
  const content = object(requestBody.content);
  const json = object(content['application/json']);
  const schema = object(json.schema);
  const properties = object(schema.properties);
  properties.method = { type: 'string', const: 'tools/call' };
  const params = object(properties.params);
  const paramProperties = object(params.properties);
  const name = object(paramProperties.name);
  name.const = MPP_MCP_TOOL;
  paramProperties.name = name;
  params.properties = paramProperties;
  properties.params = params;
  schema.properties = properties;
  json.schema = schema;
  content['application/json'] = json;
  requestBody.content = content;
  operation.requestBody = requestBody;
}

/** Build discovery metadata from the exact server-side payment configuration. */
export function buildOpenApiDiscovery(config: OpenApiPaymentConfig): OpenApiDocument {
  const document = JSON.parse(JSON.stringify(sourceDocument)) as OpenApiDocument;
  const preTrade = document.paths['/api/v1/safety/pre-trade']?.get;
  const x402Mcp = document.paths['/api/mcp']?.post;
  const mcpAccess = config.x402Enabled ? 'x402 or API key' : 'API key';

  document.info.description =
    'Oracle-immune-system pre-trade safety checks with verifiable EIP-712 attestations. ' +
    'The REST pre-trade endpoint accepts API-key access and advertises configured x402/MPP ' +
    'payment rails. The MPP MCP pilot exposes pre_trade_safety_check on its dedicated endpoint; ' +
    'the full MCP tool catalog remains on /api/mcp.';
  document.info['x-guidance'] =
    'REST: GET /api/v1/safety/pre-trade with asset, chainId, action, and tradeAmountUsd. ' +
    `The full MCP catalog uses POST /api/mcp (${mcpAccess}). ` +
    (config.mcpMppEnabled
      ? 'The MPP MCP pilot uses POST /api/mcp/mpp and only accepts pre_trade_safety_check. '
      : 'The MPP MCP payment pilot is currently disabled. ') +
    'MPP offers are shown only when enabled; the runtime challenge is authoritative. ' +
    'Every paid result is settled only after the tool succeeds.';

  if (preTrade) {
    delete preTrade['x-payment-info'];
    delete preTrade['x-x402-payment-info'];
    if (config.x402Enabled) {
      preTrade['x-x402-payment-info'] = {
        protocol: 'x402-v2',
        price: { currency: 'USDC', amount: config.priceUsd.toFixed(6) },
      };
    }
    if (config.mppEnabled) {
      preTrade['x-payment-info'] = { offers: [mppOffer(config)] };
    }
  }

  if (x402Mcp) {
    delete x402Mcp['x-payment-info'];
    delete x402Mcp['x-x402-payment-info'];
    if (config.x402Enabled) {
      x402Mcp.description =
        'Pay-per-call access to the Insight oracle tool catalog for agents without an API key. ' +
        'Price scales with the tool metering class (C1=$0.002, C2=$0.008, C3=$0.02, C4=$0.04). ' +
        'tools/list and initialize are free; paid calls settle only after success.';
      x402Mcp['x-x402-payment-info'] = {
        protocol: 'x402-v2',
        price: { currency: 'USD', min: '0.002', max: '0.04', unit: 'per tool call' },
      };
    } else {
      x402Mcp.description =
        'The full Insight oracle tool catalog is available to authenticated API-key callers. ' +
        'Unauthenticated tools/list and initialize requests are free; paid tool calls require an API key.';
    }
    const responses = object(x402Mcp.responses);
    const paymentResponse = object(responses['402']);
    paymentResponse.description = config.x402Enabled
      ? 'Payment Required: x402 v2 challenge in the PAYMENT-REQUIRED response header. The amount reflects the requested tool metering class.'
      : 'Payment Required: API-key credit or quota balance is insufficient.';
    responses['402'] = paymentResponse;
    x402Mcp.responses = responses;
  }

  if (!config.mcpMppEnabled || !x402Mcp) {
    delete document.paths['/api/mcp/mpp'];
    return document;
  }

  const mppMcp = JSON.parse(JSON.stringify(x402Mcp)) as JsonObject;
  mppMcp.operationId = 'mppMcpPreTradeSafetyCheck';
  mppMcp.summary = 'MPP-paid pre-trade safety check over MCP';
  mppMcp.description =
    'MPP pilot endpoint for the pre_trade_safety_check tool only. Payment is bound to the tool ' +
    'name and canonicalized arguments; validation happens before execution and settlement happens ' +
    'only after a successful tool result. MCP reports payment-required as JSON-RPC error -32042 ' +
    'with data.httpStatus=402; Streamable HTTP may carry that JSON-RPC response with HTTP 200.';
  delete mppMcp['x-x402-payment-info'];
  mppMcp['x-payment-info'] = { offers: [mppOffer(config)] };
  addMcpPaymentNameConstraint(mppMcp);

  const responses = object(mppMcp.responses);
  const successResponse = object(responses['200']);
  successResponse.description =
    'Successful JSON-RPC response. MPP-paid tool results include the receipt in result._meta["org.paymentauth/receipt"].';
  responses['200'] = successResponse;
  responses['402'] = {
    description:
      'MPP Payment Required at the MCP protocol level: JSON-RPC error -32042 with the challenge in error.data.challenges and data.httpStatus=402.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            jsonrpc: { type: 'string', const: '2.0' },
            id: { type: ['integer', 'string'] },
            error: { type: 'object', properties: { code: { const: -32042 } } },
          },
        },
      },
    },
  };
  mppMcp.responses = responses;
  document.paths['/api/mcp/mpp'] = { post: mppMcp };
  return document;
}
