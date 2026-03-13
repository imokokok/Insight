# Tasks

## 高优先级任务

- [x] Task 1: 建立测试体系
  - [x] SubTask 1.1: 配置 Jest 和 React Testing Library
  - [x] SubTask 1.2: 为 BaseOracleClient 编写单元测试
  - [x] SubTask 1.3: 为 useOracleData hook 编写测试
  - [ ] SubTask 1.4: 为核心组件编写测试（PriceChart、OraclePageTemplate）
  - [ ] SubTask 1.5: 配置测试覆盖率报告，目标 > 70%

- [x] Task 2: 统一日志管理
  - [x] SubTask 2.1: 创建 logger 工具类（src/lib/utils/logger.ts）
  - [x] SubTask 2.2: 替换所有 console.log 为 logger 调用
  - [ ] SubTask 2.3: 配置生产环境日志级别
  - [ ] SubTask 2.4: 集成错误追踪服务（Sentry 或类似服务）

## 中优先级任务

- [x] Task 3: 完善类型安全
  - [x] SubTask 3.1: 消除 src/lib/supabase/queries.ts 中的 any 类型
  - [x] SubTask 3.2: 消除 src/components/oracle 目录下的 any 类型
  - [x] SubTask 3.3: 为 API 响应定义精确类型
  - [x] SubTask 3.4: 使用泛型优化 DatabaseQueries 类

- [ ] Task 4: 统一错误处理
  - [ ] SubTask 4.1: 定义错误处理策略文档
  - [ ] SubTask 4.2: 创建统一的错误边界组件
  - [ ] SubTask 4.3: 实现 useErrorHandler hook
  - [ ] SubTask 4.4: 为 API 层添加统一错误处理

- [ ] Task 5: 完善文档
  - [ ] SubTask 5.1: 编写详细的 README.md
  - [ ] SubTask 5.2: 创建架构设计文档
  - [ ] SubTask 5.3: 编写 API 使用文档
  - [ ] SubTask 5.4: 创建组件文档和示例

## 低优先级任务

- [ ] Task 6: 性能优化
  - [ ] SubTask 6.1: 集成 web-vitals 性能监控
  - [ ] SubTask 6.2: 为大数据列表添加虚拟滚动优化
  - [ ] SubTask 6.3: 实现图表数据缓存策略
  - [ ] SubTask 6.4: 优化组件渲染性能（React.memo、useMemo、useCallback）

- [ ] Task 7: 代码质量工具
  - [ ] SubTask 7.1: 配置 pre-commit hooks（husky + lint-staged）
  - [ ] SubTask 7.2: 添加代码复杂度检查工具
  - [ ] SubTask 7.3: 配置 GitHub Actions CI/CD
  - [ ] SubTask 7.4: 集成代码质量扫描工具（SonarQube 或 CodeClimate）

# Task Dependencies

- Task 1 和 Task 2 可以并行执行（无依赖关系）
- Task 3 依赖 Task 1（需要测试来验证类型修改）
- Task 4 可以与 Task 3 并行执行
- Task 5 可以在任何时间执行，建议在 Task 1-4 完成后
- Task 6 依赖 Task 1（需要测试保证性能优化不破坏功能）
- Task 7 可以在最后执行，作为持续改进的一部分
