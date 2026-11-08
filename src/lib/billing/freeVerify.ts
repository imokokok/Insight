/**
 * Verification price rule: signing is paid, verification is free unless it
 * needs a live upstream/on-chain read. The three offline evidence kinds
 * (pure signature + digest + embedded snapshot) are free on every surface.
 *
 * `MCP_FREE_VERIFY_KINDS` can be emptied to charge every kind again, which
 * restores the strictly-$0.004 behaviour without touching any other code.
 */
const DEFAULT_FREE_VERIFY_KINDS = ['execution_pair', 'base_agent_swap', 'solana_swap'] as const;

/**
 * Parsed allowlist, memoised on the raw env value. `isFreeVerifyCall` runs on
 * every MCP call, so re-splitting the same string per call is wasted work.
 */
let cachedRawKinds: string | undefined;
let cachedKinds: string[] = [...DEFAULT_FREE_VERIFY_KINDS];

function parseFreeKinds(): string[] {
  const raw = process.env.MCP_FREE_VERIFY_KINDS;
  if (raw === cachedRawKinds) return cachedKinds;
  cachedRawKinds = raw;
  cachedKinds =
    raw === undefined
      ? [...DEFAULT_FREE_VERIFY_KINDS]
      : raw
          .split(',')
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0);
  return cachedKinds;
}

/** Legacy tool names, each mapped to the offline kind it verifies. */
const LEGACY_FREE_VERIFY_TOOL_KINDS: ReadonlyMap<string, string> = new Map([
  ['verify_execution_pair', 'execution_pair'],
  ['verify_base_agent_swap_guard_settlement', 'base_agent_swap'],
  ['verify_solana_swap_guard_settlement', 'solana_swap'],
]);

/**
 * True when this call verifies an offline artifact and must not create a 402.
 * Accepts both the unified `verify_evidence` tool (dispatch by `kind`) and the
 * legacy per-kind tool names still callable during the compatibility window.
 * The legacy names go through the same allowlist: an override that empties
 * MCP_FREE_VERIFY_KINDS must restore billing for every surface, otherwise the
 * documented kill switch silently leaves three tool names free.
 */
export function isFreeVerifyCall(toolName: string, args?: unknown): boolean {
  const legacyKind = LEGACY_FREE_VERIFY_TOOL_KINDS.get(toolName);
  if (legacyKind !== undefined) return parseFreeKinds().includes(legacyKind);
  const record = (args ?? {}) as { kind?: unknown; op?: unknown };
  const isVerifyEvidence =
    toolName === 'verify_evidence' ||
    (toolName === 'trade_proof' && record.op === 'verify_evidence');
  if (!isVerifyEvidence) return false;
  return typeof record.kind === 'string' && parseFreeKinds().includes(record.kind);
}
