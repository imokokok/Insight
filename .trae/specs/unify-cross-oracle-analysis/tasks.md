# 统一跨预言机分析功能任务列表

## 任务1: DIA 页面添加跨预言机分析
- [x] 1.1 在 `src/app/[locale]/dia/page.tsx` 中导入 `CrossOracleComparison` 组件
- [x] 1.2 添加 `cross-oracle` Tab 的处理逻辑
- [x] 1.3 在 `src/lib/config/oracles.tsx` 中 DIA 配置的 `tabs` 数组添加 `{ id: 'cross-oracle', labelKey: 'dia.tabs.crossOracle' }`

## 任务2: Tellor 页面添加跨预言机分析
- [x] 2.1 在 `src/app/[locale]/tellor/page.tsx` 中导入 `CrossOracleComparison` 组件
- [x] 2.2 添加 `cross-oracle` Tab 的处理逻辑
- [x] 2.3 在 `src/lib/config/oracles.tsx` 中 Tellor 配置的 `tabs` 数组添加 `{ id: 'cross-oracle', labelKey: 'tellor.tabs.crossOracle' }`

## 任务3: Chronicle 页面添加跨预言机分析
- [x] 3.1 在 `src/app/[locale]/chronicle/page.tsx` 中导入 `CrossOracleComparison` 组件
- [x] 3.2 添加 `cross-oracle` Tab 的处理逻辑
- [x] 3.3 在 `src/lib/config/oracles.tsx` 中 Chronicle 配置的 `tabs` 数组添加 `{ id: 'cross-oracle', labelKey: 'chronicle.tabs.crossOracle' }`

## 任务4: API3 页面统一跨预言机分析组件
- [x] 4.1 在 `src/app/[locale]/api3/page.tsx` 中将 `API3CrossOraclePanel` 替换为 `CrossOracleComparison`
- [x] 4.2 移除 `API3CrossOraclePanel` 的导入
- [x] 4.3 更新 `cross-oracle` Tab 的处理逻辑，直接使用 `CrossOracleComparison` 组件

## 任务5: Band Protocol 启用跨预言机分析
- [x] 5.1 在 `src/components/oracle/common/oraclePanels/BandProtocolPanelConfig.tsx` 中添加 `renderCrossOracleTab` 函数
- [x] 5.2 在 `bandProtocolPanelConfig` 对象中添加 `renderCrossOracleTab` 属性
- [x] 5.3 确保 `src/lib/config/oracles.tsx` 中 Band Protocol 配置的 `tabs` 已包含 `cross-oracle`

## 任务6: UMA 启用跨预言机分析
- [x] 6.1 在 `src/components/oracle/common/oraclePanels/UMAPanelConfig.tsx` 中添加 `renderCrossOracleTab` 函数
- [x] 6.2 在 `umaPanelConfig` 对象中添加 `renderCrossOracleTab` 属性
- [x] 6.3 确保 `src/lib/config/oracles.tsx` 中 UMA 配置的 `tabs` 已包含 `cross-oracle`

## 任务7: 验证所有修改
- [x] 7.1 验证所有页面能正常编译
- [x] 7.2 验证跨预言机 Tab 显示正常
- [x] 7.3 验证 `CrossOracleComparison` 组件功能正常

# 任务依赖
- 任务1、2、3、4 可以并行执行
- 任务5、6 可以并行执行
- 任务7 依赖于所有其他任务完成
