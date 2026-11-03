-- Migration 0083: service-role grants for lineage + manip-cost tables
--
-- 0082 建表时按新云默认未自动暴露给 Data API（config.toml: auto-exposure removed）。
-- 按家规（0061 security_boundary_hardening 模式）显式授予 service_role：
-- 谱系表 = 采集器/回放写入 + service 读取；manip_cost 快照表 = GH Actions 采集器写入。
-- anon / authenticated 保持零授权（RLS enable + 无 policy + 无 grant = 拒绝）。

BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.oracle_lineage_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.oracle_lineage_edges TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.manip_cost_pool_snapshots TO service_role;

GRANT USAGE ON SEQUENCE public.oracle_lineage_events_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.oracle_lineage_edges_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.manip_cost_pool_snapshots_id_seq TO service_role;

COMMIT;
