# Changelog

## 0.15.0-stage14

### Added
- 新增公司自有车辆正式二手挂牌流程，挂牌后车辆进入 `listed_for_sale` 并退出运营/自动排班候选。
- 新增 `vehicleMarket.sellToDealer`，支持车商按估值直接收车并进入统一二手库存。
- 新增二手车估值模型：车龄、里程、机械/车身状态、事故历史、地区需求、车商类型共同影响公平价、车商收购价和建议挂牌价。
- 新增卖方披露、买方检测报告与披露不一致识别。
- 新增 `vehicleMarket.inspectListing`，支持基础/完整检测并形成买方私有检测报告。
- 新增 `vehicleMarket.negotiateListing`，议价成功后生成限时保留成交价。
- 新增拍卖流程：开拍、最低加价、竞价、保留价、结算、流拍与卖方手续费。
- 新增二手市场自动刷新：过期挂牌、预约释放、车商库存动态重估。
- 新增 `vehicleMarket.valuation` / `vehicleMarket.inspections` / `vehicleMarket.auctions` 查询。
- 公司挂牌车辆成交时保持同一个 VehicleId，仅变更所有权，不复制车辆实体。
- 过户后保留真实里程、车况、保养、证件、事故和历史车主数据。
- 二手市场服务费、检测费、挂牌费、拍卖卖方手续费进入正式财务账本。
- 新增二手车流通专项测试，并修复挂牌车辆仍可能进入自动日排班的问题。

### Architecture
- 新车、车商二手库存、公司自售、议价和拍卖继续共用唯一 VehicleListing / VehicleMarketRepository。
- 公司自售车辆只能通过真实过户改变 CompanyId；禁止创建第二个 VehicleId 伪造交易。
- `listed_for_sale` 是正式不可运营状态，车辆分配、生命周期安全校验和 DayOperationsPlanner 都必须排除。
- 卖方披露与真实 UsedVehicleSnapshot 分离；普通市场列表不得泄漏未检测出的隐藏缺陷。
- VehicleMarketProjection 继续只读，所有交易状态变化必须通过 VehicleMarketTradingService / CommandBus。


## 0.14.0-stage13

### Removed
- 删除旧 `vehicle.purchase` 车型 ID 直购入口；车辆不能再脱离车商/车源凭空生成。
- VehicleLifecyclePolicy 删除 quotePurchase，购车成交价不再由生命周期策略伪造。
- 运营座位数与能源容量不再强制读取基础 VehicleModel，改读具体 OwnedVehicle 的实际配置结果。

### Added
- 新增 VehicleBrand / VehicleSeries / VehicleModelIdentity，建立品牌→车系→基础技术车型的商业目录映射。
- 新增 VehicleVariant，支持年款、厂家正式版本、标准座位、标准能源容量、行李舱、舒适度和允许选装。
- 新增 VehicleOptionDefinition 与 VehicleConfigurationRules。
- 玩家自定义配置支持座位布局、能源容量、行李舱、舒适度、外观颜色和公司涂装。
- 自定义配置只生成 VehicleConfiguration，不创建重复 VehicleModel。
- 新增 VehicleDealer，支持厂家经销商、地区车商、二手车商和拍卖行类型。
- 新增 VehicleListing，统一承载新车和二手车车源、库存、报价、上架时间和状态。
- 二手车车源保存真实里程、剩余能源、保养历史、保险/年检、动力/制动/轮胎/车身状态、过户次数和事故记录。
- 新增 vehicleMarket.createConfiguration。
- 新增 vehicleMarket.purchaseListing。
- 新增 vehicleMarket.listings / vehicleMarket.configurator 查询。
- 购买新车可选择同一厂家版本下的合法自定义配置，成交后 OwnedVehicle 保存 configurationId、实际座位数和实际能源容量。
- 购买二手车时配置锁定，不允许购买前偷换选装。
- 二手车买入后保留真实里程、车况、保养里程、保险和年检，不会洗成新车。
- 新车库存成交后真实扣减，库存归零后 listing 转 sold。
- 新增车商/自定义配置/二手车专项测试。

### Architecture
- VehicleModel 继续只负责运行技术参数；品牌、车系、年款、商业名称、车商和价格不写回 VehicleModel。
- VehicleConfiguration 通过 VehicleVariant 引用基础车型，禁止“一次选装生成一个新 VehicleModel”。
- OwnedVehicle 保存实际物理配置结果；Trip 上客与补能/调度读取单车实际容量。
- 新车和二手车使用同一个 VehicleMarketRepository 与 Listing 边界，不建立平行市场实现。
- UI 后续只读取 vehicleMarket.listings / vehicleMarket.configurator，不直接拼接市场仓库。


