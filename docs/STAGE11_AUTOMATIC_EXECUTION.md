# Stage 11：运营日程落地与自动执行

状态：Implemented

## 核心边界

DayOperationsPlan 是只读推演结果。

CommittedOperationsSchedule 是已经提交、等待执行或正在执行的运营日程。

真正的领域变化仍然只能通过 CommandBus 进入现有 Trip / FleetTask / Vehicle / Driver / Finance / Simulation 链。

## 自动执行

OperationsExecutionCoordinator 负责：

- 到点启动调车
- 到点启动补能
- 到点启动保养
- 到点开始司机休息
- 提前进入客运上客
- 准点发车
- 跟踪 Trip/FleetTask 完成状态
- 自动故障救援
- 备用车/替补司机接班
- 运营偏差后的剩余日程重排

## 时间推进

SimulationCoordinator 不允许越过运营边界。

较大时间跳跃会被切成：

support complete → deadhead → boarding → departure → trip progress → arrival

以保证自动运营顺序确定。

## 故障

Trip disrupted 后：

1. fleet.recover
2. 拖救至线路后续站点
3. 释放原故障车/司机
4. 查找同站备用资源
5. 校验备用车剩余线路安全
6. trip.resume
7. 提升 schedule revision
8. 重排后续日程
