# Checklist

## 共享命名空间验证

- [x] `common.consistency.*` 键已添加到 en.json 和 zh-CN.json
- [x] `common.time.*` 键已添加到 en.json 和 zh-CN.json
- [x] `common.actions.*` 键已添加到 en.json 和 zh-CN.json
- [x] `common.status.*` 键已添加到 en.json 和 zh-CN.json
- [x] `common.filters.*` 键已添加到 en.json 和 zh-CN.json
- [x] `common.deviation.*` 键已添加到 en.json 和 zh-CN.json

## cross-oracle 页面国际化验证

- [x] `cross-oracle/page.tsx` 中无硬编码中文文本
- [x] `cross-oracle/constants.tsx` 中 `getFreshnessInfo` 函数已国际化
- [x] `cross-oracle/constants.tsx` 中刷新间隔选项已国际化
- [x] `cross-oracle/components/FilterPanel.tsx` 中无硬编码中文文本
- [x] `cross-oracle/components/PairSelector.tsx` 中无硬编码中文文本
- [x] `cross-oracle/useCrossOraclePage.ts` 中无硬编码中文文本

## 重复键清理验证

- [x] `crossOracle.consistency.*` 已合并到 `common.consistency.*`
- [x] `crossChain.consistency.*` 已合并到 `common.consistency.*`
- [x] 所有使用旧键的组件已更新引用
- [x] i18n 文件中无重复的翻译内容

## 功能验证

- [x] 语言切换功能正常工作
- [x] cross-oracle 页面正确显示中文和英文
- [x] 相对时间显示根据语言正确切换
- [x] 筛选面板文本正确国际化
- [x] 图表操作按钮文本正确国际化
- [x] 异常检测提示文本正确国际化

## 质量验证

- [x] TypeScript 类型检查通过（cross-oracle 相关）
- [x] 生产构建成功
- [x] 无 lint 错误（cross-oracle 相关）
- [x] 无控制台错误
- [x] 翻译文本准确自然
