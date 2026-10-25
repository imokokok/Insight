# PriorSeal x402 Bazaar 上线公告（成稿）

发布日期：2026-10-25 · 状态：已验证可发布（所有事实均来自生产环境实测）
使用方式：按渠道复制对应版本；代码块三个版本共用。

---

## 版本一：X / Twitter（英文，~270 字符）

> PriorSeal is now discoverable & payable via x402 on the Coinbase Bazaar: agents can buy a signed $0.02 readiness report for any EVM address — chain support, live RPC, EOA/contract check — before committing funds. No signup, no key: the payment is the auth. Base USDC, gas sponsored. https://priorseal.xyz

---

## 版本二：x402 Discord / Coinbase Developer Community / Base 生态论坛（英文长文）

### PriorSeal is live on the Coinbase x402 Bazaar — $0.02 signed readiness reports, payable by any agent

We just shipped our first x402-native paid endpoint, and it is now discoverable and payable through the CDP x402 Bazaar. No signup, no API key — the payment is the auth.

**What you get**

`GET https://priorseal.xyz/v1/integration-readiness?chainId=8453&subjectAddress=0x…`

A signed, machine-readable pre-integration report for any EVM address:

- whether the chain is supported and its RPC is live (`SUPPORTED`/`UNSUPPORTED`, `AVAILABLE`/`UNAVAILABLE`/`CHAIN_ID_MISMATCH`)
- whether the subject is an EOA or a contract (with code size)
- Ed25519-signed by our production key, 5-minute validity, request-bound via `inputHash` (no replay)

Think of it as the pre-flight check an agent runs _before_ committing funds to an unfamiliar chain or protocol.

**Sample response (trimmed):**

```json
{
  "schema": "priorseal.integration-readiness.v1",
  "readinessId": "pir_…",
  "issuedAt": 1761300000,
  "expiresAt": 1761300300,
  "input": { "chainId": 8453, "subjectAddress": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" },
  "inspection": {
    "chain": { "support": "SUPPORTED", "rpc": "AVAILABLE", "observedChainId": 8453 },
    "subject": { "kind": "CONTRACT", "codeHash": "0x…", "codeBytes": 15516 }
  },
  "issuer": "priorseal-production",
  "keyId": "production-1",
  "algorithm": "Ed25519",
  "keyRegistry": { "url": "https://priorseal.xyz/.well-known/priorseal-keys.json" },
  "payment": {
    "protocol": "x402",
    "method": "GET",
    "path": "/v1/integration-readiness",
    "price": "$0.02"
  }
}
```

**Call it in ~10 lines** (Node, `@x402/fetch` + `viem`):

```ts
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { x402Client, toClientEvmSigner, ExactEvmScheme } from '@x402/evm';
import { wrapFetchWithPayment } from '@x402/fetch';

const account = privateKeyToAccount(process.env.EVM_PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({ account, chain: base, transport: http() });
const signer = toClientEvmSigner(wallet);
if (!signer.address) signer.address = account.address; // viem facade quirk in @x402/evm 2.28

const client = new x402Client().register('eip155:8453', new ExactEvmScheme(signer));
const fetchWithPay = wrapFetchWithPayment(fetch, client);

const response = await fetchWithPay(
  'https://priorseal.xyz/v1/integration-readiness?chainId=8453&subjectAddress=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
);
const report = await response.json();
```

$0.02 USDC settled on Base (9 EVM networks accepted), gas sponsored by the CDP facilitator — your wallet needs USDC and nothing else. Verified end-to-end: a wallet with 0 ETH completed settlement successfully.

**Agent discovery**

- CDP Bazaar MCP: `search_resources({ "query": "priorseal", "curatedOnly": false })`
- Search API (no auth): `GET https://api.cdp.coinbase.com/platform/v2/x402/discovery/search?query=priorseal`
- OpenAPI: `https://priorseal.xyz/openapi/*` · Capabilities: `https://priorseal.xyz/v1/capabilities`

**Honest scope**: read-only. It reports infrastructure readiness — not a security audit, no ownership claims, no transactions submitted. Receipt-bundle export joins the Bazaar index after its first x402 settlement.

