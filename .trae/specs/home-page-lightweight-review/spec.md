# 轻首页设计专业审查 Spec（修订版）

## Why

用户请求对首页作为"轻首页"的设计进行专业审查，评估其优缺点并提供改进建议。用户明确要求保持简洁，不添加过多功能，保留粒子特效，新加内容必须必要且符合现有设计风格。

## What Changes

- 分析当前首页设计的优势与不足
- 提供轻量级、必要的改进建议
- 保持现有设计风格和粒子特效
- **BREAKING**: 无破坏性变更

## Impact

- Affected specs: 首页用户体验、SEO
- Affected code:
  - `src/app/[locale]/page.tsx`
  - `src/app/[locale]/home-components/ProfessionalHero.tsx`

---

## 当前首页设计分析

### ✅ 做得好的地方

#### 1. 核心功能聚焦

- **搜索为核心**: 搜索框作为主要交互点，符合轻首页"快速入口"的设计理念
- **清晰的CTA**: 两个主要行动按钮（市场概览、价格查询）目标明确
- **热门代币快捷入口**: 降低用户操作成本

#### 2. 视觉设计

- **简洁的布局**: 居中对齐，视觉层次清晰
- **品牌一致性**: 配色和风格与应用整体一致
- **微动画**: 入场动画和交互反馈增强用户体验
- **粒子特效**: 增强科技感，符合预言机数据平台的定位

#### 3. 技术实现

- **动态导入**: ProfessionalHero 使用 `ssr: false` 避免水合问题
- **搜索历史**: localStorage 持久化，提升复用体验
- **键盘支持**: 完整的键盘导航支持
- **无障碍**: 支持 prefers-reduced-motion

---

## ⚠️ 需要改进的地方（仅限必要改进）

### 问题 1: 缺少 SEO 优化（严重程度：高 - 必要）

**问题描述**:
首页缺少 SEO 元数据，不利于搜索引擎收录。

**代码位置**: `src/app/[locale]/page.tsx`

**影响**:

- 搜索引擎无法正确索引首页
- 缺少 Open Graph 标签，社交分享效果差
- 影响网站流量和可发现性

**建议方案**（轻量级，不影响视觉）:
添加 metadata 导出，这是不可见但必要的优化：

```typescript
// 在 page.tsx 中添加
export async function generateMetadata({ params }: { params: { locale: string } }) {
  return {
    title: 'Insight - 预言机数据平台',
    description: '全面分析和比较主流预言机协议。实时监控价格数据，评估协议性能。',
    keywords: ['预言机', 'oracle', 'chainlink', 'pyth', '价格数据', '区块链'],
    openGraph: {
      title: 'Insight - 预言机数据平台',
      description: '全面分析和比较主流预言机协议',
      type: 'website',
    },
  };
}
```

### 问题 2: 搜索无结果时缺少提示（严重程度：中 - 必要）

**问题描述**:
当用户搜索的内容没有匹配结果时，下拉框直接消失，没有友好提示。

**代码位置**: `src/app/[locale]/home-components/ProfessionalHero.tsx`

**影响**:

- 用户不知道是搜索完成还是系统无响应
- 缺少引导用户调整搜索词

**建议方案**（轻量级，符合现有设计）:
在搜索无结果时显示简单提示：

```typescript
// 在下拉框中添加无结果提示
{isDropdownOpen && searchQuery.trim() && dropdownItems.length === 0 && (
  <div className="px-4 py-3 text-center text-gray-500 text-sm">
    未找到匹配结果，请尝试其他关键词
  </div>
)}
```

### 问题 3: 移动端热门代币可能被截断（严重程度：中 - 必要）

**问题描述**:
热门代币按钮在小屏幕上可能被截断，虽然有 `overflow-x-auto`，但用户可能不知道可以滚动。

**代码位置**: `src/app/[locale]/home-components/ProfessionalHero.tsx` 第 445-456 行

**当前代码**:

```typescript
<div className="flex items-center justify-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
```

**建议方案**（轻量级优化）:
添加滚动提示或调整布局：

