# Stage 15：车辆内容库与动态车商供给冻结

状态：**Blueprint Freeze**

## 1. 目标

Stage 13–14 已完成车辆市场规则。

Stage 15 只解决一个问题：

> 让市场长期存在足够多、合理、会变化的车型和车源，而不是靠手写固定 Listing。

不新增第二套车辆市场，不重写 VehicleModel / VehicleVariant / VehicleConfiguration / VehicleListing。

---

## 2. 第一版固定内容量

| 内容 | 固定数量 |
|---|---:|
| 架空品牌 VehicleBrand | 10 |
| 车系 VehicleSeries | 32 |
| 基础技术车型 VehicleModel | 100 |
| 厂家版本/年款 VehicleVariant | 180 |
| 选装定义 VehicleOptionDefinition | 48 |
| 正式车商 VehicleDealer | 24 |

这些是 Stage 15 第一版验收数字，不再使用区间。

---

## 3. 8 类车辆用途

100 个基础车型必须覆盖：

1. rural_minibus：乡镇/农村微客、小型客运
2. county_midibus：县域中巴
3. standard_coach：普通客运大巴
4. intercity_coach：城际/省际客车
5. premium_coach：高档长途商务客车
6. tourist_coach：旅游客车
7. airport_shuttle：机场/商务接驳
8. high_capacity_coach：高运力干线客车

建议基础车型分布：

| 类型 | VehicleModel |
|---|---:|
| rural_minibus | 12 |
| county_midibus | 16 |
| standard_coach | 22 |
| intercity_coach | 18 |
| premium_coach | 10 |
| tourist_coach | 10 |
| airport_shuttle | 6 |
| high_capacity_coach | 6 |
| 合计 | 100 |

---

## 4. 10 个架空品牌定位

正式内容全部使用架空品牌，不使用真实商标。

品牌必须形成明显差异：

1. 国民低价品牌
2. 县域耐用品牌
3. 城际主流品牌
4. 高可靠性品牌
5. 节能品牌
6. 新能源品牌
7. 高端商务品牌
8. 旅游客车品牌
9. 大运力干线品牌
10. 小众高性价比品牌

品牌差异通过数据体现，不通过硬编码 if brandId。

---

## 5. 32 个车系

每个品牌 2–4 个车系。

车系主要描述产品族，不承担具体技术参数。

示例：

```text
品牌
├─ 小型客运系列
├─ 县域中巴系列
├─ 城际系列
└─ 高端长途系列
```

VehicleSeries 只关联品牌和产品族。

---

## 6. 100 个 VehicleModel

VehicleModel 是技术底座。

每个 Model 必须有合理且互相联动的：

- serviceClass
- seatCapacity
- maxSpeedMps
- energyKind
- energyCapacityUnits
- minimumDispatchEnergyUnits
- drivingEnergyUnitsPer100Km
- idleEnergyUnitsPerHour
- serviceIntervalM
- 动力/制动/轮胎磨损
- 最低安全阈值

禁止只改名称、价格就复制出“新车型”。

两个 VehicleModel 若主要技术参数完全相同且只差商业命名，应合并为同一技术 Model，通过 Variant 表达。

---

## 7. 180 个 VehicleVariant

Variant 表达：

- 年款
- 标准座位布局
- 标准能源容量
- 标准行李舱
- 标准舒适度
- 基础价格
- 可用选装

比例：

- 100 个 Model 至少各 1 个 Variant
- 主力车型允许 2–3 个年款/版本
- 总数固定 180

不得用 Variant 复制运行技术底座。

---

## 8. 48 个选装定义

分 8 组，每组约 6 个：

### 座椅
- 高密度座椅
- 标准座椅
- 舒适座椅
- 商务座椅
- 低座位大空间
- 无障碍布局

### 能源/续航
- 标准油箱/电池
- 长续航
- 超长续航
- 轻量化能源包
- 城际能源包
- 寒区能源包