## 0.13.0-stage12

### Added
- 新增 DispatchCenterDto，作为运营调度中心唯一 UI 只读快照。
- 新增 DispatchCenterProjection，统一聚合 CommittedOperationsSchedule、Trip、FleetTask、Vehicle、Driver、Station 与实时 DayOperationsPlan 缺口。
- 新增 operations.dispatchCenter Query。
- 调度中心快照正式提供今日班次、支援动作、车辆、司机、缺口、当前 revision、replan 时间和总体统计。
- 班次 DTO 提供线路编号、始发/终到站、计划发车、真实上客开始、实际发车、实际到站、延误、故障、恢复站和失败原因。
- 车辆 DTO 提供当前位置、可用时间、能源比例、里程、距离下次保养、安全状态、故障和下一运营动作。
- 司机 DTO 提供当前位置、可用时间、连续驾驶、当前任务和下一运营动作。
- 支援 DTO 提供调车、补能、保养、休息的时间窗、站点、资源、里程、能源和失败原因。
- 未覆盖班次即使采用 allowPartial 提交，也通过 NO_VEHICLE / NO_DRIVER / NO_RESOURCE_PAIR 持续展示在调度中心。
- 下一运营动作时间按真实执行边界计算；客运班次使用 boardingStartGameSecond，而不是误用发车时间。
- 新增调度中心专项测试：已提交班次快照、运行状态变化、自动补能展示、部分提交缺口可见性。

### Architecture
- UI 不再跨 Repository 自行拼接调度数据，只读取 operations.dispatchCenter。
- DispatchCenterProjection 为只读投影，不允许 save/replace 任何领域状态。
- 调度中心展示状态全部来自 Stage 9–11 的唯一运行事实，不建立 UI 专用第二套车辆/司机/Trip 状态。
- 缺口来源为 DayOperationsPlanner 的实时只读推演，与已提交运营状态并列展示，不伪造已排班动作。


## 0.12.0-stage11

### Added
- 新增 CommittedOperationsSchedule，正式区分只读 DayOperationsPlan 与已经提交执行的日程。
- 新增 operations.commitDayPlan / operations.replanDay。
- 提交日计划时通过现有 CommandBus 创建 Trip 并绑定车辆/司机，不直接写底层运行状态。
- 新增 trip.clearResources，只允许 planned/disrupted Trip 在重排时安全清空未来资源预约。
- 新增 OperationsExecutionCoordinator，到运营时间点自动执行 deadhead / refuel / maintenance / rest / passenger_trip。
- 新增 passengerBoardingLeadSeconds，车辆和司机必须在真正上客时间前到位。
- SimulationCoordinator 按运营边界切片推进；一次大跨度快进仍按补能结束、调车、上客、发车、到站等顺序执行。
- 新增 driver.startRest / driver.completeRest，司机休息进入正式运行链。
- 自动动作失败时同一游戏时刻触发重排，不延迟到下一次时间推进。
- 途中 trip.disrupted 自动发起 fleet.recover，拖救完成后尝试同站备用车辆和合格司机接班恢复。
- 备用车 trip.resume 前重新校验剩余线路的保险、年检、保养、技术状态和能源储备。
- 故障恢复或实际运营偏差会提升 schedule revision 并重新计算剩余日程。
- 新增 operations.committedDay Query。
- 新增端到端自动执行测试：计划提交、自动上客、自动发车、自动补能、途中故障、拖救、备用车接班和日程重排。

### Architecture
- 自动运营与玩家手动运营共用同一个 CommandBus、Trip、FleetTask、Vehicle、Driver、Finance 与 Simulation 规则链。
- 未来支援动作只保存在 CommittedOperationsSchedule；到执行时间才创建真实 FleetTask。
- CommittedOperationsSchedule 只保存动作状态和领域实体引用，不复制车辆位置、能源、司机工时等运行事实。
- OperationsExecutionCoordinator 只编排命令和日程状态，不直接修改 Vehicle、Driver、Trip 或 FleetTask。
- 时间快进必须经过运营边界，禁止先跳到未来再补发自动事件。


## 0.11.0-stage10

