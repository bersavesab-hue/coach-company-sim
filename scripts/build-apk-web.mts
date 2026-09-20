import fs from "node:fs";
import path from "node:path";

import {
  GAME_VERSION,
  CONTENT_VERSION
} from "../src/core/version/Versions.js";
import { VEHICLE_BRANDS } from "../src/content/vehicle/VehicleBrandCatalog.js";
import { VEHICLE_SERIES } from "../src/content/vehicle/VehicleSeriesCatalog.js";
import { VEHICLE_MODELS } from "../src/content/vehicle/VehicleModelCatalog.js";
import { VEHICLE_VARIANTS } from "../src/content/vehicle/VehicleVariantCatalog.js";
import { VEHICLE_OPTIONS } from "../src/content/vehicle/VehicleOptionCatalog.js";
import { VEHICLE_DEALERS } from "../src/content/vehicle/VehicleDealerCatalog.js";
import {
  VEHICLE_MARKET_ZONE_DEMAND_PROFILES
} from "../src/content/vehicle/VehicleMarketDemandCatalog.js";
import {
  validateStage15VehicleContent
} from "../src/content/vehicle/VehicleStage15Validator.js";

const validation = validateStage15VehicleContent();
if (!validation.valid) {
  const errors = validation.issues
    .filter((issue) => issue.severity === "error")
    .map((issue) => `${issue.source}:${issue.code}:${issue.ref ?? "-"}`)
    .join("\n");
  throw new Error(
    `Stage 15 content is invalid; APK presentation cannot be built.\n${errors}`
  );
}

const seriesById = new Map(
  VEHICLE_SERIES.map((record) => [
    String(record.series.id),
    record
  ])
);
const brandById = new Map(
  VEHICLE_BRANDS.map((record) => [
    String(record.brand.id),
    record
  ])
);
const variantCountByModel = new Map<string, number>();
for (const record of VEHICLE_VARIANTS) {
  const key = String(record.variant.modelId);
  variantCountByModel.set(
    key,
    (variantCountByModel.get(key) ?? 0) + 1
  );
}

const payload = {
  version: GAME_VERSION,
  contentVersion: CONTENT_VERSION,
  generatedAt: new Date().toISOString(),
  counts: validation.counts,
  brands: VEHICLE_BRANDS.map((record) => ({
    id: String(record.brand.id),
    name: record.brand.name,
    latinName: record.latinName,
    origin: record.origin,
    positioning: record.positioning,
    seriesCount: VEHICLE_SERIES.filter(
      (series) =>
        series.series.brandId === record.brand.id
    ).length
  })),
  models: VEHICLE_MODELS.map((record) => {
    const series = seriesById.get(
      String(record.identity.seriesId)
    );
    const brand = series
      ? brandById.get(String(series.series.brandId))
      : undefined;
    return {
      id: String(record.model.id),
      name: record.identity.displayName,
      brand: brand?.brand.name ?? "未知品牌",
      series: series?.displayName ?? "未知车系",
      role: record.metadata.role,
      tier: record.metadata.unlock.tier,
      earliestGameDay:
        record.metadata.unlock.earliestGameDay,
      minimumReputationPermille:
        record.metadata.unlock.minimumReputationPermille,
      minimumOwnedVehicleCount:
        record.metadata.unlock.minimumOwnedVehicleCount,
      seatCapacity: record.model.seatCapacity,
      maxSpeedKph: Math.round(
        Number(record.model.maxSpeedMps) * 3.6
      ),
      energyKind: record.model.energyKind,
      energyCapacityUnits:
        record.model.energyCapacityUnits,
      drivingEnergyUnitsPer100Km:
        record.model.drivingEnergyUnitsPer100Km,
      serviceIntervalKm:
        Math.round(record.model.serviceIntervalM / 1000),
      variantCount:
        variantCountByModel.get(
          String(record.model.id)
        ) ?? 0
    };
  }),
  dealers: VEHICLE_DEALERS.map((record) => ({
    id: String(record.dealer.id),
    name: record.dealer.name,
    kind: record.dealer.kind,
    zone: record.marketZoneCode,
    inventoryProfile: record.inventoryProfile,
    brands: record.dealer.supportedBrandIds
      .map((id) => brandById.get(String(id))?.brand.name)
      .filter((value): value is string => value !== undefined),
    newStockWeightPermille:
      record.newStockWeightPermille,
    usedSupplyWeightPermille:
      record.usedSupplyWeightPermille,
    priceBiasPermille:
      record.priceBiasPermille
  })),
  zones: VEHICLE_MARKET_ZONE_DEMAND_PROFILES
};

const outputDir = path.resolve(
  "android-app/app/src/main/assets/www"
);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, "index.html"),
  renderHtml(payload),
  "utf8"
);

