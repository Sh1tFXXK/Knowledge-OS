# 阶段一 DRY-RUN 报告（before → after，**未写盘**）

> 生成时间 2026-09-14T07:23:29.787Z
> 方式：tree/pool/edges **全量 deep-clone 到内存**，在克隆体上真跑操作，再把克隆 pool 喂给真实 `inspectNodePool`。
> ⚠️ **data/ 未写入任何字节**；本报告与 `phase1-dryrun-plan.json` 是唯一产物。

## 0. 总账

| 指标 | before | after | Δ |
|---|---|---|---|
| 树条目 | 3215 | 3219 | +4 |
| 池节点 | 3849 | 3855 | +6 |
| 边 | 4158 | 4164 | +6 |
| 悬空 nodeRef（树） | 0 | 0 | +0 |
| 悬空端点（边） | — | 27 | — |
| 体检 fatal | 无 | 无 | — |
| 空 tabs 节点 | 495 | 501 | +6 |

新增树条目：**4**（2 个 OS 中间层 + 2 个 OOP 本体）· 新增池节点：**6**（2 中间层 + 2 OOP 本体 + 2 拆分出的 Java 具象）· 新增边：**6**

## 0.5 硬校验（基线 vs 变更后；只有 **Δ>0** 才阻断 APPLY）

| # | 校验项 | 基线违规数 | 变更后违规数 | Δ | 判定 | 明细 |
|---|---|---|---|---|---|---|
| 1 | 树 treeId 全局唯一 | 0 | 0 | 0 | ✅ | 无重复 |
| 2 | 树 nodeRef 全部命中池实体 | 0 | 0 | 0 | ✅ | 0 处悬空 |
| 3 | 边端点全部命中池实体 | 27 | 27 | 0 | ⚠️ 存量（未恶化） | 27 条悬空：treebind:demo_web:react_root, treebind:react_root:react_tree_conditional, treebind:tree_acm2012_algorithms:governance:canonical:n_9hr0nvvv |
| 4 | 每个非根条目有 treebind 边（增量） | 789 | 789 | 0 | ⚠️ 存量（未恶化） | 789 个缺失，例：projection:mysql-term:k_dict_mb72ps2c, projection:mysql-term:mysql_glossary_hdd_eb2rxz, projection:mysql-term:mysql_glossary_ssd_gyazmt |
| 5 | 无子条目被多条 treebind 重复挂载（增量） | 47 | 47 | 0 | ⚠️ 存量（未恶化） | 47 个重复：tree_1785820543100_i1zgfg, demo_tree_undo, composition |
| 6 | 改动过的条目 treebind 与树父子一致 | 0 | 0 | 0 | ✅ | 抽查 9/9 条通过（其余 0 条为本批新增，基线 N/A） |
| 7 | 树无环 | 0 | 0 | 0 | ✅ | 无环 |
| 8 | OOP/Java 两侧不再共享实体 | 0 | 0 | 0 | ✅ | 已拆 2 组 |
| 9 | inspectNodePool 无 fatal | — | 0 | — | ✅ | 无 fatal |

- **本批引入的新违规：0 项** → ✅ 无
- 存量违规（未恶化）：3 项 —— 属**基线债**，由既有治理批次承担，不在本轮范围。

> ⚠️ 关于「789 个条目缺 treebind」与「27 条悬空边」：**基线即如此**，本轮 0 变化。
> 这意味着本批的 treebind 增删是**在既有稀疏结构上做加法**，不会放大存量债 —— 验收时只盯 Δ。

## 1. 共享实体拆分方案

> 判定依据（架构规则）：**treeId = 挂载位置，nodeRef = 池实体**。
> 当同一 `nodeRef` 出现在 OOP 树与语言树两侧时，说明**一个实体被当成两种东西用**：
> 一侧需要「通用本体」，另一侧需要「语言具象」。拆分 = 保一个、建一个、改挂载、记关系。

