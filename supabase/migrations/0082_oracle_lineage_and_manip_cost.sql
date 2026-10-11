-- Migration 0082: oracle lineage registry + manipulation-cost pool snapshots
--
-- 地基块①（预言机依赖谱系）与块②（DEX 池深度→操纵成本）的存储层。
-- 依据：insight-foundation-enrichment-2026-10-11（地基扩展报告）+ oracle-lineage-v0 草案。
--
-- Design:
--   * oracle_lineage_events / oracle_lineage_edges —— 接线是主语，参数是属性。
--     events 是原始变更记录（每行强制 tx_hash 或治理帖出处）；edges 是由 events
--     推导的区间树快照（可复算 = 可审计）。Mag-7 样本回放时逐段填充。
--   * manip_cost_pool_snapshots —— 每池每快照的深度状态 + 闭式成本曲线
--     （arXiv:2606.03548 单向精确解）。与 market_reference_snapshots 同款采集器
--     模式（GitHub Actions，fail-closed，COLLECTOR_VERSION pinned）。
--     纪律沿用：evidence 层，不进 verdict 门，不进签名 receipt（先 advisory）。
--   * 全部表 RLS enable、无 policy —— service-role 专用，anon/authenticated 拒绝
--     （与 0061 security_boundary_hardening 后的姿态一致）。
--   * 谱系表永久保留（注册表性质，不做清理 cron）；快照表 365 天保留
--     （操纵成本 × 偏离的联合分布要长窗口，比 market_reference 的 180 天长）。
--   * 全语句幂等（IF NOT EXISTS / OR REPLACE），可重放。

BEGIN;

-- btree_gist：edges 的 EXCLUDE 约束需要 text 列参与 gist
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- ============================================================
-- Table 1: oracle_lineage_events —— 接线/参数变更的原始事件
-- ============================================================
CREATE TABLE IF NOT EXISTS "public"."oracle_lineage_events" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "market_key" text NOT NULL,
    "chain" text NOT NULL,
    "block_number" bigint,
    "block_time" timestamp with time zone,
    "event_kind" text NOT NULL,
    "old_value" jsonb,
    "new_value" jsonb NOT NULL,
    "tx_hash" text,
    "source_url" text,
    "collector_version" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "oracle_lineage_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "oracle_lineage_events_provenance_check"
        CHECK ("tx_hash" IS NOT NULL OR "source_url" IS NOT NULL)
);

ALTER TABLE "public"."oracle_lineage_events" OWNER TO "postgres";

COMMENT ON TABLE "public"."oracle_lineage_events" IS 'Raw oracle-lineage change events (feed_set / param_change / aggregator_rotated / market_created / market_frozen). Every row must carry a tx_hash or a governance source_url. Populated by the Mag-7 sample replay and later by importers.';

CREATE INDEX IF NOT EXISTS "lineage_ev_market_block_idx"
    ON "public"."oracle_lineage_events" USING "btree" ("market_key", "chain", "block_number");

-- ============================================================
-- Table 2: oracle_lineage_edges —— 接线区间树（feed→proxy→aggregator→adapter）
-- ============================================================
CREATE TABLE IF NOT EXISTS "public"."oracle_lineage_edges" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "market_key" text NOT NULL,
    "chain" text NOT NULL,
    "block_from" bigint NOT NULL,
    "block_to" bigint,
    "feed_id" text,
    "feed_addr" text,
    "proxy_addr" text,
    "aggregator_addr" text,
    "adapter_addr" text,
    "adapter_semantics" jsonb,
    "market_params" jsonb,
    "evidence_ref" text NOT NULL,
    "evidence_kind" text NOT NULL,
    "confidence" text NOT NULL DEFAULT 'secondary',
    "collector_version" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "oracle_lineage_edges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "oracle_lineage_edges_no_overlap" EXCLUDE USING gist (
        "market_key" WITH =,
        "chain" WITH =,
        int4range("block_from"::int, "block_to"::int, '[)') WITH &&
    )
);

ALTER TABLE "public"."oracle_lineage_edges" OWNER TO "postgres";

