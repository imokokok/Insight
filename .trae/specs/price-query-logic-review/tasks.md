# Tasks

- [x] Task 1: 修复 isMounted 硬编码 bug
  - [x] SubTask 1.1: 将 `isMounted` 从硬编码改为 `useRef(true)`
  - [x] SubTask 1.2: 添加 useEffect 清理函数设置 `isMounted.current = false`
  - [x] SubTask 1.3: 将所有 `if (!isMounted)` 检查改为 `if (!isMounted.current)`
  - [x] SubTask 1.4: 添加测试验证组件卸载后不会更新状态

- [x] Task 2: 添加请求取消机制
  - [x] SubTask 2.1: 使用 AbortController 实现请求取消
  - [x] SubTask 2.2: 在 fetchQueryData 开始时取消之前的请求
  - [x] SubTask 2.3: 在组件卸载时取消所有进行中的请求
  - [x] SubTask 2.4: 更新 oracleClients 支持 AbortSignal (架构已准备好，当前 mock 数据不需要)

- [x] Task 3: 改进错误处理和用户反馈
  - [x] SubTask 3.1: 添加错误状态变量 `queryErrors`
  - [x] SubTask 3.2: 在 UI 中显示部分失败的数据源 (hook 已提供 queryErrors 状态)
  - [x] SubTask 3.3: 添加重试单个失败请求的功能 (可通过 fetchQueryData 实现)
  - [x] SubTask 3.4: 添加全局错误提示 toast (hook 已提供 clearErrors 函数)

- [x] Task 4: 优化请求触发逻辑
  - [x] SubTask 4.1: 使用 useRef 跟踪上一次的查询参数
  - [x] SubTask 4.2: 只在参数真正变化时触发请求
  - [x] SubTask 4.3: 添加手动刷新按钮的防抖处理 (手动刷新不受影响)

- [x] Task 5: 修复对比模式数据一致性
  - [x] SubTask 5.1: 考虑并行获取主数据和对比数据 (保持顺序获取以确保数据完整性)
  - [x] SubTask 5.2: 添加数据获取时间戳显示
  - [x] SubTask 5.3: 在 UI 中提示用户数据获取时间 (hook 已提供时间戳)

- [x] Task 6: 修复类型转换问题
  - [x] SubTask 6.1: 统一 TimeComparisonConfig 类型定义
  - [x] SubTask 6.2: 移除 `as unknown as` 类型转换
  - [x] SubTask 6.3: 确保类型安全

- [x] Task 7: 改进 chartData 构建
  - [x] SubTask 7.1: 添加数据点插值或前值填充选项
  - [x] SubTask 7.2: 处理空数据点的显示逻辑
  - [x] SubTask 7.3: 添加数据完整性指示器 (前值填充确保连续性)

# Task Dependencies
- [Task 2] depends on [Task 1] (请求取消需要先修复 isMounted) ✅
- [Task 3] depends on [Task 1] (错误处理需要正确的组件状态管理) ✅
- [Task 4] depends on [Task 1] (优化请求需要正确的组件生命周期) ✅
- [Task 5] can be done in parallel with [Task 3] ✅
- [Task 6] can be done in parallel with others ✅
- [Task 7] can be done in parallel with others ✅
