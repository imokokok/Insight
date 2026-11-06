#!/usr/bin/env node
// Thin launcher for the hosted Insight MCP server. It keeps the endpoint URL
// and the bounded attribution label out of every agent config while delegating
// the stdio <-> streamable-HTTP bridge to the published mcp-remote package.
// It has no Insight source dependency and never handles a private key.
//
// This is a CLI entry point, not a module. It runs unconditionally on load,
// which is what makes it work through npm's .bin symlinks and Windows shims.
// Importable logic lives in lib/remote-args.mjs.

import { spawn } from 'node:child_process';

import { buildRemoteArgs, resolveProxy } from '../lib/remote-args.mjs';

const args = buildRemoteArgs(process.env, process.argv.slice(2));

let proxy;
try {
  proxy = resolveProxy();
} catch (error) {
  console.error(
    `[insight-mcp] cannot locate mcp-remote. Reinstall oracle-insight-mcp: ${error.message}`
  );
  process.exit(1);
}

const child = spawn(process.execPath, [proxy, ...args], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 1);
  }
});

child.on('error', (error) => {
  console.error(`[insight-mcp] failed to start mcp-remote: ${error.message}`);
  process.exit(1);
});
