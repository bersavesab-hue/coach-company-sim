# Changelog

## 0.18.8-stage17-map-presentation

### Removed
- 删除地图道路中的蓝色高速视觉，五级道路统一改为绿色系导航图风格。
- 删除地图页下半屏大面积纯黑空白布局。
- 删除所有城市使用近似同一尺寸圆点的表现方式。
- 运营线路不再只存在于列表中，也不使用独立装饰直线。

### Added
- WorldMapStationContent 新增 unlockReputationPermille。
- 新增 MapStationUnlockPolicy：城市解锁正式由公司声誉驱动。
- 当前 48 个站点全部配置声誉解锁门槛；起步三站为 0，声誉 180 时共有 12 个站点解锁。
- 地图未解锁城市灰显并显示锁图标；线路创建下拉框只展示已解锁城市。
- 城市标记按 hub / city / county / town 四级调整半径、字号和视觉权重。
- hub 城市增加外圈，和普通城市/县城/乡镇形成明显层级差。
- PlayableClient roads 恢复 fromNodeId / toNodeId 投影，保证 corridor stitching 使用真实拓扑。
- PassengerRoute DTO 新增 pathPoints，由正式 pathLegs + RoadSegment polyline 派生。
- 地图新增玩家运营线路暖色双层高亮，并显示线路编号牌。
- 地图画布改为占满可用主界面高度，“新建线路”改为地图内悬浮按钮。

### Changed
- 地图 HUD 改为显示“已解锁城市/总城市 + 当前声誉”。
- 地图线路选择和地图锁定状态共用同一 MapStationUnlockPolicy。
- Android / package 版本升级至 0.18.8。
- GAME_VERSION 更新为 0.18.8-stage17-map-presentation。

### Validation
- 所有站点必须有 0–1000 的整数 unlockReputationPermille。
- 声誉 180/1000 时正式地图必须恰好解锁 12 个站点。
- 起步三站必须从 0 声誉开始可用。
- Core Check 与 APK 构建继续作为提交门禁。


## 0.18.7-stage17-domestic-road-morphology

### Removed
- 删除河源、永安、云州三个四节点等半径方形城市环线。
- 删除起步区域多条近似横平竖直的人工格子式道路几何。
- 默认城市群视角不再直接展开全部县乡道路和匝道。

### Added
- 河源 P820 重建为 6 段不规则外环。
- 永安 P821 重建为 7 段不规则外环。
- 云州 P822 重建为 6 段不规则外环。
- 起步城市群新增更自然的外环接驳、城市站点接入和高速连接。
- H02 / H21 互通位置及匝道几何重新调整为非正交结构。
- H02 / H21 / H12 / H03 主要高速在起步区域改为多控制点弯曲走廊。
- N102 / N201 / N202 / P205 / N103 等区域主路同步改为自然曲线，不再按两点直连。
- 新增 docs/DOMESTIC_ROAD_MORPHOLOGY.md，冻结国内道路网形态参考规则。
- 内容测试新增起步区 6/7/6 外环段数、旧方环节点禁止项和主要走廊多控制点检查。

### Changed
- 正式地图更新为 48 个客运站、130 个道路节点、200 个正式道路段。
- 五级道路规模更新为：高速 34、国道 40、省道 77、县道 10、乡道 39。
- 默认镜头改为河源—永安—云州城市群平均中心的区域视角。
- LOD 调整：城市群默认视角只展开到省道，进一步放大后才显示县乡道路与匝道。
- Android / package 版本升级至 0.18.7。
- GAME_VERSION 更新为 0.18.7-stage17-domestic-road-morphology。

### Validation
- 起步区三个旧四向 ring 节点前缀禁止重新出现。
- H02/H21/H12/H03/N102/N201/N202 等主要样板走廊必须保留多点几何。
- Core Check 与 APK 构建继续作为正式提交门禁。\n- 收紧 L953 匝道曲线，保持实际路段长度低于 100km 匝道上限。


## 0.18.6-stage17-interchange-sample

### Removed
- 删除起步区 H02 / H21 共用单一十字 junction 的假互通结构。
- 删除河源、永安进城接驳线直接戳入同一高速交叉点的结构。