### Added
- 新增 DayOperationsPlan，正式表达一天运营计划、班次覆盖、支援动作、缺口与统计。
- 新增 DayOperationsPlanner，从 ServicePlan 当日发车槽自动生成可执行车辆/司机运营方案。
- 自动选择符合 requiredVehicleClass 的车辆和有对应资质的司机。
- 自动维护车辆虚拟运营状态：所在站、最早可用时间、能源、里程、部件状态和下次保养里程。
- 自动维护司机虚拟运营状态：所在站、可用时间、值勤开始、连续驾驶与休息窗口。
- 当上一班终点与下一班始发站不一致时，自动通过真实 WorldGraph 寻路插入 deadhead。
- 空驶调车在计划层计算真实路网时间、距离和能源需求。
- 能源不足时自动插入 refuel，并按 OperationsPolicy 计算补能占用时间。
- 预计超过保养里程或部件安全阈值时自动插入 maintenance。
- 司机存在足够休息窗口时自动插入 rest，并重置连续驾驶链。
- 无法找到可执行车辆/司机组合时输出 uncovered Trip 与明确 issue，而不是静默丢班。
- 支持已有 planned Trip 的既定车辆/司机约束；已执行/完成 Trip 标记为 locked_existing，不重新排写。
- 新增 operations.planDay Query，UI/调度中心只读获取完整日计划。
- VehicleRepository 新增 findByCompany；StaffRepository 新增 findDriversByCompany。
- 新增整日自动排班专项测试：往返复用、同向空驶、自动补能/保养、缺司机暴露。

### Architecture
- DayOperationsPlanner 是只读推演层，不直接 save/replace 任何 Vehicle、Driver、Trip 或 FleetTask。
- 未来运营计划与正在执行的 FleetTask 严格分离：计划层只产出 PlannedOperationAction，运行时到点后再转真实命令/任务。
- UI 不直接拼车辆/司机排班逻辑，只调用 operations.planDay。
- 计划算法使用 Stage 9 的唯一车辆/司机运营状态和 OperationsPolicy，不建立第二套运行状态。
- 架构守卫禁止 DayOperationsPlanner 写 Repository，并强制车辆/司机仓库保留公司级资源发现接口。


## 0.10.0-stage9

### Removed
- 删除 Stage 8 的 `vehicle.completeMaintenance` 手动完成保养接口。
- 删除“给未来班次分配车辆/司机时立即把资源状态改成 assigned”的单班锁死模型。
- 不保留 reserveVehicleForTrip / reserveDriverForTrip 旧接口或兼容壳。

### Added
- 新增 FleetTask，正式承载 deadhead / refuel / maintenance / recovery 运营任务。
- OwnedVehicle 新增 currentStationId、availableAtGameSecond、activeFleetTaskId。
- Driver 新增 currentStationId、availableAtGameSecond、dutyStartedAtGameSecond、lastDutyEndedAtGameSecond、continuousDrivingSeconds、activeFleetTaskId。
- 新增 DispatchPlanningService，按真实线路耗时、终点站、周转时间校验车辆和司机未来排班。
- 同一辆车/司机可以排多个未来班次，但上一班实际终点必须与下一班始发站衔接，且必须留足周转时间。
- 新增 OperationsPolicy，统一注入车辆周转、司机周转、最小休息、连续驾驶上限、值勤上限、补能耗时、保养耗时和救援耗时。
- 新增 fleet.reposition，空驶调车沿真实路网计算时间，并真实累计里程、能源、部件磨损和司机工时。
- 调车前校验能源储备、预计技术状态、司机连续驾驶和总值勤时间。
- 补能与保养改成真实占用游戏时间的 FleetTask，到期后由 FleetOperationsCoordinator 自动完成。
- 新增 fleet.recover，将故障车辆与司机从 disrupted Trip 中脱离并拖救到线路站点。
- disrupted Trip 支持重新分配备用车辆/替补司机并通过 trip.resume 继续运行，保留乘客与已完成路段进度。
- 班次完成后车辆和司机记录真实终点站与最早再可用时间。
- 新增 Stage 9 调车与未来班次链专项测试。

### Architecture
- Trip 只保存客运班次事实；调车/补能/保养/救援不伪装成客运 Trip。
- Vehicle/Driver 只保存当前执行中的 Trip/FleetTask；未来预约事实保存在 Trip 并由调度服务校验。
- 运营位置只记录 StationId，不把世界坐标写进 Vehicle/Driver；运行中地图坐标继续从 Trip 路径派生。
- FleetTask 的空驶运行同样进入车辆生命周期和财务事件链，不允许免费瞬移。
- 调度安全检查与车辆技术安全检查分层，避免 assigned 状态成为技术规则前置条件。