| 实体 | 挂载数（基线） | 判定 | 保留侧（含正文） | 新建侧（空，待填） | Java treebind 改指 | 新关系边 |
|---|---|---|---|---|---|---|
| `抽象类` | 3（全在 Java） | ⚠️ **HIGH — 裁决与数据冲突** | 建议改为保留原实体作**本体**（正文 232 字即 OOP 通用定义） | 需为 Java 侧 3 个挂载点新建具象实体 | 3 条 treebind 需改指 | `具象 --[implements]--> 本体` ×1 |
| `内部类` | 2（全在 Java） | ✅ 裁决成立 | 新建 OOP 本体（空） | OOP 侧 `tree_p1_oop_inner_class` | 不动（Java 侧原样） | 无（Java 实体本就是具象） |
| `最终类` | 2（OOP + Java 混用） | ✅ 可拆 | **OOP 侧**保留 `k_1784045589643_icc5oo`（正文 81 字） | Java 侧新建 `p1_java_final_class` | `treebind:tree_1784043760890_bptgal:tree_1784045589689_drgfh8` | `p1_java_final_class --[implements]--> k_1784045589643_icc5oo` |
| `匿名类` | 2（OOP + Java 混用） | ✅ 可拆 | **OOP 侧**保留 `k_1784044171635_8etz45`（正文 42 字，纯通用） | Java 侧新建 `p1_java_anonymous_class` | `treebind:tree_1784044092244_76wkqz:tree_1784044171666_9yd2is` | `p1_java_anonymous_class --[implements]--> k_1784044171635_8etz45` |

**共 4 个实体、10 个挂载点、需新建 3 个实体、改指 4 条 treebind。**

### 1.1 待裁决：`抽象类` 的两条互斥路线

| | 变体 A（= 本轮 dry-run 已模拟） | 变体 B（建议） |
|---|---|---|
| OOP 侧 | 新建**空**本体 `p1_oop_abstract_class` | **现有实体认定为本体**，新增 OOP 挂载点（或整体移入 `类的分类`） |
| Java 侧 | 3 个挂载点**完全不动**，仍指现实体 | 3 个挂载点改指**新建 Java 具象实体** |
| 正文（232 字 OOP 定义） | 留在 Java 树 → **倒置** | 留在本体侧 → **归位** |
| 边改动量 | treebind +1 | treebind +4（3 改指 + 1 新增 OOP）、implements +1 |
| 风险 | 本体节点空转、内容挂错域 | 改动面稍大，需同步 4 条边 |

> **与 `内部类` 的对比**：`内部类` 的 1900 字正文明确是 Java 专有（含「Java 类中…」词句），所以「新建空 OOP 本体」正确；
> 而 `抽象类` 的 232 字是纯通用定义，所以同样的动作会产出相反结果 —— **判据是正文语义，不是挂载点数量。**

### 1.2 相关实体的语义边分布（基线快照，供拆分后重指裁决）

| 实体 | 语义边 | 方向 | 对端 |
|---|---|---|---|
| `最终类` | 0 | — | — |
| `匿名类` | 0 | — | — |
| `抽象类` | `asplit:s1` (instance-of) | 入 | `具体类` |
| `内部类` | `asplit:s2` (属于) | 入 | `局部类` |

共 **2** 条语义边挂在这 4 个实体上。**本 dry-run 不改动它们** —— 拆分后哪些该指向本体、哪些该指向具象，必须逐条裁决（见 1.1 的变体 B）。

## 2. 边影响汇总（真实 diff：基线 vs 变更后，按边 id 对齐）

