# VRT1 端到端原型（免费路线）

把 Insight 生产 `OracleSafetyCheck`（EIP-712 v2，26 字段）映射为 VRT1 §8 agent action，
组合双签名（内层 EIP-712/secp256k1 + 外层 BIP340 Schnorr），批量 Merkle，构造 49B OP_RETURN
锚定载荷，并全程离线验证。

对应合作：Insight × VERITAS（vrt1-spec，Tutankhamun）。事实源见
`.trae/veritas-collaboration/01-complete-history-and-technical-record.md` §5.4 / §10。

## 运行

```bash
node scripts/vrt1-e2e-prototype/prototype.mjs                 # 默认用 sample-receipt.json
node scripts/vrt1-e2e-prototype/prototype.mjs <receipt.json>  # 传入重签/其他 receipt
node scripts/vrt1-e2e-prototype/convergence-check.mjs         # 本地验收（3 负向量 + 正向量）
node scripts/vrt1-e2e-prototype/verify-against-vectors.mjs    # 对方 vectors 全量 byte-exact 对拍（最终验收）
node scripts/vrt1-e2e-prototype/resign-pilot.mjs --private-key <hex> [--out <path>]  # 9/2 重签
node scripts/vrt1-e2e-prototype/registry-snapshot.mjs         # 第二 record type 候选形态
```

依赖：`@noble/curves`（Schnorr/secp256k1）、`@noble/hashes`（sha256）、`viem`（EIP-712）、
`canonicalize`（RFC 8785 JCS，取自 `~/.workbuddy/insight_aps_demo/node_modules`）。

## 做了什么

1. **工具链自检**（必须先于一切）：用公开 vrt1-spec test vectors 做字节级对拍——
   - `test-vectors/agent_action.json`：canonical JSON（RFC 8785 字典序）、
     `action_id = tagged_hash("VRT1/agent-action", canonical)`、Schnorr 验签；
   - `test-vectors/merkle.json`：size=7 树的 Merkle root（RFC-6962 0x00/0x01 前缀 +
     Bitcoin 式奇数叶子复制，double-SHA256）；
   - `test-vectors/op_return.json`：49B OP_RETURN 载荷（`VRT1`|version|epoch(8BE)|leaf_count(4BE)|root(32)）。
2. **真实路径**：`sample-receipt.json`（生产 fresh receipt，uid `0x08e2d411…`）→
   26 字段入 `params.oracle_safety_check_v2`、EIP-712 签名/uid 入 `params.eip712_attestation`、
   verdict 入 `outcome`、`ts = checkedAt`（epoch = `floor(ts/600)` = 2979468）→
   外层 Schnorr 签名 → Merkle（单叶子 batch + 3 叶子含包含性证明演示）→ 49B OP_RETURN 载荷。
3. **离线验证**：外层 Schnorr 验签 + 内层 EIP-712 recover == attester + Merkle 包含性证明 + OP_RETURN 往返解析。
4. **§8.3 Nostr 包装（kind 1990）**：按 NIP-01 构造事件（tags 空数组、content = 明文 canonical JSON `{"action","sig"}`，与对方向量一致），外层 Nostr 事件签名验签 + `event.pubkey == action.agent` + 从 content 重验内层 action 签名（spec 强制三验）。
5. **负向量**：篡改 canonical → action_id 变化被拒；翻转 sig 字节 → Schnorr 拒绝；错误 leaf → 包含性证明拒绝。
6. **从链验证（live，只读）**：抓取 VERITAS 真实主网锚点 `92b2c4e4…5aafa0`（block 953,581），按 §5.1 解析其 OP_RETURN（tag/version/epoch/leaf_count/root），证明链上真实载荷与本构造器字节格式一致。若网络不可达则 SKIP（离线格式检查由 op_return 向量覆盖）。

产出：`vrt1-action.json`（record + action_id + canonical + 双签名 + Nostr 事件）、`anchor-epoch.json`（epoch/root/OP_RETURN + chain_verify）、`convergence-report.json`（收敛验收）。

## Canonical 编码规则（修正版 §5.2/§5.1，对方 2026-08-27 确认；单一事实源 = `vrt1-encoding.mjs`）

- **Class A hex 字节字段**（4 evidence hashes + `uid` + `attester` + EIP-712 `signature`）：
  **去 `0x` 前缀 + 全小写**。这是规范化一种编码。
- **CAIP-19 标识符**（`sourceAssetId`/`destinationAssetId`/`target`，如 `eip155:1/erc20:0xA0b8…`）：
  **字节原样、大小写保留**。`0x` 是标识符一部分、EIP-55 混合大小写携带意义，lowercase 是改标识符而非规范化。
- **uint256 → decimal string**（§5.1，如 `tradeAmountUsd: "10000000000"`）；`outcome.schema_version` 除外（number，与对方向量一致）。
- **aux_rand = 32 个零字节**（对方 8.27 规范：没有它你产出有效但不同的签名，追一个不是差异的差异）。
- **eip712_attestation envelope**：`{attester, signature, uid, signedAt, domain{name,version,chainId 字符串}, primary_type}`（无 verify_url，与对方向量一致）。
- **VRT1 agent key（原型 demo）**：`0x55..55`（对方发布的正向量密钥，可复现；非生产 key）。

**已收敛（byte-exact）**：canonical **1769 字节**、action_id **`157a3cb8…`**（与对方 `insight-vectors/` 完全一致）。
`verify-against-vectors.mjs` 对拍对方 5 个向量文件（action/merkle/op_return/nostr_1990/negative）：
正向量全部 byte-exact、5 个负向量全部被拒 → **BYTE-EXACT CONVERGED**。
`convergence-check.mjs` 本地验收（3 负向量 + 正向量复现）同步通过。

## 边界（诚实声明）

- **未广播我方批次**。本原型是免费路线：一切离线构造与验证，加上对 VERITAS 真实主网锚点的只读从链解析，不花一分钱。
  我方 receipt 的批次**没有 txid、没有 block 确认**；真实广播（主网或测试网）需一条锚定路径
  （对方锚定服务 / 我们自己的节点+UTXO），到那一步才谈成本（主网单批矿工费通常 1–3 美元，
  批量聚合后每 receipt 边际成本趋近 0）。
- **VRT1 agent key 是确定性演示密钥**（`0x55..55`，与对方发布的正向量一致，可复现），
  **不是**生产 EIP-712 attester 私钥，也不是正式 VRT1 agent key；正式 key 的派生/注册
  待与对方确认（对应 §5.4 或独立注册流程）。
- 映射形态已按对方 8.27 确认收敛：`insight.oracle-safety-check`（namespaced）、`target` = 资产对、
  26 字段连续 `params`（非 10/15 拆分）。**已与对方 canonical vectors byte-exact 对拍通过**
  （`verify-against-vectors.mjs`，18 项全过）。
- epoch 对齐：VRT1 epoch = 600s（§2.2）与 receipt `validUntil = checkedAt + 600s` 巧合对齐，
  原型以 `floor(checkedAt/600)` 取 epoch（本例 2979468）；该语义在 reserved type 注册时一并确认。
- 签名确定性：固定 aux_rand = 32 零字节（规范），保证重跑字节稳定。
- **9/2 时限项**：`sample-receipt.json` 用旧 key（validUntil 2026-09-02）签，9/2 后锚定会被
  verifier 拒；`resign-pilot.mjs` 用当前 key 重签（同 26 字段 + 新时间戳，uid/action_id 随之变化）。
