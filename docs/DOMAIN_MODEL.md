# 领域模型规范

状态：**Domain Model v1**

## 1. ID 命名

所有永久 ID 都带领域前缀：

```text
region.*
location.*
road.*
station.*
route.*
service_plan.*
trip.*
vehicle_model.*
vehicle.*
staff.*
company.*
license.*
event.*
```

永久 ID 发布后：
- 不修改含义
- 不复用
- 下架内容只标记 inactive/deprecated

---

## 2. World 领域

### WorldNode

地图拓扑节点，可代表：
- 城市
- 县城
- 乡镇
- 村
- 道路交叉节点
- 客运站位置
- 景区
- 工业园
- 机场/铁路站

核心字段：
- id
- nodeType
- worldPosition
- regionId
- active

### RoadSegment

一条不可再分的路网边。

核心字段：
- id
- fromNodeId
- toNodeId
- lengthM
- speedLimitMps
- roadClass
- direction
- polyline
- accessRules

动态封路、施工、天气影响不直接改静态内容，进入 WorldRuntimeState。

---

## 3. Station 领域

Station 是经营设施，不等同于 WorldNode。

核心：
- stationId
- worldNodeId
- ownerCompanyId/null
- stationTypeId
- platformCapacity
- parkingCapacity
- passengerCapacity
- condition
- services

未来可扩展：
- 售票
- 候车厅
- 维修
- 商铺
- 充电
- 行李

---

## 4. Route 领域

PassengerRoute 描述固定运输关系。

核心：
- routeId
- companyId
- routeType
- orderedStopIds
- roadPathSegmentIds
- baseFareRule
- licenseRequirement
- active

不包含：
- 当前车辆
- 当前司机
- 当前乘客
- 当前所在位置

这些属于 Trip。

---

## 5. Schedule 领域

### ServicePlan

长期计划：
- servicePlanId
- routeId
- serviceDays
- departurePattern
- requiredVehicleClass
- effectiveFrom
- effectiveUntil

### DepartureSlot

一个计划发车点：
- plannedDepartureGameSecond
- originStationId
- routeId

---

## 6. Trip 领域

TripInstance 是“一次真实发车”的运行聚合。

核心：
- tripId
- routeId
- servicePlanId/null
- vehicleId
- driverId/null
- tripStatus
- plannedDeparture
- actualDeparture
- activeRoadSegmentIndex
- offsetOnSegmentM
- onboardPassengerCount
- delaySeconds

状态机：

```text
planned
  -> boarding
  -> running
  -> completed

planned/boarding/running
  -> cancelled
```

车辆地图实时位置以 TripInstance 为运行事实。

---

## 7. Vehicle 领域

### VehicleModel

静态内容：
- modelId
- manufacturer
- seatCapacity
- standingCapacity
- purchasePriceCents
- fuelType
- nominalFuelConsumption
- reliability
- comfort
- maxSpeedMps
- allowedServiceTypes

### OwnedVehicle

运行资产：
- vehicleId
- companyId
- modelId
- mileageM
- conditionPermille
- fuelPermille
- status
- depotStationId
- activeTripId/null

状态：
- available
- assigned
- running
- maintenance
- broken
- retired

---

## 8. Passenger 领域

第一阶段不模拟每个普通乘客对象。

使用聚合客流：
- OD Demand：起点 -> 终点需求
- Queue：站点等待人数
- OnboardGroup：车内按目的地聚合人数

只有特殊剧情乘客未来才成为独立实体。

这样可以支持大地图上数百车辆，而不会因为几十万 Passenger 对象拖垮手机。

---

## 9. Company 领域

Company：
- companyId
- name
- cash/FinanceAccountRef
- reputationPermille
- licenseIds
- branchRegionIds
- progression

Company 不直接拥有一大坨嵌套对象，车辆/线路/员工均通过 ID 关联。

---

## 10. Finance 领域

资金变化必须通过 LedgerEntry。

LedgerEntry：
- ledgerEntryId
- companyId
- gameTime
- category
- amountCents
- referenceType
- referenceId

category 例如：
- ticket_revenue
- vehicle_purchase
- fuel
- toll
- salary
- maintenance
- station_fee
- fine
- loan

Company.cash 是账本汇总后的快速状态，不允许 UI 自己改。

---

## 11. Staff 领域

后续正式实体：
- StaffMember
- DriverQualification
- Shift
- Assignment

司机不是 Vehicle 的字符串字段。

Trip 只引用 driverId。

---

## 12. Market / Competitor 领域

竞争公司与玩家尽可能复用同一领域协议：
- Company
- Route
- Vehicle
- ServicePlan

AI 决策属于 simulation/competition，禁止复制一套“NPC专用线路模型”。

---

## 13. Event 领域

事件分：
- WorldEvent：天气、施工、道路封闭
- MarketEvent：油价、客流机会
- CompanyEvent：检查、事故、员工事件
- CalendarEvent：节假日、开学、赶集

事件产生 Modifier，不把特殊判断散落到各系统 if/else 中。