| 类别 | 数量 | 明细 |
|---|---|---|
| 删除 | 5 | `treebind:theory_domain_operating_systems:tree_io_zero_copy` (belongs-to / structure: theory_domain_operating_systems → k_io_zero_copy)<br>`treebind:theory_domain_operating_systems:asplit_s1_asplit_select_io` (belongs-to / structure: theory_domain_operating_systems → asplit_select_io)<br>`treebind:theory_domain_operating_systems:asplit_s1_asplit_epoll` (belongs-to / structure: theory_domain_operating_systems → asplit_epoll)<br>`treebind:tree_wiki_en_profiling_computer_programming_s8:final_atomic_hypervisor` (belongs-to / structure: k_wiki_en_profiling_computer_programming_s8 → atomic_hypervisor)<br>`treebind:tree_wiki_en_profiling_computer_programming_s8:final_atomic_emulator` (belongs-to / structure: k_wiki_en_profiling_computer_programming_s8 → atomic_emulator) |
| 新增 | 11 | `treebind:tree_class_programming_classification:tree_p1_oop_abstract_class` (belongs-to / structure: k_class_programming_classification → p1_oop_abstract_class)<br>`treebind:tree_class_programming_classification:tree_p1_oop_inner_class` (belongs-to / structure: k_class_programming_classification → p1_oop_inner_class)<br>`p1_e_java_final_class` (implements: p1_java_final_class → k_1784045589643_icc5oo)<br>`p1_e_java_anonymous_class` (implements: p1_java_anonymous_class → k_1784044171635_8etz45)<br>`treebind:tree_wiki_en_virtual_machine_s5:final_atomic_hypervisor` (belongs-to / structure: k_wiki_en_virtual_machine_s5 → atomic_hypervisor)<br>`treebind:tree_wiki_en_virtual_machine_s5:final_atomic_emulator` (belongs-to / structure: k_wiki_en_virtual_machine_s5 → atomic_emulator)<br>`treebind:theory_domain_operating_systems:tree_p1_io_multiplexing` (belongs-to / structure: theory_domain_operating_systems → p1_io_multiplexing)<br>`treebind:theory_domain_operating_systems:tree_p1_syscall_io` (belongs-to / structure: theory_domain_operating_systems → p1_syscall_io)<br>`treebind:tree_p1_io_multiplexing:asplit_s1_asplit_select_io` (belongs-to / structure: p1_io_multiplexing → asplit_select_io)<br>`treebind:tree_p1_io_multiplexing:asplit_s1_asplit_epoll` (belongs-to / structure: p1_io_multiplexing → asplit_epoll)<br>`treebind:tree_p1_syscall_io:tree_io_zero_copy` (belongs-to / structure: p1_syscall_io → k_io_zero_copy) |
| 修改（同 id，端点变） | 2 | `treebind:tree_1784044092244_76wkqz:tree_1784044171666_9yd2is`：target `k_1784044171635_8etz45` → `p1_java_anonymous_class`<br>`treebind:tree_1784043760890_bptgal:tree_1784045589689_drgfh8`：target `k_1784045589643_icc5oo` → `p1_java_final_class` |

**读法（关键）：**

- 删除的 5 条中，**5 条是 treebind**（另有 0 条非 treebind）。
  treebind 之所以失效，是因为**父节点换了** → 边 id 里嵌着父 treeId，父一变 id 就变。
  子节点的实体（`nodeRef`）**未变**，内容归属无损 —— 这就是「结构边」与「语义边」分离的好处。
- 新增的 11 条 = **9 条 treebind** + **2 条 `implements`**。
    - **4 条**：孩子是本批**新建**的树条目（C1-03/C1-04 新 OOP 本体 + C4-03/C4-06 新 OS 中间层）
    - **5 条**：孩子**原本就在树里**，只是换了父（C4-01/02 搬入虚拟化技术、C4-04/05/07 搬入新中间层）
- 另有 **2 条 treebind 被「同 id 修改」**（只改 target，不改 id）：因为挂载位置没变、只是换了实体。
  刻意如此设计 —— **边 id 保持稳定 → diff 更小、回滚更简单**。这是 schema 层面「结构边 id 绑定父位置」带来的副作用，正好为我所用。
- 提示：**2 条 `implements` 边进不了索引图** —— `logicalRelationKind()` 对它返回 null，调用方直接 continue 丢弃，
  只在**类型关系视图**可见。这是本轮裁决 **C1-08（暂不扩白名单）** 的直接后果 —— 记录在此，将来若要「让具象→本体关系上索引图」，改的就是这里。

## 3. 逐操作 before → after

> 注：操作**按顺序执行于同一份克隆数据**，因此后一个操作的 `before` 已包含前一个的效果（例：`C4-01` 移走 `管理程序` 后，`C4-02` 的旧父孩子数 6→5→4）。

### `C1-02` · rename · `分类` → `类的分类`（就地改名，挂 `类（编程）` 不变）

- **targetIds**：`{"treeId":"tree_class_programming_classification","ref":"k_class_programming_classification"}`
- **before**：`{"name":"分类","path":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 分类","kids":10,"poolLabel":"分类","tags":["分类","类","面向对象","编程"]}`
- **after**：`{"name":"类的分类","path":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 类的分类","kids":10,"poolLabel":"类的分类","tags":["分类","类","面向对象","编程","类的分类"]}`
- **边影响**：无：treeId 不变 → treebind 边 id 不变；只改池 label 与 tags
- **验收条件**：
  - 树条目 name = 类的分类（`tree_class_programming_classification`）
  - 池节点 label = 类的分类，tags 同时含 分类 与 类的分类
  - 孩子数与全部后代 treeId 逐条不变（改名不动子树）
  - 10 个成员路径前缀变为 … > 类（编程） > 类的分类

### `C1-03` · create · `抽象类` 新建 OOP 本体（裁决）

