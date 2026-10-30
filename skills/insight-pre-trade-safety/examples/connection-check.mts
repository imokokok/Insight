/**
 * No-money MCP discovery check. Requires Node 22+.
 * It never calls tools/call, requests payment, or touches a wallet.
 */
type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('MCP returned a non-object JSON response');
  return value as JsonRecord;
}

async function request(method: string, params?: JsonRecord): Promise<JsonRecord> {
  const response = await fetch('https://www.oracleinsight.xyz/api/mcp', {
    method: 'POST',
    headers: { Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${method}-${crypto.randomUUID()}`,
      method,
      ...(params ? { params } : {}),
    }),
  });
  if (!response.ok) throw new Error(`${method} returned HTTP ${response.status}`);
  const payload = record(await response.json());
  if (payload.jsonrpc !== '2.0' || ('error' in payload && payload.error))
    throw new Error(`${method} returned an MCP error`);
  return payload;
}

async function notifyInitialized(): Promise<void> {
  const response = await fetch('https://www.oracleinsight.xyz/api/mcp', {
    method: 'POST',
    headers: { Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  });
  if (!response.ok) throw new Error(`notifications/initialized returned HTTP ${response.status}`);
}

const initialized = await request('initialize', {
  protocolVersion: '2025-11-25',
  capabilities: {},
  clientInfo: { name: 'insight-skill-connection-check', version: '0.2.0' },
});
const serverInfo = record(record(initialized.result).serverInfo);
await notifyInitialized();
const listed = await request('tools/list');
const tools = record(listed.result).tools;
if (!Array.isArray(tools)) throw new Error('tools/list did not return a tools array');
console.log(
  `Insight discovery reachable: ${String(serverInfo.name)} ${String(serverInfo.version)}; ${tools.length} tools listed; no paid tool called`
);
