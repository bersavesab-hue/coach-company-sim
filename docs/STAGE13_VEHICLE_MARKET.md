# Stage 13：车辆产业与交易底层

状态：Implemented

## 目标

把原来的“车型 ID → 直接生成车辆”替换为正式车辆商业链：

VehicleBrand
→ VehicleSeries
→ VehicleModel（技术底座）
→ VehicleVariant（厂家版本/年款）
→ VehicleConfiguration（具体选装）
→ VehicleDealer
→ VehicleListing
→ OwnedVehicle

## 新车

新车必须来自 VehicleListing。

Listing 记录：

- dealer
- model / variant
- 标准或可替换配置
- asking price
- stock
- available/expired/sold

购买后库存真实扣减。

## 自定义配置

VehicleConfiguration 不是 VehicleModel。

允许改变：

- 座位数
- 能源容量
- 行李舱
- 舒适度
- 外观颜色
- 公司涂装

选装必须来自 VehicleVariant.allowedOptionCodes，并检查互斥组。

运营真正读取 OwnedVehicle.seatCapacity / energyCapacityUnits。

## 二手车

UsedVehicleSnapshot 保留：

- 真实里程
- 剩余能源
- 上次/下次保养里程
- 首次登记时间
- 保险有效期
- 年检有效期
- 动力/制动/轮胎/车身状态
- 历史车主数
- 已记录事故数

二手 Listing 的 configuration 固定，购买前不能切换为自定义配置。

## 车商

VehicleDealer 类型：

- manufacturer_dealer
- regional_dealer
- used_vehicle_dealer
- auction_house

Stage 13 建立统一市场边界；动态库存生成、公司挂牌出售、拍卖竞价和地区价格波动继续在后续市场阶段扩展，不建立第二套接口。

## UI 入口

- vehicleMarket.listings
- vehicleMarket.configurator

市场 Projection 只读。
