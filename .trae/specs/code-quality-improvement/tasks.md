# Tasks

## Phase 1: 配置和基础设施改进

- [x] Task 1: 增强 ESLint 配置
  - [x] SubTask 1.1: 更新 eslint.config.mjs,添加更严格的规则
  - [x] SubTask 1.2: 添加 complexity 规则限制圈复杂度
  - [x] SubTask 1.3: 添加 max-lines 规则限制文件行数
  - [x] SubTask 1.4: 添加 max-lines-per-function 规则限制函数行数
  - [x] SubTask 1.5: 运行 `npm run lint:fix` 自动修复可修复的问题

- [x] Task 2: 增强 TypeScript 配置
  - [x] SubTask 2.1: 更新 tsconfig.json,启用更严格的类型检查
  - [x] SubTask 2.2: 添加 noImplicitAny 选项
  - [x] SubTask 2.3: 添加 strictNullChecks 选项
  - [x] SubTask 2.4: 添加 noUnusedLocals 和 noUnusedParameters 选项
  - [x] SubTask 2.5: 运行 `npm run typecheck` 识别类型错误

- [x] Task 3: 添加代码质量工具
  - [x] SubTask 3.1: 安装并配置 Zod 用于运行时类型验证
  - [x] SubTask 3.2: 配置 Husky 和 lint-staged 用于提交前检查
  - [x] SubTask 3.3: 添加 pre-commit hook 运行 lint 和 typecheck
  - [x] SubTask 3.4: 配置 CI/CD 流程运行代码质量检查

## Phase 2: 大文件重构

- [x] Task 4: 重构 API3 客户端 (src/lib/oracles/api3.ts - 1511 行)
  - [x] SubTask 4.1: 提取类型定义到 types.ts
  - [x] SubTask 4.2: 提取 Mock 数据生成器到 mockData.ts
  - [x] SubTask 4.3: 提取 Alert 相关方法到 alertService.ts
  - [x] SubTask 4.4: 提取 Coverage Pool 相关方法到 coveragePoolService.ts
  - [x] SubTask 4.5: 提取 OEV 相关方法到 oevService.ts
  - [x] SubTask 4.6: 提取 Staking 相关方法到 stakingService.ts
  - [x] SubTask 4.7: 重构主文件,只保留核心逻辑
  - [x] SubTask 4.8: 更新所有导入路径

- [x] Task 5: 重构 BaseOracleClient (src/lib/oracles/base.ts - 297 行)
  - [x] SubTask 5.1: 提取 Mock 数据生成逻辑到单独文件
  - [x] SubTask 5.2: 提取数据库操作逻辑到单独文件
  - [x] SubTask 5.3: 简化主文件,只保留核心抽象类

- [x] Task 6: 重构 ProfessionalHero 组件 (src/app/[locale]/home-components/ProfessionalHero.tsx - 502 行)
  - [x] SubTask 6.1: 提取 SearchDropdown 子组件
  - [x] SubTask 6.2: 提取 SearchInput 子组件
  - [x] SubTask 6.3: 提取 PopularTokens 子组件
  - [x] SubTask 6.4: 提取 HeroContent 子组件
  - [x] SubTask 6.5: 提取自定义 hooks (useSearch, useDropdown)
  - [x] SubTask 6.6: 更新主组件使用新的子组件

- [x] Task 7: 审查并重构其他大文件
  - [x] SubTask 7.1: 识别所有超过 500 行的文件
  - [x] SubTask 7.2: 为每个文件制定重构计划
  - [x] SubTask 7.3: 执行重构

## Phase 3: 类型安全增强

- [x] Task 8: 消除 any 类型
  - [x] SubTask 8.1: 运行 ESLint 查找所有 any 类型使用
  - [x] SubTask 8.2: 为每个 any 类型定义明确的类型
  - [x] SubTask 8.3: 更新代码使用新类型

- [x] Task 9: 添加运行时类型验证
  - [x] SubTask 9.1: 为 API 响应创建 Zod schema
  - [x] SubTask 9.2: 在 API 路由中添加验证中间件
  - [x] SubTask 9.3: 在 Oracle 客户端中添加数据验证
  - [x] SubTask 9.4: 添加错误处理和用户友好的错误消息

- [x] Task 10: 增强类型定义
  - [x] SubTask 10.1: 审查所有类型定义文件
  - [x] SubTask 10.2: 添加缺失的类型定义
  - [x] SubTask 10.3: 使用更精确的类型(如字面量类型、联合类型)
  - [x] SubTask 10.4: 添加类型守卫函数

## Phase 4: 性能优化

- [x] Task 11: 组件性能优化
  - [x] SubTask 11.1: 识别重渲染频繁的组件
  - [x] SubTask 11.2: 使用 React.memo 包装合适的组件
  - [x] SubTask 11.3: 使用 useMemo 优化昂贵的计算
  - [x] SubTask 11.4: 使用 useCallback 优化回调函数
  - [x] SubTask 11.5: 使用 React DevTools 验证优化效果

- [x] Task 12: 代码分割和懒加载
  - [x] SubTask 12.1: 使用 dynamic import 懒加载大型组件
  - [x] SubTask 12.2: 按路由分割代码
  - [x] SubTask 12.3: 优化第三方库的导入
  - [x] SubTask 12.4: 分析 bundle 大小,识别优化机会

- [x] Task 13: 数据获取优化
  - [x] SubTask 13.1: 审查 React Query 使用情况
  - [x] SubTask 13.2: 优化查询缓存策略
  - [x] SubTask 13.3: 添加预加载和预取逻辑
  - [x] SubTask 13.4: 优化 WebSocket 连接管理

