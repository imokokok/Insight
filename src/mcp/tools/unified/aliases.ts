/**
 * @fileoverview Deprecated-name aliases for the four consolidated product tools.
 *
 * Deliberately kept OUT of `LEGACY_MCP_TOOLS` in ./runtime.ts: that registry is
 * removed wholesale on `LEGACY_TOOL_REMOVAL_DATE` (2027-01-06), and folding the
 * alias names into it would hand permanent compatibility names an expiry date.
 * Aliases here carry no removal date; they are a stable convenience surface.
 *
 * Every alias canonicalizes onto one product tool plus an `op` selector, so a
 * single dispatch path, price lookup, payment scope, audit row and settlement
 * resource row serves both spellings. Adding a per-alias billing or x402 scope
 * would make Bazaar list the old name as an independent resource; callers must
 * be canonicalized at the JSON-RPC boundary instead.
 */

export type ProductToolName =
  | 'trade_guard'
  | 'trade_proof'
  | 'oracle_watch_window'
  | 'position_lifecycle';

export const TRADE_GUARD_OPS = [
  'oracle_price',
  'price_analytics',
  'oracle_health',
  'search_registry',
  'market_quote',
  'check_safety',
  'prepare_swap',
  'prepare_perp_order',
] as const;

export const TRADE_PROOF_OPS = ['begin_evidence', 'issue_receipt', 'verify_evidence'] as const;

export const ORACLE_WATCH_WINDOW_OPS = ['snapshot', 'history', 'begin', 'poll', 'close'] as const;

export const POSITION_LIFECYCLE_OPS = ['begin', 'guard', 'receipt', 'close'] as const;

export const PRODUCT_TOOL_OPS: Readonly<Record<ProductToolName, readonly string[]>> = {
  trade_guard: TRADE_GUARD_OPS,
  trade_proof: TRADE_PROOF_OPS,
  oracle_watch_window: ORACLE_WATCH_WINDOW_OPS,
  position_lifecycle: POSITION_LIFECYCLE_OPS,
};

export interface ToolAlias {
  /** Canonical product tool that serves this deprecated name. */
  readonly tool: ProductToolName;
  /** Op selector the alias resolves to; may depend on the caller's arguments. */
  readonly op: (args: unknown) => string;
  /** Representative op used in the deprecation notice. */
  readonly preferredOp: string;
}

function recordOf(args: unknown): Record<string, unknown> {
  return args !== null && typeof args === 'object' && !Array.isArray(args)
    ? (args as Record<string, unknown>)
    : {};
}

function fixedOp(op: string): (args: unknown) => string {
  return () => op;
}

/**
 * `oracle_watch` folded a `snapshot`|`history` selector into one tool. Preserve
 * the caller's selector; an omitted selector defaults to `snapshot`, matching
 * the old schema. Anything unknown is passed through so validation rejects it.
 */
function oracleWatchOp(args: unknown): string {
  const op = recordOf(args).op;
  if (op === undefined) return 'snapshot';
  return typeof op === 'string' ? op : 'snapshot';
}

/** `oracle_watch_window_control` required `poll`|`close`; never invent an op. */
function oracleWatchControlOp(args: unknown): string {
  const op = recordOf(args).op;
  return typeof op === 'string' && op.length > 0 ? op : '__missing_op__';
}

/** `position_lifecycle_step` required `guard`|`receipt`|`close`. */
function positionLifecycleStepOp(args: unknown): string {
  const op = recordOf(args).op;
  return typeof op === 'string' && op.length > 0 ? op : '__missing_op__';
}

/**
 * The 16 deprecated names, each mapped to its product tool and op selector.
 * Five names also exist in the legacy registry (`get_oracle_price`,
 * `get_oracle_health`, `oracle_watch`, `oracle_watch_window_begin`,
 * `position_lifecycle_begin`); the legacy profile routes those to the real
 * legacy implementation before canonicalization is considered.
 */
export const MCP_TOOL_ALIASES: Readonly<Record<string, ToolAlias>> = {
  get_oracle_price: { tool: 'trade_guard', op: fixedOp('oracle_price'), preferredOp: 'oracle_price' },
  get_price_analytics: {
    tool: 'trade_guard',
    op: fixedOp('price_analytics'),
    preferredOp: 'price_analytics',
  },
  get_oracle_health: { tool: 'trade_guard', op: fixedOp('oracle_health'), preferredOp: 'oracle_health' },
  search_oracle_registry: {
    tool: 'trade_guard',
    op: fixedOp('search_registry'),
    preferredOp: 'search_registry',
  },
  get_market_quote: { tool: 'trade_guard', op: fixedOp('market_quote'), preferredOp: 'market_quote' },
  check_trade_safety: { tool: 'trade_guard', op: fixedOp('check_safety'), preferredOp: 'check_safety' },
  prepare_swap: { tool: 'trade_guard', op: fixedOp('prepare_swap'), preferredOp: 'prepare_swap' },
  prepare_perp_order: {
    tool: 'trade_guard',
    op: fixedOp('prepare_perp_order'),
    preferredOp: 'prepare_perp_order',
  },
  begin_trade_evidence: {
    tool: 'trade_proof',
    op: fixedOp('begin_evidence'),
    preferredOp: 'begin_evidence',
  },
  issue_execution_receipt: {
    tool: 'trade_proof',
    op: fixedOp('issue_receipt'),
    preferredOp: 'issue_receipt',
  },
  verify_evidence: { tool: 'trade_proof', op: fixedOp('verify_evidence'), preferredOp: 'verify_evidence' },
  oracle_watch: { tool: 'oracle_watch_window', op: oracleWatchOp, preferredOp: 'snapshot' },
  oracle_watch_window_begin: {
    tool: 'oracle_watch_window',
    op: fixedOp('begin'),
    preferredOp: 'begin',
  },
  oracle_watch_window_control: {
    tool: 'oracle_watch_window',
    op: oracleWatchControlOp,
    preferredOp: 'poll',
  },
  position_lifecycle_begin: {
    tool: 'position_lifecycle',
    op: fixedOp('begin'),
    preferredOp: 'begin',
  },
  position_lifecycle_step: {
    tool: 'position_lifecycle',
    op: positionLifecycleStepOp,
    preferredOp: 'guard',
  },
};

export const ALIAS_TOOL_NAMES: ReadonlySet<string> = new Set(Object.keys(MCP_TOOL_ALIASES));

export interface CanonicalToolCall {
  /** Canonical product tool name. */
  readonly name: ProductToolName;
  /** Arguments with the resolved `op` selector injected. */
  readonly args: Record<string, unknown>;
}

/**
 * Canonicalize a deprecated name onto its product tool, injecting the op
 * selector so downstream pricing, scope, audit and dispatch all see one shape.
 * Returns null for names that are not aliases; callers keep the original call.
 */
export function canonicalizeAlias(name: string, args: unknown): CanonicalToolCall | null {
  const alias = MCP_TOOL_ALIASES[name];
  if (alias === undefined) return null;
  return { name: alias.tool, args: { ...recordOf(args), op: alias.op(args) } };
}
