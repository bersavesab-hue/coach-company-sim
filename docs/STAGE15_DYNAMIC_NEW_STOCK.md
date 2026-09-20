# Stage 15：动态新车库存生成器

状态：Implemented

## 核心规则

动态新车库存不手写固定 VehicleListing。

正式链路：

```text
VehicleDealer
→ supportedBrandIds
→ 当前可销售 VehicleVariant
→ Variant lifecycle
→ 7 天库存周期
→ 确定性候选排序
→ stockCount / priceBias
→ VehicleListing
```

## 7 天库存周期

库存周期固定为 7 个游戏日。

规则：
- 同一周期重复调用不会重复生成 Listing。
- 同一车源卖光后，本周期不即时重生。
- 下一个周期使用新的 cycle key 生成新的库存批次。
- 生成结果由 game cycle + dealer + variant 决定，不使用 Math.random / Date.now。
- 时间推进频率不会改变市场结果。

## 允许生成新车的车商

只允许：
- manufacturer_dealer
- regional_dealer

禁止：
- used_vehicle_dealer
- auction_house

二手车商和拍卖行只由后续二手供给系统提供车源。

## 生命周期

Variant 状态按 gameDay 判断：

```text
未到 launchGameDay
→ 不出现

launchGameDay ~ productionEndGameDay
→ 正常在产

productionEndGameDay 之后
且未超过 dealerClearanceEndGameDay
→ 清库存

超过 dealerClearanceEndGameDay
→ 不再生成新车
```

清库存：
- stockCount 固定更低
- 使用清库存价格折扣
- 仍然是合法 new VehicleListing

## 标准配置

动态新车 Listing 自动确保存在稳定的厂家标准 VehicleConfiguration。

标准配置直接使用 Variant 的：
- standardSeatCapacity
- standardEnergyCapacityUnits
- standardLuggageCapacityL
- standardComfortPermille

priceAdjustmentCents = 0。

玩家仍可在购买时传入同一个 Variant 下的合法自定义 VehicleConfiguration。

## 运行时内容

FORMAL_VEHICLE_CONTENT 提供正式 seed bundle：

- 10 brands
- 32 series
- 100 models
- 100 model identities
- 180 variants
- 48 options
- 24 dealers

Repository adapter 初始化时使用该 bundle 注入正式静态内容。

NewVehicleStockGenerator 在生成 Listing 前仍会检查运行时 Repository 引用，避免产生不可购买的孤儿车源。

## Listing 来源

自动新车：
- supplySource = generated_new
- supplyCycleKey = 7 天周期 key

VehicleMarketTradingService 不对 generated_new 做普通车商二次重估，避免把车商价格偏移、库存周期价格和清库存折扣覆盖掉。