### Added
- 起步区域建立第一套正式“真实互通样板”：H02 与 H21 分别拥有独立主线节点。
- 新增 6 段弧形匝道，主线之间通过匝道转换，不再用硬 X 型交叉表示互通。
- 河源、永安进城连接改接互通外围节点。
- WorldMapRoadContent 新增 roadRole：mainline / urban_ring / connector / ramp / local_access。
- RoadNetworkStyleValidator 新增 roadRole 守卫：匝道必须为 local + displayPriority 4，单段最长 100km；城市环线必须为 provincial + displayPriority 3。
- PlayableClient 正式透出 roadRole。
- 地图近景按 roadRole 区分主线、环线、接驳和匝道的道路带宽度。
- 默认地图视角进一步拉近到起步枢纽近景，用于直接观察城市环线和互通结构。
- 手机地图编辑器新增道路结构角色选择并写入 world-map.v1.json。

### Changed
- 正式地图更新为 48 个客运站、123 个道路节点、189 个道路段。
- 五级道路规模更新为：高速 34、国道 40、省道 67、县道 10、乡道 38。
- Android / package 版本升级至 0.18.6。
- GAME_VERSION 更新为 0.18.6-stage17-interchange-sample。

### Validation
- 地图测试强制检查 6 段 ramp、32+ 城市环线路段以及 H02/H21 分离主线节点。
- 旧 location.junction.j 不允许重新出现。
- Core Check 与 APK 构建必须通过后才接受本版。


## 0.18.5-stage17-navigation-road-style

### Removed
- 删除“每个 RoadSegment 各自渲染一条独立折线”的显示方式。
- 删除交叉口黑色圆点式节点表现。
- 删除高速/国道/省道依靠蓝红黄高饱和色区分的策略图式视觉。

### Added
- 新增 corridor stitching：相同 roadCode 的连续正式路段先拼接为连续道路走廊，再一次性平滑渲染。
- PlayableClient 道路投影新增 fromNodeId / toNodeId，供展示层正确拼接道路。
- junction 投影新增主道路等级，用于路口融合与 LOD。
- 道路改为“分级绿色边缘 + 统一浅色路面”的双层道路带。
- junction 改为共享路面补片：先绘制道路边缘，再融合路口路面，再绘制道路表面，避免接口像彩色线条硬碰。
- roadCode 改为导航式盾牌标签。
- 非共享节点的几何交叉不会生成 junction 补片，可自然表现跨线关系。
- 默认地图视角改为起步枢纽附近的区域级视图；全图复位仍可查看全国骨架。

### Changed
- SVG 曲线仍使用正式 polyline 数据，但同一 corridor 会跨 RoadSegment 连续平滑，路段边界不再产生折角。
- 图例同步改为统一绿色系道路层级。
- Android / package 版本升级至 0.18.5。
- GAME_VERSION 更新为 0.18.5-stage17-navigation-road-style。

### Validation
- Core Check 继续使用正式路网数据与层级校验。
- APK 网页资源必须成功构建后才进入 Android Gradle 打包。


## 0.18.4-stage17-road-network

### Removed
- 删除“单条长折线直接代表一整条道路”的地图表现方式。
- 删除不同等级道路在同一对节点上重复叠线的做法。
- 不再把枢纽城市仅作为一个孤立站点挂在全国干线上。

### Added
- 正式地图扩展为 48 个客运站、118 个道路节点、181 个正式道路段。
- 新增 32 段高速、40 段国道、67 段省道、10 段县道、32 段乡道。
- 长距离道路自动拆分中间 junction，正式路网由多个节点/路段连续组成。
- 重点 hub 城市增加四向环线互通与城市接驳道路。
- 新增高速互通、城市环线互通和区域路口三类地图节点表现。
- PlayableClient 新增只读 junctions 投影，包含坐标、节点度数和显示层级。
- SVG 道路从 polyline 折线改为 Catmull-Rom/Cubic 平滑 path，道路转弯不再出现生硬折角。
- 道路绘制改为“全部底衬 → 全部路面 → 互通 → 编号/站点”的统一顺序，交叉口不再被后一条道路底衬切断。
- 各级道路统一使用道路带样式；高速/国道/省道/县乡道宽度与底衬分级。
- 地图近景显示城市环线与支路，全图仍保持主骨架清晰。

