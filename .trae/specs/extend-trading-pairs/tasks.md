# 扩展交易对任务列表

## 任务依赖关系
```
[Task 1] 定义扩展的交易对数据结构
    ↓
[Task 2] 更新 PairSelector 组件支持分类筛选
    ↓
[Task 3] 添加新交易对的图标支持
    ↓
[Task 4] 验证预言机数据源兼容性
    ↓
[Task 5] 测试验证
```

## 任务详情

- [x] **Task 1: 定义扩展的交易对数据结构**
  - [x] SubTask 1.1: 更新 `src/app/cross-oracle/constants.tsx`
    - 创建 `SymbolConfig` 接口，包含 symbol、name、category 字段
    - 定义 `tradingPairs` 数组，包含所有交易对信息
    - 保留 `symbols` 数组用于向后兼容
  - [x] SubTask 1.2: 定义交易对分类
    - Layer 1 类别: BTC、ETH、SOL、AVAX
    - DeFi 类别: LINK、UNI、AAVE、MKR、SNX、COMP、YFI、CRV

- [x] **Task 2: 更新 PairSelector 组件支持分类筛选**
  - [x] SubTask 2.1: 添加分类标签栏
    - 在选择器下拉菜单顶部添加分类标签
    - 实现标签切换逻辑
    - 高亮当前选中标签
  - [x] SubTask 2.2: 实现分类筛选功能
    - 根据选中分类过滤交易对列表
    - 保持搜索功能与分类筛选的联动
  - [x] SubTask 2.3: 优化列表展示
    - 添加分类分组显示（可选）
    - 优化长列表的滚动体验

- [x] **Task 3: 添加新交易对的图标支持**
  - [x] SubTask 3.1: 更新 `CryptoIcon` 组件
    - 为新增交易对添加颜色和图标配置
    - LINK: 蓝色 (#2A5ADA)
    - UNI: 粉色 (#FF007A)
    - AAVE: 紫色 (#B6509E)
    - MKR: 绿色 (#1AAB9B)
    - SNX: 蓝色 (#0B0816)
    - COMP: 绿色 (#00D395)
    - YFI: 蓝色 (#006AE3)
    - CRV: 黄色 (#FF5A00)
  - [x] SubTask 3.2: 确保图标视觉一致性
    - 所有图标使用相同的尺寸和样式
    - 文字对比度符合可访问性标准

- [x] **Task 4: 验证预言机数据源兼容性**
  - [x] SubTask 4.1: 检查各预言机客户端
    - ChainlinkClient 支持情况
    - BandProtocolClient 支持情况
    - PythClient 支持情况
    - 其他预言机客户端支持情况
  - [x] SubTask 4.2: 处理不支持的预言机
    - 对于不支持特定交易对的预言机，显示 "N/A"
    - 在 UI 中提供适当的提示信息

- [x] **Task 5: 测试验证**
  - [x] SubTask 5.1: 功能测试
    - 验证所有新增交易对可以正常选择
    - 验证分类筛选功能正常工作
    - 验证搜索功能在大量选项下仍有效
  - [x] SubTask 5.2: 视觉测试
    - 验证所有图标正确显示
    - 验证分类标签样式正确
    - 验证响应式布局正常
  - [x] SubTask 5.3: 数据测试
    - 验证各预言机对新增交易对的数据返回
    - 验证价格偏差计算正确

## 设计参考

### SymbolConfig 接口
```typescript
interface SymbolConfig {
  symbol: string;
  name: string;
  category: 'layer1' | 'defi';
  iconColor: string;
}
```

### 交易对分类
| 类别 | 交易对 |
|------|--------|
| Layer 1 | BTC/USD, ETH/USD, SOL/USD, AVAX/USD |
| DeFi | LINK/USD, UNI/USD, AAVE/USD, MKR/USD, SNX/USD, COMP/USD, YFI/USD, CRV/USD |

### 样式规范
- 分类标签：水平排列，选中时底部有蓝色下划线
- 交易对列表：保持现有样式，按字母顺序排序
- 图标：24x24px，圆角背景，白色文字
