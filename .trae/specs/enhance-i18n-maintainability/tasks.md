# 国际化长期可维护性提升任务列表

## 阶段一：清理遗留文件

- [x] Task 1.1: 验证旧文件是否仍在使用
  - [x] 检查 `src/i18n/zh-CN.json` 是否有引用
  - [x] 检查 `src/i18n/en.json` 是否有引用
  - [x] 确认所有翻译键已迁移到模块化文件

- [x] Task 1.2: 删除旧的大文件
  - [x] 删除 `src/i18n/zh-CN.json`
  - [x] 删除 `src/i18n/en.json`
  - [x] 验证项目构建成功

## 阶段二：重构加载逻辑

- [x] Task 2.1: 创建配置驱动的加载机制
  - [x] 在 `config.ts` 中定义翻译文件列表
  - [x] 创建通用的文件加载函数
  - [x] 重构 `request.ts` 使用配置驱动加载

- [x] Task 2.2: 统一 common.json 的访问方式
  - [x] 移除 `request.ts` 中的双重合并逻辑
  - [x] 只保留根级别合并（支持 `t('actions.close')`）
  - [x] 验证所有翻译键访问正常

## 阶段三：类型安全增强

- [x] Task 3.1: 配置 next-intl 类型安全
  - [x] 创建 `global.d.ts` 声明文件
  - [x] 配置 TypeScript 识别翻译键类型
  - [x] 验证 IDE 自动补全功能

- [x] Task 3.2: 生成翻译键类型定义
  - [x] 创建类型生成脚本 `scripts/generate-i18n-types.js`
  - [x] 从 JSON 文件生成 TypeScript 类型 `src/i18n/generated-types.ts`
  - [x] 配置 npm script `i18n:types`

## 阶段四：添加验证工具

- [x] Task 4.1: 创建翻译键完整性检查脚本
  - [x] 扫描代码中使用的翻译键
  - [x] 对比 JSON 文件中定义的翻译键
  - [x] 输出缺失和未使用的翻译键报告

- [x] Task 4.2: 创建中英文对照检查脚本
  - [x] 检查中英文翻译键是否一一对应
  - [x] 输出缺失翻译的报告

- [x] Task 4.3: 添加 npm scripts
  - [x] 添加 `i18n:check` 命令
  - [x] 添加 `i18n:validate` 命令
  - [x] 添加 `i18n:types` 命令

## 阶段五：验证和文档

- [x] Task 5.1: 功能验证
  - [x] 运行项目构建
  - [x] 运行 TypeScript 类型检查
  - [x] 测试所有页面翻译正常显示
  - [x] 测试语言切换功能

- [x] Task 5.2: 更新项目文档
  - [x] 更新 README 中的 i18n 使用说明
  - [x] 添加翻译键命名规范文档
  - [x] 添加添加新翻译的指南

## 任务依赖关系

```
阶段一 (清理遗留文件)
    ↓
阶段二 (重构加载逻辑)
    ↓
阶段三 (类型安全) ←→ 阶段四 (验证工具)
    ↓
阶段五 (验证和文档)
```

- 阶段三和阶段四可以并行执行
- 阶段五必须在所有任务完成后执行
