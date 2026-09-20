# Stage 8：车辆完整生命周期

状态：Implemented

## 1. 唯一技术状态

旧字段：

- conditionPermille
- fuelPermille

正式删除。

现在车辆技术事实为：

- 实际能源单位 energyUnits
- 动力系统状态
- 制动状态
- 轮胎状态
- 车身状态
- 里程
- 上次保养里程
- 下次保养里程
- 保险有效期
- 检验有效期
- 当前故障

不保留第二套“总车况”。

## 2. VehicleModel 技术参数

车型正式拥有：

- 能源类型
- 能源容量
- 最低发车储备
- 每100km行驶能耗
- 每小时怠速能耗
- 保养周期
- 动力/制动/轮胎磨损率
- 最低安全发车阈值

这些是车型技术事实，不再放进 Finance Profile。

## 3. 发车硬校验

Trip 真正发车前检查：

- 保险未过期
- 检验未过期
- 未超过保养里程
- 动力/制动/轮胎达到安全阈值
- 当前能源足够完成整条正式 Route 并保留最低储备

因此“只剩一点油也照样跑跨城线路”的情况被禁止。

## 4. 实际能耗与磨损

trip.operatingInterval 触发 VehicleLifecycleCoordinator。

按真实：

- 行驶距离
- 怠速时间

累计：

- 能源消耗
- 车辆里程
- 动力磨损
- 制动磨损
- 轮胎磨损

分数消耗进入 VehicleLifecycleRuntimeState 余数，不因 1/15/300 秒 Simulation Tier 改变最终结果。

## 5. 故障与中断

运行中如果：

- 能源耗尽
- 动力系统降至 0
- 制动降至 0
- 轮胎降至 0

车辆进入 broken，并记录 activeIncident。

Trip 进入 disrupted，而不是继续移动或自动完成。

被中断的 Trip 不再进入 findRunning，所以不会出现坏车继续在地图上跑。

## 6. 补能

统一 vehicle.refuel 命令覆盖：

- 柴油
- 汽油
- 电
- 氢

车型 energyKind 决定实际能源。

补能价格仍由 EconomicPolicy 动态提供。

物理层：
- vehicle.energyUnits 增加

财务层：
- 补能时形成 energy_inventory
- 行驶实际消耗时再从 inventory 结转到 energy_expense

因此不再“加油时扣一次、跑车时又扣一次”。

## 7. 保养

vehicle.sendToMaintenance：
- 车辆必须无 active Trip
- available/broken 才能进入 maintenance

vehicle.completeMaintenance：
- 使用 VehicleLifecyclePolicy 报价
- 恢复动力/制动/轮胎/车身状态
- 重置保养基准
- 形成真实 maintenance expense / payable

## 8. 保险和检验

支持：

- vehicle.renewInsurance
- vehicle.passInspection

检验前会校验车辆安全状态。

保险/检验有效期进入车辆技术事实。

## 9. 购置

vehicle.purchase 不接受 UI 自己传价格。

价格、残值、寿命、初始保险期、检验期等全部由 VehicleLifecyclePolicy 报价。

现金不足时不允许购买。

购买后：
- Fleet Vehicle 建档
- Finance 创建 VehicleAssetProfile
- Debit vehicle_asset
- Credit cash

## 10. 出售/报废

vehicle.sell / vehicle.retire 只能处理无班次占用车辆。

出售/报废后：
- 状态进入 sold / retired
- 不再能参与运营
- Finance 停止后续资产折旧
- 清理剩余能源库存
- 冲销车辆原值/累计折旧
- 差额进入 gain/loss on vehicle disposal
- 出售/残值收入进入 cash

历史车辆记录仍保留，避免财务和运营历史断链。

## 11. 查询

新增：

vehicle.lifecycle

返回：
- 状态
- 当前能源/容量
- 总里程
- 距离保养公里数
- 四项技术状态
- 保险/检验有效性
- 当前故障

UI 只读 DTO，不直接修改车辆。