- **targetIds**：`{"newTreeId":"tree_p1_oop_abstract_class","newRef":"p1_oop_abstract_class","parentTreeId":"tree_class_programming_classification","parentRef":"k_class_programming_classification"}`
- **before**：`{"javaMounts":[{"treeId":"tree_java_syntax_zh_1hqaeyr","path":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java类 > 修饰符 > 抽象类"},{"treeId":"tree_1784295376195_3l31hb","path":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java类 > 继承 > 抽象类"},{"treeId":"tree_1786343651438_q205rt","path":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java类 > 抽象类"}],"existContentLen":232,"existTags":["抽象类","抽象类型"]}`
- **after**：`{"oopMount":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 类的分类 > 抽象类","newTabs":0}`
- **边影响**：新增 treebind 1 条；Java 侧 4 条既有边不动（belongs-to ×3 + instance-of ×1：`具体类 --[instance-of]--> 抽象类`）
- **⚠️ 裁决与数据冲突（HIGH）**：裁决理由「Java 下已有的是具象引用」与数据不符
  - 证据：现有实体 `k_1784295376153_uiovkk` 的正文是 **通用 OOP 定义**（232 字：「一个抽象类是一个不完整的类，或者被认为是不完整的，并且不能被实例化（直接）。

…」），tags=[抽象类, 抽象类型]，**不含任何 Java 专有语法**。
  - 风险：按裁决执行 → 新建一个**空** OOP 本体，同时那个**已经写着 OOP 定义**的实体仍留在 Java 树 → 出现「本体内容挂在语言树上、本体节点是空的」的倒置。
  - **建议**：变体 B：把现有实体**认定为本体**（新增 OOP 挂载点 / 或把它移到分类下），Java 侧 3 个挂载点改指**新建的 Java 具象实体**。本体内容零复制、倒置消除。
  - 备选：变体 A（本 dry-run 已模拟）：严格按裁决建空本体，接受内容在 Java 侧。
- **验收条件**：
  - `tree_p1_oop_abstract_class` 挂在 类（编程） > 类的分类 下，孩子数 +1
  - 新池节点 `p1_oop_abstract_class` 存在，label=抽象类，tags 含自身名
  - **新建节点 tabs 为空** → 体检的「空 tabs」计数 +1（合法，但属待填正文债）
  - Java 侧 `k_1784295376153_uiovkk` 3 个挂载点路径完全不变

### `C1-04` · create · `内部类` 新建 OOP 本体（与数据一致 ✅）

- **targetIds**：`{"newTreeId":"tree_p1_oop_inner_class","newRef":"p1_oop_inner_class","parentTreeId":"tree_class_programming_classification"}`
- **before**：`{"javaMounts":[{"treeId":"tree_1784044129452_61ft68","path":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java类 > 声明 > 内部类"},{"treeId":"tree_1786353277269_msn0ma91g","path":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java类 > 内部类"}],"existContentLen":1900,"existTags":["内部类","Java面试突击"]}`
- **after**：`{"oopMount":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 类的分类 > 内部类"}`
- **边影响**：新增 treebind 1 条；Java 侧 7 条既有边不动（含 4 条 Java 子概念 belongs-to：静态/成员/局部内部类、匿名内部类）
- **裁决与数据一致 ✅**：裁决理由与数据一致
  - 证据：现有实体正文 1900 字且明确是 Java 专有（「Java 类中不仅可以定义变量和方法，还可以定义类，这样定义在类内部的类就被称为内部类。…」，tags 含「Java面试突击」）→ 确属 Java 具象。
  - **建议**：按裁决执行即可。
- **验收条件**：
  - `tree_p1_oop_inner_class` 挂在 类（编程） > 类的分类 下
  - 新池节点 `p1_oop_inner_class` 存在，tabs 为空 → 空 tabs 计数 +1
  - Java 侧 `k_1784044129424_ffqm4z` 的 2 个挂载点与 7 条边零变化
  - ⚠️ 4 个 Java 子概念（静态/成员/局部内部类、匿名内部类）**仍挂在 Java 具象实体下** —— 符合「具象留在语言树」

### `C1-09/1` · split-entity · 拆分共享实体 `最终类`

