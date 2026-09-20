import { ids } from "../../contracts/ids/EntityIds.js";
import type {
  VehicleDealerContentRecord,
  VehicleDealerInventoryProfile,
  VehicleMarketZoneCode
} from "./VehicleContentTypes.js";

const brand = {
  yusheng: ids.vehicleBrand("vehicle_brand.yusheng"),
  jincheng: ids.vehicleBrand("vehicle_brand.jincheng"),
  zhongheng: ids.vehicleBrand("vehicle_brand.zhongheng"),
  jiangchi: ids.vehicleBrand("vehicle_brand.jiangchi"),
  yunchi: ids.vehicleBrand("vehicle_brand.yunchi"),
  xinglv: ids.vehicleBrand("vehicle_brand.xinglv"),
  velmann: ids.vehicleBrand("vehicle_brand.velmann"),
  norsen: ids.vehicleBrand("vehicle_brand.norsen"),
  tojima: ids.vehicleBrand("vehicle_brand.tojima"),
  hanvo: ids.vehicleBrand("vehicle_brand.hanvo")
} as const;

const allBrands = Object.values(brand);

function dealer(input: {
  readonly id: string;
  readonly name: string;
  readonly kind:
    | "manufacturer_dealer"
    | "regional_dealer"
    | "used_vehicle_dealer"
    | "auction_house";
  readonly supportedBrandIds: readonly (typeof brand)[keyof typeof brand][];
  readonly marketZoneCode: VehicleMarketZoneCode | null;
  readonly inventoryProfile: VehicleDealerInventoryProfile;
  readonly newStockWeightPermille: number;
  readonly usedSupplyWeightPermille: number;
  readonly priceBiasPermille: number;
}): VehicleDealerContentRecord {
  return {
    dealer: {
      id: ids.vehicleDealer(
        `vehicle_dealer.${input.id}`
      ),
      name: input.name,
      kind: input.kind,
      // Stage 15 vehicle-market zones are intentionally separate from
      // the future canonical world Region catalog. Runtime mapping will
      // fill RegionId only after world regions are formalized.
      regionId: null,
      supportedBrandIds: input.supportedBrandIds,
      active: true
    },
    marketZoneCode: input.marketZoneCode,
    inventoryProfile: input.inventoryProfile,
    newStockWeightPermille: input.newStockWeightPermille,
    usedSupplyWeightPermille: input.usedSupplyWeightPermille,
    priceBiasPermille: input.priceBiasPermille
  };
}

