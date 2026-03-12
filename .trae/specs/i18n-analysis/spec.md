# 国际化实现分析与优化 Spec

## Why
项目当前实现了自定义的国际化系统，但已安装了 `next-intl` 包却未使用。需要评估当前实现是否符合主流实践，以及是否需要迁移到更成熟的解决方案。

## What Changes
- 分析当前国际化实现的优缺点
- 评估是否需要迁移到 next-intl
- 提供优化建议

## Impact
- Affected code: `src/lib/i18n/context.tsx`, `src/components/LanguageSwitcher.tsx`, `src/i18n/*.json`

## Current Implementation Analysis

### 当前实现架构

项目使用自定义的国际化实现：

1. **核心文件**：
   - `src/lib/i18n/context.tsx` - React Context 实现
   - `src/i18n/en.json` - 英文翻译（2725 行）
   - `src/i18n/zh-CN.json` - 中文翻译（2820 行）
   - `src/components/LanguageSwitcher.tsx` - 语言切换组件

2. **实现特点**：
   - 使用 React Context API 管理语言状态
   - 静态 JSON 翻译文件
   - localStorage 持久化用户偏好
   - 浏览器语言自动检测
   - 支持嵌套 key（如 `navbar.home`）
   - 支持参数替换（如 `{count}`）

### 优点

1. ✅ **实现简单直观**：代码易于理解和维护
2. ✅ **功能完整**：支持基本翻译、参数替换、语言切换
3. ✅ **持久化支持**：使用 localStorage 保存用户偏好
4. ✅ **自动检测**：根据浏览器语言自动选择默认语言
5. ✅ **翻译文件结构清晰**：按功能模块组织，便于管理

### 缺点与问题

1. ❌ **未使用已安装的 next-intl**
   - package.json 中已安装 `next-intl@^4.8.3`
   - 但完全使用自定义实现，造成依赖冗余

2. ❌ **SSR/SSG 兼容性问题**
   ```tsx
   const [locale, setLocaleState] = useState<Locale>(() => {
     if (typeof window === 'undefined') return 'en';  // 服务端固定返回 'en'
     // ...
   });
   ```
   - 服务端渲染时无法访问 localStorage 和 navigator
   - 可能导致水合不匹配（hydration mismatch）
   - HTML lang 属性固定为 "en"，无法动态更新

3. ❌ **缺少类型安全**
   ```tsx
   const t = (key: string, params?: Record<string, string | number>): string
   ```
   - `key` 参数是普通字符串，没有类型检查
   - IDE 无法提供自动补全
   - 拼写错误只能在运行时发现

4. ❌ **缺少 SEO 优化**
   - 没有 URL 路径国际化（如 `/en/`, `/zh/`）
   - 搜索引擎无法区分不同语言版本
   - 缺少 hreflang 标签支持

5. ❌ **缺少高级功能**
   - 没有复数处理（pluralization）
   - 没有日期/数字/货币格式化
   - 没有翻译缺失时的回退机制
   - 没有翻译文件懒加载

## Mainstream Solutions Comparison

### 1. next-intl（推荐用于 Next.js）

**优势**：
- ✅ 官方推荐的 Next.js 国际化方案
- ✅ 完美支持 SSR/SSG/ISR
- ✅ 自动处理水合问题
- ✅ URL 路径国际化（`/en/`, `/zh/`）
- ✅ 类型安全（TypeScript 支持）
- ✅ SEO 友好（自动生成 hreflang）
- ✅ 支持命名空间和懒加载
- ✅ 内置日期/数字格式化

**示例**：
```tsx
// middleware.ts - 自动路由
export default middleware(routing);

// 使用
const t = useTranslations('navbar');
t('home'); // 类型安全，有自动补全
```

### 2. react-i18next

**优势**：
- ✅ 生态成熟，社区活跃
- ✅ 功能全面（复数、插值、格式化）
- ✅ 支持命名空间和懒加载
- ✅ 类型安全支持

**劣势**：
- ⚠️ 需要 extra 配置才能完美支持 Next.js SSR
- ⚠️ 包体积较大

### 3. formatjs (react-intl)

**优势**：
- ✅ ICU Message Format 标准
- ✅ 强大的格式化功能
- ✅ 类型安全

**劣势**：
- ⚠️ API 相对复杂
- ⚠️ 需要 extra 配置支持 Next.js

## Recommendations

### 方案 A：迁移到 next-intl（推荐）

**理由**：
1. 项目已安装 next-intl，应充分利用
2. 完美支持 Next.js 16 的 SSR/SSG
3. 提供更好的 SEO 和类型安全
4. 社区活跃，文档完善

**迁移成本**：
- 中等（需要重构 Context，调整翻译文件结构）
- 翻译文件可以直接复用
- 需要添加 middleware 和配置文件

### 方案 B：优化现有实现

**适用场景**：
- 不需要 SEO 优化
- 项目规模较小
- 不想引入额外依赖

**优化建议**：
1. 添加类型安全
2. 修复 SSR 水合问题
3. 添加日期/数字格式化
4. 移除未使用的 next-intl 依赖

## Conclusion

当前实现**不是主流方式**，存在以下问题：

1. **技术选型不一致**：安装了 next-intl 却未使用
2. **缺少 SSR 支持**：可能导致水合问题
3. **缺少类型安全**：容易出错，开发体验差
4. **缺少 SEO 优化**：不利于搜索引擎收录

**建议**：迁移到 next-intl，因为：
- 项目已安装该依赖
- 是 Next.js 官方推荐方案
- 能解决所有现有问题
- 翻译文件可复用，迁移成本可控

对于这个预言机数据分析平台，如果不需要 SEO 优化（如内部工具），当前实现可以接受。但如果需要公开访问和搜索引擎收录，强烈建议迁移到 next-intl。
