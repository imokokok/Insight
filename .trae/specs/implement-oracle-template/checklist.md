# Checklist

## Phase 1: 核心基础设施

- [x] useOraclePage Hook 创建完成
- [x] useOraclePage 返回类型定义完整
- [x] useOraclePage 支持所有预言机数据获取
- [x] OracleConfig 扩展完成
- [x] viewComponents 配置添加完成
- [x] features 与 Tab 映射关系正确

## Phase 2: 通用组件

- [x] OracleHero 组件创建完成
- [x] OracleHero 支持主题色和图标配置
- [x] OracleSidebar 组件创建完成
- [x] OracleSidebar 根据 config.tabs 动态渲染
- [x] OracleContentView 组件创建完成
- [x] OracleContentView 支持动态组件加载

## Phase 3: 模板重构

- [x] OraclePageTemplate 重构完成
- [x] OraclePageTemplate 接受 provider 参数
- [x] OraclePageTemplate 集成 useOraclePage
- [x] OraclePageTemplate 使用通用组件
- [x] OraclePageTemplate 统一处理加载和错误状态

## Phase 4: 页面迁移

- [x] Chainlink 页面重构完成
- [x] Pyth 页面重构完成
- [x] Band Protocol 页面重构完成
- [x] UMA 页面重构完成
- [x] API3 页面重构完成
- [x] RedStone 页面重构完成
- [x] DIA 页面重构完成
- [x] Tellor 页面重构完成
- [x] Chronicle 页面重构完成
- [x] WINkLink 页面重构完成

## Phase 5: 清理和验证

- [x] 冗余代码已清理（保留特定数据获取逻辑）
- [x] 导出索引文件已更新
- [x] TypeScript 类型检查通过（无新增错误）
- [x] 所有预言机页面使用新模板

## 最终检查

- [x] 代码量减少约80%（从~150行/页面 到 ~8行/页面）
- [x] 新增预言机只需添加配置
- [x] 所有预言机页面样式一致
- [x] 向后兼容（支持 legacy 模式）

## 收益总结

| 指标           | 优化前                    | 优化后                |
| -------------- | ------------------------- | --------------------- |
| 页面代码行数   | ~150行/页面 × 10 = 1500行 | ~8行/页面 × 10 = 80行 |
| 数据获取 Hook  | 10个独立文件              | 1个通用 Hook          |
| Hero 组件      | 10个重复组件              | 1个通用组件           |
| Sidebar 组件   | 10个重复组件              | 1个通用组件           |
| 新增预言机成本 | 复制整个目录 + 修改       | 添加配置 + 特定组件   |
| 维护成本       | 高（10倍重复）            | 低（单一模板）        |
