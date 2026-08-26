# VRT1 端到端原型（免费路线）

把 Insight 生产 `OracleSafetyCheck`（EIP-712 v2，26 字段）映射为 VRT1 §8 agent action，
组合双签名（内层 EIP-712/secp256k1 + 外层 BIP340 Schnorr），批量 Merkle，构造 49B OP_RETURN
锚定载荷，并全程离线验证。

对应合作：Insight × VERITAS（vrt1-spec，Tutankhamun）。事实源见
`.trae/veritas-collaboration/01-complete-history-and-technical-record.md` §5.4 / §10。

## 运行

```bash
node scripts/vrt1-e2e-prototype/prototype.mjs
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

产出：`vrt1-action.json`（record + action_id + canonical + 双签名）、`anchor-epoch.json`（epoch/root/OP_RETURN）。

## 边界（诚实声明）

- **未广播主网**。本原型是免费路线：一切离线构造与验证，不花一分钱。
  Bitcoin 真实上链（OP_RETURN tx + block 确认）属 VERITAS 锚定服务或我方后续生产步骤，
  到那一步才谈成本（主网单批矿工费通常 1–3 美元，批量聚合后每 receipt 边际成本趋近 0）。
- **VRT1 agent key 是确定性演示密钥**（`sha256("insight-vrt1-prototype-agent-key-2026-08-26")`），
  **不是**生产 EIP-712 attester 私钥，也不是正式 VRT1 agent key；正式 key 的派生/注册
  待与对方确认（对应 §5.4 或独立注册流程）。
- 映射形态（params/outcome 布局、`insight.oracle-safety-check` 自定义 action_type）为草案，
  待对方正式 VRT1 record format + canonical test vectors 回发后做 byte-exact 收敛。
- epoch 对齐：VRT1 epoch = 600s（§2.2）与 receipt `validUntil = checkedAt + 600s` 巧合对齐，
  原型以 `floor(checkedAt/600)` 取 epoch；该语义在 reserved type 注册时一并确认。
