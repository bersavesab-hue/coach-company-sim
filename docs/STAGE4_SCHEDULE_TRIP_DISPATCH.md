# Stage 4：班次、Trip 与调度

状态：Implemented

## 正式链路

```text
PassengerRoute
-> ServicePlan
-> DepartureSlot
-> TripInstance
-> Vehicle + Driver
```

## ServicePlan

ServicePlan 是长期运营计划，不保存具体车辆和司机。

支持：
- fixed_times
- interval_window
- serviceDays
- effectiveFrom / effectiveUntil
- requiredVehicleClass

创建后的计划直接进入 active。取消后的计划进入 cancelled，不允许继续修改或生成班次。

## DepartureSlot

DepartureSlot 是由 ServicePlan 计算出的派生值，不单独成为长期资产。

第一版规则：
- 游戏第 1 天 = Monday
- 每个游戏日按 serviceDays 过滤
- fixed_times 直接展开
- interval_window 按窗口和间隔展开
- effectiveFrom / effectiveUntil 再次裁剪

## TripInstance

只有合法 DepartureSlot 才能 prepare Trip。

Trip 创建后仍然保持：
- routeId
- servicePlanId
- vehicleId nullable
- driverId nullable
- plannedDeparture
- actualDeparture
- delay
- TripPosition

## 车辆与司机调度

Vehicle 与 Driver 都是独立资产。

分配时检查：
- 同一公司
- 当前 available
- activeTripId 为空
- VehicleModel.serviceClass 满足 ServicePlan.requiredVehicleClass
- Driver.qualifiedVehicleClasses 包含 requiredVehicleClass

分配后：
- Vehicle.status = assigned
- Driver.status = assigned
- 两者 activeTripId = Trip.id

发车后：
- Trip = running
- Vehicle = running
- Driver = driving

取消 Trip 后释放当前绑定资源。

## 事件

Stage 4 正式发布：
- servicePlan.created
- servicePlan.updated
- servicePlan.cancelled
- trip.created
- trip.vehicleAssigned
- trip.driverAssigned
- trip.boardingStarted
- trip.departed
- trip.cancelled

## 仍未进入 Stage 4 的内容

- 车辆沿道路推进
- 到站/完成 Trip
- 上下客
- 油耗
- 司机工时结算
- Tier A/B/C 模拟

这些进入 Stage 5/6/7。
