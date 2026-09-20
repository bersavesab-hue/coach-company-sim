# Stage 16：Android Presentation Foundation

状态：**Implemented — APK foundation**

## 目标

Stage 15 完成后开始建立真正的移动端出口，但不在 Android 层复制游戏规则。

第一步只建立：

- Android 应用壳
- 本地 WebView Presentation
- 正式 Content 构建桥
- GitHub Actions APK 构建
- 手机端车辆内容验收界面

## 数据规则

APK 构建前运行 `validateStage15VehicleContent()`。

页面中的：

- 10 品牌
- 32 车系
- 100 基础车型
- 180 Variant 数量
- 48 Option 数量
- 24 Dealer
- 6 市场区域

全部来自仓库正式 Content。

禁止在 Android Java 或 HTML 中再手写第二份车辆目录。

## 当前界面

当前 debug APK 可查看：

- 当前 GAME_VERSION / CONTENT_VERSION
- Stage 15 内容总量
- 品牌列表
- 100 个基础车型与搜索
- 车型座位、极速、能源、保养、Tier 与解锁门槛
- 24 个正式车商及供给权重
- 6 个地区市场需求参数

这是正式 Presentation 基础，不伪装尚未接入的经营操作。

## APK 构建

APK 工作流：

`Android APK`

职责：

1. npm install
2. 由正式 Content 生成 Android assets
3. 安装 Android SDK / Gradle
4. assembleDebug
5. 上传 APK artifact

APK 工作流**不运行 `npm run check`**。

核心 TypeScript / Domain / Simulation 的检查继续由独立 `Core Check` 负责。

对于只修改：

- android-app/**
- scripts/build-apk-web.mts
- presentation/apk/**

的提交，Core Check 不重复运行。

## 下一步

后续 Stage 16 继续接入：

- 正式游戏启动/存档 adapter
- Company / Finance 首页
- 线路与班次管理
- 调度中心
- 车辆市场真实 Listing 与购买 Command
- 大地图与车辆位置 Query

这些功能必须接正式 Command / Query，不在 WebView 页面内生成第二套业务状态。