## Phase 5: 错误处理改进

- [x] Task 14: 统一错误处理机制
  - [x] SubTask 14.1: 创建统一的错误类型层次结构
  - [x] SubTask 14.2: 实现全局错误边界组件
  - [x] SubTask 14.3: 添加错误日志记录服务
  - [x] SubTask 14.4: 创建用户友好的错误显示组件

- [x] Task 15: API 错误处理
  - [x] SubTask 15.1: 创建统一的 API 错误处理中间件
  - [x] SubTask 15.2: 标准化 API 错误响应格式
  - [x] SubTask 15.3: 添加错误重试逻辑
  - [x] SubTask 15.4: 实现错误恢复策略

## Phase 6: 测试覆盖提升

- [ ] Task 16: 单元测试
  - [ ] SubTask 16.1: 为所有工具函数添加单元测试
  - [ ] SubTask 16.2: 为所有自定义 hooks 添加单元测试
  - [ ] SubTask 16.3: 为 Oracle 客户端添加单元测试
  - [ ] SubTask 16.4: 达到 80% 的单元测试覆盖率

- [ ] Task 17: 集成测试
  - [ ] SubTask 17.1: 为关键组件添加集成测试
  - [ ] SubTask 17.2: 为页面路由添加集成测试
  - [ ] SubTask 17.3: 为 API 路由添加集成测试
  - [ ] SubTask 17.4: 为数据流添加集成测试

- [ ] Task 18: E2E 测试
  - [ ] SubTask 18.1: 扩展现有 E2E 测试覆盖范围
  - [ ] SubTask 18.2: 添加关键用户流程的 E2E 测试
  - [ ] SubTask 18.3: 添加错误场景的 E2E 测试
  - [ ] SubTask 18.4: 配置 CI/CD 运行 E2E 测试

## Phase 7: 代码风格和文档

- [x] Task 19: 统一代码风格
  - [x] SubTask 19.1: 将所有中文注释翻译为英文
  - [x] SubTask 19.2: 统一命名规范
  - [x] SubTask 19.3: 运行 Prettier 格式化所有代码
  - [x] SubTask 19.4: 添加 EditorConfig 配置

- [x] Task 20: 添加代码文档
  - [x] SubTask 20.1: 为所有公共函数添加 JSDoc 注释
  - [x] SubTask 20.2: 为所有公共组件添加 JSDoc 注释
  - [x] SubTask 20.3: 为复杂逻辑添加内联注释
  - [x] SubTask 20.4: 更新 README 和开发文档

- [x] Task 21: 输入验证和安全
  - [x] SubTask 21.1: 审查所有用户输入点
  - [x] SubTask 21.2: 添加输入验证和清理
  - [x] SubTask 21.3: 实施 XSS 防护措施
  - [x] SubTask 21.4: 添加 CSRF 保护

- [x] Task 22: 环境变量和密钥管理
  - [x] SubTask 22.1: 审查所有硬编码的敏感信息
  - [x] SubTask 22.2: 将敏感信息迁移到环境变量
  - [x] SubTask 22.3: 创建 .env.example 文件
  - [x] SubTask 22.4: 添加环境变量验证

## Phase 9: 依赖注入和架构改进

- [ ] Task 23: 完善依赖注入系统
  - [ ] SubTask 23.1: 审查现有 DI 容器实现
  - [ ] SubTask 23.2: 为所有服务创建接口定义
  - [ ] SubTask 23.3: 重构服务实例化逻辑使用 DI
  - [ ] SubTask 23.4: 添加服务生命周期管理

- [ ] Task 24: 架构优化
  - [ ] SubTask 24.1: 审查整体架构设计
  - [ ] SubTask 24.2: 识别架构问题和改进点
  - [ ] SubTask 24.3: 重构不符合架构设计的代码
  - [ ] SubTask 24.4: 更新架构文档

## Phase 10: 最终验证和文档

- [x] Task 25: 全面测试和验证
  - [x] SubTask 25.1: 运行所有测试确保通过
  - [x] SubTask 25.2: 运行 lint 和 typecheck 确保无错误
  - [x] SubTask 25.3: 进行性能测试对比优化前后
  - [x] SubTask 25.4: 进行安全审计

- [x] Task 26: 更新文档
  - [x] SubTask 26.1: 更新 README.md
  - [x] SubTask 26.2: 更新 CONTRIBUTING.md
  - [x] SubTask 26.3: 更新 ARCHITECTURE.md
  - [x] SubTask 26.4: 创建代码质量改进报告

# Task Dependencies

- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1, Task 2]
- [Task 4] depends on [Task 3]
- [Task 5] depends on [Task 3]
- [Task 6] depends on [Task 3]
- [Task 7] depends on [Task 4, Task 5, Task 6]
- [Task 8] depends on [Task 2]
- [Task 9] depends on [Task 3]
- [Task 10] depends on [Task 8, Task 9]
- [Task 11] depends on [Task 7]
- [Task 12] depends on [Task 7]
- [Task 13] depends on [Task 12]
- [Task 14] depends on [Task 3]
- [Task 15] depends on [Task 14]
- [Task 16] depends on [Task 7, Task 10]
- [Task 17] depends on [Task 16]
- [Task 18] depends on [Task 17]
- [Task 19] depends on [Task 7]
- [Task 20] depends on [Task 19]
- [Task 21] depends on [Task 3]
- [Task 22] depends on [Task 21]
- [Task 23] depends on [Task 7, Task 10]
- [Task 24] depends on [Task 23]
- [Task 25] depends on [Task 18, Task 20, Task 22, Task 24]
- [Task 26] depends on [Task 25]
