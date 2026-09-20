# 客运公司模拟器：完整系统地图

状态：**System Map Freeze v2（Stage 15）**

本文件定义“整个游戏最终有哪些系统、谁拥有数据、谁依赖谁、第一版做什么、哪些只预留边界”。  
以后新增功能必须先在这里找到归属；找不到归属时先修改架构文档，禁止随手新建 Manager 或把逻辑塞进页面。

---

# 1. 产品核心链

整个游戏长期围绕一条主链：

```text
World 世界路网
  ↓
Route 线路
  ↓
ServicePlan 班次计划
  ↓
TripInstance 实际班次
  ↓
Vehicle + Driver
  ↓
Passenger Demand / Boarding
  ↓
Trip Result
  ↓
Finance / Reputation / Maintenance / Statistics
  ↓
Company Progression
  ↓
解锁新的区域、线路类型、车辆与站场
```

任何新玩法如果不能明确挂到这条链或一个独立领域，不允许直接进入主流程。

---

# 2. 系统分级

## P0：底层基础

没有这些，其他系统不允许开始。

1. Contracts / IDs
2. Units
3. GameClock
4. Event Bus
5. Result / Error
6. WorldGraph
7. SpatialIndex
8. Content Loader + Validator
9. Save Schema + Migration
10. Application Command / Query

## P1：第一版完整游戏核心

第一版必须形成完整闭环：

1. Company
2. License
3. Station
4. Route
5. ServicePlan
6. Trip
7. Vehicle
8. Passenger Demand
9. Passenger Queue / Boarding / Alighting
10. Dispatch
11. Fare
12. Finance Ledger
13. Fuel / Toll / Running Cost
14. Vehicle Condition / Maintenance
15. Reputation
16. Progression / Unlock
17. Basic Market / Vehicle Purchase
18. Basic Staff / Driver
19. Basic World Event
20. Statistics

## P2：第一版之后扩展

当前已提前完成：
- Used Vehicle Market（Stage 13–14）
- 4S / Dealer Network（Stage 13–14）
- Vehicle Custom Configuration（Stage 13）
- Used Vehicle Auction / Negotiation / Inspection（Stage 14）

仍待后续实现：

- Advanced Competitor AI
- Urban Bus
- Tourism Coach
- Airport Express
- School / Customized Transport
- Terminal Commercial Operations
- Loan / Insurance
- Branch Company
- Advanced HR
- Accident / Safety Inspection
- Dynamic Fuel Market
- Advanced Weather
- Regional Economy
- Passenger Segments
- Brand / Awards / Rankings
- Marketing / Promotion
- Contracts / Tenders
- National Expansion
- Achievements / Tasks
- Rewarded Ads Adapter

原则：**P2 不提前创建一堆空类。**  
只有当 P1 的公共接口确实需要考虑未来扩展时，才预留字段或策略接口。

---

# 3. 模块总图

```text
                         ┌──────────────────────┐
                         │ Presentation / Map   │
                         │ UI / ViewModels      │
                         └──────────┬───────────┘
                                    │ Query / Command
                                    ▼
                         ┌──────────────────────┐
                         │ Application          │
                         │ Handlers / Queries   │
                         └──────────┬───────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
    │ Company     │          │ Route/Trip  │          │ Station     │
    │ License     │          │ Schedule    │          │ Staff       │
    └──────┬──────┘          └──────┬──────┘          └──────┬──────┘
           │                        │                        │
           └───────────────┬────────┴────────┬───────────────┘
                           ▼                 ▼
                    ┌─────────────┐   ┌─────────────┐
                    │ Vehicle     │   │ Passenger   │
                    │ Maintenance │   │ Demand      │
                    └──────┬──────┘   └──────┬──────┘
                           │                 │
                           └────────┬────────┘
                                    ▼
                         ┌──────────────────────┐
                         │ Simulation           │
                         │ Dispatch / Movement  │
                         │ Boarding / Economy   │
                         └──────────┬───────────┘
                                    │ Events
              ┌─────────────────────┼───────────────────────┐
              ▼                     ▼                       ▼
       ┌─────────────┐       ┌─────────────┐         ┌─────────────┐
       │ Finance     │       │ Reputation  │         │ Statistics  │
       └─────────────┘       └─────────────┘         └─────────────┘

    WorldGraph / SpatialIndex / Content / Save 为横向基础设施
```

