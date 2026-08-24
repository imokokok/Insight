# Safety Check 多钱包导入 — 详细设计文档

> 状态：设计稿（待评审，未实现）
> 范围：仅解决"safety-check 页面一键导入时只能连 MetaMask，无法选择其他钱包"的问题。
> 目标取向：保持现有"只读地址、不签名"的轻量设计，不引入 wagmi / rainbowkit 等重型依赖。

---

## 1. 问题陈述

在 `src/app/safety-check` 页面，用户点击导入区里的 **"Connect Wallet"** 按钮后，会直接连上 `window.ethereum` 指向的钱包（绝大多数浏览器下是 MetaMask），随后自动 `handleImport(addr)`。

现状三个文件：

- `src/app/safety-check/hooks/useWalletConnect.ts`
  - `getInjectedProvider()`（L17–20）只返回 `window.ethereum`。
  - `connect()`（L42–70）对该单一 provider 调 `eth_requestAccounts`。
  - `useEffect`（L78–90）把 `accountsChanged` 监听挂在 `window.ethereum` 上。
- `src/app/safety-check/components/PositionForm.tsx`
  - 未连接时唯一按钮即 "Connect Wallet"（L206–216），点击 → `handleWalletConnect` → `wallet.connect()`，无任何钱包选择 UI（L95–98 连上后自动导入）。
- `src/app/safety-check/hooks/usePositionImporter.ts`：只负责把地址 + protocolId POST 到 `/api/protocol-health/import`，与钱包无关。

### 1.1 根因

代码**只读取 EIP-1193 时代的单一全局对象 `window.ethereum`**，没有消费 **EIP-6963（多注入钱包发现协议）**。

现代钱包（Rabby、Coinbase Wallet、Trust、Zerion、Brave Wallet 等）通过 EIP-6963 各自播报自己的 provider，挂在 `window.ethereum.providers` 数组里。本代码忽略该数组，直接抓那个"全局默认对象"，于是落入最后写入 `window.ethereum` 的钱包（通常是 MetaMask）。报错文案（L45）写着 "Install MetaMask or Rabby."，但代码根本没有选择 Rabby 的能力——自相矛盾。

### 1.2 为什么不能先改个小判断

`window.ethereum` 的多钱包共存语义由 EIP-5749 / EIP-6963 规定，硬编码 `if (isRabby) ... else if (isMetaMask)` 既不可维护也会漏掉新钱包。正确做法是监听钱包主动 `announceProvider` 事件，由钱包自己上报身份与图标。

---

## 2. 目标与非目标

**目标**

- 点击按钮后弹出钱包选择列表，列出浏览器中实际检测到的钱包（带名称与图标）。
- 用户选定后，用该钱包的 provider 完成连接并自动导入持仓。
- 不支持 EIP-6963 的旧环境（老版 MetaMask、部分移动端 in-app 浏览器）仍可走 `window.ethereum` 兜底。
- 回访时记住上次选择的钱包，无感恢复已授权地址（不弹窗）。

**非目标（本期不做）**

- 链切换 / 网络管理（导入仅用地址，无需切链）。
- 交易签名、EIP-712 证明（那是 attestation 流程，与导入无关）。
- 移动端 WalletConnect 扫码（见 §7 后续项）。

---

## 3. 方案概述

采用 **EIP-6963 发现 + 轻量自定义选择器**。

- EIP-6963 的 provider 本身也是 EIP-1193 对象，因此现有 `eth_requestAccounts` 逻辑**不改**，只是"从哪个 provider 调"换成用户选中的那个。
- 不引入 wagmi / rainbowkit / web3modal，包体零新增，契合现有 `useWalletConnect` 注释里"避免重型依赖"的取向。
- 仅 `viem` 已是项目依赖，本方案不新增任何运行时依赖。

---

## 4. 架构与数据流

```
[页面加载] ──dispatch──> eip6963:requestProvider
                             │
              eip6963:announceProvider (各钱包广播)
                             │
                  useWalletConnect 收集 wallets[]
                             │
[用户点击 "Connect Wallet"] ──> 打开 WalletPicker 弹层
                             │
                 用户选中某 wallet (rdns)
                             │
                  connect(rdns) ──> 该 provider.eth_requestAccounts
                             │
                  拿到 address ──> handleImport(addr) 自动导入
```

`window.ethereum` 作为兜底 provider，仅在 EIP-6963 未发现任何钱包时使用，UI 上显示为 "Browser Wallet"。

---

## 5. 详细改动

### 5.1 `useWalletConnect.ts` 重构

新增类型与发现逻辑：

