# STATE.md — 沉积层剖面（2026-09-09）

> 事实 + 判断。不写愿景。考古脚本：`scripts/data-archaeology.mjs`、`scripts/data-archaeology-timeline.mjs`；摘要：`outputs/archaeology-*.json`。未读 `useGraph.ts`，未改 data。

---

## 1. 数据里现在有什么

**规模**：节点 **3839** · 边 **4066** · tree `nodeRef` **3192**

**ID 身份（先做的那条）**

| 模式 | 约数 | 含义 |
|---|---:|---|
| `k_<13位时间戳>_<rand>` | 978 | `genId('k')`（`src/knowledge/defaults.ts`）— **每次新建新 id** |
| `k_*` 其他（含 `k_dict_`531、`k_auto_`…） | ~800 | 多轮命名实验残留 |
| topic / `mysql_` / `concept_` / `theory_` slug | ~800 | 偏人工/专题命名 |
| `k_java_type_<sha16>` | 409 | JDK/源码导入，稳定摘要 |
| `k_wiki_{zh\|en}_*` | 380 | 路径派生；section 带 `_sN` |
| `k_vault_*` | 193 | vault/笔记路径派生 |
| `k_acm2012_*` | 144 | ACM CCS 分类 |
| `k_web_<hash>` | 15 | 网页导入 |
| `n_<8rand>` | 9 | 最早短 hash |
| `demo_*` | 34 | seed |

**重导结论**：同一概念会留下**多批 id，旧的还在**。例：「页 / page」→ `k_1781002610469_*`（glossary）+ `k_1787209372193_*` + `concept_page`；「数据结构」→ `n_*` + `theory_*` + wiki section + 两个 timestamp + `k_vault_*`。Java FQCN 几乎唯一（仅 String 双 id）。**稳定 id 只存在于 java/wiki/web/vault 等派生方案；UI 路径不幂等。**

**方法簇（按 id/tag 指纹，名字是判断）**

| 簇 | 节点 | 画像 |
|---:|---:|---|
| C12 UI-timestamp | 923 | 最大层；2026-06-09→09-06 的 `Date.now()`；正文参差、dims 极少 |
| C13 k_other（主仓 `k_dict_`） | 621 | **451 不在 tree**；dict 531 里仅 ~98 挂树 / ~96 有边 |
| C2 Java type/source | 412 | 有正文、几乎无 dims |
| C3 Wiki | ~380 | section 为主 |
| C14 topic_slug | 258 | 几乎都有 dims — 偏手工镜头 |
| C10 concept/theory | 241 | 多 tabs、有 dims |
| C8 mysql-glossary | 206 | glossary 标签 |
| C5 vault | 193 | 笔记导入 |
| C9 mysql_ 手工 slug | 191 | |
| C6 ACM CCS2012 | 159 | |
| 其余（demo/web/class/n_/container…） | <120 | |

交叉：全部有 tags；`definitionPages` **171 个空数组、0 个有内容**（字段死了）。正文Y≈2612 / 正文N≈1227。

**孤儿（不敢删的具体大小）**

- 不在 tree：**647**
- 不连边：**898**
- 两端节点都不存在的边：**4**（一端缺失 13）
- 既不在 tree 又无边：**628** ← 主体积在 `k_dict_` / C13

**边 × dims**：无 dimensions **75.0%**（1018 有 / 1310 缺字段 / 1738 空数组）。无标签边集中在：

1. C2×C2 Java **893**（`extends`/`implements`/`instance-of`/`belongs-to`）
2. C12×C12 timestamp **647**
3. 其次 wiki、acm、topic 自环  

→ **不是渲染 bug，是那几轮方法没写标签**（尤其 Java 关系边 + UI 建的 belongs-to）。

**折线（每月 checkout 点数）**

```
06-07  54n / 53e     ← 种子
06-17  104 / 68
06-29  1159 / 363    ← 第一次暴涨（UI-timestamp + 早期内容）
07-02  1250 / 454
07-21  1879 / 1066
07-28  2386 / 1123
08-05  2891 / 2092   ← JUC/java 层级写入
08-10  3170 / 2441
08-16  ~3040 / 3380  ← glossary 分类进 fores；节点略回调
08-17  ~3050 / 3370  ← MySQL taxonomy 合并/重平衡
08-25  3219 / 4366
08-31  3634 / 4425
09-01  3636 / 4430
09-06  3830 / 4040   ← 节点↑ 边↓（整理删边）
今    3839 / 4066
```

