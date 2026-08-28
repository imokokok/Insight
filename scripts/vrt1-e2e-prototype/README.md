# VRT1 端到端原型（免费路线）

把 Insight 生产 `OracleSafetyCheck`（EIP-712 v2，26 字段）映射为 VRT1 §8 agent action，
组合双签名（内层 EIP-712/secp256k1 + 外层 BIP340 Schnorr），批量 Merkle，构造 49B OP_RETURN
锚定载荷，并全程离线验证。

对应合作：Insight × VERITAS（VRT1 规范，Tutankhamun Castillo El-Bey，proofofagent.net）。
Insight 是第一个被 VERITAS 锚定 record 的外部实现，也是 §8.5 `key_registry_snapshot`
record type 的提出方（经对方同意泛化，规范文本 credit Insight 出处）。

合作往来档案与对方交付包（round1 向量、round3 的 §8.5 / 2.2 AMENDED 文本与向量）是内部
记录，归档在 `.trae/veritas-collaboration/`（gitignore），不随本仓库发布——对方交付物默认
不进公开仓库，除非对方书面授权。

## 运行

```bash
npm run verify:vrt1                                           # 校验套件全跑（round-2 一致性 + genesis 合规）
node scripts/vrt1-e2e-prototype/verify-round2.mjs             # 只跑 round-2 共享 conformance 复算
node scripts/vrt1-e2e-prototype/verify-round3.mjs             # 只跑我方 §8.5 genesis 合规自检
node scripts/vrt1-e2e-prototype/prototype.mjs                 # 端到端演示（默认 sample-receipt.json）
node scripts/vrt1-e2e-prototype/prototype.mjs <receipt.json>  # 传入其他 receipt
node scripts/vrt1-e2e-prototype/registry-snapshot.mjs         # §8.5 registry record 候选形态
node scripts/vrt1-e2e-prototype/build-genesis.mjs             # 重建 §8.5 genesis（需 agent 私钥）
node scripts/vrt1-e2e-prototype/build-vvv-demo.mjs            # VVV→USDC 第二资产演示 record
```

依赖：`@noble/curves`（Schnorr/secp256k1）、`@noble/hashes`（sha256）、`viem`（EIP-712）、
`canonicalize`（RFC 8785 JCS）。均已登记在 `package.json`，`npm install` 后即可跑。

### 只有本人能跑的两个脚本

`build-genesis.mjs` 与 `build-vvv-demo.mjs` 依赖两个**仓库外**的输入，路径硬编码在脚本里：

- agent 私钥 `~/.workbuddy/veritas_deliverable/vrt1-agent-keys/`（chmod 600，不进仓库、
  也不进 Vercel env）。外层 VRT1 签名需要它。
- `build-vvv-demo.mjs` 还需 VVV→USDC 的真实生产输出
  `~/.workbuddy/interai_deliverable/deliverable-1-pre-trade-responses.json`。

外部读者无法复现，这是有意的：私钥不可分享，生产数据属于另一次交付。但它们的
**产物留在仓库里**（`registry-genesis.json`、`vvv-vrt1-record.json`），可直接校验，
见「已归档的锚定证据」。

内层 EIP-712 生产签名由 Vercel 环境的 attester key 持有，本地重建时退化为演示签名，
这一点在 `vvv-vrt1-record.json` 的 `note` 字段里如实标注了，不是隐含的。

> 注意：这两个脚本会**覆盖**上述产物。产物是已锚定 / 已交付的事实记录，
> 重跑前先确认你确实想替换它们。

`conformance-round2/gen-conformance-vectors.py` 是对方提供的 round-2 向量生成器
（纯 Python、零第三方依赖）。它按对方自己的目录结构工作，期望输入在
`conformance-round2/insight-vectors/`，该目录不在本仓库，故直接运行会失败。
仓库只保留它生成的产物 `conformance-vectors/`，校验跑产物即可，无需重生成。

## 做了什么

1. **工具链自检**（必须先于一切）：用公开 vrt1-spec test vectors 做字节级对拍——
   - `vectors/agent_action.json`：canonical JSON（RFC 8785 字典序）、
     `action_id = tagged_hash("VRT1/agent-action", canonical)`、Schnorr 验签；
   - `vectors/merkle.json`：size=7 树的 Merkle root（RFC-6962 0x00/0x01 前缀 +
     Bitcoin 式奇数叶子复制，double-SHA256）；
   - `vectors/op_return.json`：49B OP_RETURN 载荷（`VRT1`|version|epoch(8BE)|leaf_count(4BE)|root(32)）。
2. **真实路径**：`sample-receipt.json`（生产 fresh receipt，uid `0x08e2d411…`）→
   26 字段入 `params.oracle_safety_check_v2`、EIP-712 签名/uid 入 `params.eip712_attestation`、
   verdict 入 `outcome`、`ts = checkedAt`（epoch = `floor(ts/600)` = 2979468）→
   外层 Schnorr 签名 → Merkle（单叶子 batch + 3 叶子含包含性证明演示）→ 49B OP_RETURN 载荷。
