// Minimal dependency-free .env.local loader so the verify script runs against
// the same RPC config (including Alchemy) as the production app. Must be
// imported before any module that reads process.env at load time.
import { readFileSync } from 'fs';

try {
  const txt = readFileSync('.env.local', 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val && !process.env[key]) process.env[key] = val;
  }
  console.log('[loadEnv] loaded .env.local');
} catch {
  console.log('[loadEnv] .env.local not found; using public RPC fallbacks only');
}
