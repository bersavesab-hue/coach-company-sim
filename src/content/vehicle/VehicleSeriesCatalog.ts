import { ids } from "../../contracts/ids/EntityIds.js";
import type { VehicleSeriesContentRecord } from "./VehicleContentTypes.js";

const b = {
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

function series(
  id: string,
  brandId: (typeof b)[keyof typeof b],
  seriesCode: string,
  displayName: string,
  role: VehicleSeriesContentRecord["role"],
  plannedModelCount: number,
  baseUnlockTier: VehicleSeriesContentRecord["baseUnlockTier"]
): VehicleSeriesContentRecord {
  return {
    series: {
      id: ids.vehicleSeries(`vehicle_series.${id}`),
      brandId,
      name: displayName,
      active: true
    },
    seriesCode,
    displayName,
    role,
    plannedModelCount,
    baseUnlockTier
  };
}

export const VEHICLE_SERIES: readonly VehicleSeriesContentRecord[] = [
  // 宇盛：15 models
  series("yusheng_m", b.yusheng, "M", "M系列", "county_midibus", 3, 1),
  series("yusheng_c", b.yusheng, "C", "C系列", "standard_coach", 4, 2),
  series("yusheng_k", b.yusheng, "K", "K系列", "intercity_coach", 5, 3),
  series("yusheng_x", b.yusheng, "X", "X系列", "premium_coach", 3, 5),

  // 金程：13 models
  series("jincheng_j", b.jincheng, "J", "J系列", "county_midibus", 3, 1),
  series("jincheng_g", b.jincheng, "G", "G系列", "standard_coach", 3, 2),
  series("jincheng_l", b.jincheng, "L", "L系列", "intercity_coach", 4, 3),
  series("jincheng_v", b.jincheng, "V", "V系列", "tourist_coach", 3, 4),

  // 中衡：12 models
  series("zhongheng_c", b.zhongheng, "C", "C系列", "county_midibus", 4, 1),
  series("zhongheng_k", b.zhongheng, "K", "K系列", "standard_coach", 4, 2),
  series("zhongheng_t", b.zhongheng, "T", "T系列", "intercity_coach", 4, 3),

  // 江驰：11 models
  series("jiangchi_v", b.jiangchi, "V", "V系列", "rural_minibus", 4, 1),
  series("jiangchi_m", b.jiangchi, "M", "M系列", "county_midibus", 4, 1),
  series("jiangchi_c", b.jiangchi, "C", "C系列", "standard_coach", 3, 2),

  // 云驰：11 models
  series("yunchi_v", b.yunchi, "V", "V系列", "airport_shuttle", 3, 2),
  series("yunchi_e", b.yunchi, "E", "E系列", "standard_coach", 4, 3),
  series("yunchi_ex", b.yunchi, "EX", "EX系列", "intercity_coach", 4, 4),

  // 星旅：10 models
  series("xinglv_t", b.xinglv, "T", "T系列", "tourist_coach", 4, 3),
  series("xinglv_x", b.xinglv, "X", "X系列", "premium_coach", 3, 4),
  series("xinglv_p", b.xinglv, "P", "P系列", "premium_coach", 3, 5),

  // 维尔曼：8 imported models
  series("velmann_t", b.velmann, "T", "T Series", "intercity_coach", 3, 5),
  series("velmann_c", b.velmann, "C", "C Series", "tourist_coach", 3, 5),
  series("velmann_g", b.velmann, "G", "Grand Series", "premium_coach", 2, 6),

  // 诺森：7 imported models
  series("norsen_n", b.norsen, "N", "N Series", "intercity_coach", 2, 5),
  series("norsen_r", b.norsen, "R", "R Series", "high_capacity_coach", 3, 5),
  series("norsen_x", b.norsen, "X", "X Series", "premium_coach", 2, 6),

  // 东岛：7 imported models
  series("tojima_m", b.tojima, "M", "M Series", "rural_minibus", 3, 4),
  series("tojima_s", b.tojima, "S", "S Series", "county_midibus", 2, 4),
  series("tojima_c", b.tojima, "C", "C Series", "airport_shuttle", 2, 5),

  // 韩沃：6 imported models
  series("hanvo_h", b.hanvo, "H", "H Series", "standard_coach", 2, 4),
  series("hanvo_a", b.hanvo, "A", "A Series", "tourist_coach", 2, 4),
  series("hanvo_r", b.hanvo, "R", "R Series", "intercity_coach", 2, 5)
];