### Changed
- Android / package 版本升级至 0.18.4。
- GAME_VERSION 更新为 0.18.4-stage17-road-network。
- 地图内容测试更新为 118 节点 / 181 路段，并强制存在城市 ring 节点和自动中间节点。

### Validation
- Core Check 必须验证全部客运站连通、路网层级合法、道路端点无重复。
- APK 构建必须通过正式地图校验后才生成资源。


## 0.18.3-stage17-geographic-map

### Removed
- 删除上一版 145 段偏规则化路网，不再以“横向多走廊 + 纵向多走廊”铺满全国总览。
- 全国视角不再同时显示国道、省道、县道和乡道。
- 删除地图页过高的纵向空白画布布局。

### Added
- 正式地图重排为 48 个客运站、72 个地图节点、120 条道路段。
- 路网规模调整为：高速 24、国道 36、省道 38、县道 12、乡道 10。
- 高速收敛为 7 条主走廊；国道负责跨区串城；省道负责区域织网；县乡道只保留局部短线。
- 新增四级 LOD：全国仅高速；区域增加国道；城市级增加省道；近景才显示县乡道。
- 地图加入山地、丘陵、河流、湖泊和海岸装饰层；这些图形不进入寻路、里程、收费或车辆状态。
- 客运站位置重新按西部稀疏、中央过渡、东部/沿海较密的结构布局。
- 地图画布固定 4:3 视觉比例，避免竖屏下路网被挤在中央、上下出现大面积空白。

### Changed
- WorldMapRoadContent.displayPriority 扩展为 1–4。
- RoadNetworkStyleValidator 固定：高速=1、国道=2、省道=3、县道/乡道=4。
- PlayableClient 默认道路显示等级改为 4，版本更新为 0.18.3-geographic-map。
- Android / package 版本升级至 0.18.3。

### Validation
- 正式地图测试固定检查 24/36/38/12/10 的五级道路规模、120 段总量和 72 个地图节点。
- 全国总览 priority 1 必须全部为高速。
- Core Check 与 Android APK 构建必须同时通过。


## 0.18.2-stage17-road-hierarchy

### Removed
- 删除上一轮仍然偏“等距骨架”的道路组织方式，不再按横排/竖排节点补路。
- 删除地图背景上的工程网格纹理，避免视觉继续像编辑器测试图。

### Added
- 五级路网重新规划为 145 条正式道路段：高速 27、国道 44、省道 46、县道 12、乡道 16。
- 新增 8 条高速走廊：H01/H02/H03、H11/H12/H13、H21/H22；高速只连接道路枢纽，不直接穿过普通客运站。
- 新增 4 条全国主国道 N101–N104 和 4 条区域国道 N201–N204。
- 省道正式承担区域织网与高速接驳；县道、乡道收敛为局部短线与末端支线。
- WorldMapRoadContent 新增可选 roadCode / displayPriority / showLabel 地图表现元数据，不进入车辆、线路、财务等核心状态。
- 新增 RoadNetworkStyleValidator：检查道路编号等级、显示优先级、重复端点、高速端点类型、各级道路最小规模和分级最大长度。
- 新增 ROAD_NETWORK_STYLE_GUIDE，冻结后续地图扩展的五级路网规划规则。
- 地图显示加入道路编号，并按 displayPriority 做三级 LOD：全图 / 区域 / 近景。
- 手机地图编辑器新增自动道路编号与显示优先级，后续编辑不会再导出无层级道路。

### Changed
- 全图视角只显示高速、主国道与主要站点；区域视角加入次级国道和省道；近景才加入县道、乡道。
- 道路弯曲度按等级递增：高速最平顺，乡道最自由。
- Android / package 版本升级至 0.18.2。
- GAME_VERSION 更新为 0.18.2-stage17-road-hierarchy。

