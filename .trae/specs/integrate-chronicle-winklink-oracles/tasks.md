# Tasks

## 阶段一：后端集成

### Task 1: 扩展 OracleProvider 枚举
**描述**: 在 `src/types/oracle/enums.ts` 中添加 CHRONICLE 和 WINKLINK 枚举值
- [x] 在 OracleProvider 枚举中添加 `CHRONICLE = 'chronicle'`
- [x] 在 OracleProvider 枚举中添加 `WINKLINK = 'winklink'`
- [x] 验证枚举值符合命名规范

### Task 2: 创建 Chronicle Labs 预言机客户端
**描述**: 实现 Chronicle Labs 预言机客户端，支持价格查询和专属数据
- [x] 创建 `src/lib/oracles/chronicle.ts` 文件
- [x] 实现 ChronicleClient 类继承 BaseOracleClient
- [x] 实现 getPrice 方法获取实时价格
- [x] 实现 getHistoricalPrices 方法获取历史价格
- [x] 实现 getScuttlebuttSecurity 方法获取 Scuttlebutt 安全机制数据
- [x] 实现 getMakerDAOIntegration 方法获取 MakerDAO 集成数据
- [x] 实现 getValidatorNetwork 方法获取验证者网络数据
- [x] 实现 getNetworkStats 方法获取网络统计
- [x] 定义 Chronicle 专属类型接口（ChronicleNetworkStats, ScuttlebuttData, MakerDAOData, ValidatorInfo）

### Task 3: 创建 WINkLink 预言机客户端
**描述**: 实现 WINkLink 预言机客户端，支持价格查询和专属数据
- [x] 创建 `src/lib/oracles/winklink.ts` 文件
- [x] 实现 WINkLinkClient 类继承 BaseOracleClient
- [x] 实现 getPrice 方法获取实时价格
- [x] 实现 getHistoricalPrices 方法获取历史价格
- [x] 实现 getTRONEcosystem 方法获取 TRON 生态集成数据
- [x] 实现 getNodeStaking 方法获取节点质押数据
- [x] 实现 getGamingData 方法获取游戏娱乐数据
- [x] 实现 getNetworkStats 方法获取网络统计
- [x] 定义 WINkLink 专属类型接口（WINkLinkNetworkStats, TRONEcosystemData, NodeStakingData, GamingData）

### Task 4: 更新预言机工厂类
**描述**: 在工厂类中注册新的预言机客户端
- [x] 更新 `src/lib/oracles/factory.ts` 导入 ChronicleClient 和 WINkLinkClient
- [x] 在 createClient 方法中添加 CHRONICLE 和 WINKLINK 的 case
- [x] 在 getAllClients 方法中添加新的预言机提供商

### Task 5: 更新模块导出
**描述**: 在 index.ts 中导出新的客户端和类型
- [x] 更新 `src/lib/oracles/index.ts` 导出 ChronicleClient 和 WINkLinkClient
- [x] 导出 Chronicle 专属类型
- [x] 导出 WINkLink 专属类型

### Task 6: 更新预言机配置
**描述**: 在 oracles.tsx 中添加 Chronicle Labs 和 WINkLink 配置
- [x] 更新 `src/lib/config/oracles.tsx` 导入 ChronicleClient 和 WINkLinkClient
- [x] 添加 Chronicle Labs 配置（provider, name, symbol, chains, icon, marketData, networkData, features）
- [x] 添加 WINkLink 配置（provider, name, symbol, chains, icon, marketData, networkData, features）

---

## 阶段二：前端专属页面

### Task 7: 创建 Chronicle Labs 专属页面
**描述**: 创建 Chronicle Labs 的完整展示页面
- [x] 创建 `src/app/chronicle/page.tsx` 页面组件
- [x] 创建 `src/app/chronicle/ChroniclePageContent.tsx` 内容组件
- [x] 实现页面布局（Hero区域、标签页导航、内容面板）
- [x] 实现市场数据标签页
- [x] 实现网络健康标签页
- [x] 实现 Scuttlebutt 安全标签页
- [x] 实现 MakerDAO 集成标签页
- [x] 实现验证者网络标签页

### Task 8: 创建 WINkLink 专属页面
**描述**: 创建 WINkLink 的完整展示页面
- [x] 创建 `src/app/winklink/page.tsx` 页面组件
- [x] 创建 `src/app/winklink/WINkLinkPageContent.tsx` 内容组件
- [x] 实现页面布局（Hero区域、标签页导航、内容面板）
- [x] 实现市场数据标签页
- [x] 实现网络健康标签页
- [x] 实现 TRON 生态标签页
- [x] 实现节点质押标签页
- [x] 实现游戏娱乐数据标签页

