# Stage 5：车辆移动与地图查询基础

状态：Implemented

## 1. 运行事实

车辆的业务位置仍然只存在于 TripPosition：

- activeRoadSegmentIndex
- offsetOnSegmentM
- lastUpdatedGameSecond

OwnedVehicle 不保存 Route 或 worldPosition。

地图世界坐标始终由：

```text
TripPosition
+ PassengerRoute.PathLeg
+ RoadSegment geometry
-> WorldPoint
```

派生。

## 2. 离散秒移动

模拟使用整数游戏秒和整数米。

有效速度：

```text
min(
  VehicleModel.maxSpeedMps,
  floor(RoadSegment.speedLimitMps * RoadRuntime.speedMultiplierPermille / 1000)
)
```

这样：
- 不把浮点位置写进存档
- 按 1 秒/15 秒/300 秒批量推进时结果可复现
- RoadRuntimeState 可以即时限速
- closed 道路会让 Trip 原地等待

Stage 5 不做自动绕行。封路后的重路由属于后续运行策略。

## 3. 正反向位置

RoadGeometry 会按 PathLeg.direction 解释 offset。

同一条双向道路：
- forward offset=0 从 fromNode 开始
- reverse offset=0 从 toNode 开始

视觉 polyline 只是显示几何。
正式路程仍以 RoadSegment.lengthM 为业务距离。

## 4. Trip 完成

跑完最后一个 PathLeg：
- Trip -> completed
- actualArrivalGameSecond 写入
- Vehicle 释放为 available
- Driver 释放为 available
- 从运行车辆 SpatialIndex 删除
- 发布 trip.completed

## 5. Tier A/B/C

正式命名：

- foreground：1 秒更新建议
- regional：15 秒更新建议
- background：300 秒更新建议

三档只改变“多久批量解析一次”，不改变道路、速度或经营公式。

同一 Trip 最终仍调用同一个 advanceRunningTrip。

## 6. SpatialIndex

Stage 5 使用可替换的 uniform-grid PointSpatialIndex。

当前默认车辆格网：
- 25,000 世界米 / cell

这是派生缓存，不进入业务存档。

以后可以替换 R-tree/region chunk，不修改 Trip/Vehicle。

## 7. 地图查询

正式 Query：

```text
map.visibleVehicles
```

输入 bbox：
- minXM
- minYM
- maxXM
- maxYM

返回：
- tripId
- vehicleId
- routeId
- xM
- yM

UI 以后只能读这个 DTO，不直接扫描/修改 Trip。
