# Stage 15：48 个正式选装定义

状态：Implemented

## 数量
- 座椅布局：6
- 能源 / 续航：6
- 行李方案：6
- 空调 / 热管理：6
- 舒适设备：6
- 安全设备：6
- 车内服务：6
- 外观 / 运营：6
- 合计：48

## 互斥组
以下属于单选：
- seat_layout
- energy_package
- luggage_package
- climate_package
- paint_finish

以下设备允许合理叠加：
- USB
- Wi-Fi
- 可调座椅组件
- 静音包
- 安全辅助
- 娱乐设备
- 冰箱
- 热水设备
- 卫生间
- 电源插座
- LED 线路牌
- 无障碍运营设备
- 远程车队管理

## 选装效果
每个正式 VehicleOptionDefinition 可以影响：
- priceDeltaCents
- seatCapacityDelta
- energyCapacityUnitsDelta
- luggageCapacityLDelta
- comfortPermilleDelta

选装结果必须继续通过 VehicleConfigurationRules：
- 座位 > 0
- 能源容量 > 0
- 行李容量 >= 0
- 舒适度 0..1000
- 同一互斥组不得同时选择多个

## 续航单位
energyCapacityUnitsDelta 沿用对应 VehicleModel.energyKind：
- 柴油：diesel_ml
- 纯电：electric_wh

同一数值表示对应能源单位中的容量变化，不再假设所有车型都是燃油车。

## 与 Variant 的关系
180 个 VehicleVariant 已经引用稳定的 48 个 option code。
本阶段只补正式定义，没有重新命名 option code，因此不会返工 Variant 数据。