console.log(
  `APK_WEB_READY ${payload.models.length} models / ${payload.dealers.length} dealers / v${payload.version}`
);

function renderHtml(data: typeof payload): string {
  const json = JSON.stringify(data)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#111820">
<title>客运公司模拟器</title>
<style>
:root{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;color:#eaf0f5;background:#0b1016}
*{box-sizing:border-box}body{margin:0;background:#0b1016;color:#eaf0f5}
header{position:sticky;top:0;z-index:8;background:rgba(11,16,22,.96);border-bottom:1px solid #26323d;padding:calc(12px + env(safe-area-inset-top)) 16px 12px}
h1{font-size:20px;margin:0 0 4px}.sub{font-size:12px;color:#8ea1b1}
nav{display:flex;gap:8px;overflow:auto;padding:10px 16px;border-bottom:1px solid #202a33;background:#111820}
nav button{border:1px solid #31404c;background:#17212a;color:#c9d5df;border-radius:12px;padding:9px 14px;white-space:nowrap}
nav button.active{background:#e5edf3;color:#101820;border-color:#e5edf3}
main{padding:14px 14px 84px;max-width:900px;margin:auto}.page{display:none}.page.active{display:block}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.metric,.card{background:#131c24;border:1px solid #283540;border-radius:14px;padding:13px}
.metric strong{font-size:24px;display:block}.metric span{font-size:12px;color:#92a6b6}
.section-title{font-size:16px;margin:18px 2px 10px}.status{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:#143322;color:#b9efcc;font-size:12px}
.dot{width:7px;height:7px;border-radius:50%;background:#64d68a}
.search{width:100%;border:1px solid #31404c;border-radius:12px;background:#101820;color:#fff;padding:12px 13px;margin-bottom:10px;font-size:15px}
.row{display:flex;justify-content:space-between;gap:10px}.muted{color:#91a3b2;font-size:12px}.name{font-weight:700}.tag{display:inline-block;padding:3px 7px;border-radius:8px;background:#202d38;color:#bfd0dc;font-size:11px;margin:5px 5px 0 0}
.list{display:flex;flex-direction:column;gap:8px}.detail{font-size:13px;color:#cad5de;line-height:1.7;margin-top:8px}
.kv{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px}.kv b{font-weight:500;color:#fff}.empty{text-align:center;color:#8da0af;padding:28px}
footer{position:fixed;bottom:0;left:0;right:0;background:rgba(11,16,22,.96);border-top:1px solid #26323d;padding:9px 14px calc(9px + env(safe-area-inset-bottom));font-size:11px;color:#8193a2;text-align:center}
@media(min-width:700px){.grid{grid-template-columns:repeat(4,1fr)}}
</style>
</head>
<body>
<header><h1>客运公司模拟器</h1><div class="sub">Android 测试客户端 · ${escapeHtml(data.version)} · Content ${data.contentVersion}</div></header>
<nav>
<button class="active" data-page="overview">总览</button>
<button data-page="models">车型库</button>
<button data-page="dealers">车商</button>
<button data-page="zones">地区需求</button>
</nav>
<main>
<section class="page active" id="overview">
<div class="status"><i class="dot"></i>Stage 15 内容校验通过</div>
<h2 class="section-title">正式内容</h2>
<div class="grid">
<div class="metric"><strong>${data.counts.brands}</strong><span>品牌</span></div>
<div class="metric"><strong>${data.counts.series}</strong><span>车系</span></div>
<div class="metric"><strong>${data.counts.models}</strong><span>基础车型</span></div>
<div class="metric"><strong>${data.counts.variants}</strong><span>厂家版本</span></div>
<div class="metric"><strong>${data.counts.options}</strong><span>选装</span></div>
<div class="metric"><strong>${data.counts.dealers}</strong><span>车商</span></div>
<div class="metric"><strong>${data.counts.marketZones}</strong><span>市场区域</span></div>
<div class="metric"><strong>7天</strong><span>动态库存周期</span></div>
</div>
<h2 class="section-title">品牌</h2><div class="list" id="brand-list"></div>
</section>
<section class="page" id="models">
<input class="search" id="model-search" placeholder="搜索品牌 / 车型 / 车系">
<div class="muted" id="model-count"></div><div class="list" id="model-list"></div>
</section>
<section class="page" id="dealers">
<input class="search" id="dealer-search" placeholder="搜索车商 / 地区 / 类型">
<div class="list" id="dealer-list"></div>
</section>
<section class="page" id="zones"><div class="list" id="zone-list"></div></section>
</main>
<footer>数据由正式 Content 构建生成；此 APK 不维护第二套车型或市场数据。</footer>
<script>
const DATA=${json};
const roleNames={rural_minibus:"乡镇微客",county_midibus:"县域中巴",standard_coach:"普通客车",intercity_coach:"城际客车",premium_coach:"高端客车",tourist_coach:"旅游客车",airport_shuttle:"机场接驳",high_capacity_coach:"高运力干线"};
const dealerKinds={manufacturer_dealer:"厂家网络",regional_dealer:"地区综合车商",used_vehicle_dealer:"二手车商",auction_house:"拍卖行"};
const zoneNames={north:"北方",east:"东部",south:"南方",central:"中部",west:"西部",northeast:"东北"};
const energyNames={diesel_ml:"柴油",gasoline_ml:"汽油",electric_wh:"纯电",hydrogen_gram:"氢能"};
const esc=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
document.querySelectorAll("nav button").forEach(btn=>btn.onclick=()=>{
 document.querySelectorAll("nav button").forEach(x=>x.classList.remove("active"));
 document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
 btn.classList.add("active");document.getElementById(btn.dataset.page).classList.add("active");
});
document.getElementById("brand-list").innerHTML=DATA.brands.map(b=>`<div class="card"><div class="row"><div><div class="name">${esc(b.name)}</div><div class="muted">${esc(b.latinName)}</div></div><span class="tag">${b.origin==="domestic"?"国产":"进口"}</span></div><div class="detail">车系：${b.seriesCount} · 定位：${esc(b.positioning)}</div></div>`).join("");
function renderModels(q=""){
 const key=q.trim().toLowerCase();const rows=DATA.models.filter(m=>!key||[m.name,m.brand,m.series,m.role].join(" ").toLowerCase().includes(key));
 document.getElementById("model-count").textContent=`显示 ${rows.length} / ${DATA.models.length} 辆`;
 document.getElementById("model-list").innerHTML=rows.map(m=>`<div class="card"><div class="row"><div><div class="name">${esc(m.name)}</div><div class="muted">${esc(m.brand)} · ${esc(m.series)}</div></div><span class="tag">Tier ${m.tier}</span></div><div><span class="tag">${esc(roleNames[m.role]||m.role)}</span><span class="tag">${esc(energyNames[m.energyKind]||m.energyKind)}</span><span class="tag">${m.variantCount} 个版本</span></div><div class="detail kv"><span>座位 <b>${m.seatCapacity}</b></span><span>极速 <b>${m.maxSpeedKph} km/h</b></span><span>保养 <b>${m.serviceIntervalKm} km</b></span><span>最早解锁 <b>第 ${m.earliestGameDay} 天</b></span><span>声誉门槛 <b>${m.minimumReputationPermille}/1000</b></span><span>车队门槛 <b>${m.minimumOwnedVehicleCount} 辆</b></span></div></div>`).join("")||'<div class="empty">没有匹配车型</div>';
}
renderModels();document.getElementById("model-search").oninput=e=>renderModels(e.target.value);
function renderDealers(q=""){
 const key=q.trim().toLowerCase();const rows=DATA.dealers.filter(d=>!key||[d.name,d.kind,d.zone,d.inventoryProfile,...d.brands].join(" ").toLowerCase().includes(key));
 document.getElementById("dealer-list").innerHTML=rows.map(d=>`<div class="card"><div class="row"><div class="name">${esc(d.name)}</div><span class="tag">${esc(dealerKinds[d.kind]||d.kind)}</span></div><div class="detail">区域：${d.zone?esc(zoneNames[d.zone]||d.zone):"全国/总代理"}<br>品牌：${d.brands.map(esc).join("、")}</div><div><span class="tag">新车权重 ${d.newStockWeightPermille}</span><span class="tag">二手权重 ${d.usedSupplyWeightPermille}</span><span class="tag">价格偏移 ${d.priceBiasPermille}</span></div></div>`).join("")||'<div class="empty">没有匹配车商</div>';
}
renderDealers();document.getElementById("dealer-search").oninput=e=>renderDealers(e.target.value);
document.getElementById("zone-list").innerHTML=DATA.zones.map(z=>`<div class="card"><div class="name">${esc(zoneNames[z.zoneCode]||z.zoneCode)}</div><div class="detail kv"><span>微客 <b>${z.minibusDemandPermille}</b></span><span>中巴 <b>${z.midibusDemandPermille}</b></span><span>客车 <b>${z.coachDemandPermille}</b></span><span>高端 <b>${z.premiumDemandPermille}</b></span><span>旅游 <b>${z.tourismDemandPermille}</b></span><span>新能源 <b>${z.newEnergyDemandPermille}</b></span><span>价格敏感 <b>${z.priceSensitivityPermille}</b></span></div></div>`).join("");
</script>
</body></html>`;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
