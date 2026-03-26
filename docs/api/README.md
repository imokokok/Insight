# API 文档

> Insight 平台 API 接口文档

## 概述

Insight API 提供区块链预言机数据的访问接口，支持多种预言机提供商和资产类型。

### 基础 URL

```
开发环境: http://localhost:3000/api
生产环境: https://api.insight.io/api
```

### 认证

部分 API 需要认证，请在请求头中包含：

```
Authorization: Bearer <your-token>
```

### 响应格式

所有 API 返回统一的 JSON 格式：

```json
{
  "data": { ... },
  "meta": {
    "timestamp": 1704067200000
  }
}
```

错误响应：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": { ... }
  },
  "meta": {
    "timestamp": 1704067200000
  }
}
```

## 预言机 API

### 获取价格

```
GET /oracles/{provider}?symbol={symbol}&chain={chain}
```

**参数：**

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| provider | string | 是 | 预言机提供商 |
| symbol | string | 是 | 资产符号 |
| chain | string | 否 | 区块链网络 |

**响应：**

```json
{
  "data": {
    "provider": "chainlink",
    "symbol": "BTC",
    "chain": "ethereum",
    "price": 45000.50,
    "timestamp": 1704067200000,
    "confidence": 0.98,
    "change24h": 1200.50,
    "change24hPercent": 2.74
  },
  "meta": {
    "timestamp": 1704067200000
  }
}
```

### 获取历史价格

```
GET /oracles/{provider}/history?symbol={symbol}&period={period}
```

**参数：**

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| provider | string | 是 | 预言机提供商 |
| symbol | string | 是 | 资产符号 |
| period | number | 否 | 时间周期（小时） |

**响应：**

```json
{
  "data": [
    {
      "provider": "chainlink",
      "symbol": "BTC",
      "price": 45000.50,
      "timestamp": 1704067200000
    }
  ],
  "meta": {
    "timestamp": 1704067200000
  }
}
```

## 警报 API

### 获取警报列表

```
GET /alerts
```

**响应：**

```json
{
  "data": [
    {
      "id": "alert-1",
      "symbol": "BTC",
      "provider": "chainlink",
      "conditionType": "above",
      "targetValue": 50000,
      "isActive": true
    }
  ],
  "meta": {
    "timestamp": 1704067200000
  }
}
```

### 创建警报

```
POST /alerts
```

**请求体：**

```json
{
  "symbol": "BTC",
  "provider": "chainlink",
  "conditionType": "above",
  "targetValue": 50000
}
```

**响应：**

```json
{
  "data": {
    "id": "alert-1",
    "symbol": "BTC",
    "provider": "chainlink",
    "conditionType": "above",
    "targetValue": 50000,
    "isActive": true
  },
  "meta": {
    "timestamp": 1704067200000
  }
}
```

## 错误码

| 错误码 | 描述 | HTTP 状态码 |
|--------|------|-------------|
| VALIDATION_ERROR | 请求参数错误 | 400 |
| INVALID_PROVIDER | 无效的预言机提供商 | 400 |
| MISSING_PARAMS | 缺少必需参数 | 400 |
| UNAUTHORIZED | 未授权 | 401 |
| FORBIDDEN | 禁止访问 | 403 |
| NOT_FOUND | 资源不存在 | 404 |
| RATE_LIMIT_EXCEEDED | 请求过于频繁 | 429 |
| INTERNAL_ERROR | 服务器内部错误 | 500 |
| PRICE_FETCH_ERROR | 价格获取失败 | 502 |

## 速率限制

- 未认证用户：100 请求/分钟
- 认证用户：1000 请求/分钟

响应头中包含速率限制信息：

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067260
```

## SDK

### JavaScript/TypeScript

```bash
npm install @insight/api-sdk
```

```typescript
import { InsightClient } from '@insight/api-sdk';

const client = new InsightClient({
  apiKey: 'your-api-key'
});

// 获取价格
const price = await client.oracles.getPrice('chainlink', 'BTC');

// 获取历史价格
const history = await client.oracles.getHistory('chainlink', 'BTC', 24);
```

## 更多文档

- [API 层架构](../architecture/api-layer.md)
- [完整 API 参考](./reference.md)
