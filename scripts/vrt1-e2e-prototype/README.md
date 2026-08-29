# VRT1 端到端原型（免费路线）

把 Insight 生产 `OracleSafetyCheck`（EIP-712 v2 26 字段 / v3 27 字段）映射为 VRT1 §8 agent action，
组合双签名（内层 EIP-712/secp256k1 + 外层 BIP340 Schnorr），批量 Merkle，构造 49B OP_RETURN
锚定载荷，并全程离线验证。

对应合作：Insight × VERITAS（VRT1 规范，proofofagent.net）。
Insight 是第一个被 VERITAS 锚定 record 的外部实现，也是 §8.5 `key_registry_snapshot`
record type 的提出方，规范文本 credit Insight 出处。

合作往来记录不在本仓库——对方未发布的交付物默认不进公开仓库，除非对方书面授权。

例外：`conformance-round2/`（共享 conformance 套件与 §8.5 规范正文）随本仓库发布。它不是
内部往来，而是公开规范的一部分——§8.5 已正式登记进 VRT1，保留它是公开的署名凭据。
Insight 的正式署名在 `conformance-round2/VRT1-section-8.5-key-registry-snapshot.md`
（"Type contributed by Insight"）。

## 目录结构

```
vrt1-e2e-prototype/
├── README.md                本文档
├── src/vrt1-encoding.mjs    编码单一事实源（builders 复用）
├── builders/                record 生成入口（prototype / build-genesis / build-vvv-demo / build-vvv-v3-demo / registry-snapshot）
├── verify/                  独立校验器（刻意不复用被测实现）：verify-round2 / verify-round3 / verify-vvv-v3
├── vectors/                 公开 vrt1-spec 向量（canonical / merkle / op_return）
├── conformance-round2/      对方共享 conformance 套件 + §8.5 正文（署名凭据）
├── evidence/                已锚定 / 已交付记录（勿重跑覆盖）
├── registration/            reserved type 注册 pin（per-field scale + 策略常量）
└── fixtures/                演示输入（sample-receipt.json）
```

## 运行

```bash
npm run verify:vrt1                                           # 校验套件全跑（round-2 一致性 + genesis 合规）
node scripts/vrt1-e2e-prototype/verify/verify-round2.mjs      # 只跑 round-2 共享 conformance 复算
node scripts/vrt1-e2e-prototype/verify/verify-round3.mjs      # 只跑我方 §8.5 genesis 合规自检
node scripts/vrt1-e2e-prototype/builders/prototype.mjs        # 端到端演示（默认 sample-receipt.json）
node scripts/vrt1-e2e-prototype/builders/prototype.mjs <receipt.json>  # 传入其他 receipt
node scripts/vrt1-e2e-prototype/builders/registry-snapshot.mjs          # §8.5 registry record 候选形态
node scripts/vrt1-e2e-prototype/builders/build-genesis.mjs              # 重建 §8.5 genesis（需 agent 私钥）
node scripts/vrt1-e2e-prototype/builders/build-vvv-demo.mjs             # VVV→USDC 第二资产演示 record（v2，26 字段）
node scripts/vrt1-e2e-prototype/builders/build-vvv-v3-demo.mjs          # 同一份生产数据重建为 v3（27 字段）
node scripts/vrt1-e2e-prototype/verify/verify-vvv-v3.mjs                # v3 record 离线复算（13 项）
```

依赖：`@noble/curves`（Schnorr/secp256k1）、`@noble/hashes`（sha256）、`viem`（EIP-712）、
`canonicalize`（RFC 8785 JCS）。均已登记在 `package.json`，`npm install` 后即可跑。

### 只有本人能跑的两个脚本

`build-genesis.mjs`、`build-vvv-demo.mjs`、`build-vvv-v3-demo.mjs` 依赖**仓库外**的输入：

- agent 私钥 `~/.workbuddy/veritas_deliverable/vrt1-agent-keys/`（chmod 600，不进仓库、
  也不进 Vercel env）。外层 VRT1 签名需要它。
- `build-vvv-demo.mjs` 还需 VVV→USDC 的真实生产输出，通过环境变量
  `VRT1_VVV_SOURCE` 传入该文件路径（该输入属另一次交付，不可再分发，故不写死在仓库里）。
- `build-vvv-v3-demo.mjs` 不需要那个外部输入——它从已归档的 `evidence/vvv-vrt1-record.json`
  读回同一批生产数据，因此除 agent 私钥外可复现。它还会回读
  `src/lib/attestations/oracleSafetyAttestationV2.ts` 里的 `V2_REQUIRED_NON_DERIVED_GROUPS`，
  若与脚本要签的阈值不一致就直接报错（签进去的常量不许和引擎跑的常量分叉）。

外部读者无法复现，这是有意的：私钥不可分享，生产数据不可再分发。但它们的
**产物留在仓库里**（`evidence/registry-genesis.json`、`evidence/vvv-vrt1-record.json`），可直接校验，
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
4. **§8.3 Nostr 包装（kind 1990）**：按 NIP-01 构造事件（tags 空数组、content = 明文 canonical JSON `{"action","sig"}` 而非 base64；格式与对方向量一致，该向量未随本仓库发布，此处按商定格式构造后自验），外层 Nostr 事件签名验签 + `event.pubkey == action.agent` + 从 content 重验内层 action 签名（spec 强制三验）。
5. **负向量**：篡改 canonical → action_id 变化被拒；翻转 sig 字节 → Schnorr 拒绝；错误 leaf → 包含性证明拒绝。
6. **从链验证（live，只读）**：抓取 VERITAS 真实主网锚点 `92b2c4e4…5aafa0`（block 953,581），按 §5.1 解析其 OP_RETURN（tag/version/epoch/leaf_count/root），证明链上真实载荷与本构造器字节格式一致。若网络不可达则 SKIP（离线格式检查由 op_return 向量覆盖）。

