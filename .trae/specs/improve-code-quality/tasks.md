# Tasks

## Phase 1: 紧急修复

- [x] Task 1: 修复依赖安全漏洞
  - [x] 添加 npm overrides 强制使用安全版本
  - [x] 运行 npm install --legacy-peer-deps
  - [x] 验证漏洞已修复（0 vulnerabilities）

- [x] Task 2: 统一代码格式化
  - [x] 运行 npx prettier --write . 格式化所有文件
  - [x] 修复 sentry 配置文件的缩进问题

## Phase 2: 质量提升

- [x] Task 3: 消除 as any 类型断言
  - [x] 修复 pythHermesClient.ts 中的 as any
  - [x] 修复 OraclePageTemplate.tsx 中的 as any
  - [x] 修复 chartSharedUtils.ts 中的 as any
  - [x] 修复 DataQualityTrend.tsx 中的 as any
  - [x] 修复其他文件中的 as any

- [x] Task 4: 替换 console 调用为 logger
  - [x] 修复 UMARiskPanel/index.tsx
  - [x] 修复 UMANetworkPanel/index.tsx
  - [x] 修复 BandValidatorsPanel.tsx
  - [x] 修复 BandDataFeedsPanel.tsx

- [x] Task 5: 添加安全响应头配置
  - [x] 在 next.config.ts 中添加安全响应头

- [x] Task 6: 修复内存泄漏风险
  - [x] 检查并修复 setTimeout 未清理问题

- [x] Task 7: 修复构建类型错误
  - [x] 修复 recharts Tooltip 类型问题
  - [x] 修复 logger.error 类型问题
  - [x] 验证构建成功

---

# Task Dependencies

- Task 3, Task 4, Task 5, Task 6 可以并行执行
- Task 1, Task 2 可以并行执行
