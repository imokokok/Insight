# Checklist

- [x] I18nProvider 不再重新包装 next-intl 的 hooks
- [x] layout.tsx 中 Provider 嵌套问题已修复
- [x] 消息加载失败时在开发环境输出警告日志
- [x] 路径替换逻辑使用动态 locale 配置
- [x] 所有 i18n hooks 从 `src/i18n/index.ts` 统一导入
- [x] `src/lib/i18n/provider.tsx` 不再直接导出 hooks
- [x] export.json 命名空间与其他组件文件一致
- [x] 所有使用 unifiedExport 命名空间的组件已更新
- [x] 应用能正常启动，没有 TypeScript 错误
- [x] 语言切换功能正常工作
- [x] 翻译内容正确显示
