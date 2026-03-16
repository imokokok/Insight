# Tasks - DIA页面改造

## Phase 1: 数据层扩展
- [x] Task 1: 扩展DIAClient数据接口
  - [x] SubTask 1.1: 在dia.ts中添加NFT数据类型定义
  - [x] SubTask 1.2: 在dia.ts中添加getNFTData方法
  - [x] SubTask 1.3: 在dia.ts中添加getStakingDetails方法
  - [x] SubTask 1.4: 在dia.ts中添加getCustomFeeds方法
  - [x] SubTask 1.5: 在dia.ts中添加getEcosystemIntegrations方法

- [x] Task 2: 扩展React Hooks
  - [x] SubTask 2.1: 在useDIAData.ts中添加useDIANFTData hook
  - [x] SubTask 2.2: 在useDIAData.ts中添加useDIAStakingDetails hook
  - [x] SubTask 2.3: 在useDIAData.ts中添加useDIACustomFeeds hook
  - [x] SubTask 2.4: 在useDIAData.ts中添加useDIAEcosystem hook
  - [x] SubTask 2.5: 更新useDIAAllData整合新hooks

## Phase 2: Panel组件开发
- [x] Task 3: 创建DIANFTDataPanel组件
  - [x] SubTask 3.1: 创建基础组件结构和props定义
  - [x] SubTask 3.2: 实现NFT集合列表展示
  - [x] SubTask 3.3: 实现NFT价格趋势图表
  - [x] SubTask 3.4: 实现链筛选功能
  - [x] SubTask 3.5: 添加国际化支持

- [x] Task 4: 创建DIAStakingPanel组件
  - [x] SubTask 4.1: 创建基础组件结构和props定义
  - [x] SubTask 4.2: 实现质押统计展示（APR、总量、人数）
  - [x] SubTask 4.3: 实现质押收益计算器
  - [x] SubTask 4.4: 实现质押历史趋势图表
  - [x] SubTask 4.5: 添加国际化支持

- [x] Task 5: 创建DIADataFeedsPanel组件
  - [x] SubTask 5.1: 创建基础组件结构和props定义
  - [x] SubTask 5.2: 实现数据馈送统一列表（合并原data-sources和cross-chain）
  - [x] SubTask 5.3: 实现链筛选和类型筛选
  - [x] SubTask 5.4: 实现数据质量评分展示
  - [x] SubTask 5.5: 实现详情展开功能
  - [x] SubTask 5.6: 添加国际化支持

- [x] Task 6: 创建DIAEcosystemPanel组件
  - [x] SubTask 6.1: 创建基础组件结构和props定义
  - [x] SubTask 6.2: 实现协议列表展示
  - [x] SubTask 6.3: 实现分类筛选（DEX、借贷、衍生品等）
  - [x] SubTask 6.4: 实现集成深度指标展示
  - [x] SubTask 6.5: 添加国际化支持

## Phase 3: 主页面重构
- [x] Task 7: 重构DIA主页面
  - [x] SubTask 7.1: 更新Tab结构（7个tabs）
  - [x] SubTask 7.2: 集成新的Panel组件
  - [x] SubTask 7.3: 实现动态统计卡片
  - [x] SubTask 7.4: 更新数据获取逻辑
  - [x] SubTask 7.5: 测试所有tab切换功能

## Phase 4: 配置与国际化
- [x] Task 8: 更新配置文件
  - [x] SubTask 8.1: 更新oracles.tsx中的DIA tabs配置
  - [x] SubTask 8.2: 验证themeColor和icon配置

- [x] Task 9: 更新国际化文件
  - [x] SubTask 9.1: 在zh-CN.json中添加DIA新tab翻译
  - [x] SubTask 9.2: 在zh-CN.json中添加NFT数据相关翻译
  - [x] SubTask 9.3: 在zh-CN.json中添加质押详情相关翻译
  - [x] SubTask 9.4: 在zh-CN.json中添加数据馈送相关翻译
  - [x] SubTask 9.5: 在zh-CN.json中添加生态系统增强相关翻译
  - [x] SubTask 9.6: 同步更新en.json

## Phase 5: 清理与优化
- [x] Task 10: 清理旧组件
  - [x] SubTask 10.1: 标记旧data-sources panel为废弃
  - [x] SubTask 10.2: 标记旧cross-chain panel为废弃
  - [x] SubTask 10.3: 更新panels/index.ts导出

- [x] Task 11: 性能优化
  - [x] SubTask 11.1: 优化大数据列表虚拟滚动
  - [x] SubTask 11.2: 优化图表懒加载
  - [x] SubTask 11.3: 优化数据缓存策略

## Phase 6: 验证与测试
- [x] Task 12: 功能验证
  - [x] SubTask 12.1: 验证所有7个tab正常显示
  - [x] SubTask 12.2: 验证NFT数据展示正确
  - [x] SubTask 12.3: 验证质押计算器功能正确
  - [x] SubTask 12.4: 验证数据馈送筛选功能正确
  - [x] SubTask 12.5: 验证生态系统分类展示正确

- [x] Task 13: 国际化验证
  - [x] SubTask 13.1: 验证中文翻译完整
  - [x] SubTask 13.2: 验证英文翻译完整
  - [x] SubTask 13.3: 验证切换语言时内容正确更新

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3,4,5,6 依赖 Task 2
- Task 7 依赖 Task 3,4,5,6
- Task 9 依赖 Task 3,4,5,6（需要知道组件中使用的文本key）
- Task 10 依赖 Task 7
- Task 12,13 依赖 Task 7,9
