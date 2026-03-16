# Tasks

- [x] Task 1: 更新API3 tab配置 - 修改 `src/lib/config/oracles.tsx` 中的API3 tabs数组
  - [x] SubTask 1.1: 更新tab配置为新的8个tab结构
  - [x] SubTask 1.2: 确保tab id和labelKey正确对应

- [x] Task 2: 更新API3页面渲染逻辑 - 修改 `src/app/api3/page.tsx` 中的tab内容渲染
  - [x] SubTask 2.1: 更新 "airnode" tab 仅渲染 AirnodeDeploymentPanel
  - [x] SubTask 2.2: 新增 "dapi" tab 渲染 DapiCoveragePanel 和 DataSourceTraceabilityPanel
  - [x] SubTask 2.3: 更新 "staking" tab (原coverage) 渲染 StakingMetricsPanel, CoveragePoolPanel, CoveragePoolTimeline
  - [x] SubTask 2.4: 更新 "advanced" tab 移除 CrossOracleComparison，保留技术指标
  - [x] SubTask 2.5: 新增 "ecosystem" tab 渲染 EcosystemPanel

- [x] Task 3: 添加i18n翻译 - 更新中英文翻译文件
  - [x] SubTask 3.1: 更新 `src/i18n/en.json` 添加新的api3.tabs翻译键
  - [x] SubTask 3.2: 更新 `src/i18n/zh-CN.json` 添加新的api3.tabs翻译键

- [x] Task 4: 验证EcosystemPanel组件可用性 - 检查组件是否正确导出
  - [x] SubTask 4.1: 确认EcosystemPanel组件存在于 `src/components/oracle/panels/`
  - [x] SubTask 4.2: 确认组件已正确导出

# Task Dependencies
- Task 2 depends on Task 1 (需要先更新tab配置)
- Task 3 can be done in parallel with Task 1 and Task 2
- Task 4 should be done before Task 2.5