本地产出（不入仓库）：`vrt1-action.json`（record + action_id + canonical + 双签名 + Nostr 事件）、
`anchor-epoch.json`（epoch/root/OP_RETURN + chain_verify）。

已归档的锚定证据在仓库内：`evidence/registry-genesis.json`（§8.5 genesis，action_id `87b750e4…`，
已由对方锚定于 block 964,407）、`evidence/vvv-vrt1-record.json`（VVV→USDC 第二资产演示 record，v2）、
`evidence/vvv-vrt1-record-v3.json`（同一份生产数据重建为 v3）。

## v3：把独立性阈值签进去（2026-08-29）

v2 的 26 个签名字段里有 `sourceGroupCount`（实测的不同 operator group 数），却**没有**它被拿来
比较的那个要求值——`requiredSourceGroupCount`（= 2）只存在于代码库里。于是"2 对一个要求 2"
是签发方的一句断言：拿到 receipt 的人必须相信签发方的源码才能判断这道门是过还是没过。
同一 struct 里 quorum 门的两个操作数（`participantCount` / `requiredParticipantCount`）都在签名内，
所以同一份 receipt 里一道门可证、另一道门不可证。

v3 只加一个字段：`requiredSourceGroupCount`（uint256，追加在末尾，v2 的 26 字段前缀原样不动）。
门逻辑、阈值、verdict 政策全部不变——同一个 gate，只是把阈值摆进签名里。

产物：`evidence/vvv-vrt1-record-v3.json`

- 数据 = v2 那份**同一批真实生产 BLOCK 输出**（`unresolved:VVV@1`、sourceGroupCount=2、
  coverage INSUFFICIENT 2/3、verdict BLOCK），从 v2 record 读回，不是重新采集；
- 内层 EIP-712 27 字段用**演示 attester key** 签（生产 attester 在 Vercel env，与 v2 一致，如实标注）；
- 外层用**真实 agent key** `299a3d33…` 签——该 key 在已锚定的 genesis（block 964,407）里；
- action_id `c0e8ea3f…`，canonical 1784 字节；
- `params` 键为 `oracle_safety_check_v3`（**不复用 v2 的键**：键名参与 canonical 字节，
  复用会让按 v2 形状解析的人读到不同字段集而不自知）。

`verify/verify-vvv-v3.mjs` 是独立复算器（不 import 生成脚本），13 项全过，其中两项是 v2 做不到的：

```text
PASS  coverage gate recomputes to the signed coverageStatus — 2 vs 3 → INSUFFICIENT
PASS  independence gate recomputes to the signed independenceStatus (v3 only) — 2 vs 2 → ASSESSED
```

## Canonical 编码规则（§1.2/§1.5）

生产编码的**单一事实源是 `src/vrt1-encoding.mjs`**：`builders/` 下的脚本都 import 它，规则只此一份。

校验则相反——`verify/verify-round2.mjs` 与 `verify/verify-round3.mjs` **刻意不 import 它**，各自独立实现
`tagged_hash` / `action_id`。这是有意的：校验器若复用被测实现，编码模块的 bug 会自我确认，
29/29 就成了安慰剂。

- **Class A hex 字节字段**（4 evidence hashes + `uid` + `attester` + EIP-712 `signature`）：
  **去 `0x` 前缀 + 全小写**。这是规范化一种编码。
- **CAIP-19 标识符**（`sourceAssetId`/`destinationAssetId`/`target`，如 `eip155:1/erc20:0xA0b8…`）：
  **字节原样、大小写保留**。`0x` 是标识符一部分、EIP-55 混合大小写携带意义，lowercase 是改标识符而非规范化。
- **uint256 → decimal string**（§1.2，如 `tradeAmountUsd: "10000000000"`）；`outcome.schema_version` 除外（number，与对方向量一致）。
- **aux_rand = 32 个零字节**（共享向量约定：没有它你产出有效但不同的签名，追一个不是差异的差异）。
- **eip712_attestation envelope**：`{attester, signature, uid, signedAt, domain{name,version,chainId 字符串}, primary_type}`（无 verify_url，与共享向量一致）。
- **VRT1 agent key（原型 demo）**：`0x55..55`（共享 conformance 套件发布的正向量密钥，可复现；非生产 key）。

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
- 映射形态已收敛：`insight.oracle-safety-check`（namespaced）、`target` = 资产对、
  26 字段连续 `params`（非 10/15 拆分，v3 为 27 字段，键 `oracle_safety_check_v3`），
  **已与共享 canonical vectors byte-exact 对拍通过**（29 项全过）。
- epoch 对齐：VRT1 epoch = 600s（§2.2）与 receipt `validUntil = checkedAt + 600s` 巧合对齐，
  原型以 `floor(checkedAt/600)` 取 epoch（本例 2979468）；epoch 是**批次标签而非时钟**，
  跨 oracle 不可比，时间证据来自锚定区块且只是上界。
- 签名确定性：固定 aux_rand = 32 零字节（规范），保证重跑字节稳定。
- `sample-receipt.json` 由 2026-08 的 attester key 签名，该 key 的发布窗口已随密钥轮换
  关闭，故它只作编码与流程演示，不再作为待锚定对象。