### 行李
- 标准行李舱
- 加大行李舱
- 旅游行李包
- 机场行李包
- 轻量小舱
- 高顶储物

### 空调/热管理
6 项

### 舒适
6 项

### 安全
6 项

### 车内服务
6 项

### 外观/运营
6 项

互斥选装必须使用 mutuallyExclusiveGroup，不在 UI 写死。

---

## 9. 24 个车商

固定组成：

- 10 个品牌厂家经销网络
- 6 个地区综合车商
- 5 个二手车商
- 3 个拍卖行

车商库存差异来自：
- supportedBrandIds
- regionId
- dealer kind
- 地区需求
- 车型生命周期
- 当前游戏时间

---

## 10. 动态新车库存

禁止把所有 Variant 永久显示在所有 4S 店。

正式生成逻辑：

```text
品牌/地区
→ 当前在产 Variant
→ 地区偏好
→ 车商支持品牌
→ 供给权重
→ 库存数量
→ 折扣/加价
→ VehicleListing
```

支持：
- 现车
- 稀缺车
- 清库存
- 新年款上市
- 老款停产
- 地区缺货

生成器只创建 VehicleListing，不创建第二套 Market 对象。

---

## 11. 动态二手车源

二手生成器根据：

- 当前游戏年份
- 历史在售车型
- 车型保有量权重
- 车龄
- 里程
- 保养质量
- 事故概率
- 历史车主数
- 地区偏好
- 车辆用途

生成 UsedVehicleSnapshot + VehicleListing。

禁止：
- 每天手写固定二手车
- 二手车买入后洗成新车
- 生成无法追溯到 Variant/Configuration 的二手车

---

## 12. 车型生命周期

每个 Variant 后续内容数据必须能够描述：

- launchGameDay
- productionEndGameDay
- dealerClearanceEndGameDay

规则：

```text
未上市
→ 正常销售
→ 新年款替代
→ 老款清库存
→ 停售
→ 只剩二手市场
```

不删除历史 Variant。

---

## 13. 地区市场差异

地区只提供权重，不复制车型：

- minibusDemandPermille
- midibusDemandPermille
- coachDemandPermille
- premiumDemandPermille
- tourismDemandPermille
- newEnergyDemandPermille
- priceSensitivityPermille

同一 Variant 在不同地区可出现：
- 库存不同
- 折扣不同
- 二手保值不同

---

## 14. Content Validator

Stage 15 必须先做 validator，再批量填内容。

至少检查：

- ID 唯一
- Brand → Series 引用有效
- Series → ModelIdentity 引用有效
- Variant → VehicleModel 引用有效
- Variant price > 0
- seatCapacity > 0
- energyCapacity > 0
- option code 唯一
- mutuallyExclusiveGroup 合法
- 选装后座位/容量不能 <= 0
- Dealer 引用品牌有效
- 生命周期日期顺序合法
- 100 Model / 180 Variant 等固定数量达标
- 同技术参数重复 Model 报警
- 异常价格/能耗/座位组合报警

任何正式内容包未通过 validator，不得进入 main。

---

## 15. Stage 15 实施顺序

1. 更新 SYSTEM_MAP + 冻结本文件
2. Content contract / lifecycle metadata
3. Content Validator
4. 10 品牌
5. 32 车系
6. 100 VehicleModel
7. 180 Variant
8. 48 Option
9. 24 Dealer
10. 新车库存生成器
11. 二手车动态生成器
12. 地区需求配置
13. 生命周期刷新
14. 全量验证 + CI

---

## 16. 第一验收点

第一步只验收：

- SYSTEM_MAP 不再把 4S/二手拍卖写成“未来未实现”
- Stage 10–15 与实际仓库一致
- Stage 15 数量固定
- 数据归属明确
- 禁止事项明确
- 后续实现顺序明确

本步骤不新增 100 个 VehicleModel，不生成正式车源。