PriorSeal is oracle transparency & risk infrastructure. This readiness check is our first agent-native product — feedback welcome.

🔗 https://priorseal.xyz

---

## 版本三：中文社区（即刻 / 微信群 / 即刻圈子）

### PriorSeal 已上线 Coinbase x402 Bazaar —— $0.02 就能买到的签名就绪报告

我们的第一个 x402 原生付费端点正式可被发现、可被 agent 自动支付：无需注册、无需 API key，付款即授权。

**它是什么**

`GET https://priorseal.xyz/v1/integration-readiness?chainId=8453&subjectAddress=0x…`

返回一份 Ed25519 签名的机器可读"集成就绪报告"（5 分钟有效、绑定请求参数防重放）：

- 目标链是否支持、RPC 是否在线（`SUPPORTED` / `AVAILABLE`）
- 目标地址是 EOA 还是合约（含代码大小）

定位：agent 在向陌生链或协议投入资金**之前**运行的预检。

**~10 行调用**（Node，`@x402/fetch` + `viem`）：

```ts
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { x402Client, toClientEvmSigner, ExactEvmScheme } from '@x402/evm';
import { wrapFetchWithPayment } from '@x402/fetch';

const account = privateKeyToAccount(process.env.EVM_PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({ account, chain: base, transport: http() });
const signer = toClientEvmSigner(wallet);
if (!signer.address) signer.address = account.address; // @x402/evm 2.28 的 viem facade 小坑

const client = new x402Client().register('eip155:8453', new ExactEvmScheme(signer));
const fetchWithPay = wrapFetchWithPayment(fetch, client);

const response = await fetchWithPay(
  'https://priorseal.xyz/v1/integration-readiness?chainId=8453&subjectAddress=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
);
const report = await response.json();
```

$0.02 USDC（Base 结算，另支持 9 条 EVM 网络），gas 由 CDP facilitator 代付——钱包里只需要有 USDC。

**Agent 发现方式**

- CDP Bazaar MCP：`search_resources({ "query": "priorseal", "curatedOnly": false })`
- 搜索 API：`GET https://api.cdp.coinbase.com/platform/v2/x402/discovery/search?query=priorseal`

**边界**：只读。报告的是基础设施就绪状态——不是安全审计，也不暗示所有权。PriorSeal 是预言机透明度与风险基础设施（oracleinsight.xyz），这是该体系上第一个 agent 原生产品。

🔗 https://priorseal.xyz

---

## 发布清单（你自己操作）

| 渠道                                           | 用哪个版本 | 备注                                                                                    |
| ---------------------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| X / Twitter                                    | 版本一     | 可附 priorseal.xyz 截图或 Bazaar 搜索结果截图                                           |
| x402 Discord（#showcase / #integrations 频道） | 版本二     | 语气已按社区惯例收敛，避免营销腔                                                        |
| Coinbase Developer Platform 社区 / Base 论坛   | 版本二     | 标题可用 "PriorSeal is live on the CDP x402 Bazaar"                                     |
| 即刻 / 中文群                                  | 版本三     | 代码块保留，工程师读者会直接跑                                                          |
| x402scan.com                                   | 提交表单   | **已核实未收录**；表单在 https://x402scan.com/resources/register ，可直接粘贴下方 blurb |
| x402atlas.com                                  | 暂缓       | 已核实未收录；目录在注册墙后，无公开提交入口，不值得主动申请                            |

**x402scan 表单 blurb（直接粘贴）：**

> PriorSeal — signed Integration Readiness reports for agents. $0.02 USDC (x402, Base + 8 more EVM networks). GET /v1/integration-readiness?chainId&subjectAddress returns an Ed25519-signed, inputHash-bound pre-integration check: chain support, live RPC, EOA vs CONTRACT (code size). No signup; payment is the auth. Listed on the Coinbase CDP x402 Bazaar. https://priorseal.xyz

发完后 24-72 小时盯一个信号：`/v1/integration-readiness` 出现第一笔非我们自己发起的真实付款——那就是公告奏效的标志。
