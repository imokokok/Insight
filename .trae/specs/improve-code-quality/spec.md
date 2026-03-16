# 代码质量改进规范

## Why

根据代码质量审查报告，项目存在以下需要改进的问题：依赖安全漏洞、代码格式化不一致、组件过长、Hook 过大、类型安全问题等。本规范旨在系统性地解决这些问题，提升代码质量。

## What Changes

- 修复依赖安全漏洞（6个高危漏洞）
- 统一代码格式化
- 消除 `as any` 类型断言
- 替换 `console.error` 为统一 logger
- 添加安全响应头配置
- 修复内存泄漏风险

## Impact

- Affected specs: 代码质量
- Affected code: package.json, next.config.ts, 多个组件文件

---

## 一、紧急修复（Phase 1）

### 1.1 修复依赖安全漏洞

- d3-color < 3.1.0 存在 ReDoS 漏洞
- flatted < 3.4.0 存在无界递归 DoS 漏洞
- 相关传递依赖需要更新

### 1.2 统一代码格式化

- 运行 Prettier 格式化所有文件
- 修复缩进问题（sentry 配置文件使用 4 空格）

---

## 二、质量提升（Phase 2）

### 2.1 消除 `as any` 类型断言

- [pythHermesClient.ts:101](file:///Users/imokokok/Documents/foresight-build/insight/src/lib/oracles/pythHermesClient.ts#L101) - 定义正确的 Pyth 价格数据类型
- [OraclePageTemplate.tsx:592-593](file:///Users/imokokok/Documents/foresight-build/insight/src/components/oracle/common/OraclePageTemplate.tsx#L592) - 使用类型安全的 i18n 键
- [chartSharedUtils.ts:325](file:///Users/imokokok/Documents/foresight-build/insight/src/lib/utils/chartSharedUtils.ts#L325) - 定义正确的图表颜色类型

### 2.2 替换 console 调用为 logger

- [UMARiskPanel/index.tsx:49](file:///Users/imokokok/Documents/foresight-build/insight/src/components/oracle/panels/UMARiskPanel/index.tsx#L49)
- [UMANetworkPanel/index.tsx:45](file:///Users/imokokok/Documents/foresight-build/insight/src/components/oracle/panels/UMANetworkPanel/index.tsx#L45)
- [BandValidatorsPanel.tsx:65](file:///Users/imokokok/Documents/foresight-build/insight/src/components/oracle/panels/BandValidatorsPanel.tsx#L65)
- [BandDataFeedsPanel.tsx:181](file:///Users/imokokok/Documents/foresight-build/insight/src/components/oracle/panels/BandDataFeedsPanel.tsx#L181)

### 2.3 添加安全响应头

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()

### 2.4 修复内存泄漏风险

- 检查并修复 setTimeout 未清理的问题
- 在 useEffect 中添加清理函数

---

## 三、改进目标

| 指标         | 当前值  | 目标值   |
| ------------ | ------- | -------- |
| 依赖漏洞     | 6个高危 | 0个      |
| as any 断言  | 8处     | 0处      |
| console 调用 | 4处     | 0处      |
| 安全响应头   | 缺失    | 完整配置 |
| 代码格式化   | 不一致  | 100%一致 |