---

# 4. 各系统职责与唯一数据所有权

| 系统 | 唯一拥有的数据 | 可以读取 | 禁止拥有 |
|---|---|---|---|
| World | 节点、道路静态拓扑、道路运行状态 | 事件修正 | 车辆、票价 |
| SpatialIndex | 空间索引缓存 | World、Trip位置 | 业务事实 |
| Station | 站场容量、站台、设施运行状态 | Passenger、Trip | 路网算法 |
| Route | 线路站序、正式道路路径、票价规则引用 | World | 当前车辆位置 |
| ServicePlan | 长期发车计划 | Route | 实际运行状态 |
| Trip | 一次班次运行事实 | Route、Vehicle、Staff | 车型静态参数 |
| Vehicle | 车辆资产、车况、油量、里程、activeTripId | VehicleModel | 线路永久绑定 |
| Staff | 员工、资质、工时 | Trip | 车辆位置 |
| Passenger | OD需求、站点队列、车内聚合客流 | World、Route、Trip | 财务余额 |
| Finance | Ledger、账户余额 | 领域事件 | UI状态 |
| Company | 企业身份、信誉引用、许可证、成长状态 | Finance摘要 | 所有车辆对象嵌套副本 |
| Reputation | 服务评价与声誉状态 | Trip结果、事件 | 票价 |
| Market | 车辆供给、交易报价、市场状态 | VehicleModel | 玩家资金 |
| Event | 世界/市场/公司事件实例与 Modifier | Clock、World | 特殊页面逻辑 |
| Statistics | 派生统计、历史聚合 | Domain Events | 核心业务状态 |
| Save | 序列化运行状态 | 所有可持久化领域 | 第二套业务模型 |

任何数据如果出现两个“权威拥有者”，必须在编码前解决。

---

# 5. World / 大地图系统

## 5.1 WorldGraph

负责业务拓扑：

- Region
- WorldNode
- RoadSegment
- RoadRuntimeState
- 邻接表
- 通行限制
- 道路等级
- 正式里程
- 正式限速

WorldGraph 不负责画地图。

## 5.2 SpatialIndex

负责快速回答：

- 当前视口有哪些道路
- 当前区域有哪些站点
- 当前缩放级别显示哪些城市标签
- 哪些运行车辆在这个区域
- 哪些线路穿过当前区域

第一阶段接口要支持：
- bbox 范围查询
- region 查询
- zoomLevel 过滤

后续实现可换 R-tree / grid / chunk，不影响 Domain。

## 5.3 Region Pack

全国地图禁止一次加载全部详细数据。

正式规划：

```text
WorldIndex
  ├─ RegionPack 001
  ├─ RegionPack 002
  ├─ RegionPack 003
  └─ ...
```

区域包拥有：
- nodes
- roads
- stations
- visual metadata

运行时按需要加载。

---

# 6. 全国级性能架构

这是移动端必须从第一天规划的边界。

## 6.1 模拟分三档

### Tier A：精细模拟

对象：
- 当前玩家关注区域
- 当前被查看车辆
- 临近到站车辆
- 正在发生事件的 Trip

更新：
- 高频、逐段、精确位置
- 完整上下客和道路影响

### Tier B：区域低频模拟

对象：
- 已加载但非当前视口区域
- 普通运行 Trip

更新：
- 较低频率
- 按批次推进
- 不做不必要的表现计算

### Tier C：离屏解析推进

对象：
- 很远区域
- 数量巨大的后台 Trip

不每帧移动。

根据：
- 当前游戏时间
- Trip 时间轴
- 道路计划
- 已知事件

解析出当前应处于：
- 哪个路段
- 大约偏移
- 是否到站/完成

只有进入关注范围时提升到 Tier A/B。

## 6.2 规则

模拟精度可以变化，**业务结果不能因为玩家是否看着地图而变得不同**。

禁止：
- 玩家打开地图后车辆才开始走
- 离屏车辆不产生运营成本
- 缩放级别改变实际到站时间

---

# 7. Route / Schedule / Trip

## 7.1 Route