3. **离线验证**：外层 Schnorr 验签 + 内层 EIP-712 recover == attester + Merkle 包含性证明 + OP_RETURN 往返解析。
4. **§8.3 Nostr 包装（kind 1990）**：按 NIP-01 构造事件（tags 空数组、content = 明文 canonical JSON `{"action","sig"}`，与对方向量一致），外层 Nostr 事件签名验签 + `event.pubkey == action.agent` + 从 content 重验内层 action 签名（spec 强制三验）。
5. **负向量**：篡改 canonical → action_id 变化被拒；翻转 sig 字节 → Schnorr 拒绝；错误 leaf → 包含性证明拒绝。
6. **从链验证（live，只读）**：抓取 VERITAS 真实主网锚点 `92b2c4e4…5aafa0`（block 953,581），按 §5.1 解析其 OP_RETURN（tag/version/epoch/leaf_count/root），证明链上真实载荷与本构造器字节格式一致。若网络不可达则 SKIP（离线格式检查由 op_return 向量覆盖）。

本地产出（不入仓库）：`vrt1-action.json`（record + action_id + canonical + 双签名 + Nostr 事件）、
`anchor-epoch.json`（epoch/root/OP_RETURN + chain_verify）。

已归档的锚定证据在仓库内：`registry-genesis.json`（§8.5 genesis，action_id `87b750e4…`，
已由对方锚定于 block 964,407）、`vvv-vrt1-record.json`（VVV→USDC 第二资产演示 record）。

## Canonical 编码规则（修正版 §5.2/§5.1，对方 2026-08-27 确认；单一事实源 = `vrt1-encoding.mjs`）

- **Class A hex 字节字段**（4 evidence hashes + `uid` + `attester` + EIP-712 `signature`）：
  **去 `0x` 前缀 + 全小写**。这是规范化一种编码。
- **CAIP-19 标识符**（`sourceAssetId`/`destinationAssetId`/`target`，如 `eip155:1/erc20:0xA0b8…`）：
  **字节原样、大小写保留**。`0x` 是标识符一部分、EIP-55 混合大小写携带意义，lowercase 是改标识符而非规范化。
- **uint256 → decimal string**（§5.1，如 `tradeAmountUsd: "10000000000"`）；`outcome.schema_version` 除外（number，与对方向量一致）。
- **aux_rand = 32 个零字节**（对方 8.27 规范：没有它你产出有效但不同的签名，追一个不是差异的差异）。
- **eip712_attestation envelope**：`{attester, signature, uid, signedAt, domain{name,version,chainId 字符串}, primary_type}`（无 verify_url，与对方向量一致）。
- **VRT1 agent key（原型 demo）**：`0x55..55`（对方发布的正向量密钥，可复现；非生产 key）。

**已收敛（byte-exact）**：canonical **1769 字节**、action_id **`157a3cb8…`**，与共享 conformance
套件中的 `positive_oracle_safety_check.json` 逐字节一致。

`npm run verify:vrt1` 全量复算：
round-2 共享套件 **29/29**（interop draft/candidate、safety-check 正负向量、registry
genesis/successor 与 5 个负向量、我方 700B 重建 vs candidate byte-exact），
我方 §8.5 genesis 合规 **9/9**，全绿。

## 边界（诚实声明）

- **未广播我方批次**。本原型是免费路线：一切离线构造与验证，加上对 VERITAS 真实主网锚点的只读从链解析，不花一分钱。
  我方 receipt 的批次**没有 txid、没有 block 确认**；真实广播（主网或测试网）需一条锚定路径
  （对方锚定服务 / 我们自己的节点+UTXO），到那一步才谈成本（主网单批矿工费通常 1–3 美元，
  批量聚合后每 receipt 边际成本趋近 0）。
- **VRT1 agent key 是确定性演示密钥**（`0x55..55`，与对方发布的正向量一致，可复现），
  **不是**生产 EIP-712 attester 私钥，也不是正式 VRT1 agent key；正式 key 的派生/注册
  走 §8.5 genesis（见 `registry-genesis.json`）。
- 映射形态已按对方 8.27 确认收敛：`insight.oracle-safety-check`（namespaced）、`target` = 资产对、
  26 字段连续 `params`（非 10/15 拆分），**已与共享 canonical vectors byte-exact 对拍通过**（29 项全过）。
- epoch 对齐：VRT1 epoch = 600s（§2.2）与 receipt `validUntil = checkedAt + 600s` 巧合对齐，
  原型以 `floor(checkedAt/600)` 取 epoch（本例 2979468）；按 2.2 AMENDED，epoch 是**批次标签而非时钟**，
  跨 oracle 不可比，时间证据来自锚定区块且只是上界。
- 签名确定性：固定 aux_rand = 32 零字节（规范），保证重跑字节稳定。
- `sample-receipt.json` 由 2026-08 的 attester key 签名，该 key 的发布窗口已随密钥轮换
  （Route A，2026-08-27）关闭，故它只作编码与流程演示，不再作为待锚定对象。
