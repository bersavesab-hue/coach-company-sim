import { ids } from "../../contracts/ids/EntityIds.js";
import type { VehicleBrandContentRecord } from "./VehicleContentTypes.js";

export const VEHICLE_BRANDS: readonly VehicleBrandContentRecord[] = [
  {
    brand: {
      id: ids.vehicleBrand("vehicle_brand.yusheng"),
      name: "宇盛客车",
      originCode: "CN",
      active: true
    },
    latinName: "YUSHENG",
    origin: "domestic",
    positioning: "full_line_mainstream"
  },
  {
    brand: {
      id: ids.vehicleBrand("vehicle_brand.jincheng"),
      name: "金程客车",
      originCode: "CN",
      active: true
    },
    latinName: "JINCHENG",
    origin: "domestic",
    positioning: "traditional_long_distance"
  },
  {
    brand: {
      id: ids.vehicleBrand("vehicle_brand.zhongheng"),
      name: "中衡客车",
      originCode: "CN",
      active: true
    },
    latinName: "ZHONGHENG",
    origin: "domestic",
    positioning: "value_mainstream"
  },
  {
    brand: {
      id: ids.vehicleBrand("vehicle_brand.jiangchi"),
      name: "江驰客车",
      originCode: "CN",
      active: true
    },
    latinName: "JIANGCHI",
    origin: "domestic",
    positioning: "county_rural"
  },
  {
    brand: {
      id: ids.vehicleBrand("vehicle_brand.yunchi"),
      name: "云驰客车",
      originCode: "CN",
      active: true
    },
    latinName: "YUNCHI",
    origin: "domestic",
    positioning: "new_energy"
  },
  {
    brand: {
      id: ids.vehicleBrand("vehicle_brand.xinglv"),
      name: "星旅客车",
      originCode: "CN",
      active: true
    },
    latinName: "STARWAY",
    origin: "domestic",
    positioning: "premium_tourism"
  },
  {
    brand: {
      id: ids.vehicleBrand("vehicle_brand.velmann"),
      name: "维尔曼",
      originCode: "DE",
      active: true
    },
    latinName: "VELMANN",
    origin: "imported",
    positioning: "import_luxury"
  },
  {
    brand: {
      id: ids.vehicleBrand("vehicle_brand.norsen"),
      name: "诺森",
      originCode: "SE",
      active: true
    },
    latinName: "NORSEN",
    origin: "imported",
    positioning: "import_safety"
  },
  {
    brand: {
      id: ids.vehicleBrand("vehicle_brand.tojima"),
      name: "东岛",
      originCode: "JP",
      active: true
    },
    latinName: "TOJIMA",
    origin: "imported",
    positioning: "import_compact"
  },
  {
    brand: {
      id: ids.vehicleBrand("vehicle_brand.hanvo"),
      name: "韩沃",
      originCode: "KR",
      active: true
    },
    latinName: "HANVO",
    origin: "imported",
    positioning: "import_value"
  }
];
