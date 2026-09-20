# Stage 1：正式核心模型实施蓝图

状态：**Implementation Blueprint Freeze v1**

本文件不是功能实现，而是下一轮正式重建 `src/` 前的逐文件施工图。  
Stage 1 的目标只有一个：**删除 V0.1 临时验证结构，建立长期稳定的 Contracts / Core / Domain 基础。**

Stage 1 完成后仍然不做 UI、不做地图渲染、不做完整客流经济。

---

# 1. Stage 1 的完成标准

必须同时满足：

1. V0.1 的 Vehicle -> Route 直接绑定模型彻底消失。
2. V0.1 的单体 `GameState` 彻底消失。
3. V0.1 的单体 `PassengerTransportApp` 彻底消失。
4. Route / ServicePlan / TripInstance / OwnedVehicle 正式分离。
5. 所有永久实体使用强类型 ID。
6. Command / Event 使用统一 Envelope。
7. Application 错误使用统一 Result + ErrorCode。
8. Trip 状态迁移只能经过正式状态机。
9. Domain 内没有 DOM、Android、UI、图片、存储依赖。
10. 新结构通过类型检查、单元测试和架构守卫。

---

# 2. 下一轮必须删除的 V0.1 源码

以下文件属于验证版本，Stage 1 实施时**直接删除，不保留兼容副本**：

```text
src/application/PassengerTransportApp.ts
src/application/commands.ts

src/core/GameClock.ts
src/core/events.ts
src/core/units.ts
src/core/version.ts

src/demo/createDemoState.ts

src/domain/company.ts
src/domain/map.ts
src/domain/route.ts
src/domain/vehicle.ts

src/simulation/PassengerDemandSystem.ts
src/simulation/VehicleMovementSystem.ts
src/simulation/mapGeometry.ts

src/state/GameState.ts

src/index.ts
src/public-api.ts

src/save/SaveCodec.ts

tests/core.test.ts
```

说明：

- 不是这些概念不要了。
- 是**删除 V0.1 文件路径和临时接口**，再按正式目录重建。
- 禁止把它们改名成 `Old*`、`Legacy*`、`*V2` 保存。

---

# 3. Stage 1 正式目录

下一轮完成后，`src/` 顶层只允许出现：

```text
src/
  contracts/
  core/
  domain/
  application/
  save/
  bootstrap/
  public-api.ts
```

Stage 1 暂时不创建：

```text
presentation/
simulation/
data/
```

原因：

- Stage 1 先冻结数据身份和运行聚合。
- Simulation 在正式 Trip 模型建立后再接。
- Data 在 Content Contract 真正落地时再接。
- Presentation 最后才接。

禁止为了“先留位置”创建空目录、空 Manager、空 Service。

---

# 4. Contracts：稳定协议层

正式目录：

```text
src/contracts/
  ids/
    EntityIds.ts
    IdPrefix.ts

  commands/
    CommandEnvelope.ts
    CommandTypes.ts

  events/
    DomainEventEnvelope.ts
    EventTypes.ts

  dto/
    CommonDto.ts
```

Contracts 只能包含：
- 类型
- 稳定协议
- 不带业务规则的序列化结构

禁止放：
- 计算公式
- Repository 实现
- UI 类型
- “utils”杂物

---

# 5. ID 规范

## 5.1 强类型

TypeScript 层禁止所有实体都裸用 `string`。

必须有品牌类型：

```ts
type CompanyId = Brand<string, "CompanyId">;
type RouteId = Brand<string, "RouteId">;
type ServicePlanId = Brand<string, "ServicePlanId">;
type TripId = Brand<string, "TripId">;
type VehicleId = Brand<string, "VehicleId">;
type VehicleModelId = Brand<string, "VehicleModelId">;
type StaffId = Brand<string, "StaffId">;
type StationId = Brand<string, "StationId">;
type WorldNodeId = Brand<string, "WorldNodeId">;
type RoadSegmentId = Brand<string, "RoadSegmentId">;
```

这样不能把 `VehicleId` 错传给 `RouteId`。

## 5.2 内容 ID 与运行 ID

### 静态内容 ID

由内容包永久维护：

