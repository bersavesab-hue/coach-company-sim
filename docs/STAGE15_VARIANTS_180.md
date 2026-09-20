# Stage 15：180 个厂家版本总览

状态：Implemented

## 数量结构
- VehicleModel：100
- VehicleVariant：180
- 单版本车型：40
- 双版本车型：40
- 三版本车型：20
- 每个基础车型至少 1 个 Variant，最多 3 个。

## Variant 承担的内容
- 年款
- 厂家版本名称
- 基础价格
- 标准座位布局
- 标准能源容量
- 标准行李舱
- 标准舒适度
- 允许选装代码
- 上市时间
- 停产时间
- 经销商清库存结束时间

VehicleModel 继续只承担技术底座，不因为豪华版、长途版或年款变化而复制。

## 厂家版本逻辑
标准版始终存在。

根据车型用途，第二/第三版本可能为：
- 舒适版 / 高配版
- 长途版 / 豪华长途版
- 豪华版 / 旗舰版
- 旅游版 / 尊享旅游版
- 商务版 / 尊享商务版
- 高运力版 / 旗舰高运力版
- 长续航版 / 旗舰长续航版（纯电）

## 生命周期
每个 Variant 有独立：
- launchGameDay
- productionEndGameDay
- dealerClearanceEndGameDay

旧年款停产后不会删除，后续仍可进入二手市场。

## 选装接口
48 个 VehicleOptionCode 已先冻结，Variant 已经引用稳定 code。

下一步只创建 48 个 VehicleOptionDefinition，补：
- 名称
- 价格变化
- 座位变化
- 能源容量变化
- 行李舱变化
- 舒适度变化
- 互斥组

不再修改 Variant 的选装代码命名。