```ts
export interface DetectedWallet {
  /** EIP-6963 反向 DNS，如 "io.metamask", "io.rabby"，用作稳定标识 */
  rdns: string;
  name: string;
  icon: string; // data URI (SVG/PNG)，直接作 <img src>
  uuid: string;
  provider: InjectedProvider;
}

export interface UseWalletConnectReturn {
  address: string | null;
  isConnecting: boolean;
  error: string | null;
  /** 已发现的钱包列表（含兜底项） */
  wallets: DetectedWallet[];
  /** 标记是否仍在等待钱包播报 */
  discovering: boolean;
  /** 按 rdns 连接某个钱包；不传则连兜底 window.ethereum */
  connect: (rdns?: string) => Promise<string | null>;
  disconnect: () => void;
  unavailable: boolean;
  /** 最近一次连接选择（rdns 或 'injected'） */
  selectedRdns: string | null;
}
```

发现逻辑（挂载时执行一次）：

```ts
useEffect(() => {
  const found = new Map<string, DetectedWallet>();

  const onAnnounce = (e: Event) => {
    const { info, provider } = (e as CustomEvent).detail;
    if (!info?.rdns || !provider) return;
    found.set(info.rdns, { ...info, provider });
    setWallets([...found.values()]); // 触发渲染
  };
  window.addEventListener('eip6963:announceProvider', onAnnounce);
  window.dispatchEvent(new Event('eip6963:requestProvider'));

  // 兜底：约 300ms 后若仍未发现任何 6963 钱包，用 window.ethereum
  const t = setTimeout(() => {
    if (found.size === 0 && getInjectedProvider()) {
      setWallets([
        {
          rdns: 'injected',
          name: 'Browser Wallet',
          icon: '',
          uuid: 'injected',
          provider: getInjectedProvider()!,
        },
      ]);
    }
    setDiscovering(false);
  }, 300);

  return () => {
    window.removeEventListener('eip6963:announceProvider', onAnnounce);
    clearTimeout(t);
  };
}, []);
```

`connect(rdns?)` 改为按 rdns 取 provider，并把事件监听挂到**选中的 provider**：

```ts
const connect = useCallback(async (rdns?: string): Promise<string | null> => {
  const target =
    (rdns && walletsRef.current.find((w) => w.rdns === rdns)?.provider) ?? getInjectedProvider();
  if (!target) {
    setError('No browser wallet detected.');
    return null;
  }

  // 关键：监听挂在被选中的 provider 上，而非 window.ethereum
  const onAccountsChanged = (...args: unknown[]) => {
    /* 同原逻辑 */
  };
  target.on?.('accountsChanged', onAccountsChanged);
  selectedProviderRef.current = target; // 供 disconnect/cleanup 使用

  try {
    const accounts = (await target.request({ method: 'eth_requestAccounts' })) as unknown[];
    const addr = accounts.find((a): a is string => typeof a === 'string') ?? null;
    if (!addr || !ADDRESS_RE.test(addr)) {
      setError('No account authorized.');
      return null;
    }
    localStorage.setItem('safety-check:wallet-rdns', rdns ?? 'injected');
    setSelectedRdns(rdns ?? 'injected');
    setAddress(addr);
    return addr;
  } catch (err) {
    const code = (err as { code?: number })?.code;
    setError(code === 4001 ? 'Connection rejected.' : 'Wallet connection failed.');
    return null;
  }
}, []);
```

无感恢复（页面加载、无需用户手势）：用 `eth_accounts`（不带 request）读已授权地址，不弹窗：

```ts
// 在发现完成后，若 localStorage 有上次选择，尝试静默恢复
const savedRdns = localStorage.getItem('safety-check:wallet-rdns');
const saved = wallets.find((w) => w.rdns === savedRdns)?.provider ?? getInjectedProvider();
if (saved) {
  const accts = (await saved.request({ method: 'eth_accounts' })) as string[];
  if (accts[0]) setAddress(accts[0]);
}
```

### 5.2 新增 `WalletPicker` 组件

路径：`src/app/safety-check/components/WalletPicker.tsx`

- Props：`wallets: DetectedWallet[]`、`onSelect: (rdns: string) => void`、`onClose: () => void`、`isConnecting`、`connectingRdns`。
- 渲染：遍历 `wallets`，每项显示 `info.icon`（`<img src={icon} />`）与 `info.name`；点击触发 `onSelect(rdns)`。
- 空态：`wallets` 长度为 0 时显示安装引导（MetaMask / Rabby 链接），替换原 L45 文案。
- 样式：复用现有 `bg-white rounded-2xl border` + framer-motion 弹层风格，与 `PositionForm` 一致。

### 5.3 `PositionForm.tsx` 改动