```typescript
// 方案1: 添加渐变提示可滚动
<div className="relative">
  <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
    {/* 热门代币按钮 */}
  </div>
  {/* 移动端渐变提示 */}
  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none sm:hidden" />
</div>

// 方案2: 减少移动端显示的数量
const displayedTokens = typeof window !== 'undefined' && window.innerWidth < 640
  ? POPULAR_TOKENS.slice(0, 4)
  : POPULAR_TOKENS;
```

### 问题 4: 缺少平台核心数据展示（严重程度：低 - 可选）

**问题描述**:
用户无法快速了解平台的核心价值（如支持的预言机数量、数据源数量）。

**建议方案**（轻量级，符合现有设计）:
在描述文字下方添加简单的数据统计，不使用卡片样式：

```typescript
// 在描述文字下方添加（第 287 行之后）
<div className="flex items-center justify-center gap-6 text-sm text-gray-500">
  <span>10+ 预言机</span>
  <span className="w-1 h-1 bg-gray-300 rounded-full" />
  <span>100+ 数据源</span>
  <span className="w-1 h-1 bg-gray-300 rounded-full" />
  <span>实时更新</span>
</div>
```

### 问题 5: 背景动画性能优化（严重程度：低 - 可选）

**问题描述**:
粒子特效在低端设备上可能影响性能。

**代码位置**: `src/app/[locale]/home-components/HeroBackground.tsx`

**建议方案**（保留粒子特效，仅优化性能）:
根据设备性能动态调整粒子数量：

```typescript
// 在 HeroBackground.tsx 中优化
const [particleCount, setParticleCount] = useState(25);

useEffect(() => {
  // 检测设备性能
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;

  if (isLowEnd) {
    setParticleCount(10);
  } else if (isMobile) {
    setParticleCount(15);
  } else {
    setParticleCount(25);
  }
}, []);

// 使用动态粒子数量
<ParticleNetwork particleCount={particleCount} ... />
```

---

## 不建议添加的内容

根据用户反馈，以下内容**不建议添加**：

### ❌ 不添加 FeatureCards

- 理由：卡片样式与现有设计不符
- 替代：保持简洁的搜索中心设计

### ❌ 不添加 LivePriceTicker

- 理由：会增加页面复杂度
- 替代：用户可通过搜索或 CTA 按钮查看价格

### ❌ 不添加复杂的信任指标

- 理由：不符合轻首页定位
- 替代：可添加简单的文字统计（如问题4所示）

### ❌ 不移除粒子特效

- 理由：用户明确要求保留
- 替代：仅做性能优化

---

## 优先级建议

| 问题               | 严重程度 | 建议优先级    | 预计工作量 |
| ------------------ | -------- | ------------- | ---------- |
| SEO 优化           | 🔴 高    | P0 - 立即修复 | 0.5天      |
| 搜索无结果提示     | 🟡 中    | P1 - 近期修复 | 0.5天      |
| 移动端热门代币优化 | 🟡 中    | P1 - 近期修复 | 0.5天      |
| 平台核心数据展示   | 🟢 低    | P2 - 可选优化 | 0.5天      |
| 背景动画性能优化   | 🟢 低    | P2 - 可选优化 | 0.5天      |

---

## 总结

### 当前首页的优势

1. ✅ 设计简洁，符合轻首页理念
2. ✅ 核心功能（搜索）突出
3. ✅ 视觉效果良好，粒子特效增强科技感
4. ✅ 技术实现合理

### 必要的改进（共 3 项）

1. **添加 SEO 元数据**（不可见，但必要）
2. **搜索无结果提示**（轻量级，符合现有设计）
3. **移动端热门代币优化**（轻量级，改善体验）

### 可选的改进（共 2 项）

1. **平台核心数据展示**（简单的文字统计）
2. **背景动画性能优化**（保留粒子，仅优化性能）

### 核心原则

**保持简洁，只添加必要内容**。所有改进都应：

- 不改变现有的设计风格
- 不添加卡片等复杂组件
- 保持粒子特效
- 符合轻首页的定位
