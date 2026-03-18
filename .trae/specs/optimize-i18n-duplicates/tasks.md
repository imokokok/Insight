# Tasks

## Phase 1: 分析和规划

- [x] Task 1.1: 分析 i18n 文件中的重复键
  - [x] 识别 `crossOracle` 和 `crossChain` 中的重复键
  - [x] 识别其他页面间的重复键
  - [x] 创建共享键映射表

## Phase 2: 创建共享命名空间

- [x] Task 2.1: 在 i18n 文件中添加 `common` 命名空间
  - [x] 添加 `common.consistency.*` (excellent, good, fair, poor)
  - [x] 添加 `common.time.*` (时间范围、相对时间)
  - [x] 添加 `common.actions.*` (刷新、重置、确定、取消等)
  - [x] 添加 `common.status.*` (加载中、在线、离线等)
  - [x] 添加 `common.filters.*` (筛选、清除全部等)
  - [x] 添加 `common.deviation.*` (偏差范围相关)

- [x] Task 2.2: 更新 en.json 和 zh-CN.json
  - [x] 添加所有共享键到两个文件
  - [x] 确保键结构一致

## Phase 3: cross-oracle 页面国际化

- [x] Task 3.1: 国际化 `cross-oracle/page.tsx`
  - [x] 提取"平均价格"、"标准差"等硬编码文本
  - [x] 提取时间范围选项（"1 小时"、"24 小时"等）
  - [x] 提取图表操作文本（"全屏查看"、"缩小"、"放大"、"重置"等）
  - [x] 提取性能分析文本（"响应时间"、"准确率"、"稳定性"等）
  - [x] 提取异常检测文本（"检测到价格异常值"、"异常预言机"等）
  - [x] 提取收藏相关文本

- [x] Task 3.2: 国际化 `cross-oracle/constants.tsx`
  - [x] 提取 `getFreshnessInfo` 函数中的相对时间文本
  - [x] 提取刷新间隔选项文本
  - [x] 修改函数签名以接受 `t` 函数

- [x] Task 3.3: 国际化 `cross-oracle/components/FilterPanel.tsx`
  - [x] 提取"当前筛选"、"清除全部"文本
  - [x] 提取"时间范围"、"偏差范围"、"预言机筛选"标签
  - [x] 提取"已应用 X 个筛选"、"无筛选条件"文本
  - [x] 提取"确定"按钮文本

- [x] Task 3.4: 国际化 `cross-oracle/components/PairSelector.tsx`
  - [x] 提取分类标签（"全部"、"主流币"、"稳定币"）
  - [x] 提取"搜索交易对..."占位符
  - [x] 提取"加载中..."文本

- [x] Task 3.5: 国际化 `cross-oracle/useCrossOraclePage.ts`
  - [x] 提取 `getFilterSummary` 中的硬编码文本

## Phase 4: 更新组件引用

- [x] Task 4.1: 更新使用重复键的组件
  - [x] 更新 `crossOracle` 页面组件使用 `common.*` 键
  - [x] 更新 `crossChain` 页面组件使用 `common.*` 键
  - [x] 更新其他预言机页面使用共享键

- [x] Task 4.2: 清理旧的重复键
  - [x] 从 i18n 文件中移除已合并的重复键
  - [x] 验证所有引用已更新

## Phase 5: 验证和测试

- [x] Task 5.1: 语言切换测试
  - [x] 验证 cross-oracle 页面正确响应语言切换
  - [x] 验证所有硬编码文本已国际化
  - [x] 验证相对时间显示正确

- [x] Task 5.2: 类型检查和构建
  - [x] 运行 TypeScript 类型检查
  - [x] 运行生产构建
  - [x] 修复任何错误

- [x] Task 5.3: 代码质量检查
  - [x] 运行 lint 检查
  - [x] 验证无控制台错误

# Task Dependencies

- Phase 2 依赖 Phase 1 完成（需要知道哪些键需要合并）
- Phase 3 依赖 Phase 2 完成（需要共享键可用）
- Phase 4 依赖 Phase 3 完成（需要组件已国际化）
- Phase 5 依赖所有其他 Phase 完成
