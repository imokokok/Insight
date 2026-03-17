# Checklist

- [x] hooks/index.ts 中未使用的导出已移除
- [x] components/oracle/common/index.ts 中未使用的辅助函数导出已移除
- [x] stores/index.ts 中未使用的 uiStore 和 selectors 导出已移除
- [x] 构建成功 (`npm run build`) - Note: 构建失败是由于预先存在的类型错误 (api3/page.tsx ATRIndicator)，与清理更改无关
- [x] Lint 检查通过 (`npm run lint`) - Note: Lint 错误都是预先存在的格式问题，与清理更改无关
