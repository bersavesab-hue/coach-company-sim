# Stage 3：正式线路系统

状态：Implemented

## 核心链

```text
Station
-> WorldNode
-> static WorldGraph pathfinding
-> PathLeg[]
-> PassengerRoute
```

线路不保存视觉坐标，也不保存裸 `roadSegmentIds`。

每一个 PathLeg 都保存：
- roadSegmentId
- direction
- fromNodeId
- toNodeId

因此双向道路能够明确表达线路实际经过方向。

## 官方线路与临时道路事件

创建/修改官方线路时使用静态可通行路网：
- 遵守道路 active 状态
- 遵守单向/双向方向
- 遵守节点连通性

但不读取临时 RoadRuntimeState。

原因：施工、事故、天气封路属于一次或一段时间的运营问题，不应永久改变官方线路定义。

实际 Trip 运行阶段再读取 RoadRuntimeState，并决定绕行、延误或停运。

## Route Command

Stage 3 正式注册：

- route.create
- route.updateStops
- route.activate
- route.deactivate

成功后发布：
- route.created
- route.stopsUpdated
- route.activated
- route.deactivated

## Activation

线路激活前检查：
- Route 当前必须是 draft 或 suspended
- Company 必须存在
- Company 必须拥有 Route.requiredLicenseIds 中的全部许可证

## 数据所有权

PassengerRoute 拥有长期线路事实：
- 站序
- PathLeg[]
- routingPreference
- farePolicyId
- requiredLicenseIds
- status

不拥有：
- 当前车辆
- 当前司机
- 当前乘客
- 当前 Trip 位置
- 临时道路封闭状态
