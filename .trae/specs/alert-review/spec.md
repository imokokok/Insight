# 告警功能完善性审查 Spec

## Why
用户请求审查当前告警功能的完善程度，识别潜在问题和改进空间。

## What Changes
- 审查现有告警功能实现
- 识别功能缺失和潜在问题
- 提出改进建议

## Impact
- Affected specs: 告警系统
- Affected code: 
  - `src/app/[locale]/alerts/page.tsx`
  - `src/components/alerts/*`
  - `src/hooks/useAlerts.ts`
  - `src/lib/alerts/detector.ts`
  - `src/lib/supabase/queries.ts`
  - `supabase/migrations/001_initial_schema.sql`

## 审查结果

### ✅ 已实现的功能

#### 1. 告警配置 (AlertConfig)
- [x] 创建告警表单
- [x] 支持多种交易对 (BTC, ETH, LINK, PYTH等)
- [x] 支持选择预言机提供商 (可选)
- [x] 支持选择区块链 (可选，依赖provider)
- [x] 三种条件类型: `above`, `below`, `change_percent`
- [x] 目标值设置
- [x] 启用/禁用开关
- [x] 告警名称 (可选)

#### 2. 告警列表 (AlertList)
- [x] 显示所有用户告警
- [x] 告警状态显示 (active/triggered/disabled)
- [x] 启用/禁用告警
- [x] 编辑告警目标值
- [x] 删除告警 (带确认)
- [x] 虚拟滚动优化长列表
- [x] 显示最后触发时间

#### 3. 告警历史 (AlertHistory)
- [x] 显示所有触发事件
- [x] 筛选状态 (全部/已确认/未确认)
- [x] 排序 (最新/最早)
- [x] 确认事件功能
- [x] 显示未确认数量

#### 4. 告警通知 (AlertNotification)
- [x] Toast通知组件
- [x] 显示触发详情
- [x] 快速确认功能
- [x] 查看详情跳转
- [x] 动画效果

#### 5. 实时订阅
- [x] Supabase Realtime订阅告警变更
- [x] 订阅告警事件
- [x] 浏览器通知支持
- [x] 连接状态管理

#### 6. 告警检测器 (detector.ts)
- [x] 价格条件检测 (`above`, `below`, `change_percent`)
- [x] 批量获取价格历史
- [x] 价格缓存机制
- [x] 触发告警并创建事件
- [x] 防重复触发 (1小时冷却)
- [x] AlertDetector类支持定时检测

#### 7. API路由
- [x] GET /api/alerts - 获取用户告警列表
- [x] POST /api/alerts - 创建告警
- [x] GET /api/alerts/[id] - 获取单个告警
- [x] PUT /api/alerts/[id] - 更新告警
- [x] DELETE /api/alerts/[id] - 删除告警
- [x] GET /api/alerts/events - 获取告警事件
- [x] POST /api/alerts/events/[id]/acknowledge - 确认事件

#### 8. 数据库
- [x] price_alerts表
- [x] alert_events表
- [x] RLS策略
- [x] 索引优化
- [x] active_alerts_with_prices视图

#### 9. 测试覆盖
- [x] detector.test.ts - 全面的单元测试
- [x] 边界条件测试
- [x] 并发告警测试
- [x] 特殊场景测试

### ⚠️ 发现的问题

#### 1. 数据库Schema与代码不一致
**严重程度: 高**

数据库 `price_alerts` 表缺少 `name` 字段:
```sql
-- 数据库定义
CREATE TABLE public.price_alerts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    symbol TEXT NOT NULL,
    provider TEXT,
    chain TEXT,
    condition_type TEXT NOT NULL,
    target_value DECIMAL(20, 8) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
    -- 缺少 name 字段!
);
```

但代码中 `PriceAlert` 接口和 `PriceAlertInsert` 接口都包含 `name` 字段:
```typescript
export interface PriceAlert {
  id: string;
  user_id: string;
  name: string;  // 数据库没有这个字段
  // ...
}
```

