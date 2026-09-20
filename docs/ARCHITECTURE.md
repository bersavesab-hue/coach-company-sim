# V0.1 Core Architecture

## 目标

先固定大地图客运模拟最底层的数据事实源，再做 UI。

## 唯一事实源

规则核心拥有：

- 当前游戏时间
- 公司资金与信誉
- 路网
- 客运线路
- 车辆状态
- 车辆真实世界位置
- 等候客流

未来表现层只能读取这些状态。

## 世界坐标

世界坐标单位为整数米。

同一辆车未来可以在：

- 全国缩放
- 区域缩放
- 城市缩放
- 汽车站局部缩放

中显示，但状态只有一份。

## 车辆位置

运行车辆由以下字段唯一确定：

- routeId
- routeSegmentIndex
- offsetOnSegmentM
- worldPosition

worldPosition 由道路 polyline 和 offsetOnSegmentM 推导。

## tick 顺序

1. 应用层验证命令
2. GameClock 推进
3. PassengerDemandSystem 生成客流
4. VehicleMovementSystem 推进车辆
5. EventBus 发布领域事件

## 下一阶段 V0.2

- 地图分块索引
- 多级缩放查询
- 道路邻接图
- 最短/最快路径搜索
- 创建线路命令
- 站点上下客
- 班次与发车计划