## 0.9.0-stage8

### Removed
- 删除 OwnedVehicle.conditionPermille。
- 删除 OwnedVehicle.fuelPermille。
- VehicleEconomicProfile 删除能源类型与车辆能耗技术参数，技术事实回归 VehicleModel。
- 不保留旧车况/油量兼容字段或第二套生命周期接口。

### Added
- VehicleModel 新增能源类型、容量、最低发车储备、行驶/怠速能耗、保养周期、部件磨损率和安全阈值。
- OwnedVehicle 新增实际能源单位、动力/制动/轮胎/车身状态、保养里程、保险/检验有效期和 activeIncident。
- 新增 VehicleLifecycleRuntimeState，以整数余数保证不同 Simulation Tier 的能耗/磨损一致。
- 新增发车硬校验：保险、检验、保养、安全状态、整条线路预计能耗+储备。
- 新增 VehicleLifecycleCoordinator，按 trip.operatingInterval 累计真实里程、能源和部件磨损。
- 车辆能源耗尽或关键部件失效后进入 broken，并使 Trip 进入 disrupted。
- 新增 vehicle.purchase / refuel / sendToMaintenance / completeMaintenance / renewInsurance / passInspection / sell / retire。
- 新增 VehicleLifecyclePolicy，购置价、维修报价、保险、检验、二手售价和报废残值全部数据驱动。
- 新增 vehicle.lifecycle Query。
- 新增 vehicle_asset、energy_inventory、maintenance_expense、inspection_expense、车辆处置损益账户。
- 补能改为先形成 energy_inventory，车辆实际消耗时再结转 energy_expense。
- 出售/报废正式冲销车辆原值、累计折旧和剩余能源库存并确认处置损益。
- Finance Ledger 支持 vehicleId 追溯，车辆折旧可按单车核算。
- Company Finance Snapshot 新增能源库存、车辆净资产、总资产和车辆处置收益。
- 新增车辆生命周期、发车门槛、运行故障中断和资产处置专项测试。

### Architecture
- 车辆技术事实归 Vehicle Domain；价格与会计事实归 Finance/Policy。
- Simulation 不再直接增加车辆里程，车辆物理变化统一由 VehicleLifecycleCoordinator 处理。
- 历史 sold/retired 车辆记录保留，但不再参与运营和后续资产折旧。
- 架构守卫禁止 conditionPermille/fuelPermille 重新进入 OwnedVehicle。

## 0.8.0-stage7

### Added
- 建立平衡复式 LedgerEntry / LedgerPosting，会计现金与利润全部从账本推导。
- 新增 FinanceAccount、FinanceEntryKind 与账户余额计算。
- 新增 FarePolicy：起步价、里程价、最低/最高价、取整、OD精确覆盖。
- 新增 VehicleEconomicProfile：能源类型、行驶能耗、怠速能耗、维修经济成本、经济折旧。
- 新增 VehicleAssetProfile：购置成本、残值、寿命、保险、车辆税费。
- 新增 DriverCompensationProfile：基础工资、运行补贴、雇主负担。
- 新增 StationFinancialProfile / CompanyFinancialProfile。
- 新增 EconomicPolicy，动态注入能源价格、路桥费、税费、站务费和监管费用。
- TripMovement 输出实际 roadUsage、行驶距离、运行秒、怠速秒。
- SimulationCoordinator 正式累计车辆里程并发布 trip.operatingInterval。
- 新增 FinanceCoordinator，监听售票、发车、到站、运行区间事件并自动记账。
- 新增税费应付、工资应付、供应商应付与现金有限结算。
- 新增按日公司管理费、司机基础工资、保险、车辆税、站租与直线折旧计提。
- 新增 Maintenance/Economic Depreciation 管理成本账，不污染法定会计利润。
- 新增 finance.companySnapshot 与 finance.tripEconomics 查询。
- PassengerFlow 返回明确 boardedGroups/alightedGroups，售票收入可按真实 OD 计价。
- 所有分数能耗、人工、路桥和管理成本使用余数累计，保持不同 Simulation Tier 结果一致。

### Removed
- 不在 Company 里新增 cash 或 profit 第二套状态。
- 不把预计未来维修伪装成已经付款的正式会计费用。
- 清理 CHANGELOG 重复一级标题。

### Architecture
- 法定会计账与管理经济成本正式分层。
- 现实价格/费率完全数据驱动，不写死地区、年份、油价或税率。
- Trip 贡献利润与 Company 会计利润使用不同口径，避免管理决策和财务报表混淆。


