# Changelog

## 0.6.0-stage5

### Added
- VehicleModel 新增 maxSpeedMps，车辆移动正式受车型最高速度约束。
- 新增离散秒 TripMovement，按 PathLeg 沿 WorldGraph 正式推进 TripPosition。
- 有效速度同时受车型上限、道路限速和 RoadRuntimeState 速度倍率约束。
- closed 道路正式阻止车辆继续推进，并把等待时间计入游戏时间。
- 新增 RoadGeometry，支持正向/反向 PathLeg 的世界坐标派生。
- 跑完最后 PathLeg 后正式完成 Trip、记录 actualArrivalGameSecond、释放车辆和司机并发布 trip.completed。
- 新增 foreground / regional / background 三档模拟节奏（1/15/300秒）。
- 新增 WorldRuntimeRepository，静态 WorldGraph 与动态道路状态继续分离。
- TripRepository 新增 findRunning，供模拟层批处理运行班次。
- 新增 PointSpatialIndex / VehicleSpatialIndex 派生空间索引。
- 新增 map.visibleVehicles Query DTO 与查询 Handler。
- ApplicationRuntime 新增 SimulationCoordinator。
- 新增移动、封路、反向道路、完成释放、Tier 与空间索引测试。
- 架构守卫新增 simulation 依赖边界和 TripPosition worldPosition 禁止项。

### Changed
- GAME_VERSION 更新为 0.6.0-stage5。
- 核心地图世界坐标明确为派生数据，不写入 Vehicle/TripPosition。
- 清理 CHANGELOG 重复一级标题，只保留一个正式标题。

### Architecture
- Simulation 只依赖 Domain/Core/Contracts；Repository/Event 编排留在 Application。
- Tier A/B/C 只改变批量解析频率，不建立三套移动算法。
- SpatialIndex 是可重建派生缓存，不成为存档事实。

## 0.5.0-stage4

### Added
- 建立 ServicePlan 正式规则、校验与取消生命周期。
- 建立 DepartureSlot 与班次展开器，支持 fixed_times / interval_window。
- 固定游戏第 1 天为 Monday，并按 serviceDays/effective window 生成正式班次。
- 建立最小 VehicleModel/serviceClass 契约。
- 建立最小 Driver/资质/状态契约。
- 建立车辆与司机的分配、发车、释放规则。
- 建立 trip.prepare / assignVehicle / assignDriver / startBoarding / depart / cancel 正式 Handler。
- Trip 只能从 ServicePlan 生成的合法 DepartureSlot 创建。
- 调度时校验公司归属、车辆状态、车型级别、司机状态与司机资质。
- 发车时同步推进 Trip、Vehicle、Driver 三个独立聚合状态。
- 取消班次时释放已绑定车辆和司机。
- RuntimeIdAllocator 新增 ServicePlanId / TripId。
- RepositoryBundle 新增 StaffRepository / VehicleModelRepository。
- 新增 Stage 4 文档与班次、调度、资源释放测试。

### Changed
- ServicePlan 状态正式收敛为 active / suspended / cancelled。
- GAME_VERSION 更新为 0.5.0-stage4。

### Architecture
- ServicePlan 不拥有车辆/司机。
- Trip 是一次真实班次的唯一运行聚合。
- Vehicle/Driver 通过 activeTripId 与 Trip 关联，不永久绑定 Route。
- DepartureSlot 是可重建派生值，不单独制造长期资产对象。


## 0.4.0-stage3

### Removed
- 删除 PassengerRoute 的旧 `roadPathSegmentIds` 路径字段。
- 不保留任何 RoutePath V2/New/Legacy 兼容结构。

### Added
- 新增正式 Station 最小领域模型。
- 新增 RoadPath / PathLeg，作为方向感知的正式道路路径协议。
- PassengerRoute 正式保存 `PathLeg[]` 与 routingPreference。
- 新增 RouteRules，集中处理创建、站序更新、激活、停运规则。
- 新增 StationRepository 与 RouteRepository 唯一线路编号查询。
- 新增 RuntimeIdAllocator，Route ID 不再由 UI/Command 自行决定。
- 新增 DomainEventBus 与 Command 派生 Event ID。
- 新增 route.create / route.updateStops / route.activate / route.deactivate 正式 Handler。
- 新增 RoutePathService，将站点顺序通过 WorldGraph 寻路转换为正式线路路径。
- createApplication 正式注册 Route Handlers。
- 新增线路命令、方向路径、许可证与生命周期测试。
- 新增 Stage 3 线路系统文档。

### Architecture
- 官方线路路径只依据静态路网 active/方向/连通性。
- 临时封路、施工、天气等 RoadRuntimeState 不修改长期线路定义；它们在 Trip 运行阶段处理。
- 线路成功修改后发布 Domain Event，后续统计、任务、声誉等系统无需侵入 Route 核心。

## 0.3.0-stage2

### Added
- 建立 Region 与区域层级/边界模型。
- WorldNode 与 RoadSegment 正式绑定 Region。
- WorldGraph 建立方向感知的道路邻接图。
- 新增 RoadTraversal，明确道路正向/反向经过方向。
- 新增 RoadRuntimeState / WorldRuntimeState，支持封路与速度修正。
- 新增 shortest_distance / fastest_time 路径代价。
- 新增基础确定性 Dijkstra 寻路。
- 寻路结果使用 PathLeg，保留每段道路的 traversal direction。
- 新增区域、邻接、运行状态与路径查询测试。

### Changed
- 道路等级改为受控 RoadClass。
- GAME_VERSION 更新为 0.3.0-stage2。
- WorldGraph.create 现在要求 Regions、Nodes、Roads 三类正式输入。

### Architecture
- 道路静态事实与道路临时运行状态正式分离。
- 路径结果不再只表达 roadSegmentId，为 Stage 3 双向线路路径奠定正式协议。

## 0.2.0-stage1

### Removed
- 删除 V0.1 的 PassengerTransportApp、GameState、旧 commands/events/units/version。
- 删除 V0.1 的 Vehicle -> Route 直接绑定运行模型。
- 删除旧 VehicleMovementSystem、PassengerDemandSystem 与 demo 入口。
- 删除旧 SaveCodec 与单体 core.test。

### Added
- 建立正式 Contracts：强类型 ID、CommandEnvelope、DomainEventEnvelope。
- 建立 Core：整数单位、GameClock、Result、DomainError/ErrorCode、版本协议。
- 建立 Domain：World、Route、ServicePlan、TripInstance、OwnedVehicle、Company。
- 建立 Trip 正式状态机。
- 建立按领域 Repository 接口。
- 建立 CommandBus / QueryBus 骨架。
- 建立 SaveEnvelope / Migration 边界。
- 建立 Bootstrap composition root。
- 建立唯一 public-api。
- 建立架构守卫和新的分层测试。

### Breaking
- 开发期 V0.1 临时接口全部失效，不提供兼容壳。
- Vehicle 不再持有 routeId、当前位置或道路偏移；运行事实归 TripInstance。
- 不再存在总 GameState。