---

## 阶段三：专属特性组件

### Task 9: 创建 Chronicle Labs 专属面板组件
**描述**: 创建 Chronicle Labs 的专属特性展示组件
- [x] 创建 `src/components/oracle/panels/ChronicleScuttlebuttPanel.tsx`
  - 展示 Scuttlebutt 安全协议机制
  - 显示安全级别和验证状态
  - 展示历史安全事件
- [x] 创建 `src/components/oracle/panels/ChronicleMakerDAOIntegrationPanel.tsx`
  - 展示与 MakerDAO 协议的集成
  - 显示支持的 MakerDAO 资产
  - 展示 DAI 稳定币相关数据
- [x] 创建 `src/components/oracle/panels/ChronicleValidatorPanel.tsx`
  - 展示验证者网络拓扑
  - 显示验证者声誉分数
  - 展示验证者历史表现

### Task 10: 创建 WINkLink 专属面板组件
**描述**: 创建 WINkLink 的专属特性展示组件
- [x] 创建 `src/components/oracle/panels/WINkLinkTRONEcosystemPanel.tsx`
  - 展示 TRON 生态系统集成
  - 显示 TRON 网络统计数据
  - 展示 TRON DApp 集成情况
- [x] 创建 `src/components/oracle/panels/WINkLinkStakingPanel.tsx`
  - 展示节点质押机制
  - 显示质押奖励计算器
  - 展示节点排名和表现
- [x] 创建 `src/components/oracle/panels/WINkLinkGamingDataPanel.tsx`
  - 展示游戏行业数据支持
  - 显示娱乐行业价格源
  - 展示随机数生成服务

---

## 阶段四：Hooks 和导航

### Task 11: 创建专属 Hooks
**描述**: 创建用于获取 Chronicle Labs 和 WINkLink 数据的 Hooks
- [x] 创建 `src/hooks/useChronicleData.ts`
  - 实现 useChroniclePrice 获取价格
  - 实现 useChronicleHistoricalPrices 获取历史价格
  - 实现 useChronicleScuttlebutt 获取安全数据
  - 实现 useChronicleMakerDAO 获取集成数据
  - 实现 useChronicleValidators 获取验证者数据
- [x] 创建 `src/hooks/useWINkLinkData.ts`
  - 实现 useWINkLinkPrice 获取价格
  - 实现 useWINkLinkHistoricalPrices 获取历史价格
  - 实现 useWINkLinkTRONEcosystem 获取生态数据
  - 实现 useWINkLinkStaking 获取质押数据
  - 实现 useWINkLinkGamingData 获取游戏数据

### Task 12: 更新导航配置
**描述**: 在导航配置中添加新的预言机入口
- [x] 更新 `src/components/navigation/config.ts`
  - 在 oracles 分组中添加 Chronicle Labs 导航项
  - 在 oracles 分组中添加 WINkLink 导航项
- [x] 更新 `src/i18n/en.json` 添加英文翻译
- [x] 更新 `src/i18n/zh-CN.json` 添加中文翻译

---

## 阶段五：验证和优化

### Task 13: 类型检查和构建验证
**描述**: 确保所有代码通过类型检查并成功构建
- [x] 运行 TypeScript 类型检查
- [x] 运行 Next.js 构建
- [x] 修复任何类型错误

### Task 14: 功能验证
**描述**: 验证所有功能正常工作
- [x] 验证 Chronicle Labs 页面可访问
- [x] 验证 WINkLink 页面可访问
- [x] 验证导航链接正常工作
- [x] 验证所有标签页内容正确显示
- [x] 验证价格数据正确获取

# Task Dependencies
- Task 2 依赖 Task 1（需要枚举值）
- Task 3 依赖 Task 1（需要枚举值）
- Task 4 依赖 Task 2 和 Task 3（需要客户端实现）
- Task 5 依赖 Task 2 和 Task 3（需要客户端实现）
- Task 6 依赖 Task 2 和 Task 3（需要客户端实现）
- Task 7 依赖 Task 6（需要配置）
- Task 8 依赖 Task 6（需要配置）
- Task 9 依赖 Task 2（需要 Chronicle 类型）
- Task 10 依赖 Task 3（需要 WINkLink 类型）
- Task 11 依赖 Task 2 和 Task 3（需要客户端）
- Task 12 依赖 Task 7 和 Task 8（需要页面存在）
- Task 13 依赖所有编码任务
- Task 14 依赖 Task 13