线路是长期经营资产。

只描述：
- 服务站点
- 道路路径
- 类型
- 许可要求
- 票价策略引用
- 运营状态

## 7.2 ServicePlan

描述长期班次：

例如：

```text
K01
06:30 首班
20:30 末班
高峰 20 分钟
平峰 35 分钟
```

ServicePlan 生成 DepartureSlot。

## 7.3 TripInstance

每一次真实发车都创建 Trip。

Trip 才拥有：
- vehicleId
- driverId
- passenger groups
- 当前道路段
- 当前偏移
- 实际时刻
- 延误
- 运行结果

这三个模块永久分开。

---

# 8. Passenger 客流系统

第一版不创建几十万个独立 Passenger 对象。

使用三层聚合：

```text
ODDemand
起点 -> 终点 -> 时间段需求

StationQueue
某站当前等待目的地分布

OnboardGroup
某 Trip 车内按下车站聚合
```

## 第一版需求因子

必须支持接口：
- 基础人口
- 时间段
- 工作日/周末
- 节假日
- 票价
- 服务频率
- 线路可达性
- 特殊事件

第一阶段不用一次做复杂 AI，但公式必须在 Passenger 系统内，禁止散在 Route/Station/UI。

---

# 9. Dispatch 调度系统

Dispatch 不拥有车辆。

负责产生和验证：

- 哪个 DepartureSlot 需要车辆
- 哪辆 Vehicle 可用
- 哪个 Driver 可用
- 是否满足车型/资质要求
- 是否冲突
- 是否需要临时加班车

结果创建/更新 Trip。

后续自动调度 AI 也必须复用相同接口。

---

# 10. Finance 财务系统

所有金额变化必须写 Ledger。

第一版类别至少包含：

收入：
- ticket_revenue

支出：
- vehicle_purchase
- fuel
- toll
- salary
- maintenance
- station_fee
- fine

禁止其他模块直接：

```text
company.cash -= ...
```

正确流程：

```text
领域事件
-> Finance Posting
-> LedgerEntry
-> Account Balance 更新
```

后续贷款、保险、补贴只是在 Finance 扩展 category/contract，不重写余额逻辑。

---

# 11. Vehicle / Maintenance

Vehicle 分两层：

### VehicleModel
静态内容。

### OwnedVehicle
玩家/NPC拥有的具体资产。

第一版车况影响：
- 可用性
- 故障概率基础
- 维护成本
- 运营限制

当前 Vehicle 已推进到 Stage 14：

- available / boarding / running
- repositioning / refueling / maintenance / recovering
- broken / listed_for_sale / sold / retired
- VehicleBrand / VehicleSeries / VehicleModelIdentity
- VehicleVariant / VehicleConfiguration
- VehicleDealer / VehicleListing
- 新车、二手车、议价、检测、拍卖、真实过户

车型运行差异继续由 VehicleModel + VehicleConfiguration 数据决定。

Stage 15 开始补正式车辆内容库和动态市场供给，不再扩张新的车辆运行状态。

---

# 12. Station

第一版 Station 先做经营必需能力：

- 站台容量
- 发车能力
- 停车容量
- 乘客容量
- 基础站务费用

第一版不做：
- 商铺逐间装修
- 候车厅家具摆放
- 复杂室内寻路

后续商业经营从 StationFacility 扩展。

---

# 13. Staff

第一版只做司机最小闭环：

- Driver
- 资质
- 工资
- 工时
- 可用状态
- Trip assignment

先不做复杂：
- 家庭
- 性格剧情
- 多层技能树
- 办公室人员微管理

Staff 接口预留其他岗位，但不创建空系统。

---

# 14. Company / License / Progression

Company 是经营主体。

第一版成长门槛由：

- 资产
- 信誉
- 安全记录
- 线路数量
- 许可
- 区域经营权

共同决定。

许可证分级规划：

```text
county
intercounty
intercity
interprovincial
national
```

后续公交、旅游、机场快线可以增加独立 ServiceLicense，不污染基础 LicenseLevel。

---

# 15. Reputation / Service Quality

声誉不能只靠“完成一趟 +1”。

输入：
- 准点率
- 取消率
- 满载/滞留
- 车辆舒适度
- 故障
- 票价合理度
- 事故/检查
- 服务事件

