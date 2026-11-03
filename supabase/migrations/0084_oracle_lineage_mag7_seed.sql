-- 0084: oracle_lineage seed — Mag-7 first-weekend replay sample v3 (first real rows)
--
-- 第一批真实谱系数据：Aave V4 Base Mag-7 市场（样本 ID aave-v4-base-mag7-firstweekend-replay-v1），
-- 窗口 [51795727, 51910927)（上线后首个周末重定价窗口，含 Sun 20:00 ET 重开）。
-- 来源：回放样本 v3 —— 全部接线要素由链上直读核验（adapter.getReserveSource /
-- spoke.getReserve / feed 代理与 aggregator 直读 / 逐块 getReservesPrices 扫描），
-- confidence 全部 onchain-verified。
--   * 区间内接线恒定（逐块扫描确认切换块均在重开后 11-27 块，接线本身无变更）；
--     故本迁移只种 edges，不伪造 events（events 由真实变更事件产生，窗口内为零）。
--   * market_params 仅断言可证事实（窗口内市场活跃）；LTV/阈值来自二手风险提案，
--     不入 onchain-verified 行。
--   * 幂等：WHERE NOT EXISTS 判重后插入，可重放。

BEGIN;

INSERT INTO "public"."oracle_lineage_edges"
  (market_key, chain, block_from, block_to, feed_id, feed_addr, proxy_addr, aggregator_addr,
   adapter_addr, adapter_semantics, market_params, evidence_ref, evidence_kind, confidence, collector_version)
