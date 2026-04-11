# 上线前测试修复任务列表

## 第一阶段：修复失败的测试用例（优先级：高）

### Task 1: 修复 Alert 相关测试失败

- [x] 分析 Alert 测试失败原因
  - [x] 检查 AlertConfig.test.tsx 失败原因
  - [x] 检查 AlertList.test.tsx 失败原因
  - [x] 检查 useAlerts.test.tsx 失败原因
- [x] 修复 AlertConfig 测试
  - [x] 修复 mute-period 元素查找失败问题
  - [x] 确保 Mock 数据正确
  - [x] 验证组件渲染
- [x] 修复 useAlerts Hook 测试
  - [x] 修复 isCreating 状态跟踪问题
  - [x] 修复 updateAlert 方法调用问题
  - [x] 修复 deleteAlert 方法调用问题
  - [x] 修复 acknowledge 方法调用问题
  - [x] 修复 batchOperation 方法调用问题
- [x] 验证所有 Alert 测试通过

### Task 2: 修复 Favorites 测试失败

- [x] 分析 Favorites 测试崩溃原因
  - [x] 检查内存使用情况
  - [x] 检查 Jest worker 配置
  - [x] 检查测试隔离问题
- [x] 修复内存崩溃问题
  - [x] 优化测试数据结构
  - [x] 减少不必要的 Mock
  - [x] 清理测试副作用
- [x] 验证所有 Favorites 测试通过

### Task 3: 修复 DataFreshness 测试失败

- [x] 分析内存溢出原因
  - [x] 检查测试数据大小
  - [x] 检查异步操作清理
  - [x] 检查定时器清理
- [x] 修复内存问题
  - [x] 优化测试用例
  - [x] 添加清理逻辑
  - [x] 限制数据量
- [x] 验证测试正常完成

### Task 4: 修复其他失败的测试

- [x] 修复 guards.test.ts 语法错误（已完成）
- [x] 修复其他 97 个失败测试
  - [x] 统计各模块失败数量
  - [x] 优先修复高频失败模式
  - [x] 逐个模块修复

## 第二阶段：提高测试覆盖率（优先级：高）

### Task 5: 识别低覆盖率模块

- [x] 运行覆盖率报告
  - [x] 执行 `npm run test:coverage`
  - [x] 分析 coverage/lcov-report/index.html
  - [x] 列出覆盖率 < 30% 的模块
- [x] 确定优先级
  - [x] 标记核心业务逻辑模块
  - [x] 标记高风险模块
  - [x] 制定测试计划

### Task 6: 为核心模块添加测试

- [x] 为 Oracle 数据处理添加测试
  - [x] 测试价格计算逻辑
  - [x] 测试数据验证逻辑
  - [x] 测试错误处理逻辑
- [x] 为 API 路由添加测试
  - [x] 测试 /api/prices 路由
  - [x] 测试 /api/oracles 路由
  - [x] 测试 /api/alerts 路由
- [x] 为工具函数添加测试
  - [x] 测试格式化函数
  - [x] 测试验证函数
  - [x] 测试计算函数

### Task 7: 达到覆盖率目标

- [x] 提升覆盖率至 40%
  - [x] 添加基础测试用例
  - [x] 覆盖主要分支
- [x] 提升覆盖率至 50%
  - [x] 添加边界情况测试
  - [x] 添加错误情况测试
- [x] 验证覆盖率报告

## 第三阶段：修复代码规范问题（优先级：中）

### Task 8: 修复 ESLint 错误

- [x] 修复函数长度问题
  - [x] 重构 authStore.test.ts (575 行)
  - [x] 重构 crossChainStore.test.ts (721 行)
  - [x] 重构 realtimeStore.test.ts (550 行)
  - [x] 重构 uiStore.test.ts (688 行)
  - [x] 重构 queries.test.ts (978 行)
  - [x] 重构 handler.test.ts (623 行)
  - [x] 重构 alertService.test.ts (600 行)
- [x] 修复 any 类型使用
  - [x] 替换 riskMetrics.test.ts 中的 any
  - [x] 替换 ApiResponse.test.ts 中的 any
  - [x] 替换 anomalyCalculations.test.ts 中的 any
  - [x] 替换 utils.test.ts 中的 any
