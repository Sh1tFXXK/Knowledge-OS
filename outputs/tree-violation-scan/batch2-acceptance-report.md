# final-87 第二批（R 3 + D2 30 + C 37）落盘验收报告

> 备份基线：`data/backups/final-87-batch2-2026-09-13T17-21-57-678Z/`
> 变更日志：同目录 `journal.txt`，**161 条**
> 复核口径：树 3257 → **3215** 条 · 池 3849 条（不变） · 机制 spec 14 → **15** 个
> 结论：**五类定罪 87 → 0**（batch1 消化 20，本批消化 67）

---

## 一、本批做了什么

「final-87」是 `scripts/scan-remaining-convictions.mjs` 按宪法 §2.5 拍出的全量定罪名单：

| 类 | 本条数 | 释义 | 本批处理 |
|---|---:|---|---|
| E | 7 | 直接提问型 | batch1 已归零 |
| D | 43 | 动作 / 任务 / 状态型 | batch1 做 D1（13，机制状态）<br>**本批做 D2（30，工程片段）** |
| C | 37 | 教程 / 专栏标题型 | **本批全部处理** |
| B | 0 | 对比与区别型 | — |
| A | 0 | 「A 与 B」强行捆绑型 | 早已物理拆分归零 |

### 1.1 D2 · 30 条工程片段（载体分流，不是一刀切）

| 簇 | 条数 | 载体 | 处置 |
|---|---:|---|---|
| `bean_lc_*` Bean 生命周期五阶段 | 5 | **新建 mechanismSpec** | 状态节点卸树留池；宿主标 `kind/role=mechanism`；建 4 条 `beanlc:t_*` 转移边；5 段正文镜像为宿主树条目的 supplement 页签 |
| `surge_*` 流量激增应对方法六步 | 6 | supplement 并入宿主 | 正文并入 `tree_surge_overview`，壳卸树 + 退休 |
| `hps_*` QPS 提升 10 倍六板斧 | 6 | supplement 并入宿主 | 正文并入 `tree_hps_overview`，壳卸树 + 退休 |
| `sqopt_idea_*` 慢查询优化十条 | 10 | supplement 并入宿主 | 正文并入 `tree_sqopt_ideas`，壳卸树 + 退休 |
| `k_1786092342085_3zwh4c` 合理地配置线程池 | 1 | 经验并入正身 | 940 字并入「线程池的使用」，退休 |
| `k_1786096587014_vzab8u` 线上问题定位 | 1 | 经验并入正身 | 3388 字并入「Java并发编程实践」，退休 |
| `..._s20_s21` 创建数据仓库 | 1 | **子树提级后退休** | 11 子节点提级到「数据仓库」（新建 11 条 treebind）；正文仅 7 字标题，**不占 supplement** |

「卸树 ≠ 删节点」全程成立：5 个 Bean 阶段节点退出树但留在池中，供机制视图渲染。

### 1.2 C · 37 条教程 / 章节壳

| 子类 | 条数 | 处置 |
|---|---:|---|
| 同名冲突的重复挂载壳 | 2 | `asplit_s106_db_design` 与章节壳同名且共用池节点 → 摘除重复挂载；`tree_wiki_en_database_s20`（1626 字）→ 正文并入「数据库安全」章节后退休 |
| 详解 / 总览壳正文融合 | 10 | ArrayList / HashMap / HashSet / LinkedList / 线程池 / FutureTask / ScheduledThreadPoolExecutor / ThreadPoolExecutor / Kafka / Spring Cloud —— 正文（合计 **136956 字**）挂到正身树条目的 supplement，壳退休 |
| 详解 / 总览壳纯改名 | 6 | 去「详解 / 总览 / 入门」后缀归本体（Java 集合框架、CachedThreadPool、FixedThreadPool、SingleThreadExecutor、Java 多线程编程、MyBatis） |
| 章节壳去序号 | 15 | 「一、数据库系统」→「数据库系统」等 15 处 |
| 基础壳实名 | 2 | 「Java 数据结构基础」→「Java 数据结构」；「JVM 基础」→「JVM 核心概念」 |
| 大壳实名 | 4 | 「基础」→「Java 语法要素」；「软件开发（实践总览）」→「软件开发」；「进阶思路：监控驱动动态扩容」→「监控驱动动态扩容」；「跨系统标准与约定（总览）」→「跨系统标准与约定」 |

