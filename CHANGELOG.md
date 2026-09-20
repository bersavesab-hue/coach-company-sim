# Changelog

## 0.1.2-system-map

### Added
- 新增完整 SYSTEM_MAP，冻结第一版与长期扩展的系统边界。
- 明确 P0/P1/P2 系统分级，禁止后期想到什么就随手新增 Manager。
- 明确所有核心系统的唯一数据所有权。
- 明确全国级地图采用 Region Pack + SpatialIndex。
- 明确移动端采用 Tier A / B / C 三档模拟，避免大量离屏车辆逐帧运算。
- 明确第一版完整经营闭环与明确排除项。
- 固定 Stage 1-9 的开发顺序与验收条件。
- 新增“新功能进入仓库前必须回答的 10 个问题”。

### Confirmed
- Route、ServicePlan、TripInstance、Vehicle 永久分离。
- Passenger 第一阶段采用 OD / Queue / OnboardGroup 聚合模拟，不创建海量独立乘客对象。
- Finance Ledger 是所有正式资金变动的唯一入口。
- Presentation 在底层经营闭环稳定后再正式接入。

## 0.1.1-architecture

### Added
- 冻结五层架构与 Contracts 边界。
- 新增完整领域模型规划。
- 新增 Command / Event / Query 规范。
- 新增静态内容数据契约。
- 新增存档结构与迁移规范。
- 新增版本替换与旧代码删除纪律。

### Changed
- 正式规划将运行模型从“Vehicle 直接绑定 Route”调整为“Route -> ServicePlan -> TripInstance -> Vehicle”。
- 下一代码阶段将直接替换 V0.1 临时直绑模型，不保留两套接口。

## 0.1.0-core

- 新仓库从 0 初始化。
- 建立统一整数单位规范。
- 建立世界地图节点与道路模型。
- 建立客运线路模型。
- 建立车辆及实时世界位置模型。
- 建立公司状态。
- 建立游戏时钟与领域事件总线。
- 建立车辆沿道路运行的模拟系统。
- 建立基础动态客流系统。
- 建立唯一应用命令入口。
- 建立 saveVersion 存档协议。
- 建立核心测试与 GitHub Actions 检查。
