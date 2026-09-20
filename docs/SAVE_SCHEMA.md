# 存档架构规范

状态：**Save Contract v1**

## 1. 版本独立

三个版本必须分开：

- gameVersion：代码/游戏版本
- saveVersion：存档结构版本
- contentVersion：静态内容版本

互不替代。

---

## 2. SaveRoot

目标结构：

```text
SaveRoot
├─ saveVersion
├─ gameVersion
├─ contentVersion
├─ meta
├─ clock
├─ worldRuntime
├─ company
├─ stations
├─ routes
├─ servicePlans
├─ trips
├─ vehicles
├─ staff
├─ passengerRuntime
├─ finance
├─ market
└─ progression
```

---

## 3. 只存运行状态

存档不复制静态 VehicleModel：

错误：

```json
{
  "vehicle": {
    "modelName": "...",
    "seatCapacity": 49,
    "purchasePrice": 123
  }
}
```

正确：

```json
{
  "vehicleId": "vehicle.0001",
  "modelId": "vehicle_model.coach.0001",
  "mileageM": 81230000,
  "conditionPermille": 760
}
```

---

## 4. 运行中的车辆

车辆位置不能只保存 x/y。

保存事实：
- activeTripId
- trip.activeRoadSegmentIndex
- trip.offsetOnSegmentM
- trip status

worldPosition 可以在加载后重新推导。

这样道路渲染算法变化不会破坏业务状态。

---

## 5. 财务

正式存档至少保存：
- 当前余额
- 必要的近期 Ledger
- 累计统计

长期流水可按周期压缩归档，避免存档无限增长。

---

## 6. Migration

迁移必须是单向逐版本：

```text
v1 -> v2 -> v3 -> v4
```

禁止：
```text
if old save then guess current structure
```

目录：

```text
src/save/migrations/
  migrate-v1-to-v2.ts
  migrate-v2-to-v3.ts
```

每个 migration 必须有测试。

---

## 7. 开发期规则

正式发布前允许重置测试存档，但必须同时：
1. 增加 CHANGELOG 说明
2. 明确这是开发测试存档
3. 不伪装为兼容升级

正式发布后不得要求玩家删档解决架构修改。

---

## 8. 加载流程

```text
读取 SaveEnvelope
-> 校验基本格式
-> 检查 saveVersion
-> 逐版本 migration
-> 检查 content 引用
-> 建立领域状态
-> 重建派生索引/地图位置
-> 游戏启动
```

派生缓存不应成为不可恢复的存档事实。
