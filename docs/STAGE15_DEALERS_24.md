# Stage 15：24 个正式车商

状态：Implemented

## 数量结构
- manufacturer_dealer：10
- regional_dealer：6
- used_vehicle_dealer：5
- auction_house：3
- 合计：24

## 厂家网络
10 个品牌各 1 家：
- 宇盛汽车销售服务
- 金程客车销售中心
- 中衡商用车销售服务
- 江驰客车销售服务
- 云驰新能源商用车中心
- 星旅高端客车中心
- 维尔曼进口车辆中心
- 诺森进口客车中心
- 东岛商用车进口中心
- 韩沃客车进口销售中心

## 地区综合车商
6 个市场区域：
- north
- east
- south
- central
- west
- northeast

每家地区车商拥有不同：
- supportedBrandIds
- newStockWeightPermille
- usedSupplyWeightPermille
- priceBiasPermille

## 二手车渠道
- 万里二手客车：低价
- 通达二手商用车：主流
- 远航认证二手客车：高端认证
- 海陆进口二手商用车：进口
- 运达车队置换中心：车队批量置换

## 拍卖渠道
- 中联商用车拍卖中心：综合
- 路通车队资产拍卖：车队资产
- 远洋精品客车拍卖：高端/进口

## Region 规则
Stage 15 当前没有正式世界 Region 内容库。

因此：
- VehicleDealer.regionId 暂时保持 null。
- marketZoneCode 用于车辆市场供给与地区价格/需求计算。
- 后续世界地图正式 Region 建立后，再做显式映射。
- 禁止为了车商系统伪造一批脱离 WorldGraph 的 RegionId。

## 下一步
动态新车库存生成器将直接读取：
- Dealer kind
- supportedBrandIds
- marketZoneCode
- inventoryProfile
- newStockWeightPermille
- priceBiasPermille
- Variant lifecycle

然后生成 canonical VehicleListing。
