# Stage 15：动态二手车源生成

状态：Implemented

普通动态二手零售只进入地区综合车商与二手车商；拍卖行继续走正式 VehicleAuction 链，不伪装成普通零售。

二手库存按 7 天周期确定性刷新，同周期重复刷新不会重复生成，已售车源不会在本周期复活，下一周期才出现新一批车源。

每辆生成车都保存固定 Variant / VehicleConfiguration、真实车龄、里程、剩余能源、保养里程、保险与检验有效期、动力/制动/轮胎/车身状态、历史车主数与事故记录。购买后这些事实直接进入 OwnedVehicle，不洗成新车。

原车配置从 Variant.allowedOptionCodes 中确定性选择，并继续经过 VehicleConfigurationRules 校验。

sellerDisclosure 与真实 UsedVehicleSnapshot 分离。普通渠道允许一定概率少报事故或乐观描述车况；认证高端和进口渠道更透明。完整检测仍以真实快照为准，可发现 disclosureMismatch。

价格继续经过 VehicleMarketValuationService 统一计算车龄、里程、车况、事故与市场因素，再叠加车商价格偏移；不建立第二套二手估价体系。
