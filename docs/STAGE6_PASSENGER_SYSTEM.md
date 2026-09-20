# Stage 6：正式客流系统

状态：Implemented

## 1. 客流只做聚合，不创建普通乘客实体

正式模型分三层：

```text
PassengerDemandProfile
  -> PassengerRuntimeState station queues
  -> TripInstance.onboardPassengerGroups
```

普通乘客不会拥有独立 ID。

## 2. RouteStopPoint

Stage 6 删除 PassengerRoute 内部的 orderedStationIds。

线路内部唯一站序改为：

```text
RouteStopPoint {
  stationId
  pathLegBoundaryIndex
}
```

第一站 boundary=0，终点 boundary=pathLegs.length，中间站严格递增。

这样车辆跨越 PathLeg 边界时可以确定到达哪一个正式站点。

Command 仍然接收 orderedStationIds，因为这是玩家创建线路时的输入，不是 Route 内部第二套状态。

## 3. OD Demand

PassengerDemandProfile：

- originStationId
- destinationStationId
- basePassengersPerHour

实际生成量还乘以 PassengerDemandPolicy 提供的班次频率倍率。

频率倍率不硬编码进 Simulation：
- Application 必须注入 PassengerDemandPolicy
- 以后 balance content 可以直接提供这套参数/策略

没有可用班次时，策略可以返回 0。
高频线路可以返回更高倍率。

## 4. 需求累积

需求使用整数余数累积：

```text
base passengers/hour
× frequency multiplier permille
× elapsed seconds
+ previous remainder
```

因此不同 Simulation Tier 批量推进时不会因为取整而凭空丢客流。

## 5. Station Queue

PassengerRuntimeState 是站外候车唯一状态源。

按：

```text
origin station
  -> destination station
     -> waiting count
```

聚合。

## 6. Onboard Groups

Trip 不再保存 onboardPassengerCount。

正式保存：

```text
onboardPassengerGroups [
  { destinationStationId, count }
]
```

总人数实时求和。

这样到中途站时可以准确下客。

## 7. 上下客

到站顺序：

1. 当前目的地乘客下车
2. 计算剩余座位
3. 按线路后续站序上客
4. 满载后的乘客继续留在 Station Queue
5. 返回 leftWaitingCount

Stage 6 使用 seatCapacity，不允许超载。

## 8. 班次频率影响需求

PassengerDemandCoordinator 会统计当前游戏日内，所有能从该 OD 正向直达的 active Route + ServicePlan 的 DepartureSlot 数量。

这个 departuresPerDay 传给 PassengerDemandPolicy。

因此：
- 没班次可以没有需求转化
- 班次越密，策略可以提高实际客流
- 具体曲线不写死在核心模拟代码

## 9. 发车与中途站

trip.startBoarding：
- 在起点完成第一次上客

车辆运行跨过正式站点 boundary：
- 发布 trip.arrivedAtStop
- passengers.alighted
- passengers.boarded

终点：
- 最后一批乘客下车
- 随后 Trip completed

## 10. 查询

新增：

```text
passenger.stationQueue
```

返回目的地分组和总候车人数。

UI 后续只能通过 Query 读取，不直接操作 PassengerRuntimeState。
