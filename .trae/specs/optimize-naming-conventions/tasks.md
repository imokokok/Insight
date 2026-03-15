# Tasks

- [ ] Task 1: 修正 Tellar 拼写错误为 Teller（待确认：Tellar 和 Tellor 是两个不同的预言机）
  - [ ] SubTask 1.1: 重命名 `src/lib/oracles/tellar.ts` 为 `src/lib/oracles/teller.ts`
  - [ ] SubTask 1.2: 重命名 `TellarClient` 类为 `TellerClient`
  - [ ] SubTask 1.3: 重命名 `src/hooks/useTellarData.ts` 为 `src/hooks/useTellerData.ts`
  - [ ] SubTask 1.4: 重命名 `src/app/tellar/` 目录为 `src/app/teller/`
  - [ ] SubTask 1.5: 重命名 `TellarPageContent.tsx` 为 `TellerPageContent.tsx`
  - [ ] SubTask 1.6: 更新所有导入和引用

- [x] Task 2: 修正 DI 缩写命名
  - [x] SubTask 2.1: 重命名 `src/hooks/useDI.ts` 为 `src/hooks/useDependencyInjection.ts`
  - [x] SubTask 2.2: 更新所有导入和引用

- [x] Task 3: 修正函数命名
  - [x] SubTask 3.1: 重命名 `formatCompactNumberV2` 为 `formatCompactNumberWithDecimals`
  - [ ] SubTask 3.2: 在 NodeReputationPanel 中重命名 `loadData` 为 `fetchNodeReputationData`（未执行，函数名已足够清晰）
  - [ ] SubTask 3.3: 在 NodeReputationPanel 中重命名 `generateMockNodes` 为 `generateMockNodeReputationData`（未执行，函数名已足够清晰）
  - [x] SubTask 3.4: 更新所有相关调用

- [x] Task 4: 修正变量命名
  - [x] SubTask 4.1: 在 NodeReputationPanel 中重命名 `COLORS` 为 `SCORE_COLORS`
  - [x] SubTask 4.2: 在 NodeReputationPanel 中重命名 `COLORS_MAP` 为 `NODE_TYPE_COLORS_MAP`
  - [x] SubTask 4.3: 检查并修正其他文件中的类似问题

- [x] Task 5: 统一预言机客户端命名
  - [x] SubTask 5.1: 确保所有预言机客户端类名使用 `Provider + Client` 格式
  - [x] SubTask 5.2: 确保 API3 相关命名保持大写（API3Client, useAPI3Data）
  - [x] SubTask 5.3: 确保 DIA 相关命名保持大写（DIAClient, useDIAData）
  - [x] SubTask 5.4: 确保 WINkLink 命名保持首字母大写（WINkLinkClient）

- [x] Task 6: 更新工厂类和索引文件
  - [x] SubTask 6.1: 更新 `src/lib/oracles/factory.ts` 中的引用
  - [x] SubTask 6.2: 更新 `src/lib/oracles/index.ts` 中的导出
  - [x] SubTask 6.3: 更新 `src/hooks/index.ts` 中的导出

- [x] Task 7: 验证和测试
  - [x] SubTask 7.1: 运行 TypeScript 类型检查确保无类型错误
  - [x] SubTask 7.2: 运行 lint 检查确保代码规范
  - [ ] SubTask 7.3: 运行测试确保功能正常

# Task Dependencies
- [Task 6] depends on [Task 1, Task 2, Task 3, Task 4, Task 5]
- [Task 7] depends on [Task 6]