```text
region.000001
location.000001
road.000001
station_type.000001
vehicle_model.000001
license.000001
event_def.000001
```

### 运行实体 ID

由存档世界创建：

```text
company.00000001
route.00000001
service_plan.00000001
trip.000000000001
vehicle.00000001
staff.00000001
ledger.000000000001
```

第一版使用**存档内单调序列号**，不依赖随机 UUID。

理由：
- 离线可生成
- 可测试
- 可复现
- 不需要第三方包
- 存档体积较小

ID 一旦创建不得复用。

---

# 6. Core：真正无业务的基础能力

正式目录：

```text
src/core/
  units/
    Units.ts
    Guards.ts

  time/
    GameClock.ts
    GameTime.ts

  result/
    Result.ts

  errors/
    ErrorCode.ts
    DomainError.ts

  version/
    Versions.ts
```

## 6.1 Units

统一整数：
- MoneyCents
- DistanceM
- GameSecond
- SpeedMps
- Permille

Core 不知道“票价”“车辆”“路线”是什么。

## 6.2 Result

所有可预期业务失败使用：

```ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

禁止把正常业务失败全用 throw。

throw 只用于：
- 程序员错误
- 数据损坏
- 不可能状态

## 6.3 ErrorCode

第一批稳定错误码：

```text
INVALID_ARGUMENT
ENTITY_NOT_FOUND
ENTITY_INACTIVE
INVALID_STATE_TRANSITION
DUPLICATE_ID
REFERENCE_NOT_FOUND

INSUFFICIENT_FUNDS
LICENSE_REQUIRED

ROUTE_INVALID
ROUTE_INACTIVE

SERVICE_PLAN_INVALID

TRIP_NOT_PLANNED
TRIP_ALREADY_STARTED
TRIP_ALREADY_COMPLETED
TRIP_ALREADY_CANCELLED

VEHICLE_NOT_AVAILABLE
VEHICLE_ALREADY_ASSIGNED
VEHICLE_IN_MAINTENANCE

DRIVER_NOT_AVAILABLE
DRIVER_NOT_QUALIFIED
```

错误码是机器协议，UI 文案以后另做。

---

# 7. Domain：Stage 1 只建立六个正式领域

本轮只建立：

```text
domain/
  world/
  route/
  schedule/
  trip/
  vehicle/
  company/
```

Passenger、Finance、Staff 的完整领域下一阶段逐步接。

Driver 在 Stage 1 只允许 Trip 保留可空 `driverId` 引用类型，不提前写完整 Staff 系统。

---

# 8. World 正式最小模型

目录：

```text
src/domain/world/
  WorldPoint.ts
  WorldNode.ts
  RoadSegment.ts
  WorldGraph.ts
```

Stage 1 只定义：
- 坐标
- 节点
- 道路
- 路网容器

暂时不实现：
- Pathfinding
- SpatialIndex
- Region Pack
- 封路事件

这些属于 Stage 2。

---

# 9. Route 正式模型

目录：

```text
src/domain/route/
  PassengerRoute.ts
  RouteType.ts
```

PassengerRoute 必须只包含长期线路定义：

```text
id
companyId
code
routeType
orderedStationIds
roadPathSegmentIds
farePolicyRef
requiredLicenseIds
status
```

明确禁止字段：

```text
vehicleId
driverId
passengerCount
currentPosition
currentRoad
delay
nextDeparture
```

这些不属于 Route。

---

# 10. ServicePlan 正式模型

目录：

```text
src/domain/schedule/
  ServicePlan.ts
  ServiceCalendar.ts
  DeparturePattern.ts
```

ServicePlan 描述长期运营计划：

```text
id
routeId
effectivePeriod
serviceDays
departurePattern
requiredVehicleClass
status
```

DeparturePattern 第一版允许：
- fixed_times
- interval_window

示例：

```text
fixed_times:
06:30
08:00
10:30

interval_window:
06:00-09:00 every 20 min
09:00-16:00 every 40 min
```

但 Stage 1 只建类型，不实现班次展开算法。

---

# 11. TripInstance：运行核心

目录：

```text
src/domain/trip/
  TripInstance.ts
  TripStatus.ts
  TripStateMachine.ts
  TripPosition.ts