### 1.3 R · 3 条残留收尾

| # | 内容 | 处置 |
|---|---|---|
| R1 | 扫描器 `/调用方/` 正则过宽，把已改名的裸名 `getBean 请求调用方` 误判为 D 类 | 收窄为 `/调用方[（(]/`，只命中带括号的壳形态 |
| R2 | batch1 提级时把 2 个判定方法上移了一层 | 重挂回「垃圾回收判定」（新建 2 条 treebind） |
| R3 | 3 个旧壳名 tag 残留 | 删 `如何发现瓶颈` / `执行阶段` / `调用方(getBean 请求)`（新名 tag 已在 batch1 补入，未误删） |

---

## 二、验收判据（`scripts/shell-fusion/verify-batch2.mjs`）

```
★ 全部通过（0 项未通过）
```

| 组 | 判据 | 结果 |
|---|---|---|
| 1 | 5 个数据文件：无 BOM / 2 空格缩进 / 末尾无换行 | ✓ |
| 2 | 树 nodeRef 悬空 = 0；树 id 唯一；3215 条 | ✓ |
| 2 | 新增重名种类 ⊆ 已登记容忍清单；容忍/沿用清单均无过期条目 | ✓ |
| 2 | 27 个本批新名未产生计划外撞名 | ✓ |
| 3 | 边端点悬空本批未新增（27 → 27，Δ0）；边 type 全非空 | ✓ |
| 3 | treebind 净减 2722 → 2664（Δ-58） | ✓ |
| 3 | 42 个已卸条目的 treebind 边全部清零（按 `:` 分段**精确**匹配） | ✓ |
| 4 | spec 数量 = 15；全字段引用可解析 | ✓ |
| 4 | 5 个 Bean 阶段留在池中、`kind=state`、标签已去序号 | ✓ |
| 4 | 4 条内部边 `beanlc:t_1..t_4` 存在且 `type=transitions-to / relationKind=state-transition` | ✓ |
| 4 | 宿主 `asplit_bean_lifecycle` 标为 mechanism；`stateNodeIds` 恰为 5 阶段 | ✓ |
| 4 | 宿主树条目 supplement 含 5 个阶段页签 | ✓ |
| 5 | 题库 / 演进事件引用悬空 = 0 | ✓ |
| 5 | 4 张题 relatedNodeId 已从「线程池详解」壳重指 ThreadPoolExecutor 正身 | ✓ |
| 5 | 边不再挂在退休壳上（重指或去重删除） | ✓ |
| 6 | **门一**：36 个退休壳的六处活引用零命中 | ✓ |
| 6 | 36 个壳全部标 `archived-redirect + redirectTo + canonicalNodeId` | ✓ |
| 6 | 42 个已卸树 ref 全部仍在池中 | ✓ |
| 7 | 10 个详解壳正文已挂到正身 supplement（10/10，136956 字） | ✓ |
| 7 | 融合 tab 正文非空、未在多处重复挂载 | ✓ |
| 8 | R2 判定方法已在「垃圾回收判定」名下且不再直挂「垃圾回收」 | ✓ |
| 8 | R3 旧 tag 已清、新名 tag 仍存 | ✓ |
| 9 | 5 组提级：壳已不是孩子 + 原孙子按**原壳 id 前缀**就位 + 11 条 treebind | ✓ |
| 10 | 池节点数未减少（3849 → 3849）；树中已无提问型 / 详解总览基础壳名 | ✓ |

### 2.1 定罪归零

```
全树条目: 3215
定罪条目: 0（唯一节点 0）→ 全卸后剩 3215
  E: 0 | B: 0 | D: 0 | C: 0 | A: 0
```

### 2.2 工程门

| 命令 | 结果 |
|---|---|
| `npm test` | **44 / 44 pass**（新增 5 项机制投影回归测试） |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | `✓ built in 5.19s` |

### 2.3 浏览器实测（`scripts/shell-fusion/spot-check-batch2.mjs`，无头 Chromium + CDP 直连）

