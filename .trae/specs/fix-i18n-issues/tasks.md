# Tasks

- [x] Task 1: 修复 I18nProvider 重复包装问题
  - [x] SubTask 1.1: 修改 `src/lib/i18n/provider.tsx`，移除 useTranslations 和 useLocale 的重新包装
  - [x] SubTask 1.2: 保留 localStorage 持久化功能
  - [x] SubTask 1.3: 更新 `src/app/[locale]/layout.tsx`，移除 I18nProvider 包装（如果不需要 localStorage 功能）或保留（如果需要 localStorage 功能）
  - [x] SubTask 1.4: 确保组件中使用的 useLocale 和 useI18n 导入路径正确

- [x] Task 2: 添加消息加载错误日志
  - [x] SubTask 2.1: 修改 `src/i18n/request.ts` 中的 loadMessages 函数
  - [x] SubTask 2.2: 在 catch 块中添加开发环境警告日志
  - [x] SubTask 2.3: 确保日志包含失败的文件路径信息

- [x] Task 3: 修复路径替换逻辑
  - [x] SubTask 3.1: 修改 `src/lib/i18n/provider.tsx` 中的 setLocale 函数
  - [x] SubTask 3.2: 导入 routing 配置
  - [x] SubTask 3.3: 使用 routing.locales 动态生成正则表达式

- [x] Task 4: 统一 i18n 导出
  - [x] SubTask 4.1: 修改 `src/i18n/index.ts`，确保所有导出都在这里
  - [x] SubTask 4.2: 修改 `src/lib/i18n/provider.tsx`，移除 export { useLocale, useI18n }
  - [x] SubTask 4.3: 更新所有使用这些 hooks 的组件导入路径

- [x] Task 5: 统一命名空间使用
  - [x] SubTask 5.1: 修改 `src/i18n/config.ts` 中的 export 配置
  - [x] SubTask 5.2: 移除 namespace: 'unifiedExport'，使其与其他组件一致
  - [x] SubTask 5.3: 更新 `src/i18n/request.ts` 中的 export 加载逻辑
  - [x] SubTask 5.4: 更新所有使用 unifiedExport 命名空间的组件

# Task Dependencies
- Task 4 依赖于 Task 1（先修复 Provider 再统一导出）
- Task 5 可以与其他任务并行执行