```

## 11.1 状态

正式状态：

```text
planned
boarding
running
completed
cancelled
```

不加入：
- paused
- loading
- arriving
- delayed

“延误”是时间差，不是状态。

“到某站”是 Event，不是长期状态。

## 11.2 合法迁移

```text
planned -> boarding
planned -> cancelled

boarding -> running
boarding -> cancelled

running -> completed
running -> cancelled
```

禁止：
- completed -> running
- cancelled -> boarding
- running -> planned

所有状态变化必须经过 `TripStateMachine`。

## 11.3 TripPosition

运行事实：

```text
activeRoadSegmentIndex
offsetOnSegmentM
lastUpdatedGameSecond
```

Stage 1 不把 `worldPosition` 作为必须持久化字段。

世界坐标以后由：
- Route road path
- activeRoadSegmentIndex
- offsetOnSegmentM
推导。

---

# 12. Vehicle 正式模型

目录：

```text
src/domain/vehicle/
  OwnedVehicle.ts
  VehicleStatus.ts
```

OwnedVehicle：

```text
id
companyId
modelId
mileageM
conditionPermille
fuelPermille
status
depotStationId
activeTripId
```

VehicleStatus：

```text
available
assigned
running
maintenance
broken
retired
```

明确删除：
- routeId
- routeSegmentIndex
- offsetOnSegmentM
- worldPosition

这些运行位置属于 Trip。

---

# 13. Company 正式最小模型

目录：

```text
src/domain/company/
  Company.ts
  CompanyStatus.ts
```

Stage 1 只保留：

```text
companyId
name
status
reputationPermille
licenseIds
homeStationId
```

正式现金不再直接长期塞在 Company 里。

Finance 建立后：
- Company 只引用财务账户
- 余额由 Finance/Ledger 拥有

Stage 1 在 Finance 尚未实现时，不新增临时第二套现金规则。

---

# 14. Command Envelope

文件：

```text
src/contracts/commands/CommandEnvelope.ts
```

正式字段：

```ts
interface CommandEnvelope<TType, TPayload> {
  commandId: CommandId;
  type: TType;
  issuedAtGameSecond: GameSecond;
  actorCompanyId?: CompanyId;
  payload: TPayload;
}
```

Stage 1 只冻结协议。

具体 PurchaseVehicle/CreateRoute 等 Handler 后续按系统阶段加入。

---

# 15. Event Envelope

文件：

```text
src/contracts/events/DomainEventEnvelope.ts
```

正式字段：

```ts
interface DomainEventEnvelope<TType, TPayload> {
  eventId: EventId;
  type: TType;
  gameSecond: GameSecond;
  aggregateType: AggregateType;
  aggregateId: string;
  causedByCommandId?: CommandId;
  payload: TPayload;
}
```

Event Bus 以后传的是 Envelope，不再直接传松散 union 对象。

---

# 16. Application：Stage 1 只做协议执行骨架

目录：

```text
src/application/
  CommandBus.ts
  QueryBus.ts
```

Stage 1 禁止重新造一个 `PassengerTransportApp` 大总管。

CommandBus 只负责：
- command type -> handler 注册
- dispatch
- 返回 Result

QueryBus 只负责：
- query type -> handler
- read-only 调用

具体业务 Handler 在对应阶段加入。

---

# 17. Runtime 状态组织

不再建立：

```text
class GameState {
  company
  world
  routes
  vehicles
  ...
}
```

这种会不断膨胀的 God Object。

长期采用按领域 Repository/Store：

```text
CompanyRepository
RouteRepository
ServicePlanRepository
TripRepository
VehicleRepository
WorldRepository
```

Stage 1 只定义 Repository 接口。

具体内存实现放：

```text
application/repositories/in-memory/
```

或后续 data adapter。

业务代码只依赖接口。

---

# 18. Save：Stage 1 只建立 Envelope 和版本边界

目录：

```text
src/save/
  schema/
    SaveEnvelope.ts
    SaveVersion.ts

  migrations/
    Migration.ts