- **targetIds**：`{"原实体":"k_1784045589643_icc5oo","新具象实体":"p1_java_final_class","OOP挂载":"tree_class_programming_final_class","Java挂载":"tree_1784045589689_drgfh8"}`
- **before**：`{"一个实体两处挂载":["知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 类的分类 > 最终类","知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java类 > 最终类"],"正文长度":81,"正文去向":"留在 OOP 侧 `k_1784045589643_icc5oo`","Java侧treebind":{"id":"treebind:tree_1784043760890_bptgal:tree_1784045589689_drgfh8","source":"k_1784043760861_gcvn05","target":"k_1784045589643_icc5oo","type":"belongs-to","label":"contains","relationKind":"structure","dimensions":[]}}`
- **after**：`{"OOP":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 类的分类 > 最终类 → k_1784045589643_icc5oo","Java":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java类 > 最终类 → p1_java_final_class","新加边":"p1_e_java_final_class: p1_java_final_class --[implements]--> k_1784045589643_icc5oo"}`
- **边影响**：① treebind `treebind:tree_1784043760890_bptgal:tree_1784045589689_drgfh8` 的 target 由 `k_1784045589643_icc5oo` 改为 `p1_java_final_class`；② 新增 implements 边 1 条（仅类型关系视图可见）；③ 其余语义边**按侧归属重指**（见下）
- 📌 正文 81 字含 `final class` 字样但语义通用（「不能被子类化…抽象类的对立面」）；本 dry-run 让 **OOP 侧保留原实体**（与 分类 同侧），Java 侧拿新实体。
- **验收条件**：
  - 两个 treeId 不再共享 nodeRef（`k_1784045589643_icc5oo` vs `p1_java_final_class`）
  - OOP 侧保留原实体与全部正文；Java 侧新实体 tabs 为空（待填 Java 专有正文）
  - treebind 边 target 已改指；边 id 不变（挂载位置未变，只换实体）
  - 体检「空 tabs」计数 +1
  - ⚠️ 若后续要按「本体/具象」重指语义边，需逐条裁决 —— 例如 `分类 --[belongs-to]--> 最终类` 应保留指向本体，Java 侧专属边应改指具象

### `C1-09/2` · split-entity · 拆分共享实体 `匿名类`

- **targetIds**：`{"原实体":"k_1784044171635_8etz45","新具象实体":"p1_java_anonymous_class","OOP挂载":"tree_class_programming_anonymous_class","Java挂载":"tree_1784044171666_9yd2is"}`
- **before**：`{"一个实体两处挂载":["知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 类的分类 > 匿名类","知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java类 > 声明 > 匿名类"],"正文长度":42,"正文去向":"留在 OOP 侧 `k_1784044171635_8etz45`","Java侧treebind":{"id":"treebind:tree_1784044092244_76wkqz:tree_1784044171666_9yd2is","source":"k_1784044092211_wkjnz2","target":"k_1784044171635_8etz45","type":"belongs-to","label":"contains","relationKind":"structure","dimensions":[]}}`
- **after**：`{"OOP":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 类的分类 > 匿名类 → k_1784044171635_8etz45","Java":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java类 > 声明 > 匿名类 → p1_java_anonymous_class","新加边":"p1_e_java_anonymous_class: p1_java_anonymous_class --[implements]--> k_1784044171635_8etz45"}`
- **边影响**：① treebind `treebind:tree_1784044092244_76wkqz:tree_1784044171666_9yd2is` 的 target 由 `k_1784044171635_8etz45` 改为 `p1_java_anonymous_class`；② 新增 implements 边 1 条（仅类型关系视图可见）；③ 其余语义边**按侧归属重指**（见下）
- 📌 正文 42 字纯通用（「无名类…不绑定名称或标识符」），OOP 侧保留原实体的判断更明确。
- **验收条件**：
  - 两个 treeId 不再共享 nodeRef（`k_1784044171635_8etz45` vs `p1_java_anonymous_class`）
  - OOP 侧保留原实体与全部正文；Java 侧新实体 tabs 为空（待填 Java 专有正文）
  - treebind 边 target 已改指；边 id 不变（挂载位置未变，只换实体）
  - 体检「空 tabs」计数 +1
  - ⚠️ 若后续要按「本体/具象」重指语义边，需逐条裁决 —— 例如 `分类 --[belongs-to]--> 匿名类` 应保留指向本体，Java 侧专属边应改指具象

### `C4-01` · move · `管理程序` → `虚拟机 > 虚拟化技术`

