# Tasks

## 阶段一：后端集成

### Task 1: 扩展 OracleProvider 枚举
**描述**: 在 `src/types/oracle/enums.ts` 中添加 CHRONICLE 和 WINKLINK 枚举值
- [ ] 在 OracleProvider 枚举中添加 `CHRONICLE = 'chronicle'`
- [ ] 在 OracleProvider 枚举中添加 `WINKLINK = 'winklink'`
- [ ] 验证枚举值符合命名规范

### Task 2: 创建 Chronicle Labs 预言机客户端
**描述**: 实现 Chronicle Labs 预言机客户端，支持价格查询和专属数据
- [ ] 创建 `src/lib/oracles/chronicle.ts` 文件
- [ ] 实现 ChronicleClient 类继承 BaseOracleClient
- [ ] 实现 getPrice 方法获取实时价格
- [ ] 实现 getHistoricalPrices 方法获取历史价格
- [ ] 实现 getScuttlebuttSecurity 方法获取 Scuttlebutt 安全机制数据
- [ ] 实现 getMakerDAOIntegration 方法获取 MakerDAO 集成数据
- [ ] 实现 getValidatorNetwork 方法获取验证者网络数据
- [ ] 实现 getNetworkStats 方法获取网络统计
- [ ] 定义 Chronicle 专属类型接口（ChronicleNetworkStats, ScuttlebuttData, MakerDAOData, ValidatorInfo）

### Task 3: 创建 WINkLink 预言机客户端
**描述**: 实现 WINkLink 预言机客户端，支持价格查询和专属数据
- [ ] 创建 `src/lib/oracles/winklink.ts` 文件
- [ ] 实现 WINkLinkClient 类继承 BaseOracleClient
- [ ] 实现 getPrice 方法获取实时价格
- [ ] 实现 getHistoricalPrices 方法获取历史价格
- [ ] 实现 getTRONEcosystem 方法获取 TRON 生态集成数据
- [ ] 实现 getNodeStaking 方法获取节点质押数据
- [ ] 实现 getGamingData 方法获取游戏娱乐数据
- [ ] 实现 getNetworkStats 方法获取网络统计
- [ ] 定义 WINkLink 专属类型接口（WINkLinkNetworkStats, TRONEcosystemData, NodeStakingData, GamingData）

### Task 4: 更新预言机工厂类
**描述**: 在工厂类中注册新的预言机客户端
- [ ] 更新 `src/lib/oracles/factory.ts` 导入 ChronicleClient 和 WINkLinkClient
- [ ] 在 createClient 方法中添加 CHRONICLE 和 WINKLINK 的 case
- [ ] 在 getAllClients 方法中添加新的预言机提供商

### Task 5: 更新模块导出
**描述**: 在 index.ts 中导出新的客户端和类型
- [ ] 更新 `src/lib/oracles/index.ts` 导出 ChronicleClient 和 WINkLinkClient
- [ ] 导出 Chronicle 专属类型
- [ ] 导出 WINkLink 专属类型

### Task 6: 更新预言机配置
**描述**: 在 oracles.tsx 中添加 Chronicle Labs 和 WINkLink 配置
- [ ] 更新 `src/lib/config/oracles.tsx` 导入 ChronicleClient 和 WINkLinkClient
- [ ] 添加 Chronicle Labs 配置（provider, name, symbol, chains, icon, marketData, networkData, features）
- [ ] 添加 WINkLink 配置（provider, name, symbol, chains, icon, marketData, networkData, features）

---

## 阶段二：前端专属页面

### Task 7: 创建 Chronicle Labs 专属页面
**描述**: 创建 Chronicle Labs 的完整展示页面
- [ ] 创建 `src/app/chronicle/page.tsx` 页面组件
- [ ] 创建 `src/app/chronicle/ChroniclePageContent.tsx` 内容组件
- [ ] 实现页面布局（Hero区域、标签页导航、内容面板）
- [ ] 实现市场数据标签页
- [ ] 实现网络健康标签页
- [ ] 实现 Scuttlebutt 安全标签页
- [ ] 实现 MakerDAO 集成标签页
- [ ] 实现验证者网络标签页

### Task 8: 创建 WINkLink 专属页面
**描述**: 创建 WINkLink 的完整展示页面
- [ ] 创建 `src/app/winklink/page.tsx` 页面组件
- [ ] 创建 `src/app/winklink/WINkLinkPageContent.tsx` 内容组件
- [ ] 实现页面布局（Hero区域、标签页导航、内容面板）
- [ ] 实现市场数据标签页
- [ ] 实现网络健康标签页
- [ ] 实现 TRON 生态标签页
- [ ] 实现节点质押标签页
- [ ] 实现游戏娱乐数据标签页

---

## 阶段三：专属特性组件

### Task 9: 创建 Chronicle Labs 专属面板组件
**描述**: 创建 Chronicle Labs 的专属特性展示组件
- [ ] 创建 `src/components/oracle/panels/ChronicleScuttlebuttPanel.tsx`
  - 展示 Scuttlebutt 安全协议机制
  - 显示安全级别和验证状态
  - 展示历史安全事件
- [ ] 创建 `src/components/oracle/panels/ChronicleMakerDAOIntegrationPanel.tsx`
  - 展示与 MakerDAO 协议的集成
  - 显示支持的 MakerDAO 资产
  - 展示 DAI 稳定币相关数据
- [ ] 创建 `src/components/oracle/panels/ChronicleValidatorPanel.tsx`
  - 展示验证者网络拓扑
  - 显示验证者声誉分数
  - 展示验证者历史表现

### Task 10: 创建 WINkLink 专属面板组件
**描述**: 创建 WINkLink 的专属特性展示组件
- [ ] 创建 `src/components/oracle/panels/WINkLinkTRONEcosystemPanel.tsx`
  - 展示 TRON 生态系统集成
  - 显示 TRON 网络统计数据
  - 展示 TRON DApp 集成情况
- [ ] 创建 `src/components/oracle/panels/WINkLinkStakingPanel.tsx`
  - 展示节点质押机制
  - 显示质押奖励计算器
  - 展示节点排名和表现
- [ ] 创建 `src/components/oracle/panels/WINkLinkGamingDataPanel.tsx`
  - 展示游戏行业数据支持
  - 显示娱乐行业价格源
  - 展示随机数生成服务

---

## 阶段四：Hooks 和导航

### Task 11: 创建专属 Hooks
**描述**: 创建用于获取 Chronicle Labs 和 WINkLink 数据的 Hooks
- [ ] 创建 `src/hooks/useChronicleData.ts`
  - 实现 useChroniclePrice 获取价格
  - 实现 useChronicleHistoricalPrices 获取历史价格
  - 实现 useChronicleScuttlebutt 获取安全数据
  - 实现 useChronicleMakerDAO 获取集成数据
  - 实现 useChronicleValidators 获取验证者数据
- [ ] 创建 `src/hooks/useWINkLinkData.ts`
  - 实现 useWINkLinkPrice 获取价格
  - 实现 useWINkLinkHistoricalPrices 获取历史价格
  - 实现 useWINkLinkTRONEcosystem 获取生态数据
  - 实现 useWINkLinkStaking 获取质押数据
  - 实现 useWINkLinkGamingData 获取游戏数据

### Task 12: 更新导航配置
**描述**: 在导航配置中添加新的预言机入口
- [ ] 更新 `src/components/navigation/config.ts`
  - 在 oracles 分组中添加 Chronicle Labs 导航项
  - 在 oracles 分组中添加 WINkLink 导航项
- [ ] 更新 `src/i18n/en.json`