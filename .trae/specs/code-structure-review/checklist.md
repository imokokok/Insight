# 代码结构审查检查清单

## 高优先级检查项

- [x] store 目录已创建并包含所有必要的 stores
- [x] authStore 实现完整，包含用户认证状态管理
- [x] uiStore 实现完整，包含 UI 偏好设置管理
- [x] realtimeStore 实现完整，包含实时连接状态管理
- [x] crossChainStore 实现完整，包含跨链分析状态管理
- [x] store selectors 已创建并导出
- [x] `src/utils/` 目录已合并到 `src/lib/utils/`
- [x] 所有 utils 导入路径已更新
- [x] hooks 目录按功能分类组织
- [x] hooks 重名问题已解决
- [x] hooks/index.ts 导出文件已更新

## 中优先级检查项

- [x] Oracle 页面模板组件 ⏭️ 跳过
- [x] 类型定义已集中到 `src/types/`
- [x] 类型导入路径已更新
- [x] 服务层结构已统一

## 低优先级检查项

- [x] 依赖注入系统 ⏭️ 跳过
- [x] 国际化支持 ⏭️ 跳过
- [x] API 调用统一使用 apiClient
- [x] performance 组件目录已处理（已合并到 ui/）

## 代码质量检查项

- [x] 无循环依赖
- [x] 所有导入路径使用别名 `@/`
- [x] 文件命名符合规范（组件 PascalCase，目录 kebab-case）
- [x] 每个目录都有 index.ts 导出文件
- [x] 类型定义完整，无 any 类型
- [ ] ESLint 检查通过（待验证）
- [ ] TypeScript 编译通过（待验证）
- [ ] 所有测试通过（待验证）

## 文档检查项

- [ ] ARCHITECTURE.md 已更新反映新结构
- [ ] README.md 已更新（如有必要）
- [ ] 每个主要目录有 README 说明其用途
