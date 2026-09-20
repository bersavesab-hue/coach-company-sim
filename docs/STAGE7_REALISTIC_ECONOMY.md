# Stage 7：真实经济系统

状态：Implemented

## 原则

Stage 7 把“经营经济学”和“财务会计”分开。

会计 Ledger 只记录已经发生或已经形成义务的收入、费用、资产、负债和权益。

预计未来维修、经济性折旧等管理成本进入 Management Cost，不伪装成已经付款的会计费用。

## 会计账

正式采用平衡复式记账：

- 每一笔 LedgerEntry 至少两条 Posting
- Debit 总额必须等于 Credit 总额
- 所有金额使用整数分
- Company 不再保存第二套 cash 字段
- 现金、应付、税费、工资、收入、费用全部从 Ledger 推导

主要账户：

- cash
- accounts_receivable
- accounts_payable
- payroll_payable
- tax_payable
- equity_capital
- passenger_revenue
- energy_expense
- road_toll_expense
- station_fee_expense
- driver_wage_expense
- employer_burden_expense
- insurance_expense
- vehicle_tax_expense
- station_lease_expense
- company_overhead_expense
- depreciation_expense
- accumulated_depreciation

## 票价

FarePolicy 支持：

- 起步价
- 每公里价格
- 最低票价
- 最高票价
- 票价取整规则
- 指定 OD 的精确票价覆盖

票价距离使用正式 RoadSegment.lengthM，不使用屏幕像素距离。

## 票务收入和税

乘客上车时形成售票收入。

EconomicPolicy 决定实际税费，不在核心写死某个地区/年代税率。

典型账务：

```text
Debit  cash
Credit passenger_revenue
Credit tax_payable
```

## 车辆能源

VehicleEconomicProfile 区分：

- diesel_ml
- gasoline_ml
- electric_wh
- hydrogen_gram

同时保存：

- 行驶每100km能耗
- 怠速每小时能耗

运行成本同时考虑实际行驶距离和封路/等待产生的怠速时间。

能源价格由 EconomicPolicy 按游戏时间提供。

所有小数通过 FinanceRuntimeState 余数累计，避免 1秒更新和300秒批量更新产生不同成本。

## 路桥费

TripMovement 输出实际 roadUsage。

EconomicPolicy 按 RoadClass 提供 milli-cent/km 费率。

所以只有真正驶过收费道路的距离才产生收费。

## 司机人工

DriverCompensationProfile：

- 日基础工资
- 实际出勤/运行小时补贴
- 雇主负担 permille

基础工资按完整游戏日计提。

运行补贴按 Trip 实际运行秒数计提，封路等待期间仍属于司机在岗时间。

工资和雇主负担先进入 payroll_payable，不等于即时现金支出。

## 车辆固定成本

VehicleAssetProfile：

- 购置成本
- 预计残值
- 使用寿命天数
- 日保险
- 日车辆税费/检验类摊销

会计折旧采用直线法，并用累计公式计算每日增量，避免整数舍入漂移。

## 站务与公司固定成本

支持：

- 发车/站台费
- 到站费
- 按上客人数的站务服务费
- 站场日租赁费
- 公司日管理费用
- 政策/许可类日费用

## 维修和经济性折旧

Trip 每次行驶还计算：

- maintenance_wear
- economic_depreciation

它们进入 ManagementCostEntry。

这用于判断“这趟车到底值不值得跑”，但不会错误地改变法定会计利润或现金。

实际维修发生时，再由后续维修系统形成正式维修会计凭证。

## 负债结算和现金流

费用发生时不强制假设现金立刻消失。

- 运营供应商费用 -> accounts_payable
- 工资 -> payroll_payable
- 税费 -> tax_payable

FinanceCoordinator 在推进经济时间时按现有现金依次结算：

1. tax_payable
2. payroll_payable
3. accounts_payable

现金不足时只支付能够支付的部分，未支付余额继续保留。

## 报表

新增：

- finance.companySnapshot
- finance.tripEconomics

Company Snapshot 提供：

- 现金
- 应付款
- 工资应付
- 税费应付
- 客运收入
- 总费用
- 会计利润
- 资本投入

Trip Economics 提供：

- 毛票款
- 净客运收入
- 税费
- 会计变动成本
- 维修经济成本
- 经济性折旧
- 单班贡献利润

## 不硬编码现实费率

Stage 7 固定的是会计逻辑和经济计算方法。

以下数据全部由内容/平衡层提供：

- 油价/电价/氢价
- 道路收费标准
- 税费
- 站务费
- 工资
- 雇主负担
- 保险
- 车辆税费
- 租赁
- 管理费
- 票价

因此以后可以安全做不同地区、不同年份、价格波动和政策变化，而无需改经济引擎。