输出：
- company reputation
- route service score

Passenger Demand 可以读取服务评价作为需求修正。

---

# 16. Event / Modifier

所有临时世界变化统一通过 Modifier。

例如：

```text
暴雨
-> roadSpeedMultiplier
-> demandMultiplier

赶集日
-> OD demand boost

道路施工
-> road closed / capacity reduced

工厂投产
-> new commuting demand
```

禁止在 MovementSystem 里硬编码：

```ts
if (todayIsMarketDay) ...
```

---

# 17. Competition

第一版只做最低限度竞争：

- NPC Company
- NPC Route
- 基础票价
- 基础班次
- 客流分配影响

第一版不做“全功能 AI 公司董事会”。

后续 Advanced Competitor AI 通过与玩家相同的 Command 接口行动，禁止 NPC 使用作弊专用模型。

---

# 18. Statistics

Statistics 是事件消费者，不参与业务判定。

记录：
- 今日收入
- 今日客流
- 线路上座率
- 准点率
- 车辆利用率
- 站点滞留
- 成本结构
- 历史趋势

UI 报表只读 Statistics/Query DTO，不自己扫所有业务对象计算。

---

# 19. 第一版完整游戏必须达到的闭环

第一版不是技术 Demo。

必须能够：

```text
创建公司
→ 获得初始许可
→ 在开放区域查看大地图
→ 购买车辆
→ 申请/创建线路
→ 制定班次
→ 分配车辆与司机
→ 车辆按道路运行
→ 乘客产生并上下车
→ 产生票款
→ 扣除油费/通行费/工资/维护
→ 车辆磨损/维修
→ 服务质量影响声誉与客流
→ 赚钱后扩车队/线路/区域
→ 存档与读取
```

只要这条闭环未完成，不优先做 P2 装饰系统。

---

# 20. 第一版明确不做

为了防止开发失控，第一版明确排除：

- 玩家手动驾驶
- 3D
- 火车/飞机/轮船
- 全国全部详细地图一次上线
- 汽车站室内装修
- 每个普通乘客独立 AI
- 复杂员工人生系统
- 高级竞争公司 AI
- 贷款金融衍生玩法
- 复杂事故调查
- 广告 SDK 正式接入

这些不是永久删除，而是不允许抢占底层开发顺序。

---

# 21. 开发顺序

## Stage 0：架构冻结
当前阶段。

产物：
- ARCHITECTURE
- DOMAIN_MODEL
- COMMANDS_EVENTS
- DATA_CONTRACTS
- SAVE_SCHEMA
- VERSIONING
- SYSTEM_MAP

## Stage 1：正式核心模型替换

删除 V0.1 的 Vehicle.routeId 直绑运行方式。

建立：
- IDs
- Route
- ServicePlan
- TripInstance
- OwnedVehicle.activeTripId
- 正式 Event Envelope
- Result/Error

验收：旧直绑接口完全消失。

## Stage 2：WorldGraph

建立：
- Region
- WorldNode
- RoadSegment
- adjacency
- routing cost
- road runtime state

验收：可以对测试路网做路径查询。

## Stage 3：Route / Pathfinding

建立：
- 路径搜索
- 路线合法性
- 线路创建 Command
- roadPathSegmentIds

验收：玩家线路只能沿正式路网成立。

## Stage 4：Schedule / Trip / Dispatch

建立：
- ServicePlan
- DepartureSlot
- Trip creation
- Vehicle assignment
- Driver assignment
- Trip state machine

验收：一辆车可以今天跑 K01，下一班跑 K03，不改 Vehicle 结构。

## Stage 5：Movement + Map Query

建立：
- Trip position progression
- Tier A/B/C simulation
- SpatialIndex
- visible map entity query

验收：同一车辆跨缩放级别位置一致。

## Stage 6：Passenger

建立：
- OD Demand
- Queue
- Boarding
- Alighting
- capacity

验收：线路频率和运力真正影响滞留与上座率。

## Stage 7：Economy

建立：
- Fare
- Ledger
- Fuel
- Toll
- Salary
- Maintenance
- Trip settlement

验收：不存在绕过 Ledger 的资金修改。

