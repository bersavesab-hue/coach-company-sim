# Stage 14：二手车完整流通市场

状态：Implemented

## 闭环
公司自有车辆 → 估价 → 直接卖给车商 / 市场挂牌 / 拍卖 → 检测 / 议价 / 竞价 → 成交 → 同一 VehicleId 过户 → 买方继续运营。

## 估价因素
车龄、里程、动力/制动/轮胎/车身状态、事故历史、地区需求、车商类型。

## 披露与检测
VehicleListing 保存卖方披露；UsedVehicleSnapshot 保存真实车辆事实。
买方检测报告独立保存，普通 listing DTO 不泄漏未检测出的隐藏事故和真实缺陷。

## 挂牌锁定
挂牌后的实体车状态为 listed_for_sale。
该状态禁止 Trip 分配、FleetTask、自动日排班和普通运营；撤牌后才恢复 available。

## 过户
公司自有挂牌车成交时保持原 VehicleId，只改变所有权和相关资产账。
里程、车况、保养、保险、年检、事故历史不重置。

## 拍卖
支持 scheduled/open、reserve price、minimum increment、highest bidder、won/no_sale 和 seller fee。

## 自动市场刷新
Simulation 时间推进同步处理预约释放、过期挂牌、车商库存重估和拍卖状态更新。