```

Stage 1 不实现完整所有领域序列化。

先固定：

```text
saveVersion
gameVersion
contentVersion
createdAt
savedAt
payload
```

真正 SaveRoot 在相关领域稳定后再增加。

---

# 19. Bootstrap

目录：

```text
src/bootstrap/
  createApplication.ts
```

它是 composition root。

只负责：
- 创建 repository
- 创建 buses
- 注册 handlers
- 返回应用依赖

禁止业务规则进入 bootstrap。

未来 Android/Web 入口都调用同一个 bootstrap。

---

# 20. Public API

只保留一个：

```text
src/public-api.ts
```

规则：

1. 外部层优先从 public-api 导入。
2. public-api 只导出稳定的跨层接口。
3. domain 内部实现不全部暴露。
4. 删除公共类型后必须同步检查全部引用。

`src/index.ts` 不再作为业务入口。

如果需要 CLI/demo，未来放：

```text
tools/demo/
```

而不是污染正式 `src/`。

---

# 21. Stage 1 测试布局

正式替换为：

```text
tests/
  contracts/
    ids.test.ts
    envelopes.test.ts

  core/
    result.test.ts
    game-clock.test.ts

  domain/
    trip-state-machine.test.ts
    vehicle.test.ts
    route.test.ts

  architecture/
    forbidden-paths.test.ts
    dependency-boundaries.test.ts
```

Stage 1 最重要的不是测试车辆跑多远，而是测试：

- ID 不会混用
- Trip 非法状态迁移被拒绝
- Vehicle 不再拥有 routeId
- Route 不拥有车辆运行状态
- forbidden paths 不存在
- Domain 不导入 Presentation/Android

---

# 22. CI 新增架构守卫

Stage 1 完成时必须增加：

```text
npm run typecheck
npm test
npm run check:architecture
npm run check
```

`check:architecture` 至少检查：

禁止路径：
```text
src/legacy/
src/old/
src/backup/
```

禁止命名：
```text
*V2.ts
*New.ts
*Final.ts
*Old.ts
*Legacy.ts
GameManager.ts
MainController.ts
```

禁止 Domain 导入：
```text
presentation
android
react
dom
canvas
```

---

# 23. Stage 1 不做什么

这轮正式编码完成后，仍然不做：

- 车辆移动
- Pathfinding
- Passenger Demand
- Finance
- UI
- Android
- 地图渲染
- 购车
- 实际创建线路
- 发车调度

原因：先把身份、聚合、状态机和边界建立正确。

---

# 24. Stage 1 实施顺序

正式施工顺序固定：

### Step 1
删除第 2 节列出的 V0.1 文件。

### Step 2
创建 Contracts：
- IDs
- Command Envelope
- Event Envelope

### Step 3
创建 Core：
- Units
- Time
- Result
- Error

### Step 4
创建 Domain：
- World
- Route
- Schedule
- Trip
- Vehicle
- Company

### Step 5
创建 Repository 接口。

### Step 6
创建 CommandBus / QueryBus 骨架。

### Step 7
创建 Save Envelope / Migration 接口。

### Step 8
创建 Bootstrap。

### Step 9
创建唯一 public-api。

### Step 10
重建测试和 architecture guard。

### Step 11
更新 CHANGELOG。

### Step 12
确认旧 V0.1 文件、旧接口、旧字段全部消失。

---

# 25. Stage 1 最终验收清单

只有全部满足才进入 Stage 2：

- [ ] `Vehicle.routeId` 不存在
- [ ] `Vehicle.worldPosition` 不存在
- [ ] `GameState.ts` 不存在
- [ ] `PassengerTransportApp.ts` 不存在
- [ ] `commands.ts` 松散 union 不存在
- [ ] `core/events.ts` 旧 EventBus 协议不存在
- [ ] Trip 状态机测试通过
- [ ] Route / ServicePlan / Trip / Vehicle 分离
- [ ] ID 强类型
- [ ] Result/Error 标准化
- [ ] Command/Event Envelope 标准化
- [ ] Repository 接口存在
- [ ] public-api 唯一
- [ ] forbidden path 检查通过
- [ ] typecheck/test/architecture check 全绿

完成后才开始 Stage 2：WorldGraph 与正式 Pathfinding 基础。