export const VEHICLE_DEALERS: readonly VehicleDealerContentRecord[] = [
  // 10 家品牌厂家经销网络：全国/进口总代理，不绑定临时地图 RegionId。
  dealer({
    id: "yusheng_network",
    name: "宇盛汽车销售服务",
    kind: "manufacturer_dealer",
    supportedBrandIds: [brand.yusheng],
    marketZoneCode: null,
    inventoryProfile: "manufacturer_new",
    newStockWeightPermille: 1250,
    usedSupplyWeightPermille: 0,
    priceBiasPermille: 1000
  }),
  dealer({
    id: "jincheng_network",
    name: "金程客车销售中心",
    kind: "manufacturer_dealer",
    supportedBrandIds: [brand.jincheng],
    marketZoneCode: null,
    inventoryProfile: "manufacturer_new",
    newStockWeightPermille: 1150,
    usedSupplyWeightPermille: 0,
    priceBiasPermille: 990
  }),
  dealer({
    id: "zhongheng_network",
    name: "中衡商用车销售服务",
    kind: "manufacturer_dealer",
    supportedBrandIds: [brand.zhongheng],
    marketZoneCode: null,
    inventoryProfile: "manufacturer_new",
    newStockWeightPermille: 1200,
    usedSupplyWeightPermille: 0,
    priceBiasPermille: 970
  }),
  dealer({
    id: "jiangchi_network",
    name: "江驰客车销售服务",
    kind: "manufacturer_dealer",
    supportedBrandIds: [brand.jiangchi],
    marketZoneCode: null,
    inventoryProfile: "manufacturer_new",
    newStockWeightPermille: 1300,
    usedSupplyWeightPermille: 0,
    priceBiasPermille: 950
  }),
  dealer({
    id: "yunchi_network",
    name: "云驰新能源商用车中心",
    kind: "manufacturer_dealer",
    supportedBrandIds: [brand.yunchi],
    marketZoneCode: null,
    inventoryProfile: "manufacturer_new",
    newStockWeightPermille: 1050,
    usedSupplyWeightPermille: 0,
    priceBiasPermille: 1020
  }),
  dealer({
    id: "xinglv_network",
    name: "星旅高端客车中心",
    kind: "manufacturer_dealer",
    supportedBrandIds: [brand.xinglv],
    marketZoneCode: null,
    inventoryProfile: "manufacturer_new",
    newStockWeightPermille: 900,
    usedSupplyWeightPermille: 0,
    priceBiasPermille: 1040
  }),
  dealer({
    id: "velmann_import",
    name: "维尔曼进口车辆中心",
    kind: "manufacturer_dealer",
    supportedBrandIds: [brand.velmann],
    marketZoneCode: null,
    inventoryProfile: "manufacturer_new",
    newStockWeightPermille: 600,
    usedSupplyWeightPermille: 0,
    priceBiasPermille: 1080
  }),
  dealer({
    id: "norsen_import",
    name: "诺森进口客车中心",
    kind: "manufacturer_dealer",
    supportedBrandIds: [brand.norsen],
    marketZoneCode: null,
    inventoryProfile: "manufacturer_new",
    newStockWeightPermille: 550,
    usedSupplyWeightPermille: 0,
    priceBiasPermille: 1090
  }),
  dealer({
    id: "tojima_import",
    name: "东岛商用车进口中心",
    kind: "manufacturer_dealer",
    supportedBrandIds: [brand.tojima],
    marketZoneCode: null,
    inventoryProfile: "manufacturer_new",
    newStockWeightPermille: 700,
    usedSupplyWeightPermille: 0,
    priceBiasPermille: 1060
  }),
  dealer({
    id: "hanvo_import",
    name: "韩沃客车进口销售中心",
    kind: "manufacturer_dealer",
    supportedBrandIds: [brand.hanvo],
    marketZoneCode: null,
    inventoryProfile: "manufacturer_new",
    newStockWeightPermille: 750,
    usedSupplyWeightPermille: 0,
    priceBiasPermille: 1030
  }),

  // 6 家地区综合车商：品牌覆盖与价格偏移不同。
  dealer({
    id: "north_regional",
    name: "北方商用车中心",
    kind: "regional_dealer",
    supportedBrandIds: [
      brand.yusheng,
      brand.jincheng,
      brand.zhongheng,
      brand.jiangchi,
      brand.norsen,
      brand.hanvo
    ],
    marketZoneCode: "north",
    inventoryProfile: "regional_mixed",
    newStockWeightPermille: 1000,
    usedSupplyWeightPermille: 250,
    priceBiasPermille: 990
  }),
  dealer({
    id: "east_regional",
    name: "东部客运车辆中心",
    kind: "regional_dealer",
    supportedBrandIds: [
      brand.yusheng,
      brand.jincheng,
      brand.yunchi,
      brand.xinglv,
      brand.velmann,
      brand.tojima,
      brand.hanvo
    ],
    marketZoneCode: "east",
    inventoryProfile: "regional_mixed",
    newStockWeightPermille: 1150,
    usedSupplyWeightPermille: 220,
    priceBiasPermille: 1010
  }),
  dealer({
    id: "south_regional",
    name: "南方交通装备中心",
    kind: "regional_dealer",
    supportedBrandIds: [
      brand.yusheng,
      brand.zhongheng,
      brand.jiangchi,
      brand.yunchi,
      brand.xinglv,
      brand.tojima,
      brand.hanvo
    ],
    marketZoneCode: "south",
    inventoryProfile: "regional_mixed",
    newStockWeightPermille: 1100,
    usedSupplyWeightPermille: 300,
    priceBiasPermille: 995
  }),
  dealer({
    id: "central_regional",
    name: "中部客车交易中心",
    kind: "regional_dealer",
    supportedBrandIds: [
      brand.yusheng,
      brand.jincheng,
      brand.zhongheng,
      brand.jiangchi,
      brand.yunchi,
      brand.xinglv
    ],
    marketZoneCode: "central",
    inventoryProfile: "regional_mixed",
    newStockWeightPermille: 1200,
    usedSupplyWeightPermille: 350,
    priceBiasPermille: 970
  }),
  dealer({
    id: "west_regional",
    name: "西部商用车中心",
    kind: "regional_dealer",
    supportedBrandIds: [
      brand.yusheng,
      brand.jincheng,
      brand.zhongheng,
      brand.jiangchi,
      brand.yunchi,
      brand.norsen
    ],
    marketZoneCode: "west",
    inventoryProfile: "regional_mixed",
    newStockWeightPermille: 900,
    usedSupplyWeightPermille: 280,
    priceBiasPermille: 1020
  }),
  dealer({
    id: "northeast_regional",
    name: "东北客运车辆中心",
    kind: "regional_dealer",
    supportedBrandIds: [
      brand.yusheng,
      brand.jincheng,
      brand.zhongheng,
      brand.jiangchi,
      brand.norsen,
      brand.tojima
    ],
    marketZoneCode: "northeast",
    inventoryProfile: "regional_mixed",
    newStockWeightPermille: 850,
    usedSupplyWeightPermille: 320,
    priceBiasPermille: 1015
  }),

  // 5 家二手车商：经营侧重点不同。
  dealer({
    id: "budget_used",
    name: "万里二手客车",
    kind: "used_vehicle_dealer",
    supportedBrandIds: [
      brand.jiangchi,
      brand.zhongheng,
      brand.jincheng,
      brand.yusheng,
      brand.hanvo
    ],
    marketZoneCode: "central",
    inventoryProfile: "used_budget",
    newStockWeightPermille: 0,
    usedSupplyWeightPermille: 1400,
    priceBiasPermille: 920
  }),
  dealer({
    id: "mainstream_used",
    name: "通达二手商用车",
    kind: "used_vehicle_dealer",
    supportedBrandIds: [
      brand.yusheng,
      brand.jincheng,
      brand.zhongheng,
      brand.jiangchi,
      brand.yunchi,
      brand.xinglv,
      brand.hanvo
    ],
    marketZoneCode: "east",
    inventoryProfile: "used_mainstream",
    newStockWeightPermille: 0,
    usedSupplyWeightPermille: 1250,
    priceBiasPermille: 980
  }),
  dealer({
    id: "premium_used",
    name: "远航认证二手客车",
    kind: "used_vehicle_dealer",
    supportedBrandIds: [
      brand.yusheng,
      brand.xinglv,
      brand.velmann,
      brand.norsen,
      brand.tojima,
      brand.hanvo
    ],
    marketZoneCode: "south",
    inventoryProfile: "used_premium",
    newStockWeightPermille: 0,
    usedSupplyWeightPermille: 850,
    priceBiasPermille: 1080
  }),
  dealer({
    id: "import_used",
    name: "海陆进口二手商用车",
    kind: "used_vehicle_dealer",
    supportedBrandIds: [
      brand.velmann,
      brand.norsen,
      brand.tojima,
      brand.hanvo,
      brand.xinglv
    ],
    marketZoneCode: "east",
    inventoryProfile: "used_import",
    newStockWeightPermille: 0,
    usedSupplyWeightPermille: 650,
    priceBiasPermille: 1120
  }),
  dealer({
    id: "fleet_used",
    name: "运达车队置换中心",
    kind: "used_vehicle_dealer",
    supportedBrandIds: allBrands,
    marketZoneCode: "north",
    inventoryProfile: "used_fleet",
    newStockWeightPermille: 0,
    usedSupplyWeightPermille: 1550,
    priceBiasPermille: 950
  }),

  // 3 家拍卖行：全部品牌可进入，但车源结构不同。
  dealer({
    id: "general_auction",
    name: "中联商用车拍卖中心",
    kind: "auction_house",
    supportedBrandIds: allBrands,
    marketZoneCode: "central",
    inventoryProfile: "auction_general",
    newStockWeightPermille: 0,
    usedSupplyWeightPermille: 1300,
    priceBiasPermille: 900
  }),
  dealer({
    id: "fleet_auction",
    name: "路通车队资产拍卖",
    kind: "auction_house",
    supportedBrandIds: allBrands,
    marketZoneCode: "north",
    inventoryProfile: "auction_fleet",
    newStockWeightPermille: 0,
    usedSupplyWeightPermille: 1600,
    priceBiasPermille: 860
  }),
  dealer({
    id: "premium_auction",
    name: "远洋精品客车拍卖",
    kind: "auction_house",
    supportedBrandIds: [
      brand.yusheng,
      brand.xinglv,
      brand.velmann,
      brand.norsen,
      brand.tojima,
      brand.hanvo
    ],
    marketZoneCode: "east",
    inventoryProfile: "auction_premium",
    newStockWeightPermille: 0,
    usedSupplyWeightPermille: 700,
    priceBiasPermille: 1070
  })
];

if (VEHICLE_DEALERS.length !== 24) {
  throw new Error(
    `Vehicle dealer catalog must contain exactly 24 dealers, found ${VEHICLE_DEALERS.length}`
  );
}
