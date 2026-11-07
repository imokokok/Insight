/**
 * Verification price rule: signing is paid, verification is free unless it
 * needs a live upstream/on-chain read. The three offline evidence kinds
 * (pure signature + digest + embedded snapshot) are free on every surface.
 *
 * `MCP_FREE_VERIFY_KINDS` can be emptied to charge every kind again, which
 * restores the strictly-$0.004 behaviour without touching any other code.
 */
const DEFAULT_FREE_VERIFY_KINDS = ['execution_pair', 'base_agent_swap', 'solana_swap'] as const;

function parseFreeKinds(): string[] {
  const raw = process.env.MCP_FREE_VERIFY_KINDS;
  if (raw === undefined) return [...DEFAULT_FREE_VERIFY_KINDS];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/** Legacy tool names that map to one of the offline verification kinds. */
const LEGACY_FREE_VERIFY_TOOLS = new Set([
  'verify_execution_pair',
  'verify_base_agent_swap_guard_settlement',
  'verify_solana_swap_guard_settlement',
]);

/**
 * True when this call verifies an offline artifact and must not create a 402.
 * Accepts both the unified `verify_evidence` tool (dispatch by `kind`) and the
 * legacy per-kind tool names still callable during the compatibility window.
 */
export function isFreeVerifyCall(toolName: string, args?: unknown): boolean {
  if (LEGACY_FREE_VERIFY_TOOLS.has(toolName)) return true;
  if (toolName !== 'verify_evidence') return false;
  const kind = (args as { kind?: unknown } | undefined)?.kind;
  return typeof kind === 'string' && parseFreeKinds().includes(kind);
}
