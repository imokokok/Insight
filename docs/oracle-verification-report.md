# 预言机数据获取验证报告

**测试时间**: 2026-04-13  
**测试工具**: verify-oracles-simple.mjs  
**测试范围**: 6个预言机，46个交易对

---

## 📊 总体结果

| 指标     | 数值      |
| -------- | --------- |
| 总测试数 | 100       |
| 成功数   | 43 ✅     |
| 失败数   | 57 ❌     |
| 成功率   | **43.0%** |
| 测试耗时 | 97.15秒   |

---

## 🎯 各预言机测试结果

### 1. RedStone ✅ **87.0%** (40/46)

**状态**: 🟢 **工作良好**

**成功获取的交易对** (前15个):

- BTC/USD: $71,219.13
- ETH/USD: $2,200.49
- SOL/USD: $82.69
- BNB/USD: $598.90
- XRP/USD: $1.33
- ADA/USD: $0.24
- DOGE/USD: $0.09
- DOT/USD: $1.17
- MATIC/USD: $0.38
- LTC/USD: $52.98
- AVAX/USD: $9.15
- LINK/USD: $8.78
- ATOM/USD: $1.74
- UNI/USD: $3.05
- XLM/USD: $0.15

**失败的交易对** (6个):

- FTM: HTTP 500
- MKR: HTTP 500
- WETH: HTTP 500
- STETH: HTTP 500
- RETH: HTTP 500
- CBETH: HTTP 500

**分析**:

- ✅ 主流加密货币数据获取稳定
- ⚠️ LST/LRT 代币（STETH, RETH, CBETH）返回 500 错误
- 💡 建议: 在前端隐藏失败的 LST 代币，或使用其他数据源

---

### 2. Pyth Network ⚠️ **20.0%** (3/15)

**状态**: 🟡 **部分可用**

**成功获取的交易对**:

- BTC/USD: $71,213.81
- ETH/USD: $2,200.38
- SOL/USD: $82.69

**失败的交易对** (12个):

- BNB: HTTP 404
- XRP: HTTP 404
- ADA: HTTP 404
- DOGE: HTTP 404
- DOT: HTTP 404
- MATIC: HTTP 404
- LTC: HTTP 404
- AVAX: HTTP 404
- LINK: HTTP 404
- ATOM: HTTP 404
- UNI: HTTP 404
- XLM: HTTP 404

**分析**:

- ✅ 主要交易对（BTC, ETH, SOL）数据正常
- ❌ 其他交易对的 Price Feed ID 配置不正确
- 💡 建议: 需要更新 `pythConstants.ts` 中的 Price Feed IDs

**修复方案**:

```typescript
// 需要从 Pyth 官方获取正确的 Price Feed IDs
// https://pyth.network/developers/price-feed-ids
const PYTH_PRICE_FEED_IDS = {
  BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  SOL: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  // ... 需要添加其他交易对的正确 IDs
};
```

---

### 3. Chainlink ❌ **0.0%** (0/5)

**状态**: 🔴 **不可用**

**失败原因**:

- HTTP 429 错误（请求频率限制）

**分析**:

- ❌ 使用公共 Alchemy API 端点，请求被限制
- 💡 建议:
  1. 配置专用的 Alchemy API Key
  2. 或使用 Chainlink 官方 API
  3. 或使用第三方聚合器（如 Coingecko）

**修复方案**:

```bash
# 在 .env 文件中配置
ALCHEMY_API_KEY=your_api_key_here
```

---

### 4. API3 ❌ **0.0%** (0/15)

**状态**: 🔴 **不可用**

**失败原因**:

- fetch failed（网络连接失败）

**分析**:

- ❌ API 端点可能已更改或不可用
- 💡 建议:
  1. 检查 API3 官方文档，确认正确的 API 端点
  2. 可能需要 API Key 或认证

---

### 5. DIA ❌ **0.0%** (0/15)

**状态**: 🔴 **不可用**

**失败原因**:

- HTTP 404 错误

**分析**:

- ❌ API 端点已更改或不可用
- 💡 建议:
  1. 检查 DIA 官方文档，确认正确的 API 端点
  2. 可能需要注册 API Key

---

### 6. WINkLink ❌ **0.0%** (0/4)

**状态**: 🔴 **不可用**

**失败原因**:

- No token data found

**分析**:

- ❌ TronScan API 可能已更改
- 💡 建议:
  1. 检查 TronScan API 文档
  2. 使用正确的合约地址查询价格

---

## 🔧 改进建议

### 高优先级

1. **更新 Pyth Price Feed IDs**
   - 从 Pyth 官方获取所有交易对的正确 Price Feed IDs
   - 更新 `src/lib/oracles/pythConstants.ts`

2. **配置 Chainlink API Key**
   - 获取 Alchemy 或 Infura API Key
   - 更新环境变量配置

3. **修复 API3 和 DIA API 端点**
   - 检查官方文档，确认正确的 API 端点
   - 可能需要注册 API Key

### 中优先级

4. **优化前端显示**
   - 只显示可以成功获取数据的交易对
   - 对于失败的交易对，显示"数据不可用"或隐藏

5. **添加数据源健康检查**
   - 在应用启动时检查各预言机数据源状态
   - 自动切换到可用的数据源

### 低优先级

6. **缓存机制**
   - 缓存成功的价格数据
   - 减少对 API 的请求频率

7. **监控和告警**
   - 定期运行验证脚本
   - 当数据源失败时发送告警

---

## 📝 结论

### 当前可用性

| 预言机    | 状态      | 可用交易对数量 | 建议                          |
| --------- | --------- | -------------- | ----------------------------- |
| RedStone  | 🟢 良好   | 40/46          | 继续使用，隐藏失败的 LST 代币 |
| Pyth      | 🟡 部分   | 3/15           | 修复 Price Feed IDs 后可用    |
| Chainlink | 🔴 不可用 | 0/5            | 需要配置 API Key              |
| API3      | 🔴 不可用 | 0/15           | 需要修复 API 端点             |
| DIA       | 🔴 不可用 | 0/15           | 需要修复 API 端点             |
| WINkLink  | 🔴 不可用 | 0/4            | 需要修复 API 端点             |

### 总体评价

- ✅ **RedStone** 是目前最可靠的预言机数据源
- ⚠️ **Pyth** 有潜力，但需要修复配置
- ❌ 其他预言机需要进一步配置和调试

### 下一步行动

1. 立即修复 Pyth 的 Price Feed IDs
2. 配置 Chainlink 的 API Key
3. 调研 API3 和 DIA 的正确 API 端点
4. 在前端优先显示 RedStone 和 Pyth 的数据
5. 为失败的交易对添加降级策略

---

**报告生成时间**: 2026-04-13  
**测试脚本**: `scripts/verify-oracles-simple.mjs`