## Stage 8：Company Game Loop

建立：
- License
- Reputation
- Progression
- Vehicle Market
- Region unlock
- Basic competitor
- Event modifier
- Statistics
- Save/load

验收：形成第一版完整经营闭环。

## Stage 9：Presentation

底层闭环稳定后才正式接：
- 大地图
- UI
- 实时路线
- 车辆位置
- 管理页面

表现层只能调用 Command/Query。


## Stage 10：自动日运营排班

建立：
- DayOperationsPlanner
- 全天车辆/司机链
- deadhead / refuel / maintenance / rest 计划
- 缺车/缺司机识别

状态：Implemented。

## Stage 11：运营计划落地与自动执行

建立：
- CommittedOperationsSchedule
- 自动上客/发车
- 自动调车/补能/保养/休息
- 故障救援与剩余日程重排

状态：Implemented。

## Stage 12：调度中心只读模型

建立：
- DispatchCenterDto
- operations.dispatchCenter
- Trip / Vehicle / Driver / Support / Shortage 聚合快照

状态：Implemented。

## Stage 13：车辆产业与交易底层

建立：
- 品牌 / 车系 / 基础车型
- 年款 / 厂家版本
- 自定义配置
- 4S / 车商
- 新车 / 二手车 Listing

状态：Implemented。

## Stage 14：二手车完整流通市场

建立：
- 自有车辆挂牌
- 动态估价
- 卖方披露
- 买方检测
- 议价
- 拍卖
- 同一 VehicleId 真实过户
- 市场自动刷新

状态：Implemented。

## Stage 15：车辆内容库 + 动态车商供给

目标不是增加第二套车辆逻辑，而是向 Stage 13–14 的正式接口提供足够丰富、可持续变化的 Content。

固定第一版内容量：

- 10 个架空车辆品牌
- 32 个车系
- 100 个基础 VehicleModel
- 180 个 VehicleVariant
- 48 个 VehicleOptionDefinition
- 24 个正式 VehicleDealer
- 8 类车辆用途/服务定位
- 6 档价格与产品定位
- 新车动态库存生成器
- 二手车动态生成器
- 年款发布 / 停产 / 清库存生命周期
- 地区车型偏好与保值率
- Content Validator

Stage 15 不允许：
- 手写几百辆固定 VehicleListing 作为长期市场
- 一个自定义配置生成一个 VehicleModel
- 在 UI 内随机生成车源
- 用真实品牌/真实车型直接写入正式内容库
- 为不同市场复制 VehicleModel / VehicleVariant

验收：
- 市场在不手写单辆车源的情况下可以持续生成新车和二手车
- 同一个基础车型能产生不同年款、厂家版本和玩家配置
- 不同地区/车商库存和价格结构不同
- 停产/新年款/清库存能够随游戏时间发生
- 全部内容通过自动验证器

---

# 22. 每个新功能进入仓库前必须回答

新增任何功能前，PR/提交必须能回答：

1. 属于哪个 Domain？
2. 谁拥有它的唯一状态？
3. 通过哪个 Command 修改？
4. 发布什么 Event？
5. 哪些系统只读它？
6. 是否需要存档？
7. 是否影响 saveVersion？
8. 是否需要 content 数据？
9. 是否产生新的长期公共接口？
10. 它替代了旧实现吗？如果是，旧实现是否已删除？

答不清楚就不开始写代码。

---

# 23. 文件规模纪律

为了避免重新出现大文件：

建议警戒线：
- 普通业务文件：尽量 < 300 行
- 超过 500 行：必须解释为何不能拆
- Command Handler：通常只处理一种 Command
- 一个文件不同时承担 UI + 业务 + 存储

行数不是绝对规则，职责单一优先。

---

# 24. 当前结论

当前主线已经推进到：

```text
核心架构
→ 路网 / 线路 / 班次 / 调度
→ Movement / Passenger / Economy
→ 自动运营
→ 调度中心只读模型
→ 车辆产业与新车市场
→ 二手车完整流通
→ Stage 15 车辆内容库与动态供给
→ Presentation / UI
```

Stage 15 完成前，不为车辆市场先写死最终 UI；先保证正式内容规模、动态库存和内容校验稳定。
