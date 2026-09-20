# Changelog

## 0.1.1-architecture

### Added
- 冻结五层架构与 Contracts 边界。
- 新增完整领域模型规划。
- 新增 Command / Event / Query 规范。
- 新增静态内容数据契约。
- 新增存档结构与迁移规范。
- 新增版本替换与旧代码删除纪律。

### Changed
- 正式规划将运行模型从“Vehicle 直接绑定 Route”调整为“Route -> ServicePlan -> TripInstance -> Vehicle”。
- 下一代码阶段将直接替换 V0.1 临时直绑模型，不保留两套接口。

## 0.1.0-core

- 新仓库从 0 初始化。
- 建立统一整数单位规范。
- 建立世界地图节点与道路模型。
- 建立客运线路模型。
- 建立车辆及实时世界位置模型。
- 建立公司状态。
- 建立游戏时钟与领域事件总线。
- 建立车辆沿道路运行的模拟系统。
- 建立基础动态客流系统。
- 建立唯一应用命令入口。
- 建立 saveVersion 存档协议。
- 建立核心测试与 GitHub Actions 检查。
