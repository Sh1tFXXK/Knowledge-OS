# SPRING-IOC-REFACTOR · UI 无头实测

- 时间：2026-09-22（本机）
- 方法：`npm run build` → `vite preview --port 4192`（`KNOWLEDGE_OS_DATA_DIR=.tmp-ioc-ui`，只读）→ 无头 Chromium（CDP 9338）
- 结论：**PASS**（8/8）
- 探针：`scripts/shell-fusion/probe-spring-ioc-refactor.mjs` —— **一次性产物，用后即删**（按 AGENTS.md；断言与结论留在本文件）

## 被测数据的可靠性

`.tmp-ioc-ui/` 是**落盘后真源五文件（tree / edges / pool / events / questions）的逐字节副本**（全部 `Buffer.compare === 0`）。
⇒ 本次实测打在**本批真正写进 `data/` 的那份数据**上，不是另造样本，也不是批前快照。

## 断言

| 项 | 断言 | 结果 | 读数 |
|---|---|---|---|
| T0 | 宇宙树挂载节点数 = 3222 | PASS | 实测 3222 |
| T1 | IoC容器默认正文 = 蒸馏导览（含「控制反转」，不含八股标记「单例bean是线程安全的吗」「自动装配有哪些局限性」） | PASS | len=523 · 控制反转=true · 八股标记=false |
| T2 | ApplicationContext 点成员「与 BeanFactory 的对比补充」→ 正文含 手动注册/自动注册 | PASS | member=true · len=214 |
| T3 | 自动装配默认正文 = 新补 rootContent（含 byName + autodetect） | PASS | len=510 · byName=true · autodetect=true |
| T4 | 生命周期：宿主方框 `is-matrix-host` + 含子方框 Bean 生命周期 + 点宿主标题 → 正文含「五个阶段」 | PASS | ownerHost=true · children=`knowledge:asplit_bean_lifecycle` · len=224 |
| T5 | 本质默认正文含「作用」「优点」 | PASS | len=263 |
| T6 | 依赖注入方式：宿主方框 `is-matrix-host` + 恰 3 个子方框（`k_1788687205854_*`）+ 点宿主标题 → 正文含「多种依赖注入」 | PASS | ownerHost=true · children=3 · len=43 |
| T7 | 刷新后复测：T1/T2 结论不变 | PASS | mounted=3222 · T1复测=true · T2复测=true |

## T4/T6 的判据修正（取数方式改变，期望值未放宽）

初版探针对 T4/T6 的判据是「点成员按钮（.explanation-index-class-member-main）→ 读 tab 正文」，实测两节点 **member=0**（成员按钮不存在），而 T2 的同路径断言通过 —— 失败是节点特异性的。根因调查（保留在案）：

1. **树投影决定宿主形态**：`TemporalIndexWorkspace.tsx:241-254` 用 `buildTreeProjectionContainmentEdges` 把**树节点的子节点**投影成 containment 边；只要树节点带子节点，宿主在图里就渲染为 **matrix host**（`is-matrix-host is-container-header`）。
2. **matrix host 按架构不列成员**：`UnifiedIndexGraph.tsx:1627` 的成员列表渲染被 `!graphNode.containerHost` 硬性门控 —— 容器头的 tab 成员**不渲染**，这是既有的设计行为，**非本批引入**（本批只动 6 个池实体的正文，tree/edges 两文件与快照逐字节一致，宿主化结构批前批后完全相同）。
3. 因此 T4/T6 改为断言**真实 affordance**：宿主结构（is-matrix-host + 子方框齐全）+ 点宿主标题按钮（`explanation-index-class-header-main`，`UnifiedIndexGraph.tsx:1492-1496`）→ 卡片渲染 rootContent。
4. **tab 正文（stages 编号清单 / overview「自 Spring 4 起已废弃」）在 UI 上对容器头宿主不可达**，这两处内容正确性由 verify V3f/V3g 在**数据层**断言（18/18 已含）；成员→卡片渲染路径本身由 T2 覆盖。这是产品层既有限制的登记，不是把期望值改松。

## 统计

- 挂载节点：DOM 中 `[data-tree-node-id]` = **3222**（与 `/api/data` 面一致）
- 折叠只靠 CSS，挂载数恒定 ⇒ 等待条件「等 `=== 3222`」
- 全过程无未捕获异常导致的断言失败