### Validation
- 正式地图固定为 48 个客运站、76 个地图节点、145 条道路段。
- Core Check 与 APK 构建在正式地图加载时同时执行基础数据校验与路网风格校验。\n- 修正 P211 / C306 / C309 的过长跨区连接：省道与县道重新收敛为区域短联络，不放宽层级长度上限。


## 0.18.1-stage17-map-ui-rework

### Removed
- 删除上一版规则网格式全国路网布局，不再让客运站承担整张地图的道路交叉点。
- 删除地图页工程测试式顶部标签与七项平铺导航。

### Added
- 正式地图重构为 48 个架空客运站 + 22 个道路枢纽节点 + 104 条道路段。
- 高速先连接道路枢纽，国道/省道形成跨区骨架，客运站通过城市接驳、县道和乡道接入主路网。
- 新增多条跨区斜向联络道路，避免横平竖直棋盘结构。
- 地图缩放采用分级显示：全图优先高速、国道和大站；放大后逐步显示县道、乡道和小站。
- 高速/国道增加道路底衬，站点按 hub/city/county/town 分级显示。
- 正式 UI 改为地图主界面：顶部公司状态、全屏地图、地图浮层、道路图例、右侧缩放、底部五项主导航。
- 调度中心与财务报表收进经营页，不再占用一级导航。
- 地图仍只读取正式 WorldGraph / map.visibleVehicles，不建立第二套展示状态。

### Changed
- Android / package 版本升级至 0.18.1。
- GAME_VERSION 更新为 0.18.1-stage17-map-ui-rework。
- PlayableClient 现在从正式地图内容透出 stationClass，仅用于地图缩放分级表现。

### Validation
- 地图内容测试新增道路枢纽与 100+ 道路规模守卫。
- Core Check 与 Android APK 构建必须同时通过。


## 0.18.0-stage17-map-foundation

### Removed
- 删除 createPlayableGame 内部硬编码的 8 城市 / 10 道路测试地图构造器，不保留第二套地图种子入口。

### Added
- 新增正式 World Map Content V1 数据契约，地图源数据与运行时 WorldGraph 解耦。
- 新增唯一正式地图文件 src/content/map/world-map.v1.json。
- 正式地图数据支持客运站与乡道(local)、县道、省道、国道、高速五级道路。
- 道路支持多折点 polyline，可直接承接后续地图编辑器绘制的弯曲路网。
- 山川、河流、湖泊与海岸固定为 decorative_only 背景资源，不参与寻路、里程、收费或车辆运行状态。
- 新增 WorldMapContentValidator，校验 ID、引用、道路端点、长度、速度、背景边界与站点绑定。
- 新增 WorldMapSeed，将正式地图内容转换为唯一 WorldGraph / Station / PassengerDemand 运行时。
- APK 构建前强制验证正式地图内容；地图文件无效时拒绝打包。
- 新增地图内容专项测试，覆盖五级道路、背景隔离和正式运行图构建。\n- 新增手机优先的 tools/map-editor 地图编辑器，可放置客运站/路口、绘制五级道路、多折点路网、导入/导出正式 world-map.v1.json。\n- 编辑器支持加载本地背景图作为山川河流视觉参照，但背景图不写入经营路网逻辑。

### Changed
- 首批正式地图从 8 站示例扩展为 48 个架空客运站与 82 条道路段，全国世界范围扩大到 1800km × 1180km。
- 建立全国高速 / 国道 / 省道主骨架，并加入少量县道、乡道作为后续细化样板。
- APK 地图边界不再写死为 900km × 600km，车辆空间查询改为读取正式 Region bounds。
- APK 道路显示从端点直线切换为正式 RoadSegment.polyline，多折点弯路现在会按真实路网形状显示。
- APK 大地图新增拖动、缩放和全图复位。
- GAME_VERSION 更新为 0.18.0-stage17-map-foundation。
- Android 版本更新至 0.18.0。
- 当前 world-map.v1.json 已成为全国骨架内容源，不再保留 8 站示例地图。

