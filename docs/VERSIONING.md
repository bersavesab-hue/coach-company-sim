# 版本与代码替换纪律

状态：**Mandatory v1**

## 1. 核心原则

版本升级不是“往旧代码上盖一层”。

正确流程：

```text
确定替代范围
-> 找出旧入口和全部引用
-> 删除废弃实现
-> 修改依赖
-> 加入新实现
-> 更新测试
-> 更新文档
-> 更新 CHANGELOG
-> CI 全通过
```

删除和替代最好在同一个原子提交中完成。

---

## 2. 禁止文件名

正式源码禁止出现长期并行版本：

```text
RouteSystemV2.ts
RouteSystemNew.ts
RouteSystemFinal.ts
OldVehicleManager.ts
LegacyMap.ts
backup/
old/
legacy/
```

迁移代码只有 save migration 可以按版本永久保留。

---

## 3. 一个公共能力一个入口

例如路线创建只能存在一个正式 Handler。

不能同时：
- createRoute()
- createRouteNew()
- createRouteV2()

调用者全部迁移完成后，旧入口立即删除。

---

## 4. Deprecated 使用范围

正式发布后的公共存档/插件协议可以经历短期 Deprecated。

内部未发布开发代码不需要保留兼容壳：
- 改结构
- 全部引用一起修改
- 删除旧实现

避免为了“兼容自己”积累垃圾。

---

## 5. 版本编号

Game 使用 SemVer：

```text
0.1.0
0.2.0
...
1.0.0
```

- 0.x：开发阶段
- 1.0：首个正式稳定版本

saveVersion 使用整数：
```text
1, 2, 3...
```

contentVersion 使用独立整数或内容包版本。

---

## 6. CHANGELOG

每次正式变更必须写：
- Added
- Changed
- Removed
- Migration（如有）
- Breaking（开发阶段如有）

特别是删除旧接口必须明确记录。

---

## 7. CI 应逐步加入的守卫

当前和后续必须逐步建立：

1. typecheck
2. unit tests
3. content validation
4. import-boundary check
5. duplicate public API check
6. forbidden-path check
7. save migration tests

未来 CI 应直接阻止：
- legacy/
- old/
- backup/
- *V2.ts
- *New.ts

进入正式源码。

---

## 8. 架构变更流程

如果未来发现本架构不够用：

先提交 Architecture Decision Record（ADR）：

```text
docs/adr/
  0001-xxx.md
```

ADR 必须说明：
- 为什么旧设计不够
- 新设计是什么
- 哪些模块受影响
- 如何删除旧实现
- 存档如何迁移

不允许直接在功能提交里偷偷改变核心边界。
