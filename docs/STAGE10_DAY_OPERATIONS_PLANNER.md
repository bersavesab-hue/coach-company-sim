# Stage 10：自动运营排班引擎

状态：Implemented

## 目标

把公司当天所有正式 ServicePlan 发车需求转换为可执行运营计划：

ServicePlan → Departure Slots → Vehicle/Driver Pairing → Support Actions → Coverage Report。

## 唯一边界

DayOperationsPlanner 只读。

它不：
- 保存 Trip
- 修改 Vehicle
- 修改 Driver
- 创建正在运行的 FleetTask

它只返回 DayOperationsPlan。

真正执行仍走 Stage 9 的 Command / FleetTask / Simulation 运行链。

## 车辆虚拟推演

规划过程中为每辆车维护临时状态：

- 当前站点
- 最早可用时间
- 剩余能源
- 预计里程
- 动力/制动/轮胎状态
- 下次保养里程

这些状态只存在于一次计划计算中，不写回 Repository。

## 司机虚拟推演

规划过程中维护：

- 当前站点
- 最早可用时间
- 值勤开始时间
- 连续驾驶秒数
- 最近驾驶结束时间

OperationsPolicy 提供：

- 周转时间
- 最小休息
- 最大连续驾驶
- 最大值勤时间

## 自动支援动作

支持 PlannedOperationAction：

- passenger_trip
- deadhead
- refuel
- maintenance
- rest

deadhead 使用真实 WorldGraph + PathFinder，不允许瞬移。

## 缺口

如果班次无法覆盖，必须产生：

- NO_VEHICLE
- NO_DRIVER
- NO_RESOURCE_PAIR

并保留 uncovered PlannedTripAssignment。

系统不得静默丢班。

## 已有 Trip

planned Trip 可以保留既定车辆/司机约束。

已进入执行或已经结束的 Trip 不重新规划，标记 locked_existing。

## 对 UI 的接口

唯一入口：

operations.planDay

UI 只展示：

- 哪些班次被覆盖
- 用哪辆车
- 用哪个司机
- 需要哪些调车/补能/保养/休息
- 哪些班次缺车/缺司机
- 全天资源使用统计

UI 不自行修改底层调度状态。