### Validation
- 可玩闭环集成测试改为使用相邻正式站点，避免测试结果依赖旧 8 站地图的固定数组位置和长途司机工时边界。
- Core Check 将验证正式地图数据契约与运行时构建。
- Android APK 工作流现在监听 src/content/map/** 并在打包前执行地图校验。


## 0.17.0-stage16-playable-client

### Added
- Android 客户端从只读内容浏览器升级为可玩的经营客户端。
- 新增正式 InMemoryRepositoryBundle 作为生产运行时适配层，供 CommandBus / QueryBus / Simulation 共用。
- 新增架空 8 城市路网、8 个客运站、道路、客流需求、玩家公司、司机与正式经济种子。
- 正式 10 品牌 / 32 车系 / 100 车型 / 180 Variant / 48 Option / 24 Dealer 全部接入同一局运行时。
- 新增经营总览、大地图、线路、班次、车辆市场、调度中心、车队、财务七个可玩页面。
- 支持购车、二手检测、议价、补能、保养、续保、年检、出售车辆。
- 支持创建线路、建立班次计划、提交/重排运营计划与时间推进。
- 地图车辆位置直接读取 map.visibleVehicles，不维护第二套 UI 车辆状态。
- 新增完整集成测试：购车 → 补能 → 开线路 → 建班次 → 自动运营 → 客流 → 客运收入。
- 新增浏览器 Runtime bundle，使 Android WebView 直接执行正式核心逻辑。

### Changed
- APK 版本升级至 0.17.0。
- GAME_VERSION 更新为 0.17.0-stage16-playable-client。
- 原 Stage 16 只读内容验收页已被正式可玩客户端替代。

### Validation
- Core Check 通过。
- Android APK 构建通过。
- 可玩闭环集成测试通过。


## 0.16.0-stage16-android-foundation

### Added
- 新增 Android 应用壳，使用单一 WebView 承载移动端 Presentation，不复制核心领域状态。
- 新增 APK Presentation 构建器，构建时直接读取正式 Vehicle Content 并先执行 Stage 15 全量内容校验。
- 新增手机端总览、品牌、100 基础车型搜索、24 车商与 6 市场区域需求浏览界面。
- 新增 Android APK GitHub Actions 工作流，自动生成 debug APK 并上传构建产物。
- APK 工作流与 Core Check 分离；Android 壳或 APK Presentation-only 改动不再重复触发整套核心测试。

### Architecture
- APK 展示数据由正式 Content 生成，不维护第二份车型、车商或地区市场数据。
- 当前 Android 客户端是 Stage 16 Presentation Foundation；尚未伪造未接入的经营 Command / Query 功能。
- 后续经营 UI 必须继续复用正式 Command / Query / Projection 边界。

### Changed
- GAME_VERSION 更新为 0.16.0-stage16-android-foundation。
- package version 更新为 0.16.0。
- SAVE_VERSION 与 CONTENT_VERSION 不变。


## 0.15.9-stage15-complete

### Added
- 正式完成 6 个车辆市场区域需求配置：north / east / south / central / west / northeast。
- 地区需求覆盖小型客运、中巴、普通/城际、高端、旅游、新能源与价格敏感度，并通过 VehicleMarketDemandService 统一计算。
- 地区需求正式参与动态新车与动态二手车候选排序、库存规模和价格修正，不复制 VehicleModel / VehicleVariant。
- 新增 VehicleVariantLifecycleRefresher，随 VehicleMarketCoordinator 和 Simulation 时间推进自动处理正常销售、清库存与停售切换。
- 生命周期切换会使旧阶段 generated_new Listing 失效；历史 Variant 保留，可继续进入二手市场。
- 新增 VehicleMarketDemandContentValidator 与 VehicleStage15Validator，形成 Stage 15 单一全量内容验收入口。
- 新增地区需求、生命周期刷新和 Stage 15 全量验证专项测试。
- 新增架构守卫，防止地区需求、生命周期刷新或最终 Validator 从正式市场链中脱落。

### Changed
- generated_new supplyCycleKey 现在同时记录 7 天库存周期与生命周期阶段，保证跨正常销售/清库存边界立即刷新。
- CONTENT_VERSION 从 9 升至 10。
- GAME_VERSION 更新为 0.15.9-stage15-complete。
- README / SYSTEM_MAP / Stage 15 规划文档同步到当前真实进度。

### Stage 15 Complete
- 10 个架空品牌。
- 32 个车系。
- 100 个基础 VehicleModel。
- 180 个 VehicleVariant。
- 48 个 VehicleOptionDefinition。
- 24 个 VehicleDealer。
- 6 个车辆市场区域需求配置。
- 动态新车与二手车供给。
- 年款上市 / 停产 / 清库存 / 停售生命周期。
- 全量内容校验与 CI 守卫。
- 下一阶段：Presentation / Android APK。


## 0.15.8-stage15-usedstock

### Added
- 正式完成 Stage 15 动态二手车源生成器。
- 二手库存按 7 天周期确定性刷新，同一周期重复推进不会重复刷同一车源。
- 普通动态二手零售只进入 regional_dealer 与 used_vehicle_dealer；拍卖行继续只走正式拍卖链。
- 每辆生成二手车拥有固定 VehicleConfiguration，并从 Variant 允许选装中确定性形成原车配置。
- UsedVehicleSnapshot 正式包含车龄、里程、剩余能源、保养里程、保险/检验有效期、动力/制动/轮胎/车身状态、历史车主数与事故记录。
- 卖方披露与真实 UsedVehicleSnapshot 分离；普通渠道可出现事故少报或车况偏乐观，高端/进口认证渠道更透明。
- 动态二手挂牌价格继续使用 VehicleMarketValuationService，不建立第二套估价逻辑。
- generated_used 使用独立 supplySource / supplyCycleKey，周期价格不会被通用市场刷新覆盖。
- UsedVehicleStockGenerator 已接入 VehicleMarketCoordinator，与动态新车库存一起随 Simulation 推进。
- 新增动态二手库存专项测试：渠道限制、同周期幂等、跨周期刷新、固定配置、真实车况、事故记录、披露差异与价格折旧。

### Content
- CONTENT_VERSION 从 8 升至 9。
- Stage 15 新车动态供给与二手车动态供给均已完成。
- 下一阶段：地区市场需求配置与车型生命周期刷新。


## 0.15.7-stage15-newstock

### Added
- 正式完成 Stage 15 动态新车库存生成器。
- 新车库存按 7 天周期确定性刷新；同一周期反复推进时间不会重复刷车。
- 已售罄车源在本周期不会立即补货，只能等待下一库存周期。
- 新车只由 manufacturer_dealer 与 regional_dealer 生成；二手车商和拍卖行不会生成普通新车。
- 生成候选同时校验品牌支持、Variant 生命周期、运行时 Dealer / Variant / Model / ModelIdentity 是否存在。
- 正常在产 Variant 与停产清库存 Variant 分开处理；清库存车辆库存更少并带生命周期折扣。
- 自动为每个在售 Variant 建立稳定的厂家标准 VehicleConfiguration，玩家仍可使用同 Variant 的合法自定义配置购买。
- 新增 generated_new supplySource / supplyCycleKey，避免市场刷新逻辑覆盖动态库存自己的周期价格。
- 新增 FORMAL_VEHICLE_CONTENT seed bundle，供运行时 Repository adapter 一次注入 10 品牌、32 车系、100 Model、180 Variant、48 Option、24 Dealer。
- NewVehicleStockGenerator 已接入 VehicleMarketCoordinator，随正式 Simulation 市场刷新链推进。
- 新增动态库存专项测试：来源类型、同周期幂等、卖光不重生、跨周期刷新、标准配置、清库存行为。

### Content
- CONTENT_VERSION 从 7 升至 8。
- Stage 15 新车动态供给完成。
- 下一阶段：动态二手车生成器。


## 0.15.6-stage15-dealers24

### Added
- 一次性完成 24 / 24 个正式 VehicleDealer。
- 车商结构固定为：10 家品牌厂家网络、6 家地区综合车商、5 家二手车商、3 家拍卖行。
- 10 个正式品牌各自恰好拥有 1 个 manufacturer_dealer。
- 地区综合车商拥有不同品牌组合、市场区域、库存强度、二手供给权重和价格偏移。
- 二手车商细分为低价、主流、认证高端、进口二手和车队置换渠道。
- 拍卖行细分为综合拍卖、车队资产拍卖和精品客车拍卖。
- 新增 VehicleDealerContentRecord，提供 marketZoneCode / inventoryProfile / newStockWeightPermille / usedSupplyWeightPermille / priceBiasPermille。
- 正式区分 Stage 15 车辆市场区域与未来世界地图 Region；当前不伪造 canonical RegionId。
- 新增 VehicleDealerContentValidator，校验 24 总量、10/6/5/3 分布、品牌引用、厂家唯一覆盖、区域要求和供给权重。
- 新增 24 车商专项测试。

### Content
- CONTENT_VERSION 从 6 升至 7。
- VehicleModel：100 / 100 complete。
- VehicleVariant：180 / 180 complete。
- VehicleOptionDefinition：48 / 48 complete。
- VehicleDealer：24 / 24 complete。
- 下一阶段：动态新车库存生成器。


## 0.15.5-stage15-options48

### Added
- 一次性完成 48 / 48 个正式 VehicleOptionDefinition。
- 8 大组选装全部落地：座椅、能源/续航、行李、空调/热管理、舒适、安全、车内服务、外观/运营。
- 互斥组正式固定：seat_layout / energy_package / luggage_package / climate_package / paint_finish。
- USB、Wi-Fi、安全辅助、冰箱、热水、卫生间、远程管理等设备允许合理叠加，不错误做成互斥。
- 每个选装正式拥有价格、座位变化、能源容量变化、行李舱变化、舒适度变化和互斥组。
- 180 个 VehicleVariant 的 allowedOptionCodes 现在全部可以解析到真实选装定义。
- 新增 VehicleOptionContentValidator，检查 48 个冻结 code、重复定义、未知互斥组、非法 delta、Variant 引用缺失和选装后物理规格合法性。
- 新增正式配置组合测试与互斥冲突测试。

### Content
- CONTENT_VERSION 从 5 升至 6。
- VehicleModel：100 / 100 complete。
- VehicleVariant：180 / 180 complete。
- VehicleOptionDefinition：48 / 48 complete。
- 下一阶段：24 个正式 VehicleDealer + 动态车商库存。


## 0.15.4-stage15-variants180

### Added
- 一次性完成 180 / 180 个正式 VehicleVariant。
- 100 个基础 VehicleModel 全部至少拥有 1 个厂家版本；分布为 40 个单版本、40 个双版本、20 个三版本车型。
- Variant 正式承载年款、基础价格、标准座位、标准能源容量、行李舱、舒适度和允许选装。
- 柴油与纯电 Variant 使用不同续航增量逻辑；云驰新能源版本继续使用 electric_wh。
- 新增长途版、豪华版、旅游版、商务版、高运力版、长续航版和旗舰版等正式版本逻辑。
- 新增 Variant 生命周期：launchGameDay / productionEndGameDay / dealerClearanceEndGameDay。
- 冻结 48 个 VehicleOptionCode，供 Variant 稳定引用；下一步只补选装定义属性，不需要返工 180 个 Variant。
- 新增 VehicleVariantContentValidator，检查 Variant ID、Model 引用、价格、座位、能源、舒适度、生命周期、选装代码与每 Model 1–3 Variant 规则。
- 新增 180 Variant 全量专项测试。

### Content
- CONTENT_VERSION 从 4 升至 5。
- VehicleModel：100 / 100 complete。
- VehicleVariant：180 / 180 complete。
- 下一阶段：48 个 VehicleOptionDefinition + 24 个 VehicleDealer。


## 0.15.3-stage15-models100

### Added
- 一次性补齐剩余 80 个正式基础车型，Stage 15 VehicleModel 达到 100 / 100。
- 32 个车系全部精确命中 frozen plannedModelCount，不再存在未完成车系。
- 100 个基础车型覆盖 6 个国产品牌与 4 个进口品牌，其中国产 72、进口 28。
- 新增云驰 V / E / EX 共 11 个纯电基础车型，正式使用 electric_wh 能源单位。
- 内容构建器能源字段改为 technology-neutral：energyKind + energyCapacityUnits / drivingEnergyUnitsPer100Km。
- 补齐国产城际、高端、旅游、新能源，以及维尔曼、诺森、东岛、韩沃全部进口基础车型。
- 全量车型继续使用 Tier 1–6 + 单车型 gameDay / reputation / fleet-size 逐步解锁。
- VehicleContentValidator 新增 requireCompleteSeries 模式，正式内容必须逐车系数量精确相等。
- 新增 100/100、28 辆进口、11 辆云驰纯电、32 车系完整性专项测试。
- 新增 100 个基础车型总表文档。

### Content
- CONTENT_VERSION 从 3 升至 4。
- VehicleModel 阶段正式完成 100 / 100。
- 下一内容阶段转入 180 个 VehicleVariant、48 个选装定义和 24 个正式车商。


## 0.15.2-stage15-models20

### Added
- 新增 Stage 15 VehicleContentValidator，正式校验品牌、车系、车型引用、正整数技术参数、解锁层级、车系计划数量与重复技术签名。
- 新增第一批 20 个正式 VehicleModel + VehicleModelIdentity + VehicleModelContentMetadata。
- 第一批覆盖江驰 V/M、宇盛 M/C、中衡 C、金程 J。
- 20 辆车采用不同座位、极速、能源容量、百公里能耗、怠速能耗、保养周期和部件磨损，不允许只换名称复制技术参数。
- 新增同车系逐车型解锁；例如江驰 V5 可开局获得，V6/V6L/V7 随游戏天数、声誉和车队规模逐步开放。
- VehicleContentAccessService 优先读取车型自身解锁规则，未进入正式内容库的测试/兼容数据才回退车系基础 Tier。
- 新增第一批车型内容专项测试，要求 20 个车型无验证错误、无完全重复技术签名。

### Content
- CONTENT_VERSION 从 2 升至 3。
- 当前正式基础车型完成 20 / 100。
- 后续批次继续补齐剩余 80 个 VehicleModel，再进入 180 个 VehicleVariant。


## 0.15.1-stage15-foundation

### Added
- 正式建立 Stage 15 Vehicle Content Contract。
- 建立 10 个架空客车品牌：6 国产、4 进口。
- 建立 32 个正式产品车系，并精确分配 100 个基础车型名额：国产 72、进口 28。
- 品牌/车系命名采用现实商用车行业常见的字母数字产品层级逻辑，但不复用真实品牌与真实系列名称。
- 新增 6 阶段车型解锁规则；开局仅开放 Tier 1，进口车型最早从 Tier 4 进入。
- 解锁同时受游戏天数、公司声誉和有效车队规模约束。
- 新增 VehicleContentAccessService，正式根据 Company + Fleet + GameTime 判定车型可购买性。
- vehicleMarket.purchaseListing 现在在底层强制检查车型解锁；不能通过提前出现的 Listing 绕过成长限制。
- VehicleMarketListingDto 新增 unlockTier / purchaseUnlocked / unlockMissing，供未来 UI 显示真实锁定原因。
- 新增内容规模、国产/进口分布、解锁节奏专项测试。

### Content
- CONTENT_VERSION 从 1 升至 2。
- 本阶段尚未填充 100 个 VehicleModel 的完整技术参数；下一步开始 Content Validator 与首批正式车型数据。


## 0.15.1-stage15-blueprint

### Added
- 更新 SYSTEM_MAP 至 Freeze v2，使 Stage 10–14 与当前仓库实现一致。
- 冻结 Stage 15 车辆内容库与动态供给目标。
- 固定第一版内容规模：10 品牌、32 车系、100 基础车型、180 厂家版本、48 选装、24 车商。
- 固定 8 类车辆用途及 100 个基础车型分布。
- 固定新车动态库存、二手车动态生成、车型生命周期、地区偏好和 Content Validator 边界。
- 固定 Stage 15 的 14 步实施顺序。
- 明确 Stage 15 不在 UI 中生成市场数据，不复制 VehicleModel，不手写长期固定 Listing。

### Runtime
- 本提交仅冻结 Stage 15 内容与架构规划，不改变运行时业务逻辑。


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
