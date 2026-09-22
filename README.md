# 客运公司模拟器

从 0 开发的 2D 大地图客运公司经营模拟器。

当前版本：**V0.18.2 — Stage 17 Road Hierarchy**

当前规则核心已经完成从路网、线路、班次、车辆、司机、客流、财务，到自动运营、调度中心、车辆市场与正式车辆内容库的连续底层链路。

## 当前已完成

- 连续世界坐标、道路网络与路径搜索
- 客运线路、班次、Trip 与真实车辆位置推进
- 动态客流、上下客、运力与票价
- 正式财务 Ledger、能源、通行费、工资、维护与车辆资产
- 车辆技术状态、故障、维修、保险、检验与救援
- 全天自动排班、自动执行与调度中心只读快照
- 新车、二手车、检测、议价、拍卖与真实车辆过户
- 10 个架空品牌
- 32 个车系
- 100 个基础 VehicleModel
- 180 个厂家 VehicleVariant
- 48 个正式选装
- 24 个正式车商
- 6 个车辆市场区域需求配置
- 7 天周期动态新车与二手车供给
- 年款上市、停产、清库存与停售生命周期刷新
- Stage 15 全量 Content Validator
- 正式 World Map Content V1：48 客运站 + 145 道路段 + 五级道路编号/显示层级
- 地形背景与经营路网彻底分离，山川河流只作为装饰层
- GitHub Actions Core Check

## 核心原则

地图和未来 Android UI 只是表现层。车辆在全国、区域、城市和站场视角都读取同一个正式运行状态，UI 不得维护第二套车辆、资金、市场或时间状态。

车辆市场同样只有一套正式 VehicleListing / VehicleMarketRepository：动态新车、动态二手车、公司自售、议价和拍卖都复用既有边界。

## 下一阶段

Stage 17 正在进行：五级路网已经按“高速主骨架 → 国道跨区骨架 → 省道区域织网 → 县道县域联络 → 乡道末端支线”冻结规划，并由 RoadNetworkStyleValidator 防止后续扩图重新变成规则网格。详细规范见 docs/ROAD_NETWORK_STYLE_GUIDE.md。

## 开发检查

```bash
npm install
npm run check
npm run build
```

详细开发纪律见 `AGENTS.md`，系统边界见 `docs/SYSTEM_MAP.md`。
