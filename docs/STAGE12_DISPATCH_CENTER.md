# Stage 12：运营调度中心只读模型

状态：Implemented

## 唯一 UI 入口

operations.dispatchCenter

输入：

- companyId
- gameDay
- currentGameSecond

输出 DispatchCenterDto。

## 快照内容

### Schedule
- 是否已经提交
- revision
- active / replan_required / completed
- 提交时间
- 计划生成时间
- 下一次重排时间

### Trips
- route code
- 始发/终到站
- boarding start
- 计划/实际发车
- 实际到达
- Trip/Operation 状态
- 车辆/司机
- 延误
- 故障
- 恢复站
- failure code

### Support
- deadhead
- refuel
- maintenance
- rest
- 时间窗
- 起终站
- 车辆/司机
- FleetTask
- 距离/能源

### Vehicles
- 当前位置
- 当前状态
- 能源
- 里程
- 保养剩余公里
- 技术状态
- 证件状态
- 故障
- 当前任务
- 下一动作

### Drivers
- 当前位置
- 当前状态
- 连续驾驶
- 当前任务
- 下一动作

### Shortages
- NO_VEHICLE
- NO_DRIVER
- NO_RESOURCE_PAIR

未覆盖班次不得因为 allowPartial 而从 UI 中消失。

## 架构纪律

DispatchCenterProjection 只读。

禁止：
- 保存 Vehicle
- 保存 Driver
- 保存 Trip
- 保存 FleetTask
- 修改 CommittedOperationsSchedule

UI 不允许绕过该投影自行组合领域仓库。
