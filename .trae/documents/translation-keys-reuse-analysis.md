# 翻译键复用分析计划

## 分析范围
- 分析 `MobileDrawer.tsx` 及相关组件中使用的翻译键
- 检查是否存在可以复用但未复用的翻译键
- 检查是否存在重复定义的翻译键

## 发现的问题

### 1. 当前 `MobileDrawer.tsx` 使用的翻译键
文件位置: `src/components/navigation/MobileDrawer.tsx`

| 行号 | 当前使用 | 翻译值 |
|-----|---------|--------|
| 50 | `t('navbar.menu')` | "菜单" / "Menu" |
| 55 | `t('actions.close')` | "关闭" / "Close" |
| 80, 127, 153 | `t(group.label)` / `t(item.label)` | 动态导航标签 |

**结论**: `MobileDrawer.tsx` 中的翻译键使用是正确的，已经复用了 `navigation.json` 和 `common.json` 中的键。

### 2. 发现的重复定义问题

#### 2.1 `close` 键重复定义
- ✅ `common.actions.close` = "关闭" / "Close" (正确位置)
- ⚠️ `ui.tutorial.close` = "关闭" / "Close" (可复用)
- ⚠️ 多个 oracle 文件中也有 `close` 定义

**建议**: 保持现状，因为 `tutorial.close` 有特定的上下文含义。

#### 2.2 `loading` 锁大量重复定义
- ✅ `common.status.loading` = "加载中..." / "Loading..." (正确位置)
- ⚠️ `common.loading` = "加载中..." (重复)
- ⚠️ `common.crossChainPanel.loadingCrossChainData` = "加载跨链数据中..."
- ⚠️ `common.priceDeviation.loading` = "加载中..."
- ⚠️ `common.uma.loading` = "加载中..."
- ⚠️ `common.home.loading` = "加载中..."
- ⚠️ `common.common.loading` = "加载中..."
- ⚠️ 各个 oracle 文件中都有 `loading` 定义

**建议**: 这些 `loading` 键虽然值相同，但位于不同的命名空间下，保持现状更安全。

#### 2.3 `refresh` 键重复定义
- ✅ `common.actions.refresh` = "刷新" / "Refresh" (正确位置)
- ⚠️ `common.oracleCommon.dataFreshness.refresh` = "刷新"
- ⚠️ 多个模块中有 `refresh` 定义

**建议**: 保持现状，`dataFreshness.refresh` 有特定上下文。

### 3. 翻译文件结构分析

项目使用模块化的翻译文件结构:
```
src/i18n/messages/
├── zh-CN/
│   ├── common.json      # 通用翻译 (actions, status, time 等)
│   ├── navigation.json  # 导航相关
│   ├── ui.json          # UI 组件相关
│   ├── oracles/         # 各预言机专用翻译
│   └── components/      # 组件专用翻译
└── en/
    └── (同结构)
```

## 建议的修改方案

### 谨慎修改原则
根据用户要求"谨慎修改，不要改出报错"，建议：

1. **不修改**: `MobileDrawer.tsx` 的翻译键使用已经正确
2. **不修改**: 各模块的 `loading`、`refresh`、`close` 等键，虽然值相同但命名空间不同
3. **可选优化**: 如果要优化，可以考虑统一使用 `common.status.loading`

### 潜在风险
- 修改翻译键可能导致:
  - TypeScript 类型错误
  - 运行时翻译缺失
  - 需要同时修改多个文件

## 结论

**`MobileDrawer.tsx` 的翻译键使用已经是最佳实践**，无需修改。

项目中存在一些翻译值重复定义的情况，但这些都在不同的命名空间下，修改可能引入风险。建议保持现状，除非有明确的维护需求。

## 如果需要执行优化

如果用户确认要优化，可以执行以下步骤：

1. 检查所有使用 `t('xxx.loading')` 的地方
2. 统一替换为 `t('common.status.loading')` 或 `t('status.loading')`
3. 运行类型检查确保没有错误
4. 运行项目确保翻译正常显示

但这需要修改大量文件，风险较高，不建议在当前任务中执行。
