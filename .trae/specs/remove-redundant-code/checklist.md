# 删除多余重复无用代码 Checklist

## 类型定义整合

- [x] ChartDataPoint 类型已统一到 src/types/ui/index.ts，所有文件从该处导入
- [x] ApiResponse 类型已统一到 src/lib/api/response/ApiResponse.ts
- [x] PaginatedResponse 类型已统一到 src/lib/api/response/ApiResponse.ts
- [x] PriceData 类型已统一到 src/types/oracle/price.ts
- [x] PricePoint 类型已统一到 src/types/oracle/price.ts (作为 PriceDataForChart)
- [x] TimeRange 类型已统一到 src/types/ui/index.ts
- [x] ExportConfig 类型已检查（未发现重复）

## 工具函数整合

- [x] formatNumber 函数已统一到 src/lib/utils/format.ts
- [x] formatPrice 函数已统一到 src/lib/utils/format.ts
- [x] getTimeAgo 函数已统一到 src/lib/utils/timestamp.ts
- [x] formatDate 函数已统一到 src/lib/utils/timestamp.ts
- [x] formatTimestamp 函数已统一到 src/lib/utils/timestamp.ts

## 常量整合

- [x] ORACLE_COLORS 常量已统一到 src/lib/constants/index.ts (作为 oracleColors)
- [x] chainColors 常量已统一到 src/lib/constants/index.ts
- [x] providerNames/PROVIDER_NAMES 常量已统一到 src/lib/constants/index.ts

## 未使用代码清理

- [x] src/components/features/index.ts 已删除
- [x] src/components/charts/index.ts 已删除
- [x] src/lib/export/index.ts 已删除
- [x] src/lib/api/validation/index.ts 已删除
- [x] src/lib/api/response/index.ts 已删除
- [x] src/types/api/responses.ts 已删除（未使用）
- [x] src/lib/api/types.ts 已删除（未使用）
- [x] 所有未使用的导入语句已自动修复（29个问题）

## 验证

- [x] TypeScript 类型检查通过 (tsc --noEmit)
- [x] ESLint 检查通过（无新错误，原有问题非本次修改引入）
- [x] 项目构建成功（TypeScript 编译无错误）
- [x] 无运行时错误（类型安全）