- 新增本地状态 `const [pickerOpen, setPickerOpen] = useState(false)`。
- 原 "Connect Wallet" 按钮（L206–216）的 `onClick` 由 `handleWalletConnect` 改为 `setPickerOpen(true)`。
- 在导入卡片内渲染 `<WalletPicker>`，当 `pickerOpen` 为真时显示。
- Picker 选中后：`const addr = await wallet.connect(rdns); if (addr) handleImport(addr); setPickerOpen(false);`
- 已连接态（现有 L217–230 的地址条）保持不变；`wallet.error` 提示保留。

`handleWalletConnect` 可删除或改为内部调用 Picker 的选中回调，不再需要。

---

## 6. 边界情况

| 场景                          | 处理                                                         |
| ----------------------------- | ------------------------------------------------------------ |
| 仅装了 MetaMask（支持 6963）  | 列表只出现 MetaMask，点击即连                                |
| 装了 MetaMask + Rabby         | 列表出现两项，用户任选                                       |
| 未装任何钱包                  | Picker 空态显示安装引导                                      |
| 旧版 MetaMask / 移动端 in-app | 6963 无播报 → 兜底 `window.ethereum` 显示为 "Browser Wallet" |
| 用户切换账户                  | 监听挂在选中 provider 的 `accountsChanged`，更新 `address`   |
| 用户换了钱包扩展              | 刷新后重新发现，按 `localStorage` 尝试恢复                   |
| 用户拒绝授权 (4001)           | 显示 "Connection rejected."，Picker 保持打开                 |

---

## 7. 后续可选项（非本期）

- **WalletConnect / Reown**：支持手机扫码连接。需新增 `@walletconnect/...` 或 `reown` 依赖，并在 Picker 加 "Scan with mobile" 项。桌面多钱包场景 EIP-6963 已覆盖，建议按需再做。
- **WalletConnect 二维码**（WalletConnect v2）：接入后可在 Picker 里列出，但需要 projectId 与中继配置。
- **多地址/多账户选择**：当前只取 `accounts[0]`，若用户想导入非默认账户，可在 Picker 里加账户二级选择（暂不需要）。

---

## 8. 权衡：为何不直接上 wagmi + RainbowKit

| 维度               | EIP-6963 轻量方案（推荐）        | wagmi + RainbowKit                            |
| ------------------ | -------------------------------- | --------------------------------------------- |
| 新增依赖           | 0                                | wagmi + @tanstack/react-query + rainbowkit 等 |
| 包体               | 极小                             | 明显增大                                      |
| 状态管理           | 复用现有 hook                    | 需包 `<WagmiProvider><QueryClientProvider>`   |
| 适配本页"只读地址" | 完全匹配                         | 杀鸡用牛刀                                    |
| 多钱包覆盖         | MetaMask/Rabby/Coinbase/Trust 等 | 同左 + 移动端 WC                              |
| 维护成本           | 低                               | 中（需跟随 wagmi 大版本）                     |

结论：本页只读地址，EIP-6963 方案在能力覆盖、包体、维护成本上全面更优；wagmi 适合后续要做签名/链管理时再引入。

---

## 9. 验证计划

- `npm run build`（或 `next build`）通过，类型检查无新增错误。
- 单元测试（可选，jest 已在项目内）：mock `eip6963:announceProvider` 事件，断言 `wallets` 被正确填充、`connect(rdns)` 调对应 provider 的 `request`。
- 手动验证（需浏览器装多钱包）：
  1. 装 MetaMask + Rabby，打开 safety-check，点 Connect Wallet → 列表出现两项。
  2. 选 Rabby → 连 Rabby、地址显示、自动导入。
  3. 刷新 → 静默恢复 Rabby 地址，不弹窗。
  4. 卸载所有钱包 → Picker 空态显示安装引导。

---

## 10. 改动文件清单

| 文件                                               | 动作                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/app/safety-check/hooks/useWalletConnect.ts`   | 重构：EIP-6963 发现、`wallets`/`connect(rdns)`、选中 provider 监听、静默恢复 |
| `src/app/safety-check/components/WalletPicker.tsx` | 新增：钱包选择弹层                                                           |
| `src/app/safety-check/components/PositionForm.tsx` | 改：按钮开 Picker、选中后连对应钱包再导入                                    |
| `docs/safety-check-multi-wallet-design.md`         | 本设计文档                                                                   |

---

## 11. 开放问题（待你确认）

1. Picker 用**弹层 (modal)** 还是**内联下拉**？弹层更接近主流钱包 UX，推荐弹层。
2. 静默恢复是否要默认开启？建议开启（仅恢复已授权地址，不弹窗，符合预期）。
3. 是否要把 "Browser Wallet" 兜底项的图标用 Insight 默认图标占位？建议是。