- **targetIds**：`{"treeId":"final_atomic_hypervisor","ref":"atomic_hypervisor","新父":"tree_wiki_en_virtual_machine_s5","新父Ref":"k_wiki_en_virtual_machine_s5"}`
- **before**：`{"path":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 程序分析 > 动态程序分析 > 分析（计算机编程） > 探查器类型中的数据粒度 > 管理程序","parentKids":6,"parentPath":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 程序分析 > 动态程序分析 > 分析（计算机编程） > 探查器类型中的数据粒度"}`
- **after**：`{"path":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 编译原理 > 执行 > 虚拟机 > 虚拟化技术 > 管理程序","parentKids":3}`
- **边影响**：treebind：删 `treebind:tree_wiki_en_profiling_computer_programming_s8:final_atomic_hypervisor`，建 `treebind:tree_wiki_en_virtual_machine_s5:final_atomic_hypervisor`（id 随父 treeId 变，target/source 不变）
- **验收条件**：
  - 旧父 `知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 程序分析 > 动态程序分析 > 分析（计算机编程） > 探查器类型中的数据粒度` 孩子数 6 → 5
  - 新父 `虚拟化技术` 孩子数 2 → 3
  - `final_atomic_hypervisor` 全部后代 treeId 不变
  - 语义边 `管理程序 --[对比]--> 模拟器` 不受影响（ref 未变）
  - 池节点 `atomic_hypervisor` 未删未退休

### `C4-02` · move · `模拟器` → `虚拟机 > 虚拟化技术`

- **targetIds**：`{"treeId":"final_atomic_emulator","ref":"atomic_emulator","新父":"tree_wiki_en_virtual_machine_s5","新父Ref":"k_wiki_en_virtual_machine_s5"}`
- **before**：`{"path":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 程序分析 > 动态程序分析 > 分析（计算机编程） > 探查器类型中的数据粒度 > 模拟器","parentKids":5,"parentPath":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 程序分析 > 动态程序分析 > 分析（计算机编程） > 探查器类型中的数据粒度"}`
- **after**：`{"path":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 编译原理 > 执行 > 虚拟机 > 虚拟化技术 > 模拟器","parentKids":4}`
- **边影响**：treebind：删 `treebind:tree_wiki_en_profiling_computer_programming_s8:final_atomic_emulator`，建 `treebind:tree_wiki_en_virtual_machine_s5:final_atomic_emulator`（id 随父 treeId 变，target/source 不变）
- **验收条件**：
  - 旧父 `知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 程序分析 > 动态程序分析 > 分析（计算机编程） > 探查器类型中的数据粒度` 孩子数 5 → 4
  - 新父 `虚拟化技术` 孩子数 2 → 4
  - `final_atomic_emulator` 全部后代 treeId 不变
  - 语义边 `管理程序 --[对比]--> 模拟器` 不受影响（ref 未变）
  - 池节点 `atomic_emulator` 未删未退休

### `C4-03` · create · 新建中间层 `I/O 多路复用`

- **targetIds**：`{"newTreeId":"tree_p1_io_multiplexing","newRef":"p1_io_multiplexing","父":"theory_domain_operating_systems","父Ref":"theory_domain_operating_systems"}`
- **before**：`{"操作系统孩子数":32,"同名节点":0}`
- **after**：`{"path":"知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > I/O 多路复用","操作系统孩子数":33}`
- **边影响**：新增 treebind `treebind:theory_domain_operating_systems:tree_p1_io_multiplexing`
- **验收条件**：
  - `tree_p1_io_multiplexing` 挂到 操作系统 下
  - 池节点 `p1_io_multiplexing` 存在，tabs 为空 → 空 tabs 计数 +1
  - 新父 childIds 含新条目

### `C4-06` · create · 新建中间层 `系统调用与 I/O`

- **targetIds**：`{"newTreeId":"tree_p1_syscall_io","newRef":"p1_syscall_io","父":"theory_domain_operating_systems","父Ref":"theory_domain_operating_systems"}`
- **before**：`{"操作系统孩子数":33,"同名节点":0}`
- **after**：`{"path":"知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 系统调用与 I/O","操作系统孩子数":34}`
- **边影响**：新增 treebind `treebind:theory_domain_operating_systems:tree_p1_syscall_io`
- **验收条件**：
  - `tree_p1_syscall_io` 挂到 操作系统 下
  - 池节点 `p1_syscall_io` 存在，tabs 为空 → 空 tabs 计数 +1
  - 新父 childIds 含新条目

### `C4-04` · move · `select` → `操作系统 > I/O 多路复用`