## 0.7.0-stage6

### Removed
- 删除 PassengerRoute 内部的 orderedStationIds 双重站序状态。
- 删除 TripInstance.onboardPassengerCount，避免与目的地分组形成双重事实。

### Added
- 新增 RouteStopPoint，以 pathLegBoundaryIndex 将正式站点映射到线路道路路径。
- RoutePathService 创建线路时同步生成唯一 stopPoints。
- 新增 PassengerDemandProfile、PassengerRuntimeState 与站点 OD 候车队列。
- 新增 onboardPassengerGroups，车内乘客按目的地聚合。
- VehicleModel 新增 seatCapacity，正式约束客运容量。
- 新增 PassengerDemandPolicy 注入点，班次频率影响客流但平衡曲线不硬编码进核心。
- 新增整数余数式 DemandGeneration，保证不同批量推进粒度下客流生成一致。
- 新增 PassengerDemandCoordinator，按 active Route + ServicePlan 当日班次数计算 OD 服务频率。
- 新增 PassengerFlow，完成下客、容量判断、上客与滞留。
- TripMovement 返回 reachedBoundaries，使批量移动仍能识别中途站。
- trip.startBoarding 正式在起点执行第一次上客。
- SimulationCoordinator 在中途站/终点执行上下客并发布 arrivedAtStop / boarded / alighted。
- 新增 passenger.stationQueue Query。
- 新增 demand、capacity、overflow、alighting、route stop boundary 等测试。

### Architecture
- 站外候车唯一状态源为 PassengerRuntimeState。
- 车内客流唯一状态源为 TripInstance.onboardPassengerGroups。
- Route 内唯一站序为 RouteStopPoint[]；Command 的 orderedStationIds 仅作为用户输入。
- PassengerDemandPolicy 从 Application 注入，后续可直接接 balance content。


## 0.6.0-stage5

### Added
- VehicleModel 新增 maxSpeedMps，车辆移动正式受车型最高速度约束。
- 新增离散秒 TripMovement，按 PathLeg 沿 WorldGraph 正式推进 TripPosition。
- 有效速度同时受车型上限、道路限速和 RoadRuntimeState 速度倍率约束。
- closed 道路正式阻止车辆继续推进，并把等待时间计入游戏时间。
- 新增 RoadGeometry，支持正向/反向 PathLeg 的世界坐标派生。
- 跑完最后 PathLeg 后正式完成 Trip、记录 actualArrivalGameSecond、释放车辆和司机并发布 trip.completed。
- 新增 foreground / regional / background 三档模拟节奏（1/15/300秒）。
- 新增 WorldRuntimeRepository，静态 WorldGraph 与动态道路状态继续分离。
- TripRepository 新增 findRunning，供模拟层批处理运行班次。
- 新增 PointSpatialIndex / VehicleSpatialIndex 派生空间索引。
- 新增 map.visibleVehicles Query DTO 与查询 Handler。
- ApplicationRuntime 新增 SimulationCoordinator。
- 新增移动、封路、反向道路、完成释放、Tier 与空间索引测试。
- 架构守卫新增 simulation 依赖边界和 TripPosition worldPosition 禁止项。

### Changed
- GAME_VERSION 更新为 0.6.0-stage5。
- 核心地图世界坐标明确为派生数据，不写入 Vehicle/TripPosition。
- 清理 CHANGELOG 重复一级标题，只保留一个正式标题。

### Architecture
- Simulation 只依赖 Domain/Core/Contracts；Repository/Event 编排留在 Application。
- Tier A/B/C 只改变批量解析频率，不建立三套移动算法。
- SpatialIndex 是可重建派生缓存，不成为存档事实。

## 0.5.0-stage4

### Added
- 建立 ServicePlan 正式规则、校验与取消生命周期。
- 建立 DepartureSlot 与班次展开器，支持 fixed_times / interval_window。
- 固定游戏第 1 天为 Monday，并按 serviceDays/effective window 生成正式班次。
- 建立最小 VehicleModel/serviceClass 契约。
- 建立最小 Driver/资质/状态契约。
- 建立车辆与司机的分配、发车、释放规则。
- 建立 trip.prepare / assignVehicle / assignDriver / startBoarding / depart / cancel 正式 Handler。
- Trip 只能从 ServicePlan 生成的合法 DepartureSlot 创建。
- 调度时校验公司归属、车辆状态、车型级别、司机状态与司机资质。
- 发车时同步推进 Trip、Vehicle、Driver 三个独立聚合状态。
- 取消班次时释放已绑定车辆和司机。
- RuntimeIdAllocator 新增 ServicePlanId / TripId。
- RepositoryBundle 新增 StaffRepository / VehicleModelRepository。
- 新增 Stage 4 文档与班次、调度、资源释放测试。

