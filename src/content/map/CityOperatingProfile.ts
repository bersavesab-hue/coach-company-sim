import type {
  CityRole,
  OperatingZone
} from "./WorldMapContent.js";

export function operatingZoneLabel(
  zone: OperatingZone
): string {
  switch (zone) {
    case "northwest": return "北原经营区";
    case "north": return "北部经营区";
    case "northeast": return "东岭经营区";
    case "southwest": return "西川经营区";
    case "central_south": return "中南经营区";
    case "southeast": return "海东经营区";
  }
}

export function cityRoleLabel(
  role: CityRole
): string {
  switch (role) {
    case "local": return "地方客源";
    case "regional": return "区域中心";
    case "business": return "商务客流";
    case "tourism": return "旅游客流";
    case "hub": return "综合枢纽";
    case "gateway": return "门户城市";
  }
}

export function stationTierLabel(
  tier: 1 | 2 | 3 | 4
): string {
  switch (tier) {
    case 1: return "乡镇客运站";
    case 2: return "县级客运站";
    case 3: return "城市客运站";
    case 4: return "综合枢纽站";
  }
}
