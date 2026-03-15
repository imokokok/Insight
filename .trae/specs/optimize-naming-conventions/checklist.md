# Checklist

## 文件命名检查
- [ ] `tellar.ts` 已重命名为 `teller.ts`（待确认：Tellar 和 Tellor 是两个不同的预言机）
- [ ] `useTellarData.ts` 已重命名为 `useTellerData.ts`（待确认）
- [x] `useDI.ts` 已重命名为 `useDependencyInjection.ts`
- [ ] `tellar/` 目录已重命名为 `teller/`（待确认）
- [ ] `TellarPageContent.tsx` 已重命名为 `TellerPageContent.tsx`（待确认）

## 类命名检查
- [ ] `TellarClient` 已重命名为 `TellerClient`（待确认）
- [x] 所有预言机客户端类名使用 `Provider + Client` 格式

## 函数命名检查
- [x] `formatCompactNumberV2` 已重命名为 `formatCompactNumberWithDecimals`
- [ ] `loadData` 在 NodeReputationPanel 中已重命名为 `fetchNodeReputationData`（未执行，函数名已足够清晰）
- [ ] `generateMockNodes` 已重命名为 `generateMockNodeReputationData`（未执行，函数名已足够清晰）

## 变量命名检查
- [x] `COLORS` 在 NodeReputationPanel 中已重命名为 `SCORE_COLORS`
- [x] `COLORS_MAP` 已重命名为 `NODE_TYPE_COLORS_MAP`

## 导入导出检查
- [x] `factory.ts` 中的所有引用已更新
- [x] `lib/oracles/index.ts` 中的导出已更新
- [x] `hooks/index.ts` 中的导出已更新
- [x] 所有使用旧名称的导入语句已更新

## 缩写一致性检查
- [x] API3 相关命名保持大写（API3Client, useAPI3Data, API3PageContent）
- [x] DIA 相关命名保持大写（DIAClient, useDIAData, DIAPageContent）
- [x] WINkLink 命名保持首字母大写（WINkLinkClient, WINkLinkPageContent）
- [x] UMA 相关命名保持大写（UMAClient）

## 代码质量检查
- [x] TypeScript 类型检查通过，无类型错误
- [x] ESLint 检查通过，无新增 lint 错误
- [ ] 所有测试通过