**影响**: 创建告警时可能会失败或name字段丢失

#### 2. 存在两套告警系统
**严重程度: 中**

存在两套不同的告警实现:
1. **数据库驱动**: `src/hooks/useAlerts.ts` + `src/lib/alerts/detector.ts`
2. **localStorage驱动**: `src/lib/realtime/priceAlerts.ts`

localStorage版本功能:
- 支持价格和涨跌幅两种类型
- 支持浏览器通知和声音提醒
- 完全本地存储

这可能导致混淆和维护困难。

#### 3. 缺少告警名称的国际化
**严重程度: 低**

`formatConditionMet` 函数返回硬编码的中文字符串，而不是使用i18n:
```typescript
export function formatConditionMet(...) {
  switch (conditionType) {
    case 'above':
      return `价格 ${currentPrice.toFixed(4)} 达到目标 ${targetValue.toFixed(4)}`;
    // ...
  }
}
```

#### 4. 通知设置未与告警系统集成
**严重程度: 中**

`NotificationPanel.tsx` 中的设置保存在localStorage，但告警系统未读取这些设置:
- `emailNotifications` - 未实现邮件通知
- `browserNotifications` - 未与告警触发集成
- `priceChangeThreshold` - 未被使用

#### 5. 缺少批量操作
**严重程度: 低**

- 无法批量启用/禁用告警
- 无法批量删除告警
- 无法批量确认事件

#### 6. 缺少告警模板/预设
**严重程度: 低**

虽然 `priceAlerts.ts` 定义了 `ALERT_TEMPLATES`，但UI中未使用。

#### 7. 缺少告警统计
**严重程度: 低**

- 无触发频率统计
- 无告警效果分析
- 无历史趋势图表

### 📋 改进建议

#### 高优先级
1. **修复数据库Schema**: 添加 `name` 字段到 `price_alerts` 表 ✅ 已完成
2. **统一告警系统**: 决定使用数据库还是localStorage，或明确两者的使用场景 ✅ 已完成

**架构决策**: 保留两套系统，明确分工：
- **数据库驱动系统** (`useAlerts.ts` + `detector.ts`): 用于用户登录后的持久化告警，支持跨设备同步
- **localStorage驱动系统** (`priceAlerts.ts`): 用于临时/本地告警，支持离线使用和快速设置

#### 中优先级
3. **集成通知设置**: 让 `NotificationPanel` 的设置真正影响告警行为 ✅ 已完成
4. **国际化告警消息**: 使用i18n替换硬编码字符串 ✅ 已完成
5. **添加邮件通知**: 实现email通知功能 (可选，未实现)

#### 低优先级
6. **批量操作**: 添加批量启用/禁用/删除功能
7. **告警模板**: 在UI中提供预设模板
8. **告警统计**: 添加触发统计和分析功能

## ADDED Requirements

### Requirement: 数据库Schema修复
数据库 `price_alerts` 表 SHALL 包含 `name` 字段以支持告警命名。

#### Scenario: 创建带名称的告警
- **WHEN** 用户创建告警并指定名称
- **THEN** 名称应正确保存到数据库并可检索

### Requirement: 通知设置集成
告警系统 SHALL 读取并应用用户的通知偏好设置。

#### Scenario: 浏览器通知偏好
- **WHEN** 用户在设置中启用浏览器通知
- **THEN** 告警触发时应发送浏览器通知
- **WHEN** 用户禁用浏览器通知
- **THEN** 告警触发时不应发送浏览器通知

### Requirement: 告警消息国际化
告警触发消息 SHALL 支持多语言显示。

#### Scenario: 中文环境
- **WHEN** 用户语言设置为中文
- **THEN** 告警消息显示中文

#### Scenario: 英文环境
- **WHEN** 用户语言设置为英文
- **THEN** 告警消息显示英文
