# 客运公司模拟器：总体架构规范

状态：**Architecture Freeze v1**

这份文档定义项目长期代码边界。后续功能首先服从本规范，不允许为了“先跑起来”把业务逻辑塞到 UI、页面或单个大管理器中。

## 1. 总体分层

依赖方向固定为：

```text
Presentation 表现层
        ↓
Application 应用层
        ↓
Domain 领域层 ← Data/Adapters 数据适配层
        ↓
Simulation 模拟层
```

公共类型、命令、事件与 DTO 由 Contracts 提供，但 Contracts 不拥有业务状态。

### Presentation

负责：
- 地图绘制
- UI 页面
- 动画
- 缩放与视口
- 输入转换
- ViewModel

禁止：
- 直接修改现金
- 直接修改车辆状态
- 自己计算客流
- 自己保存车辆动画位置
- 写票价、油耗、收益公式

### Application

负责：
- 接收 Command
- 权限和前置条件验证
- 编排多个领域能力
- 提交状态变化
- 发布 Domain Event
- 提供 Query

Application 是 UI 操作游戏的唯一正式入口。

### Domain

负责：
- 世界、站场、线路、车辆、班次、公司、财务、员工等领域规则
- 聚合内部一致性
- 业务不变量

禁止依赖：
- DOM
- Android API
- 广告 SDK
- Canvas/WebGL
- 图片
- 本地文件路径

### Simulation

负责随游戏时间自动推进的系统：
- 车辆移动
- 客流生成
- 上下客
- 班次执行
- 油耗与磨损
- 竞争公司
- 经济结算
- 动态事件

Simulation 只能通过正式领域状态和事件工作。

### Data / Adapters

负责：
- 静态内容包读取
- 数据校验
- 外部存储
- 平台接口
- 将 JSON/数据库转换为领域可用数据

不得包含经营公式。

### Contracts

负责：
- 稳定 ID 类型
- Command 契约
- Event 契约
- Query DTO
- Save DTO 边界

不得成为“公共杂物文件夹”。

---

## 2. 唯一状态源

任何事实只能有一个权威来源。

### 车辆位置

权威运行状态最终固定为：

```text
TripInstance
  activeRoadSegmentIndex
  offsetOnSegmentM

OwnedVehicle
  activeTripId
```

地图位置由 RoadSegment.polyline + offsetOnSegmentM 推导。

禁止出现：
- MapVehicleState
- UiVehicleState
- AnimationVehicleState
- 第二套 position 缓存作为业务事实

表现层可以缓存屏幕坐标，但缓存不得写回规则状态。

### 时间

只有 GameClock 是游戏时间源。

禁止页面自行维护“当前日期”。

### 财务

只有 Ledger/Finance 产生正式资金变动。

禁止页面：
```text
cash -= price
```

---

## 3. 线路、班次、车辆三者必须分离

正式关系：

```text
PassengerRoute
    ↓
Timetable / ServicePlan
    ↓
TripInstance
    ↓
OwnedVehicle + Driver
```

### PassengerRoute

描述“这条线路是什么”：
- 起终点
- 停靠站序
- 道路路径
- 基础票价规则
- 线路类型

### Timetable / ServicePlan

描述“什么时候发车”：
- 发车时间
- 周期
- 班次频率
- 运力要求

### TripInstance

描述“一次真实运行”：
- 哪个班次
- 哪辆车
- 哪位司机
- 当前路段
- 当前乘客
- 实际发车/到达
- 延误

### OwnedVehicle

描述“一辆资产车辆”。

车辆本身不永久绑定某条线路。

---

## 4. 大地图结构

大地图分三部分，禁止混成一个模块。

### WorldGraph

业务路网：
- WorldNode
- RoadSegment
- 邻接关系
- 道路通行状态
- 正式里程
- 限速

### SpatialIndex

查询层：
- 地图分块
- 视口范围查询
- 缩放级别筛选
- 当前区域中的道路/站点/车辆索引

SpatialIndex 不决定车辆怎么走。

### MapRenderer

表现层：
- 道路
- 线路
- 车辆
- 站点
- 标签
- 图标
- 地形资源

MapRenderer 不拥有任何经营规则。

---

## 5. 推荐源码结构

```text
src/
  contracts/
    ids/
    commands/
    events/
    dto/

  core/
    units/
    time/
    result/

  domain/
    world/
    station/
    route/
    schedule/
    trip/
    vehicle/
    passenger/
    company/
    finance/
    staff/
    market/
    event/

  simulation/
    movement/
    demand/
    boarding/
    dispatch/
    economy/
    maintenance/
    competition/

  application/
    commands/
    handlers/
    queries/

  data/
    loaders/
    validators/
    repositories/

  save/
    schema/
    migrations/

  presentation/
    map/
    ui/
    view-models/
```

静态内容放在：

```text
content/
  world/
  vehicle-models/
  station-types/
  licenses/
  events/
  balance/
```

内容数据禁止塞进 UI 或领域源码。

---

## 6. 禁止“大总管”

禁止出现承担多个领域职责的：
- GameManager
- MainController
- GlobalSystem
- AppStateGodObject

允许小型编排器，但只能协调，不承载业务公式。

一个模块只解决一类问题。

---

## 7. 导入边界

允许：
- presentation -> application/contracts
- application -> domain/simulation/contracts
- simulation -> domain/core/contracts
- domain -> core/contracts
- data -> domain/contracts
- save -> domain/contracts

禁止：
- domain -> presentation
- domain -> application
- simulation -> presentation
- content JSON -> UI 函数
- UI -> simulation 内部实现

---

## 8. 当前 V0.1 的处理

现有 V0.1 只是验证底层概念，不视为永久接口。

架构冻结后，下一个代码阶段必须直接把“Vehicle.routeId 直接运行”替换成正式的 TripInstance 运行模型。

这是开发期替换：
- 删除旧字段/旧实现
- 同一提交加入新实现
- 不保留 RouteSystemV2、VehicleNew 等并行版本

完成后才进入地图分块和班次功能。
