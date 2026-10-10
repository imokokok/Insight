#!/usr/bin/env node
// Post-deploy live smoke for the two pay-per-call rails (x402 + MPP).
//
// Runs against production after a gated deploy and asserts only the
// challenge-issuing path — no payment is made and no funds move:
//   1. REST pre-trade: HTTP 402 must carry the x402 quote (PAYMENT-REQUIRED)
//      and, when MPP is enabled, an MPP `Payment` challenge in
//      WWW-Authenticate bound to the request URL.
//   2. MCP pre-trade: an unpaid tools/call must fail with a JSON-RPC 402
//      challenge whose scope binds the tool name and arguments.
//
// Configuration:
//   SMOKE_BASE_URL    Base URL to probe (default https://www.oracleinsight.xyz)
//   SMOKE_EXPECT_MPP  'false' skips MPP assertions (set when MPP is
//                     intentionally disabled on the deployment; default 'true')

const BASE_URL = (process.env.SMOKE_BASE_URL ?? 'https://www.oracleinsight.xyz').replace(/\/$/, '');
const EXPECT_MPP = process.env.SMOKE_EXPECT_MPP !== 'false';
const ATTEMPTS = Number(process.env.SMOKE_ATTEMPTS ?? 3);

const PRE_TRADE_URL = `${BASE_URL}/api/v1/safety/pre-trade?asset=ETH&chainId=1&action=swap&tradeAmountUsd=1000`;
const MCP_URL = `${BASE_URL}/api/mcp/mpp`;

const failures = [];

function fail(probe, message) {
  failures.push(`[${probe}] ${message}`);
}

async function fetchWithRetry(url, init, probe) {
  let lastError;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
      // Retry rate-limit answers once per attempt loop; anything else returns.
      if (response.status === 429 && attempt < ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
    }
  }
  throw new Error(
    `[${probe}] request failed after ${ATTEMPTS} attempts: ${lastError?.message ?? lastError}`
  );
}

async function smokeRestRail() {
  const response = await fetchWithRetry(
    PRE_TRADE_URL,
    { method: 'GET', headers: { accept: 'application/json' } },
    'rest'
  );
  if (response.status !== 402) {
    fail('rest', `expected HTTP 402 challenge, got ${response.status}`);
    return;
  }

  const x402Quote = response.headers.get('payment-required');
  if (!x402Quote) fail('rest', 'missing x402 PAYMENT-REQUIRED header on 402');

  if (!EXPECT_MPP) {
    console.log('[rest] x402 challenge present; MPP assertions skipped (SMOKE_EXPECT_MPP=false)');
    return;
  }

  const wwwAuth = response.headers.get('www-authenticate');
  if (!wwwAuth) {
    fail('rest', 'missing MPP WWW-Authenticate challenge on 402');
    return;
  }
  if (!/^\s*Payment\b/i.test(wwwAuth))
    fail('rest', `WWW-Authenticate is not the MPP Payment scheme: ${wwwAuth.slice(0, 80)}`);
  if (!/method="evm"/.test(wwwAuth)) fail('rest', 'MPP challenge does not declare method="evm"');
  if (!/intent="charge"/.test(wwwAuth))
    fail('rest', 'MPP challenge does not declare intent="charge"');

  let opaque;
  const opaqueMatch = wwwAuth.match(/opaque="([^"]+)"/);
  if (opaqueMatch) {
    try {
      opaque = JSON.parse(Buffer.from(opaqueMatch[1], 'base64').toString('utf8'));
    } catch {
      fail('rest', 'MPP challenge opaque is not decodable base64 JSON');
    }
    if (opaque && typeof opaque._mppx_scope !== 'string') {
      fail('rest', 'MPP challenge opaque lacks the _mppx_scope URL binding');
    } else if (opaque && !opaque._mppx_scope.startsWith(PRE_TRADE_URL)) {
      fail('rest', `MPP challenge scope is not bound to the request URL: ${opaque._mppx_scope}`);
    }
  } else {
    fail('rest', 'MPP challenge has no opaque scope binding');
  }

  console.log(`[rest] 402 dual-challenge OK (x402 + MPP, scope=${opaque?._mppx_scope ?? 'n/a'})`);
}

async function smokeMcpRail() {
  const headers = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  };

  const initResponse = await fetchWithRetry(
    MCP_URL,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'insight-live-smoke', version: '0.0.1' },
        },
      }),
    },
    'mcp'
  );
  if (initResponse.status !== 200) {
    fail('mcp', `initialize failed: HTTP ${initResponse.status}`);
    return;
  }
  const sessionId = initResponse.headers.get('mcp-session-id');
  if (sessionId) headers['mcp-session-id'] = sessionId;

  const callResponse = await fetchWithRetry(
    MCP_URL,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'pre_trade_safety_check', arguments: { asset: 'ETH' } },
      }),
    },
    'mcp'
  );

  const bodyText = await callResponse.text();
  let payload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    fail('mcp', `tools/call returned non-JSON body: ${bodyText.slice(0, 120)}`);
    return;
  }

  const error = payload?.error;
  if (!error) {
    fail('mcp', `unpaid tools/call unexpectedly succeeded: ${bodyText.slice(0, 120)}`);
    return;
  }
  if (error.code !== -32042 && error.data?.httpStatus !== 402) {
    fail(
      'mcp',
      `expected a 402 payment challenge error, got code=${error.code}: ${String(error.message).slice(0, 120)}`
    );
    return;
  }

  if (!EXPECT_MPP) {
    console.log(
      '[mcp] unpaid call correctly rejected; MPP challenge assertions skipped (SMOKE_EXPECT_MPP=false)'
    );
    return;
  }

  const challenge = error.data?.challenges?.[0];
  if (!challenge) {
    fail('mcp', '402 error carries no challenge');
    return;
  }
  if (challenge.method !== 'evm' || challenge.intent !== 'charge') {
    fail('mcp', `unexpected challenge method/intent: ${challenge.method}/${challenge.intent}`);
  }
  const scope = challenge.meta?._mppx_scope;
  if (typeof scope !== 'string' || !scope.startsWith('mcp:pre_trade_safety_check:')) {
    fail('mcp', `challenge scope is not bound to the tool call: ${scope ?? 'missing'}`);
  }

  console.log(`[mcp] 402 challenge OK (scope=${scope ?? 'n/a'})`);
}

try {
  await smokeRestRail();
  await smokeMcpRail();
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
}

if (failures.length > 0) {
  console.error(`Live payment-rail smoke FAILED:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('Live payment-rail smoke passed.');