### Changed
- ServicePlan 状态正式收敛为 active / suspended / cancelled。
- GAME_VERSION 更新为 0.5.0-stage4。

### Architecture
- ServicePlan 不拥有车辆/司机。
- Trip 是一次真实班次的唯一运行聚合。
- Vehicle/Driver 通过 activeTripId 与 Trip 关联，不永久绑定 Route。
- DepartureSlot 是可重建派生值，不单独制造长期资产对象。


## 0.4.0-stage3

### Removed
- 删除 PassengerRoute 的旧 `roadPathSegmentIds` 路径字段。
- 不保留任何 RoutePath V2/New/Legacy 兼容结构。

### Added
- 新增正式 Station 最小领域模型。
- 新增 RoadPath / PathLeg，作为方向感知的正式道路路径协议。
- PassengerRoute 正式保存 `PathLeg[]` 与 routingPreference。
- 新增 RouteRules，集中处理创建、站序更新、激活、停运规则。
- 新增 StationRepository 与 RouteRepository 唯一线路编号查询。
- 新增 RuntimeIdAllocator，Route ID 不再由 UI/Command 自行决定。
- 新增 DomainEventBus 与 Command 派生 Event ID。
- 新增 route.create / route.updateStops / route.activate / route.deactivate 正式 Handler。
- 新增 RoutePathService，将站点顺序通过 WorldGraph 寻路转换为正式线路路径。
- createApplication 正式注册 Route Handlers。
- 新增线路命令、方向路径、许可证与生命周期测试。
- 新增 Stage 3 线路系统文档。

### Architecture
- 官方线路路径只依据静态路网 active/方向/连通性。
- 临时封路、施工、天气等 RoadRuntimeState 不修改长期线路定义；它们在 Trip 运行阶段处理。
- 线路成功修改后发布 Domain Event，后续统计、任务、声誉等系统无需侵入 Route 核心。

## 0.3.0-stage2

### Added
- 建立 Region 与区域层级/边界模型。
- WorldNode 与 RoadSegment 正式绑定 Region。
- WorldGraph 建立方向感知的道路邻接图。
- 新增 RoadTraversal，明确道路正向/反向经过方向。
- 新增 RoadRuntimeState / WorldRuntimeState，支持封路与速度修正。
- 新增 shortest_distance / fastest_time 路径代价。
- 新增基础确定性 Dijkstra 寻路。
- 寻路结果使用 PathLeg，保留每段道路的 traversal direction。
- 新增区域、邻接、运行状态与路径查询测试。

### Changed
- 道路等级改为受控 RoadClass。
- GAME_VERSION 更新为 0.3.0-stage2。
- WorldGraph.create 现在要求 Regions、Nodes、Roads 三类正式输入。

### Architecture
- 道路静态事实与道路临时运行状态正式分离。
- 路径结果不再只表达 roadSegmentId，为 Stage 3 双向线路路径奠定正式协议。

## 0.2.0-stage1

### Removed
- 删除 V0.1 的 PassengerTransportApp、GameState、旧 commands/events/units/version。
- 删除 V0.1 的 Vehicle -> Route 直接绑定运行模型。
- 删除旧 VehicleMovementSystem、PassengerDemandSystem 与 demo 入口。
- 删除旧 SaveCodec 与单体 core.test。

### Added
- 建立正式 Contracts：强类型 ID、CommandEnvelope、DomainEventEnvelope。
- 建立 Core：整数单位、GameClock、Result、DomainError/ErrorCode、版本协议。
- 建立 Domain：World、Route、ServicePlan、TripInstance、OwnedVehicle、Company。
- 建立 Trip 正式状态机。
- 建立按领域 Repository 接口。
- 建立 CommandBus / QueryBus 骨架。
- 建立 SaveEnvelope / Migration 边界。
- 建立 Bootstrap composition root。
- 建立唯一 public-api。
- 建立架构守卫和新的分层测试。

### Breaking
- 开发期 V0.1 临时接口全部失效，不提供兼容壳。
- Vehicle 不再持有 routeId、当前位置或道路偏移；运行事实归 TripInstance。
- 不再存在总 GameState。