---

## 2. 哪些是手工的、不可覆盖的

**分得清的**

- 近确定手工/专题：`concept_*` / `theory_*` / 多数 `mysql_*` slug / `react_*` 等 topic_slug / `demo_*`（C10、C14、C9、C0）— 有 dims、命名可读。
- 近确定机器导入且可再生成：`k_java_type_*`、`k_wiki_*`、`k_web_*`、`k_acm2012_*`、`k_vault_*`（有路径/摘要，可对照源）。

**分不出来**

- **C12 `k_<timestamp>_`（923）** 与 **C13/`k_dict_`（531）**：可能是 UI 手打、粘贴导入、旧 glossary 批跑、或半自动脚本；**没有 origin 字段，无法只靠记忆拆开**。
- 因此：「加 `origin`（或等价：`createdBy` + `sourceRef`）」是回填优先级 #1；约 70% 节点可先靠 id 前缀规则自动标，剩余 timestamp/dict 要人工或启发式。

---

## 3. 哪些方法已经不信了、它们的产物在哪

| 方法 | 还信？ | 产物在哪 | 判断 |
|---|---|---|---|
| Wikipedia CLI（`lib/import-wikipedia`） | **是** | C3 `k_wiki_*` ~380 | 池内证据足 |
| JDK collections / java-source API | **是** | C2 `k_java_type_*` 409 + `k_java_source_*` 3 | 正式入口仍在 |
| Web-link API | **是** | C4 `k_web_*` 15 | 小但干净 |
| Document + semantic 链（draft/projector/persistence/ai-organizer） | **部分→偏否** | 期望 `k_document_*`/`k_semantic_*` = **0**；笔记在 docs，池 id 断档 | 代码还接线，沉积对不上 |
| `genId('k')` UI 新建 | **否（作身份）** | C12 全部 | 能用，但不能当身份；重导必复制 |
| 不明 `k_dict_*` 批 | **否** | C13 主体；大量无树无边 | 第一批整批退役候选 |
| vault / ACM / glossary 批 | **部分** | C5/C6/C8 | 不在 `scripts/import/` 账本里；产物在，入口分散/遗忘 |
| `knowledge-governance.json` / `ontology-mapping-report.json` | **否（作运行态）** | data 里有，**src 零读写** | 漏网沉积，不是活视图 |

---

## 4. 我现在认为稳定的不变量

1. **身份不唯一**：同一现实概念允许多 id；只有 java/wiki/web/vault 等少数方案幂等。
2. **tree 是投影主索引**：活知识 ≈ 有 `nodeRef`；628 个「无树无边」节点对运行态可视为死。
3. **card.tabs 恒为数组**（可空）；`definitionPages` 目前恒空，可当废弃字段。
4. **边无 dims ≠ 坏数据**：importer/UI 的 `belongs-to`/`extends`/… 默认不写；dims 集中在手工语义边。
5. **持久化切片**只有：`node-pool` / `knowledge-edges` / `tree-data` / `questions` / `evolution-events`（后者时态索引只读）。

**视图（读写一句话）**：Universe / 时态索引 / 节点库 / 问题库 / 目录树 / 解释卡 — **会写回 data**（标红）。MechanismLens / Supertag / 系统连接图 / 子系统条 — 多半只写 UI store。Governance/ontology — **无视图**。

---

## 5. 下一个要验证的假设（一条）

**假设**：`k_dict_*` 中「不在 tree 且无边」的约 430+ 节点，是旧 glossary/字典批的尸骸，删了对任何存活视图的可达内容零影响。

验证方式：对这批做只读引用扫描（questions / evolution-events / viewDimensions 内 id）→ 零命中则整批可退役；同时给剩余节点用前缀规则回填 `origin`，专攻 C12 里「有树有正文」的子集标成 `ui-manual` vs `ui-import-unknown`。

---

*摸清标准自检：现在能对 java/wiki/web/vault/acm/demo/topic_slug 在 30 秒内点名方法；对任意 `k_dict_*` 或多数 `k_<timestamp>_` 仍要说「分不出来」——簇未分净，动刀前先验证上面那条假设，不要先写新 projector。*