```
spot check 全部通过 ✅
```

覆盖：10 个详解壳融合页签可见 / 7 个壳名已从树消失 / 4 组章节壳去序号（新名可开、旧序号名消失）/
12 组大壳与基础壳实名 / 3 个 D2 宿主的 15 个子页签 / D2-c 经验页签 / D2-d 提级 /
**4 个机制在机制视图的完整投影** / 全流程无数据加载失败横幅。含 3 条正向对照自证搜索管道。

---

## 三、★ 本批暴露并修复的源码缺陷（机制投影按树作用域取候选）

### 3.1 症状

Bean 宿主的 5 个阶段页签在右栏正常渲染，切到顶栏「机制」视图却显示：

> **当前知识不构成机制** —— 只有明确标记为机制，并包含因果或状态转移规律的知识子图才会在这里呈现。

DOM 类名为 `mechanism-lens mechanism-lens--empty`。

### 3.2 根因

`src/mechanism/knowledgeProjection.ts` 的 `collectMechanismCandidateNodeIds()` **只按「树后代」取候选**：

```ts
const orderedIds = collectTreeDescendantNodeIds(mechanismNodeId, ...)  // 树作用域
const scopedIds  = new Set(includedIds)
for (const edge of knowledgeEdges) {
  if (!scopedIds.has(edge.source) && !scopedIds.has(edge.target)) continue  // 两端都必须在树作用域内
  ...
}
```

而宪法 §2.5 要求机制状态节点**卸树留池**（树只长名词）。实测三组宿主的树后代里机制状态命中数：

| 宿主 | 树后代 | 状态在树后代中 | 结果 |
|---|---:|---:|---|
| `tpl_flow`（线程池状态机，状态**本就在树里**） | 7 | — | 正常投影 2545 字 |
| `asplit_bean_lifecycle`（本批 D2-a） | 1 | **0 / 5** | `return null` |
| `aop_flow`（**batch1 D1**） | 6 | **0 / 5** | `return null` |
| `tio_flow`（**batch1 D1**） | 2 | **0 / 6** | `return null` |

即：**「卸树留池」这一处置与投影的树作用域假设直接冲突**；batch1 的 D1 已经埋下同一回归，
只是当时的浏览器判据用了 `['机制视图','执行流程','状态']` 关键词匹配 —— 而 AOP 宿主**名字里就含「执行流程」**，
属于**假通过**。本批用「切视图 + 断言具体状态/转移标签」把它照出来了。

### 3.3 方案

`mechanismSpec` 本身就是参与方集合的**显式声明**，应与树作用域**并列**作为候选来源：

```ts
// src/mechanism/knowledgeProjection.ts
const declaredIds = collectDeclaredMechanismNodeIds(nodePool[mechanismNodeId]?.mechanismSpec);
for (const nodeId of declaredIds) {
  if (!nodePool[nodeId] || includedIds.has(nodeId)) continue;
  includedIds.add(nodeId); orderedIds.push(nodeId);
}
const scopedIds = new Set(includedIds);   // ← 声明节点进入作用域，内部转移边不再被剪掉
```

同因修复 `resolveOwningMechanismNodeId()`：选中**已卸树的状态节点**时，无法靠树路径回溯宿主，
改为先认 spec 声明（宿主关系由声明确定，不依赖树）。

同时按仓库既有约定（`src/knowledge/typeRelations.ts` 注释已写明「node --test 直接加载要求显式扩展名」）
把 `knowledgeProjection.ts` / `validation.ts` 的**运行时**导入补上 `.ts` 后缀，使该模块可被 `node --test` 加载。
类型专用导入（`import type`）不需改动。

### 3.4 验证

新增 `scripts/mechanism-projection.test.mjs`（5 项）：

| 测试 | 断言 |
|---|---|
| 机制状态卸树留池后投影仍成立 | 非 null、2 步流程、3 个卸树状态全在实体集 |
| 状态留在树里时行为不变 | 非 null、2 步流程 |
| 选中卸树状态可回溯宿主 | `mechanismNodeId === 'mech'` |
| 未标 mechanism 的节点不投影 | `null` |
| spec 缺失时不投影 | `null`（同时验证 `undefined` 安全） |

