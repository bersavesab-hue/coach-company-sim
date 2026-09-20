# Changelog

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