- [x] 修复 require 导入
  - [x] 替换 authMiddleware.test.ts 中的 require
  - [x] 替换 errorMiddleware.test.ts 中的 require
  - [x] 替换 handler.test.ts 中的 require
  - [x] 替换 schemas.test.ts 中的 require
  - [x] 替换 utils.test.ts 中的 require
  - [x] 替换 validationMiddleware.test.ts 中的 require
  - [x] 替换 alertService.test.ts 中的 require

### Task 9: 清理 ESLint 警告

- [x] 清理未使用的变量
  - [x] 移除或标记未使用的变量
  - [x] 使用 `_` 前缀标记有意未使用的参数
- [x] 清理未使用的导入
  - [x] 移除未使用的导入语句
  - [x] 统一类型导入方式

## 第四阶段：优化测试配置（优先级：中）

### Task 10: 解决内存问题

- [x] 增加 Jest 内存限制
  - [x] 修改 jest.config.js
  - [x] 设置 `maxWorkers` 和 `memoryLimit`
- [x] 优化测试运行
  - [x] 配置测试并行度
  - [x] 设置合理的超时时间
- [x] 验证内存问题解决

### Task 11: 优化测试性能

- [ ] 分析慢测试
  - [ ] 识别耗时 > 5s 的测试
  - [ ] 优化测试逻辑
- [ ] 优化测试设置
  - [ ] 减少重复初始化
  - [ ] 使用 beforeAll/afterAll

## 第五阶段：最终验证（优先级：高）

### Task 12: 运行完整测试套件

- [ ] 运行所有单元测试
  - [ ] 执行 `npm run test`
  - [ ] 确保通过率 > 95%
- [ ] 运行覆盖率测试
  - [ ] 执行 `npm run test:coverage`
  - [ ] 确保覆盖率 > 50%

### Task 13: 运行代码质量检查

- [ ] 运行 TypeScript 检查
  - [ ] 执行 `npm run typecheck`
  - [ ] 确保无错误
- [ ] 运行 ESLint 检查
  - [ ] 执行 `npm run lint`
  - [ ] 确保错误 < 10 个

### Task 14: 运行构建测试

- [ ] 运行生产构建
  - [ ] 执行 `npm run build`
  - [ ] 确保构建成功
- [ ] 验证构建输出
  - [ ] 检查生成的页面
  - [ ] 检查资源大小

---

## 任务依赖关系

```
Task 1 (Alert 测试) ──┐
Task 2 (Favorites 测试) ──┤
Task 3 (DataFreshness 测试) ──┼──> Task 12 (完整测试套件)
Task 4 (其他测试) ──┤
Task 10 (内存优化) ──┘
                                 │
                                 ↓
Task 5 (识别低覆盖率) ──> Task 6 (核心模块测试) ──> Task 7 (覆盖率目标)
                                 │
                                 ↓
Task 8 (ESLint 错误) ──> Task 9 (ESLint 警告) ──> Task 13 (质量检查)
                                 │
                                 ↓
                          Task 14 (构建测试)
```

## 验收标准

每个任务完成后应满足：

1. **测试通过**
   - ✅ 所有修复的测试通过
   - ✅ 无新增失败测试
   - ✅ 测试运行时间合理

2. **覆盖率达标**
   - ✅ 总体覆盖率 > 50%
   - ✅ 核心模块覆盖率 > 50%

3. **代码质量**
   - ✅ ESLint 错误 < 10 个
   - ✅ TypeScript 检查通过
   - ✅ 构建成功

## 时间估算

| 阶段     | 预计时间 | 关键任务                 |
| -------- | -------- | ------------------------ |
| 第一阶段 | 2-3 天   | 修复失败测试             |
| 第二阶段 | 2-3 天   | 提高覆盖率               |
| 第三阶段 | 1-2 天   | 修复代码规范             |
| 第四阶段 | 1 天     | 优化测试配置             |
| 第五阶段 | 1 天     | 最终验证                 |

**总计：7-10 天**
