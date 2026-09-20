# Command / Event 规范

状态：**Contracts v1**

## 1. 基本原则

Command 表示“请求做某件事”。

Event 表示“某件事已经成功发生”。

UI 只能发送 Command 或 Query，不能直接修改领域状态。

---

## 2. Command 命名

统一使用动词：

```text
company.create
vehicle.purchase
vehicle.sell
vehicle.sendToMaintenance

route.create
route.updateStops
route.setFare
route.activate
route.deactivate

servicePlan.create
servicePlan.update
servicePlan.cancel

trip.prepare
trip.assignVehicle
trip.assignDriver
trip.startBoarding
trip.depart
trip.cancel

station.purchase
station.upgrade

staff.hire
staff.dismiss
```

禁止：
- doThing
- handleRoute
- updateGame
- processAll

---

## 3. Command Envelope

长期统一格式：

```ts
interface CommandEnvelope<T> {
  commandId: string;
  type: string;
  issuedAtGameSecond: number;
  payload: T;
}
```

Application Handler 负责：
1. 校验命令格式
2. 查找领域对象
3. 校验业务前置条件
4. 执行领域变化
5. 写入 Event

---

## 4. Event 命名

统一使用过去式事实：

```text
company.created

vehicle.purchased
vehicle.sold
vehicle.maintenanceStarted
vehicle.maintenanceCompleted
vehicle.brokenDown

route.created
route.stopsUpdated
route.fareChanged
route.activated
route.deactivated

servicePlan.created
servicePlan.updated
servicePlan.cancelled

trip.created
trip.vehicleAssigned
trip.driverAssigned
trip.boardingStarted
trip.departed
trip.arrivedAtStop
trip.completed
trip.cancelled

passengers.generated
passengers.boarded
passengers.alighted

finance.entryPosted
```

---

## 5. Event Envelope

```ts
interface DomainEventEnvelope<T> {
  eventId: string;
  type: string;
  gameSecond: number;
  aggregateType: string;
  aggregateId: string;
  causedByCommandId?: string;
  payload: T;
}
```

事件必须描述事实，不能携带 UI 指令。

错误：
```text
showToast
refreshMap
openModal
```

正确：
```text
trip.departed
vehicle.brokenDown
route.created
```

表现层自己决定怎么显示。

---

## 6. Query

读取和写入严格分离。

Query 示例：
- getCompanyOverview
- getVisibleMapEntities
- getRouteDetail
- getVehicleDetail
- getStationBoard
- getFinanceSummary

Query 不改变状态。

---

## 7. Command Handler 边界

一个 Handler 只处理一种 Command。

禁止一个：
```text
GameCommandHandler
```

里面 switch 100 种功能长期膨胀。

目录应按领域拆：

```text
application/handlers/
  vehicle/
  route/
  trip/
  station/
  staff/
```

---

## 8. 跨系统反应

例如 Trip 完成后：

```text
trip.completed
   ├─ Finance 结算收入
   ├─ Vehicle 增加里程/磨损
   ├─ Staff 增加工时
   ├─ Statistics 更新统计
   └─ Reputation 更新服务评价
```

这些模块监听同一个事实事件。

禁止 TripCompletionHandler 直接修改所有系统内部字段。

---

## 9. 错误结果

业务失败不发布成功 Event。

Application 返回结构化错误：

```text
INSUFFICIENT_FUNDS
LICENSE_REQUIRED
VEHICLE_NOT_AVAILABLE
DRIVER_NOT_QUALIFIED
ROUTE_PATH_INVALID
STATION_CAPACITY_FULL
```

UI 负责翻译成用户文案。