SELECT * FROM (VALUES
  ('aave-v4-base-mag7-AAPLc','base',51795727,51910928,'AAPLc/USD',
   NULL,'0x787f13dea48db0897cbccdd985de77809d837f988','0xc37b6f754e90d4cca1f533f5a08f7d532b3d0d9d'::text,
   '0xabaf048fd7675ea34a84332371ffd5d55e322a47'::text,
   '{"type":"read-through-multiasset","source_index":0,"resume_switch_block":51882154,"frozen_price":341.513,"resume_price":340.24}'::jsonb,
   '{"active":true}'::jsonb,
   'sample:aave-v4-base-mag7-firstweekend-replay-v1@v3 (data/adapter-switch-v3.json, data/reserve-bindings-v3.json)','replay_report','onchain-verified','sample-v3'),
  ('aave-v4-base-mag7-AMZNc','base',51795727,51910928,'AMZNc/USD',
   NULL,'0x06a8e4b3abb3b7543d8396fb2b763d22820cb295','0x4816cb7ee43ee12c0bc9d3c597246f34d5cfdb7c'::text,
   '0xabaf048fd7675ea34a84332371ffd5d55e322a47'::text,
   '{"type":"read-through-multiasset","source_index":1,"resume_switch_block":51882144,"frozen_price":249.65,"resume_price":249.5}'::jsonb,
   '{"active":true}'::jsonb,
   'sample:aave-v4-base-mag7-firstweekend-replay-v1@v3 (data/adapter-switch-v3.json)','replay_report','onchain-verified','sample-v3'),
  ('aave-v4-base-mag7-GOOGLc','base',51795727,51910928,'GOOGLc/USD',
   NULL,'0x5bf49e0ffa937ce2fff033c739ad7c634c4d34f2','0x6bf33b7855eb8047dde206d9f6321d7d02cfb308'::text,
   '0xabaf048fd7675ea34a84332371ffd5d55e322a47'::text,
   '{"type":"read-through-multiasset","source_index":2,"resume_switch_block":51882150,"frozen_price":343.39445,"resume_price":343.35444}'::jsonb,
   '{"active":true}'::jsonb,
   'sample:aave-v4-base-mag7-firstweekend-replay-v1@v3 (data/adapter-switch-v3.json)','replay_report','onchain-verified','sample-v3'),
  ('aave-v4-base-mag7-METAc','base',51795727,51910928,'METAc/USD',
   NULL,'0x6526ae6797a76123638b863aee4d27ba4e4b27d','0xa7155928bee40052efb3094a046c5498202fd3ee'::text,
   '0xabaf048fd7675ea34a84332371ffd5d55e322a47'::text,
   '{"type":"read-through-multiasset","source_index":3,"resume_switch_block":51882144,"frozen_price":749.0,"resume_price":746.73}'::jsonb,
   '{"active":true}'::jsonb,
   'sample:aave-v4-base-mag7-firstweekend-replay-v1@v3 (data/adapter-switch-v3.json)','replay_report','onchain-verified','sample-v3'),
  ('aave-v4-base-mag7-MSFTc','base',51795727,51910928,'MSFTc/USD',
   NULL,'0xeb10a6c9aa7e537aed766c08c35dae35b321b18c','0xd72b34be6c2180ad0d28dbb415aefe8a55f3ed3'::text,
   '0xabaf048fd7675ea34a84332371ffd5d55e322a47'::text,
   '{"type":"read-through-multiasset","source_index":4,"resume_switch_block":51882139,"frozen_price":517.948,"resume_price":516.99}'::jsonb,
   '{"active":true}'::jsonb,
   'sample:aave-v4-base-mag7-firstweekend-replay-v1@v3 (data/adapter-switch-v3.json)','replay_report','onchain-verified','sample-v3'),
  ('aave-v4-base-mag7-NVDAc','base',51795727,51910928,'NVDAc/USD',
   NULL,'0x04689a41629776563e6822f76f2e57d148d28513','0xf72b1eb5932800f3d2a5eec5f99e6cd586479675'::text,
   '0xabaf048fd7675ea34a84332371ffd5d55e322a47'::text,
   '{"type":"read-through-multiasset","source_index":5,"resume_switch_block":51882138,"frozen_price":225.41045,"resume_price":225.125}'::jsonb,
   '{"active":true}'::jsonb,
   'sample:aave-v4-base-mag7-firstweekend-replay-v1@v3 (data/adapter-switch-v3.json)','replay_report','onchain-verified','sample-v3'),
  ('aave-v4-base-mag7-TSLAc','base',51795727,51910928,'TSLAc/USD',
   NULL,'0xfaf869185383a24f8cb00e27bda6b63b9905dcb4','0x0288234d9311c33be6c3a34b051bff8a799daa82'::text,
   '0xabaf048fd7675ea34a84332371ffd5d55e322a47'::text,
   '{"type":"read-through-multiasset","source_index":6,"resume_switch_block":51882152,"frozen_price":372.3664,"resume_price":372.74}'::jsonb,
   '{"active":true}'::jsonb,
   'sample:aave-v4-base-mag7-firstweekend-replay-v1@v3 (data/adapter-switch-v3.json)','replay_report','onchain-verified','sample-v3'),
  ('aave-v4-base-mag7-USDC','base',51795727,51910928,'USDC/USD',
   NULL,'0xc7d0f8dcc1f860ca752054c59ea82ba2a5aab50c',NULL,
   '0xabaf048fd7675ea34a84332371ffd5d55e322a47'::text,
   '{"type":"read-through-multiasset","source_index":7,"capped_feed":true,"note":"no independent aggregator; no AnswerUpdated events in window; adapter value differs across snapshots (see sample v2 report)"}'::jsonb,
   '{"active":true}'::jsonb,
   'sample:aave-v4-base-mag7-firstweekend-replay-v1@v3 (REPORT.md section 2/4)','replay_report','onchain-verified','sample-v3')
) AS seed(market_key, chain, block_from, block_to, feed_id, feed_addr, proxy_addr, aggregator_addr,
          adapter_addr, adapter_semantics, market_params, evidence_ref, evidence_kind, confidence, collector_version)
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."oracle_lineage_edges" e
  WHERE e.market_key = seed.market_key AND e.chain = seed.chain AND e.block_from = seed.block_from
);

-- 附加一条样本窗口的 market_observed 事件？否——events 表语义是"接线变更事件"，
-- 窗口内接线无变更，空集是正确状态。此处留注释说明，防止后续误补合成事件。

COMMIT;
