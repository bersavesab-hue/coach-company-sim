# 静态数据与内容契约

状态：**Content Contract v1**

## 1. 核心原则

代码负责规则，内容包负责内容。

以下内容不得硬编码到 UI 或业务逻辑：
- 城市
- 乡镇
- 道路基础数据
- 车辆型号
- 站场类型
- 许可证
- 节假日
- 事件
- 平衡参数

目录：

```text
content/
  manifest.json
  world/
  vehicle-models/
  station-types/
  licenses/
  events/
  balance/
```

---

## 2. manifest

每个正式内容版本必须带：

```json
{
  "contentVersion": 1,
  "gameCompatibility": ">=0.1.0",
  "packs": []
}
```

内容版本和 saveVersion 分开。

---

## 3. World 数据

WorldNode 示例：

```json
{
  "id": "location.region01.city001",
  "type": "city",
  "name": "临山市",
  "regionId": "region.01",
  "xM": 1250000,
  "yM": 860000,
  "active": true
}
```

RoadSegment 示例：

```json
{
  "id": "road.region01.000001",
  "fromNodeId": "location.a",
  "toNodeId": "location.b",
  "lengthM": 18300,
  "speedLimitMps": 22,
  "roadClass": "national_road",
  "direction": "both",
  "polyline": []
}
```

正式里程和视觉 polyline 可以不同，但不能互相替代。

---

## 4. VehicleModel 数据

```json
{
  "id": "vehicle_model.coach.000001",
  "name": "19座县域中巴",
  "seatCapacity": 19,
  "standingCapacity": 0,
  "purchasePriceCents": 12800000,
  "maxSpeedMps": 25,
  "fuelType": "diesel",
  "nominalFuelMlPer100Km": 15000,
  "reliabilityPermille": 720,
  "comfortPermille": 420,
  "allowedServiceTypes": ["rural", "county"],
  "active": true
}
```

禁止业务代码：
```ts
if (modelId === "...") { special case }
```

车型差异必须来自数据或正式策略接口。

---

## 5. Balance 数据

平衡数据单独维护，例如：

```text
content/balance/
  economy.json
  passenger-demand.json
  maintenance.json
  reputation.json
  progression.json
```

这样调数值不需要改领域代码。

---

## 6. Schema 校验

所有 content 在进入游戏前必须校验：
- ID 唯一
- 引用存在
- 整数单位正确
- 数值范围正确
- road 起终点存在
- route stop 存在
- 许可证引用存在
- 不允许循环/非法引用

正式构建必须执行 content validation。

---

## 7. 数据包扩展

未来全国地图不允许形成一个巨大 JSON。

按区域拆包：

```text
content/world/
  region-001/
    nodes.json
    roads.json
    stations.json
  region-002/
    ...
```

世界索引只负责定位需要加载哪个区域包。

---

## 8. 静态与动态严格分离

静态：
- 城市名称
- 道路基础长度
- 车型座位数

动态：
- 道路是否封闭
- 车辆车况
- 当前客流
- 公司拥有车辆
- 玩家创建线路

动态数据进入 Save，不写回 content。