浏览器端 4 个机制实测：

| 机制 | 面板文本 | 状态 / 转移标签 |
|---|---:|---|
| Bean 生命周期（本批新建） | 2752 字 | 5 状态 + 2 转移 全命中 |
| AOP 执行流程（batch1 D1，回归修复） | 3030 字 | 5 状态 + 2 转移 全命中 |
| 传统 IO 执行流程（batch1 D1，回归修复） | 1717 字 | 3 状态 + 2 转移 全命中 |
| 线程池状态机（既有 spec 对照） | 2545 字 | 未回归 |

---

## 四、已知残留与登记豁免（显式登记，非静默压制）

### 4.1 新增重名种类 +1：`存储系统`

章节壳 `chapter_db_10` 由「十、存储系统」去序号为「存储系统」后，与「系统组织」分支下的
`theory_domain_storage_systems` 撞名。

| 项 | chapter_db_10 | theory_domain_storage_systems |
|---|---|---|
| 父条目 | 数据库 | 系统组织 |
| 孩子 | 数据压缩 / 缓冲池 / 变更缓冲 / 表空间 / 段 / 区段 / 页 / …（11） | 干净页 / 实例 / 行格式 / 虚拟列 / 合并（5） |
| 分支 | 数据库章节容器 | 理论 taxonomy（tag 含 `directory-taxonomy`） |

- 属**跨分支、孩子互斥**的既有语义重叠被「去序号」暴露，非本批新增实体。
- 宇宙树**从不要求全局名字唯一**（基线即有 165 种重名，如 `方法`×6、`Node`×11），本批使种类 165 → 166。
- `scripts/shell-fusion/verify-batch2.mjs` 中以 `TOLERATED_NEW_DUP` **显式登记**，且带「容忍清单无过期条目」反向断言 —— 未来批次若引入新重名会直接失败，不会长期漂白。
- **是否合并归 taxonomy 批次裁决**，本批只登记不处理（避免在本批内发明结构）。

### 4.2 沿用重名（非本批引入）：`数据库设计` / `数据库安全`

去序号后各撞 1 处，但两名字在**基线的重名种类里本就存在**（出现次数 2 → 2，属换位非新增），
单独登记在 `TOLERATED_CARRYOVER_DUP`，并断言「名字须在基线就已重名」防漂白。

### 4.3 同名双挂载导致正文只在一处可见

池节点 `k_java_type_ff6db88dc6746818`（ThreadPoolExecutor）在树中挂两处
（`java.util.concurrent` 与「线程池」），**基线即如此**（非本批引入）。本批把 42801 字的
「ThreadPoolExecutor详解」正文挂在「线程池」那处 —— 与既有页签
`context:java-concurrency:thread-pool-executor:overview` 的落点一致（supplement 是**树条目级**的既有约定）。
从另一处挂载点打开时看不到该页签，属既有约定的延续，非本批回归。

### 4.4 未纳入本批的其它会话改动

工作区另有「本体解绑 / 索引图」方向的改动（`src/core/*`、`src/store/useGraph.ts`、`src/knowledge/treeUtils.ts`、
`src/styles/*`、`scripts/index-graph-layout.test.mjs`、`scripts/tree-utils.test.mjs`、`README/STATE/CONTEXT/docs`），
**未纳入本批提交**，留给其所属会话。

---

## 五、复核命令

```sh
node scripts/scan-tree-violations.mjs                       # 期望：定罪 0（五类全 0）
node scripts/shell-fusion/verify-batch2.mjs                  # 期望：★ 全部通过（0 项未通过）
node --experimental-transform-types --test scripts/mechanism-projection.test.mjs
npm test                                                     # 期望：44/44
npx tsc --noEmit                                             # 期望：exit 0
npm run build                                                # 期望：✓ built
npx vite preview --port 4193 --strictPort &                  # 只读预览（勿用 dev：dev 会用内存态回写 data/）
node scripts/shell-fusion/spot-check-batch2.mjs              # 期望：spot check 全部通过 ✅
```

回滚：`cp data/backups/final-87-batch2-2026-09-13T17-21-57-678Z/*.json data/`