- **targetIds**：`{"treeId":"asplit_s1_asplit_select_io","ref":"asplit_select_io","新父":"tree_p1_io_multiplexing","新父Ref":"p1_io_multiplexing"}`
- **before**：`{"path":"知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > select","旧父":"知识宇宙 > 计算机科学 > 系统组织 > 操作系统","旧父孩子数":34}`
- **after**：`{"path":"知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > I/O 多路复用 > select","旧父孩子数":33,"新父孩子数":1}`
- **边影响**：treebind：删 `treebind:theory_domain_operating_systems:asplit_s1_asplit_select_io`，建 `treebind:tree_p1_io_multiplexing:asplit_s1_asplit_select_io`；语义边不动（`select` 的 ref 未变）
- **验收条件**：
  - `asplit_s1_asplit_select_io` 挂到 `I/O 多路复用` 下
  - 后代 treeId 不变
  - 池节点 `asplit_select_io` 未删未退休

### `C4-05` · move · `epoll` → `操作系统 > I/O 多路复用`

- **targetIds**：`{"treeId":"asplit_s1_asplit_epoll","ref":"asplit_epoll","新父":"tree_p1_io_multiplexing","新父Ref":"p1_io_multiplexing"}`
- **before**：`{"path":"知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > epoll","旧父":"知识宇宙 > 计算机科学 > 系统组织 > 操作系统","旧父孩子数":33}`
- **after**：`{"path":"知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > I/O 多路复用 > epoll","旧父孩子数":32,"新父孩子数":2}`
- **边影响**：treebind：删 `treebind:theory_domain_operating_systems:asplit_s1_asplit_epoll`，建 `treebind:tree_p1_io_multiplexing:asplit_s1_asplit_epoll`；语义边不动（`epoll` 的 ref 未变）
- **验收条件**：
  - `asplit_s1_asplit_epoll` 挂到 `I/O 多路复用` 下
  - 后代 treeId 不变
  - 池节点 `asplit_epoll` 未删未退休

### `C4-07` · move · `零拷贝` → `操作系统 > 系统调用与 I/O`

- **targetIds**：`{"treeId":"tree_io_zero_copy","ref":"k_io_zero_copy","新父":"tree_p1_syscall_io","新父Ref":"p1_syscall_io"}`
- **before**：`{"path":"知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 零拷贝","旧父":"知识宇宙 > 计算机科学 > 系统组织 > 操作系统","旧父孩子数":32}`
- **after**：`{"path":"知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 系统调用与 I/O > 零拷贝","旧父孩子数":31,"新父孩子数":1}`
- **边影响**：treebind：删 `treebind:theory_domain_operating_systems:tree_io_zero_copy`，建 `treebind:tree_p1_syscall_io:tree_io_zero_copy`；语义边不动（`零拷贝` 的 ref 未变）
- **验收条件**：
  - `tree_io_zero_copy` 挂到 `系统调用与 I/O` 下
  - 后代 treeId 不变
  - 池节点 `k_io_zero_copy` 未删未退休

## 4. 明确不进入本轮的

| opId | 原因 |
|---|---|
| `C1-06` | SPEC-BLOCKED：`viewDimensions` 的 atoms 是内容语义契约，不猜；且需等外部 atoms 批次收敛 |
| `C4-10` | SPEC-BLOCKED：`物化视图` 目标父路径缺失 |
| `C4-11` | SPEC-BLOCKED：`PipedInputStream` 目标父路径缺失；且它是 Java 具象，不能因名字含 Stream 就归 OS/IO 本体 |
| `C1-05` `C1-07` `C4-08` `C4-09` | VOID：已在位 / 端点不存在 / 无内层壳 / 对象不存在 |
| `C1-08` | 无结构动作：裁决为「暂不扩索引图白名单」，`implements` 仅类型关系视图可见 |

## 5. 治理规则（本轮实证，建议正式化）

> **treeId ≠ entity identity。**
> `treeId` 表示**挂载位置**，`nodeRef` 才是**池实体**。
> 同一个 `nodeRef` 出现多个 `treeId` 时，先判它是「合法共享引用」还是「本体/具象混用」，
> **不能只按路径数量判断存在几个实体。**

本轮被这条规则抓住的：`抽象类`(3 挂载同实体) · `内部类`(2) · `最终类`(2，OOP/Java 混用) · `匿名类`(2，OOP/Java 混用)。

### 5.1 附带发现：`treebind` 边 id 内含父 treeId，是**特性不是缺陷**