COMMENT ON TABLE "public"."oracle_lineage_edges" IS 'Oracle wiring snapshot per (market, chain) over a block interval: feed -> proxy -> aggregator -> adapter, with same-period market params. Non-overlapping interval tree per market (EXCLUDE constraint). block_to NULL = current row.';
COMMENT ON COLUMN "public"."oracle_lineage_edges"."adapter_semantics" IS 'Adapter wrapper semantics, e.g. {"type":"capo"|"oev"|"multiplier"|"passthrough","params":{...},"known_pitfalls":[...]}. The Moonwell cbETH (ratio-as-USD) and Aave CAPO wstETH lessons live here — the wiring is the risk surface, not the parameters.';
COMMENT ON COLUMN "public"."oracle_lineage_edges"."confidence" IS 'onchain-verified | secondary | inferred. Rows without on-chain verification must not back signed verdicts.';

CREATE INDEX IF NOT EXISTS "lineage_market_time_idx"
    ON "public"."oracle_lineage_edges" USING "btree" ("market_key", "chain", "block_from" DESC);
CREATE INDEX IF NOT EXISTS "lineage_adapter_type_idx"
    ON "public"."oracle_lineage_edges" USING "gin" ("adapter_semantics");

-- ============================================================
-- Table 3: manip_cost_pool_snapshots —— 池深度 × 操纵成本曲线时序
-- ============================================================
CREATE TABLE IF NOT EXISTS "public"."manip_cost_pool_snapshots" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "snapshot_ts" timestamp with time zone NOT NULL,
    "pool_key" text NOT NULL,
    "chain" text NOT NULL DEFAULT 'ethereum',
    "pool_addr" text NOT NULL,
    "dex" text NOT NULL,
    "fee_tier" text,
    "block_number" bigint,
    "mid_price" double precision,
    "tvl_usd" double precision,
    "eth_usd_mid" double precision,
    "pool_state" jsonb,
    "cost_curve" jsonb,
    "is_success" boolean NOT NULL,
    "error_message" text,
    "collector_version" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "manip_cost_pool_snapshots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "manip_cost_pool_snapshots_unique" UNIQUE ("snapshot_ts", "pool_key")
);

ALTER TABLE "public"."manip_cost_pool_snapshots" OWNER TO "postgres";

COMMENT ON TABLE "public"."manip_cost_pool_snapshots" IS 'Per-pool depth state + closed-form manipulation cost curve (USD to move pool price by r%). Fail-closed: a failed fetch writes only an error row, never a stale estimate. Single-pool grain in v0; multi-pool feed aggregation is a downstream view/collector concern.';
COMMENT ON COLUMN "public"."manip_cost_pool_snapshots"."pool_state" IS 'Raw on-chain state for reproducibility: reserves (v2) or sqrtPriceX96 + liquidity (v3), token symbols/decimals.';
COMMENT ON COLUMN "public"."manip_cost_pool_snapshots"."cost_curve" IS 'Array of {move_pct, up_usd, down_usd, up_roundtrip_fee_usd, down_roundtrip_fee_usd, within_range_assumed}. v3 values are lower bounds when the move may cross the active tick range (no tick data in v0).';
COMMENT ON COLUMN "public"."manip_cost_pool_snapshots"."eth_usd_mid" IS 'ETH/USD mid derived the same round (cross-pool), for converting non-USD quote legs. NULL when unavailable.';

CREATE INDEX IF NOT EXISTS "manip_cost_pool_ts_idx"
    ON "public"."manip_cost_pool_snapshots" USING "btree" ("pool_key", "snapshot_ts" DESC);
CREATE INDEX IF NOT EXISTS "manip_cost_ts_idx"
    ON "public"."manip_cost_pool_snapshots" USING "btree" ("snapshot_ts" DESC);

-- Retention: 365 days (joint distribution of depth history x feed deviation wants a
-- long window; deliberately longer than market_reference_snapshots' 180 days).
SELECT cron.unschedule('manip-cost-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'manip-cost-cleanup');
SELECT cron.schedule('manip-cost-cleanup', '50 4 * * *', $$
  DELETE FROM public.manip_cost_pool_snapshots WHERE snapshot_ts < now() - interval '365 days';
$$);

-- ============================================================
-- RLS: 全部三表 enable、无 policy —— service-role 专用
-- ============================================================
ALTER TABLE "public"."oracle_lineage_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."oracle_lineage_edges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."manip_cost_pool_snapshots" ENABLE ROW LEVEL SECURITY;

COMMIT;