- 副作用：父一换，边 id 就必须变 → 表现为「删 1 建 1」，看起来像两条边在动，其实只有挂载位置变了。
- 好处：**边 id 就是挂载路径的指纹** —— 给定子 treeId 即可反推其 treebind id（`treebind:<父treeId>:<子treeId>`），
  这让「结构是否自洽」可以纯机械校验（本报告校验 #6 就是这么做的），不需要读任何语义字段。
- 代价：子节点换实体（拆分场景）时**必须保留原 id**，否则会退化成删+建。本批 2 条拆分边正是这么处理的。

## 6. 验收清单（APPLY 后逐条机械核对）

| # | 断言 | 期望 |
|---|---|---|
| A1 | tree-data.json 条目总数 | 3215 → **3219**（+4） |
| A2 | node-pool.json 节点总数 | 3849 → **3855**（+6） |
| A3 | knowledge-edges.json 边总数 | 4158 → **4164**（+6） |
| A4 | 树悬空 nodeRef | 保持 **0** |
| A5 | 边悬空端点 | 保持 **27**（存量，不得增加） |
| A6 | 缺 treebind 的条目 | 保持 **789**（存量，不得增加） |
| A7 | 被多条 treebind 挂载的条目 | 保持 **47**（存量，不得增加） |
| A8 | inspectNodePool fatal | **无** |
| A9 | 空 tabs 节点 | 495 → **501**（+6，均为本轮新建待填） |
| A10 | 树无环、treeId 全局唯一 | 通过 |
| A11 | 改动过的条目 treebind 端点与树父子一致 | 9/9 通过 |
| A12 | 拆分后 OOP/Java 两侧 nodeRef 不再相同 | 2/2 组已拆 |

> 校验脚本：`node scripts/dryrun-phase1.mjs` —— A1–A12 全部来自真实计算结果，非人工填写。

## 7. 闸门状态

| 闸门 | 状态 | 依据 |
|---|---|---|
| `[BLOCKED]` 5173 + 外部 data 未收敛 | ✅ **已解除** | 全工作树指纹显示：13:00 的数据批次之后再无外部写入；`outputs/` 之外 17 个已跟踪文件的 md5 与上次快照完全一致 |
| `[READ-ONLY RECONCILIATION]` | ✅ 完成 | `external-change-baseline.md`：外部改动 127 节点（tags×125 / viewDimensions×3 / card×1）+ 题库 1 条；与阶段一碰撞 **4 个**（仅 tags 字段） |
| `[BLUEPRINT NORMALIZATION]` | ✅ 完成 | `phase1-operations.json`：20 个原子操作单元，READY 5 / NEEDS_DECISION 5 / NEEDS_SPEC 3 / BLOCKED_UNTIL_CREATE 3 / VOID 4 |
| `[DRY-RUN]` | ✅ 完成 | 本报告：13 个操作单元真跑于内存克隆体，**本批引入新违规 0 项** |
| `[REVIEW]` | ⏳ **等待裁决** | 待决 3 项（见 7.1） |
| `[APPLY]` | ⛔ 未开始 | 需 REVIEW 通过 + 命名方案确认 + 写入互斥处理 |

### 7.1 进入 APPLY 前必须解决的三件事

1. **`抽象类` 走变体 A 还是 B**（§1.1）。这是唯一会改变操作数目的裁决：A = 本 dry-run 已模拟的 13 个操作单元；B = 另需为 Java 侧新建 1 个具象实体、把 3 条 treebind 改指。
2. **新实体命名方案**。本 dry-run 用了 `p1_` / `tree_p1_` 占位前缀，与现存风格（`k_1784…` 时间戳式、`asplit_*` 批次式）都不同。占位命名的好处是**一眼可辨、易于回滚**；若要统一风格，请在 APPLY 前定名。
3. **dev server 写入互斥**。Windows 下目标文件被预览/编辑器持有时 `rename` 会报 EPERM（本轮已因此产生过孤儿 `.tmp`）。APPLY 需走「原子写 + 失败回退直写 + 清理 tmp」模式，并确保 APPLY 窗口内无并发读取。

### 7.2 关于那 4 个碰撞节点

外部批次改了 127 个节点，其中仅 4 个落在阶段一目标集里（`asplit_concrete_class` / `asplit_local_class` / `asplit_select_io` / `asplit_epoll`），且**只动了 `tags` 字段**。
阶段一对这 4 个节点只做 **move（换父）**，不碰 `tags` → **写集不重叠，可安全共存**。
这正是「先固化外部基线再 APPLY」的价值：把冲突范围从「同一个文件」精确到「同一个字段」。
